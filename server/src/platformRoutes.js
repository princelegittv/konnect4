import { requireAuthenticatedUser } from "./auth/middleware.js";
import {
  areFriends,
  createFriendRequest,
  createFriendship,
  findExistingFriendRequest,
  listFriendRequestsForUser,
  listFriendsForUser,
  updateFriendRequest,
} from "./db/repositories/friendsRepository.js";
import {
  countUnreadNotificationsForUser,
  createNotification,
  listNotificationsForUser,
  markAllNotificationsRead,
  markNotificationRead,
} from "./db/repositories/notificationsRepository.js";
import { listLiveMatches } from "./db/repositories/liveMatchesRepository.js";
import { ensureCurrentSeason, getCurrentSeason } from "./db/repositories/seasonsRepository.js";
import {
  getSeasonLeaderboard,
  getUserAllTimeStats,
  getUserSeasonStats,
} from "./db/repositories/statsRepository.js";
import {
  findUserById,
  listLeaderboard,
  searchUsersByUsername,
  updateUserAvatar,
} from "./db/repositories/usersRepository.js";
import {
  emitFriendsRefresh,
  emitNotificationRefresh,
} from "./realtimeHub.js";

function sendError(response, error) {
  response.status(error.status ?? 500).json({
    ok: false,
    error: error.message ?? "Something went wrong.",
  });
}

