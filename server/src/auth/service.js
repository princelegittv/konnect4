import crypto from "node:crypto";
import { SESSION_TTL_MS } from "../config.js";
import { getRankTierForPoints } from "../rankedSystem.js";
import {
  createSession,
  deleteSession,
  findSessionByToken,
  purgeExpiredSessions,
} from "../db/repositories/sessionsRepository.js";
import {
  createUser,
  findUserByEmail,
  findUserById,
  findUserByUsername,
  updateUserOnlineStatus,
} from "../db/repositories/usersRepository.js";
import {
  ensureUserAllTimeStats,
  ensureUserSeasonStats,
} from "../db/repositories/statsRepository.js";
import { ensureCurrentSeason } from "../db/repositories/seasonsRepository.js";

function createHttpError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function normalizeUsername(username) {
  return String(username ?? "").trim();
}

function normalizeEmail(email) {
  return String(email ?? "")
    .trim()
    .toLowerCase();
}

function normalizeLocation(value) {
  return String(value ?? "").trim();
}

function validateCredentials({ username, email, password }) {
  if (!username || username.length < 3 || username.length > 18) {
    throw createHttpError("Username must be between 3 and 18 characters.");
  }

  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    throw createHttpError("Username can only contain letters, numbers, and underscores.");
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw createHttpError("Enter a valid email address.");
  }

  if (!password || password.length < 8) {
    throw createHttpError("Password must be at least 8 characters long.");
  }
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedValue) {
  const [salt, originalHash] = String(storedValue ?? "").split(":");

  if (!salt || !originalHash) {
    return false;
  }

  const candidateHash = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(candidateHash, "hex"), Buffer.from(originalHash, "hex"));
}

function sanitizeUser(user) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    country: user.country,
    region: user.region,
    onlineStatus: user.onlineStatus,
    rankTier: user.rankTier,
    rankPoints: user.rankPoints,
    winStreak: user.winStreak,
    rankedWins: user.rankedWins,
    rankedLosses: user.rankedLosses,
    avatarType: user.avatarType,
    avatarValue: user.avatarValue,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function createSessionRecord(userId) {
  const now = Date.now();
  const session = {
    token: crypto.randomBytes(32).toString("hex"),
    userId,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + SESSION_TTL_MS).toISOString(),
  };

  createSession(session);
  return session;
}

function bootstrapUserStats(user) {
  const currentSeason = ensureCurrentSeason();

  ensureUserSeasonStats(user.id, currentSeason.id, {
    rankTier: user.rankTier,
    rankPoints: user.rankPoints,
    winStreak: user.winStreak,
    rankedWins: user.rankedWins,
    rankedLosses: user.rankedLosses,
  });
  ensureUserAllTimeStats(user.id);
}

export function signup({ username, email, password, country = "", region = "" }) {
  const normalizedUsername = normalizeUsername(username);
  const normalizedEmail = normalizeEmail(email);

  validateCredentials({
    username: normalizedUsername,
    email: normalizedEmail,
    password,
  });

  if (findUserByUsername(normalizedUsername)) {
    throw createHttpError("That username is already taken.", 409);
  }

  if (findUserByEmail(normalizedEmail)) {
    throw createHttpError("That email is already registered.", 409);
  }

  const now = new Date().toISOString();
  const user = createUser({
    id: crypto.randomUUID(),
    username: normalizedUsername,
    email: normalizedEmail,
    passwordHash: hashPassword(password),
    country: normalizeLocation(country),
    region: normalizeLocation(region),
    onlineStatus: "online",
    rankTier: getRankTierForPoints(0),
    rankPoints: 0,
    winStreak: 0,
    rankedWins: 0,
    rankedLosses: 0,
    avatarType: "emoji",
    avatarValue: "\uD83C\uDFAE",
    createdAt: now,
    updatedAt: now,
  });

  bootstrapUserStats(user);

  const session = createSessionRecord(user.id);
  return { user: sanitizeUser(user), sessionToken: session.token };
}

export function login({ emailOrUsername, password }) {
  const identifier = String(emailOrUsername ?? "").trim();

  if (!identifier || !password) {
    throw createHttpError("Email/username and password are required.");
  }

  const user = findUserByEmail(identifier.toLowerCase()) ?? findUserByUsername(identifier) ?? null;

  if (!user || !verifyPassword(password, user.passwordHash)) {
    throw createHttpError("Incorrect login details.", 401);
  }

  updateUserOnlineStatus(user.id, "online");
  const refreshedUser = findUserById(user.id);
  bootstrapUserStats(refreshedUser);
  const session = createSessionRecord(user.id);
  return { user: sanitizeUser(refreshedUser), sessionToken: session.token };
}

export function getUserFromSessionToken(token) {
  if (!token) {
    return null;
  }

  purgeExpiredSessions();
  const session = findSessionByToken(token);

  if (!session) {
    return null;
  }

  if (new Date(session.expiresAt).getTime() <= Date.now()) {
    deleteSession(token);
    return null;
  }

  const user = findUserById(session.userId);
  return user ? sanitizeUser(user) : null;
}

export function logout(token) {
  if (!token) {
    return;
  }

  const session = findSessionByToken(token);
  if (session) {
    updateUserOnlineStatus(session.userId, "offline");
  }
  deleteSession(token);
}
