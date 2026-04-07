import { listFriendsForUser } from "./db/repositories/friendsRepository.js";
import {
  countUnreadNotificationsForUser,
  listNotificationsForUser,
} from "./db/repositories/notificationsRepository.js";

let ioInstance = null;
const userSockets = new Map();

export function configureRealtimeHub(io) {
  ioInstance = io;
}

export function attachUserSocket(userId, socketId) {
  if (!userId) {
    return;
  }

  const nextSet = userSockets.get(userId) ?? new Set();
  nextSet.add(socketId);
  userSockets.set(userId, nextSet);
  return nextSet.size;
}

export function detachUserSocket(userId, socketId) {
  if (!userId) {
    return;
  }

  const current = userSockets.get(userId);
  if (!current) {
    return 0;
  }

  current.delete(socketId);
  if (current.size === 0) {
    userSockets.delete(userId);
    return 0;
  }

  return current.size;
}

export function getUserSocketCount(userId) {
  return userSockets.get(userId)?.size ?? 0;
}

export function emitToRoom(roomCode, event, payload) {
  ioInstance?.to(roomCode).emit(event, payload);
}

export function emitToUser(userId, event, payload) {
  const socketIds = userSockets.get(userId);
  if (!ioInstance || !socketIds?.size) {
    return;
  }

  for (const socketId of socketIds) {
    ioInstance.to(socketId).emit(event, payload);
  }
}

export function broadcast(event, payload) {
  ioInstance?.emit(event, payload);
}

export function emitNotificationRefresh(userId) {
  if (!userId) {
    return;
  }

  emitToUser(userId, "notifications:update", {
    notifications: listNotificationsForUser(userId),
    unreadCount: countUnreadNotificationsForUser(userId),
  });
}

export function emitFriendsRefresh(userId) {
  if (!userId) {
    return;
  }

  emitToUser(userId, "friends:refresh", {
    userId,
  });
}

export function emitPresenceRefreshToFriends(userId) {
  if (!userId) {
    return;
  }

  const friends = listFriendsForUser(userId);
  for (const friend of friends) {
    emitFriendsRefresh(friend.id);
  }
}