function createHttpError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function normalizeUserProfile(user) {
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

function normalizeAvatarPayload(body) {
  const avatarType = String(body?.avatarType ?? "").trim().toLowerCase();
  const avatarValue = String(body?.avatarValue ?? "");

  if (!["upload", "emoji", "flag"].includes(avatarType)) {
    throw createHttpError("Avatar type must be upload, emoji, or flag.");
  }

  if (!avatarValue.trim()) {
    throw createHttpError("Avatar value is required.");
  }

  if (avatarType === "upload" && !avatarValue.startsWith("data:image/")) {
    throw createHttpError("Uploaded avatars must be image data URLs.");
  }

  if (avatarType === "upload" && avatarValue.length > 1_500_000) {
    throw createHttpError("Uploaded avatar is too large.");
  }

  return {
    avatarType,
    avatarValue,
  };
}

export function registerPlatformRoutes(app) {
  app.get("/api/profile", requireAuthenticatedUser, (request, response) => {
    const currentSeason = ensureCurrentSeason();
    const profile = findUserById(request.user.id);
    response.json({
      ok: true,
      profile: normalizeUserProfile(profile),
      currentSeason,
      currentSeasonStats: getUserSeasonStats(request.user.id, currentSeason.id),
      allTimeStats: getUserAllTimeStats(request.user.id),
    });
  });

  app.patch("/api/profile/avatar", requireAuthenticatedUser, (request, response) => {
    try {
      const { avatarType, avatarValue } = normalizeAvatarPayload(request.body);
      const profile = updateUserAvatar(request.user.id, avatarType, avatarValue);

      response.json({
        ok: true,
        profile: normalizeUserProfile(profile),
      });
    } catch (error) {
      sendError(response, error);
    }
  });

  app.get("/api/friends/search", requireAuthenticatedUser, (request, response) => {
    const query = String(request.query.q ?? "").trim();

    if (!query) {
      response.json({ ok: true, users: [] });
      return;
    }

    response.json({
      ok: true,
      users: searchUsersByUsername(query, request.user.id),
    });
  });

  app.get("/api/friends", requireAuthenticatedUser, (request, response) => {
    response.json({
      ok: true,
      friends: listFriendsForUser(request.user.id),
      requests: listFriendRequestsForUser(request.user.id),
    });
  });

  app.post("/api/friends/requests", requireAuthenticatedUser, (request, response) => {
    try {
      const receiverUserId = String(request.body?.receiverUserId ?? "").trim();

      if (!receiverUserId) {
        throw createHttpError("Receiver is required.");
      }

      if (receiverUserId === request.user.id) {
        throw createHttpError("You cannot send a friend request to yourself.");
      }

      const targetUser = findUserById(receiverUserId);
      if (!targetUser) {
        throw createHttpError("That player does not exist.", 404);
      }

      if (areFriends(request.user.id, receiverUserId)) {
        throw createHttpError("You are already friends.");
      }

      const existingRequest = findExistingFriendRequest(request.user.id, receiverUserId);
      if (existingRequest && existingRequest.status === "pending") {
        throw createHttpError("A pending friend request already exists.");
      }

      const friendRequest = createFriendRequest(request.user.id, receiverUserId);
      const notification = createNotification(receiverUserId, "friend_request_received", {
        requestId: friendRequest.id,
        fromUserId: request.user.id,
        fromUsername: request.user.username,
      });
      emitNotificationRefresh(receiverUserId);
      emitFriendsRefresh(receiverUserId);
      emitFriendsRefresh(request.user.id);

      response.status(201).json({
        ok: true,
        request: friendRequest,
        notification,
      });
    } catch (error) {
      sendError(response, error);
    }
  });

  app.post("/api/friends/requests/:requestId/respond", requireAuthenticatedUser, (request, response) => {
    try {
      const requestId = String(request.params.requestId);
      const decision = String(request.body?.decision ?? "").trim().toLowerCase();

      if (!["accept", "decline"].includes(decision)) {
        throw createHttpError("Decision must be accept or decline.");
      }

      const requestList = listFriendRequestsForUser(request.user.id);
      const friendRequest = requestList.find((entry) => entry.id === requestId && entry.direction === "incoming");

      if (!friendRequest) {
        throw createHttpError("Friend request not found.", 404);
      }

      updateFriendRequest(requestId, decision === "accept" ? "accepted" : "declined");

      if (decision === "accept") {
        createFriendship(friendRequest.senderUserId, friendRequest.receiverUserId);
      }

      const notification = createNotification(friendRequest.senderUserId, "friend_request_response", {
        requestId,
        fromUserId: request.user.id,
        fromUsername: request.user.username,
        decision,
      });
      emitNotificationRefresh(friendRequest.senderUserId);
      emitFriendsRefresh(friendRequest.senderUserId);
      emitFriendsRefresh(friendRequest.receiverUserId);

      response.json({
        ok: true,
        decision,
        notification,
      });
    } catch (error) {
      sendError(response, error);
    }
  });

  app.get("/api/notifications", requireAuthenticatedUser, (request, response) => {
    response.json({
      ok: true,
      notifications: listNotificationsForUser(request.user.id),
      unreadCount: countUnreadNotificationsForUser(request.user.id),
    });
  });

  app.patch("/api/notifications/read-all", requireAuthenticatedUser, (request, response) => {
    const notifications = markAllNotificationsRead(request.user.id);
    emitNotificationRefresh(request.user.id);

    response.json({
      ok: true,
      notifications,
      unreadCount: 0,
    });
  });

  app.patch(
    "/api/notifications/:notificationId/read",
    requireAuthenticatedUser,
    (request, response) => {
      const notificationId = String(request.params.notificationId ?? "").trim();

      if (!notificationId) {
        sendError(response, createHttpError("Notification id is required."));
        return;
      }

      const updated = markNotificationRead(request.user.id, notificationId);
      if (!updated) {
        sendError(response, createHttpError("Notification not found.", 404));
        return;
      }

      const notifications = listNotificationsForUser(request.user.id);
      const unreadCount = countUnreadNotificationsForUser(request.user.id);
      emitNotificationRefresh(request.user.id);

      response.json({
        ok: true,
        notifications,
        unreadCount,
      });
    },
  );

  app.get("/api/leaderboards", (request, response) => {
    const scope = String(request.query.scope ?? "global").trim().toLowerCase();
    const seasonScope = String(request.query.timeframe ?? "season").trim().toLowerCase();
    const region = String(request.query.region ?? "").trim();
    const country = String(request.query.country ?? "").trim();

    const currentSeason = ensureCurrentSeason();
    const supportedScope = ["global", "region", "country"].includes(scope) ? scope : "global";

    const entries =
      seasonScope === "all-time"
        ? listLeaderboard({
            scope: supportedScope,
            region,
            country,
          })
        : getSeasonLeaderboard({
            seasonId: currentSeason.id,
            scope: supportedScope,
            region,
            country,
          });

    response.json({
      ok: true,
      timeframe: seasonScope,
      scope: supportedScope,
      season: seasonScope === "all-time" ? null : getCurrentSeason(),
      entries,
    });
  });

  app.get("/api/live-matches", (_request, response) => {
    response.json({
      ok: true,
      matches: listLiveMatches(),
    });
  });
}
