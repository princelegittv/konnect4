import { resolveUserFromSocket } from "./auth/socket.js";
import { listLiveMatches } from "./db/repositories/liveMatchesRepository.js";
import { updateUserOnlineStatus } from "./db/repositories/usersRepository.js";
import {
  attachUserSocket,
  configureRealtimeHub,
  detachUserSocket,
  emitFriendsRefresh,
  emitNotificationRefresh,
  emitPresenceRefreshToFriends,
} from "./realtimeHub.js";
import {
  createAiRoom,
  createRoom,
  getQueueSize,
  joinMatchmakingQueue,
  joinRoom,
  joinSpectator,
  leaveMatchmakingQueue,
  leaveRoom,
  playMove,
  registerSocketConnection,
  removeSocket,
  requestRematch,
  setTurnTimer,
} from "./roomManager.js";

function requireUser(socket, callback) {
  if (!socket.data.user) {
    callback?.({
      ok: false,
      error: "You need to log in before using online features.",
    });
    return false;
  }

  return true;
}

function refreshRealtimeStateForUser(userId) {
  emitNotificationRefresh(userId);
  emitFriendsRefresh(userId);
  emitPresenceRefreshToFriends(userId);
}

export function registerGameHandlers(io) {
  configureRealtimeHub(io);

  io.on("connection", (socket) => {
    socket.data.user = resolveUserFromSocket(socket);
    const restoredRoom = registerSocketConnection(socket, socket.data.user);

    if (socket.data.user) {
      attachUserSocket(socket.data.user.id, socket.id);
      updateUserOnlineStatus(socket.data.user.id, "online");
      refreshRealtimeStateForUser(socket.data.user.id);
    }

    if (restoredRoom) {
      socket.emit("room:state", restoredRoom);
    }

    socket.emit("live:matches:update", {
      matches: listLiveMatches(),
    });

    socket.on("room:create", (_payload = {}, callback) => {
      if (!requireUser(socket, callback)) {
        return;
      }

      callback?.(createRoom(socket, socket.data.user));
    });

    socket.on("room:join", ({ roomCode } = {}, callback) => {
      if (!requireUser(socket, callback)) {
        return;
      }

      callback?.(joinRoom(socket, roomCode, socket.data.user));
    });

    socket.on("queue:join", (_payload = {}, callback) => {
      if (!requireUser(socket, callback)) {
        return;
      }

      callback?.(joinMatchmakingQueue(socket, socket.data.user));
    });

    socket.on("queue:leave", (_payload = {}, callback) => {
      if (!requireUser(socket, callback)) {
        return;
      }

      callback?.(leaveMatchmakingQueue(socket.id, socket.data.user.id));
    });

    socket.on("ranked:queue:join", (_payload = {}, callback) => {
      if (!requireUser(socket, callback)) {
        return;
      }

      callback?.(joinMatchmakingQueue(socket, socket.data.user, { ranked: true }));
    });

    socket.on("ranked:queue:leave", (_payload = {}, callback) => {
      if (!requireUser(socket, callback)) {
        return;
      }

      callback?.(leaveMatchmakingQueue(socket.id, socket.data.user.id, { ranked: true }));
    });

    socket.on("practice:create", ({ difficulty } = {}, callback) => {
      if (!requireUser(socket, callback)) {
        return;
      }

      callback?.(createAiRoom(socket, socket.data.user, difficulty));
    });

    socket.on("spectate:join", ({ roomCode } = {}, callback) => {
      if (!requireUser(socket, callback)) {
        return;
      }

      callback?.(joinSpectator(socket, roomCode, socket.data.user));
    });

    socket.on("room:leave", (_payload = {}, callback) => {
      callback?.({ ok: true });
      leaveRoom(socket.id);
    });

    socket.on("game:move", ({ column } = {}, callback) => {
      callback?.(playMove(socket.id, column));
    });

    socket.on("game:rematch", (_payload = {}, callback) => {
      callback?.(requestRematch(socket.id));
    });

    socket.on("timer:set", ({ enabled } = {}, callback) => {
      callback?.(setTurnTimer(socket.id, Boolean(enabled)));
    });

    socket.on("live:matches:list", (_payload = {}, callback) => {
      callback?.({
        ok: true,
        matches: listLiveMatches(),
        randomQueueSize: getQueueSize(),
        rankedQueueSize: getQueueSize("ranked"),
      });
    });

    socket.on("disconnect", () => {
      if (!socket.data.user) {
        removeSocket(socket.id);
        return;
      }

      const remainingSockets = detachUserSocket(socket.data.user.id, socket.id);
      if (remainingSockets === 0) {
        updateUserOnlineStatus(socket.data.user.id, "offline");
      }

      refreshRealtimeStateForUser(socket.data.user.id);
      removeSocket(socket.id);
    });
  });
}
