import { BOT_NAME, AI_DIFFICULTIES, chooseBotMove } from "./aiPlayer.js";
import {
  applyRankedResult,
  getAllowedTierIndexes,
  getExpansionLevelFromQueueMs,
  getTierIndex,
} from "./rankedSystem.js";
import { ensureCurrentSeason } from "./db/repositories/seasonsRepository.js";
import { recordCompletedMatchForUser } from "./db/repositories/statsRepository.js";
import { updateUserRankStats } from "./db/repositories/usersRepository.js";
import {
  createMatchHistoryRecord,
  finalizeMatchHistoryRecord,
} from "./db/repositories/matchHistoryRepository.js";
import {
  deleteLiveMatch,
  listLiveMatches,
  upsertLiveMatch,
} from "./db/repositories/liveMatchesRepository.js";
import { broadcast, emitToRoom } from "./realtimeHub.js";
import {
  PLAYER_COLORS,
  createGameState,
  createRoomCode,
  dropPiece,
  getValidColumns,
} from "../../shared/connect4.js";

const rooms = new Map();
const sockets = new Map();
const socketSessionIndex = new Map();
const playerRoomIndex = new Map();
const matchmakingQueue = [];
const rankedQueue = [];
const pendingAiTurns = new Map();
const pendingTurnTimers = new Map();
const pendingDisconnects = new Map();

const TURN_TIME_LIMIT_MS = 2 * 60 * 1000;
const TIMER_WARNING_MS = [90_000, 60_000, 30_000];
const DISCONNECT_FORFEIT_MS = 60_000;
const QUEUE_PROCESS_INTERVAL_MS = 5_000;

let queueProcessorInterval = null;

function ensureQueueProcessor() {
  if (queueProcessorInterval) {
    return;
  }

  queueProcessorInterval = setInterval(() => {
    processMatchmakingQueue();
    processRankedQueue();
  }, QUEUE_PROCESS_INTERVAL_MS);

  queueProcessorInterval.unref?.();
}

function generateUniqueRoomCode() {
  let code = createRoomCode();

  while (rooms.has(code)) {
    code = createRoomCode();
  }

  return code;
}

function createHumanPlayer(socket, user, color) {
  return {
    id: user.id,
    socketId: socket.id,
    userId: user.id,
    username: user.username,
    avatarType: user.avatarType ?? "emoji",
    avatarValue: user.avatarValue ?? "\uD83C\uDFAE",
    rankTier: user.rankTier ?? "Bronze",
    rankPoints: user.rankPoints ?? 0,
    winStreak: user.winStreak ?? 0,
    rankedWins: user.rankedWins ?? 0,
    rankedLosses: user.rankedLosses ?? 0,
    color,
    kind: "human",
    connected: true,
    abandoned: false,
    disconnectedAt: null,
  };
}

function createBotPlayer(roomCode, color, difficulty) {
  return {
    id: `bot:${roomCode}`,
    socketId: null,
    userId: null,
    username: BOT_NAME,
    avatarType: "emoji",
    avatarValue: "\uD83E\uDD16",
    rankTier: "Impossible",
    rankPoints: 9999,
    winStreak: 0,
    rankedWins: 0,
    rankedLosses: 0,
    color,
    kind: "bot",
    connected: true,
    abandoned: false,
    disconnectedAt: null,
    difficulty,
  };
}

function createSpectator(socket, user) {
  return {
    socketId: socket.id,
    userId: user.id,
    username: user.username,
    avatarType: user.avatarType ?? "emoji",
    avatarValue: user.avatarValue ?? "\uD83C\uDFAE",
    rankTier: user.rankTier ?? "Bronze",
    rankPoints: user.rankPoints ?? 0,
  };
}

function createRoomRecord({ code, mode, players, status = "playing", difficulty = null }) {
  const season = ensureCurrentSeason();

  return {
    code,
    mode,
    status,
    difficulty,
    players,
    spectators: [],
    gameState: createGameState(),
    rematchVotes: new Set(),
    createdAt: new Date().toISOString(),
    seasonId: season.id,
    currentMatchId: null,
    resultPersisted: false,
    rankChanges: null,
    timerEnabled: false,
    timerControllerPlayerId: null,
    turnTimeLimitMs: TURN_TIME_LIMIT_MS,
    turnStartedAt: null,
    activeTurnDeadline: null,
    timerWarningsSent: [],
    forfeitedByTimer: null,
  };
}

function assignSocketToRoom(socket, roomCode, role) {
  socket.join(roomCode);
  socketSessionIndex.set(socket.id, { roomCode, role });
}

function clearSocketRoomMembership(socketId, roomCode) {
  const socket = sockets.get(socketId);
  socket?.leave?.(roomCode);
}

function getRoomForSocket(socketId) {
  const session = socketSessionIndex.get(socketId);
  return session ? rooms.get(session.roomCode) ?? null : null;
}

function getHumanPlayers(room) {
  return room.players.filter((player) => player.kind === "human");
}

function getConnectedHumanPlayers(room) {
  return getHumanPlayers(room).filter((player) => player.connected && !player.abandoned);
}

function getActiveHumanPlayers(room) {
  return getHumanPlayers(room).filter((player) => !player.abandoned);
}

function getPlayerBySocketId(room, socketId) {
  return room.players.find((player) => player.socketId === socketId) ?? null;
}

function getPlayerById(room, playerId) {
  return room.players.find((player) => player.id === playerId) ?? null;
}

function getCurrentTurnPlayer(room) {
  return room.players.find((player) => player.color === room.gameState.currentPlayer) ?? null;
}

function getOpponentPlayer(room, playerId) {
  return room.players.find((player) => player.id !== playerId && !player.abandoned) ?? null;
}

function clearPendingAiTurn(roomCode) {
  const timeoutId = pendingAiTurns.get(roomCode);
  if (timeoutId) {
    clearTimeout(timeoutId);
    pendingAiTurns.delete(roomCode);
  }
}

function clearTurnTimerSchedule(roomCode) {
  const timers = pendingTurnTimers.get(roomCode);
  if (!timers) {
    return;
  }

  for (const timeoutId of timers) {
    clearTimeout(timeoutId);
  }

  pendingTurnTimers.delete(roomCode);
}

function clearPendingDisconnect(playerId) {
  const timeoutId = pendingDisconnects.get(playerId);
  if (timeoutId) {
    clearTimeout(timeoutId);
    pendingDisconnects.delete(playerId);
  }
}

function stopTurnClock(room) {
  clearTurnTimerSchedule(room.code);
  room.turnStartedAt = null;
  room.activeTurnDeadline = null;
  room.timerWarningsSent = [];
}

function buildPublicRoom(room, message = "") {
  return {
    code: room.code,
    mode: room.mode,
    status: room.status,
    difficulty: room.difficulty,
    gameState: room.gameState,
    players: room.players.map((player) => ({
      id: player.id,
      userId: player.userId,
      username: player.username,
      avatarType: player.avatarType,
      avatarValue: player.avatarValue,
      rankTier: player.rankTier,
      rankPoints: player.rankPoints,
      color: player.color,
      kind: player.kind,
      connected: player.connected,
      abandoned: player.abandoned,
    })),
    spectatorCount: room.spectators.length,
    rematchVotes: room.rematchVotes.size,
    rematchTarget: getConnectedHumanPlayers(room).length,
    timerEnabled: room.timerEnabled,
    timerControllerPlayerId: room.timerControllerPlayerId,
    turnTimeLimitMs: room.turnTimeLimitMs,
    turnStartedAt: room.turnStartedAt,
    activeTurnDeadline: room.activeTurnDeadline,
    timerWarningsSent: [...room.timerWarningsSent],
    forfeitedByTimer: room.forfeitedByTimer,
    rankChanges: room.rankChanges,
    message,
  };
}

function syncLiveMatches(room, publicRoom = buildPublicRoom(room)) {
  const humanPlayers = getActiveHumanPlayers(room);
  const shouldPublish =
    room.mode !== "ai" && humanPlayers.length === 2 && room.status === "playing";

  if (shouldPublish) {
    upsertLiveMatch({
      roomCode: room.code,
      mode: room.mode,
      seasonId: room.seasonId,
      status: room.status,
      playerOneUserId: humanPlayers[0]?.userId ?? null,
      playerTwoUserId: humanPlayers[1]?.userId ?? null,
      board: room.gameState.board,
      state: publicRoom,
      spectatorCount: room.spectators.length,
    });
  } else {
    deleteLiveMatch(room.code);
  }

  broadcast("live:matches:update", {
    matches: listLiveMatches(),
  });
}

function emitRoomState(room, message = "") {
  const publicRoom = buildPublicRoom(room, message);
  emitToRoom(room.code, "room:state", publicRoom);
  syncLiveMatches(room, publicRoom);
  return publicRoom;
}

function deleteRoom(roomCode) {
  const room = rooms.get(roomCode);
  if (!room) {
    return;
  }

  clearPendingAiTurn(roomCode);
  clearTurnTimerSchedule(roomCode);

  for (const player of room.players) {
    if (player.userId && playerRoomIndex.get(player.userId) === roomCode) {
      playerRoomIndex.delete(player.userId);
    }
    clearPendingDisconnect(player.id);
  }

  for (const spectator of room.spectators) {
    socketSessionIndex.delete(spectator.socketId);
  }

  deleteLiveMatch(roomCode);
  rooms.delete(roomCode);
  broadcast("live:matches:update", {
    matches: listLiveMatches(),
  });
}

function startRound(room) {
  clearPendingAiTurn(room.code);
  stopTurnClock(room);
  room.gameState = createGameState();
  room.rematchVotes.clear();
  room.status = "playing";
  room.forfeitedByTimer = null;
  room.rankChanges = null;
  room.resultPersisted = false;

  room.currentMatchId = createMatchHistoryRecord({
    roomCode: room.code,
    mode: room.mode,
    seasonId: room.seasonId,
    status: "playing",
    startedAt: new Date().toISOString(),
    metadata: {
      difficulty: room.difficulty ?? null,
      timerEnabled: room.timerEnabled,
    },
  });

  if (room.timerEnabled) {
    startTurnClock(room, Date.now());
  }
}

function resetRoom(room) {
  if (room.players.length >= 2) {
    startRound(room);
    return;
  }

  clearPendingAiTurn(room.code);
  stopTurnClock(room);
  room.gameState = createGameState();
  room.rematchVotes.clear();
  room.status = "waiting";
  room.forfeitedByTimer = null;
  room.rankChanges = null;
  room.currentMatchId = null;
  room.resultPersisted = false;
}

function createMatchedRoom(firstSocket, firstUser, secondSocket, secondUser, mode) {
  const code = generateUniqueRoomCode();
  const room = createRoomRecord({
    code,
    mode,
    players: [
      createHumanPlayer(firstSocket, firstUser, PLAYER_COLORS.RED),
      createHumanPlayer(secondSocket, secondUser, PLAYER_COLORS.YELLOW),
    ],
  });

  rooms.set(code, room);
  assignSocketToRoom(firstSocket, code, "player");
  assignSocketToRoom(secondSocket, code, "player");
  playerRoomIndex.set(firstUser.id, code);
  playerRoomIndex.set(secondUser.id, code);
  startRound(room);
  return room;
}

function recordPlayerMatchResult({ player, room, outcome, rankedDisconnect = false }) {
  if (!player.userId) {
    return {
      pointChange: 0,
      rankTier: player.rankTier,
      rankPoints: player.rankPoints,
      winStreak: player.winStreak,
    };
  }

  if (room.mode !== "ranked") {
    recordCompletedMatchForUser({
      userId: player.userId,
      seasonId: room.seasonId,
      mode: room.mode,
      outcome,
      ranked: false,
      rankTier: player.rankTier,
      rankPoints: player.rankPoints,
      winStreak: player.winStreak,
    });
    return {
      pointChange: 0,
      rankTier: player.rankTier,
      rankPoints: player.rankPoints,
      winStreak: player.winStreak,
    };
  }

  if (outcome === "draw") {
    recordCompletedMatchForUser({
      userId: player.userId,
      seasonId: room.seasonId,
      mode: room.mode,
      outcome,
      ranked: true,
      rankTier: player.rankTier,
      rankPoints: player.rankPoints,
      winStreak: player.winStreak,
    });

    return {
      pointChange: 0,
      rankTier: player.rankTier,
      rankPoints: player.rankPoints,
      winStreak: player.winStreak,
    };
  }

  const rankedUpdate = applyRankedResult({
    currentPoints: player.rankPoints,
    currentWinStreak: player.winStreak,
    outcome,
    disconnect: outcome === "loss" && rankedDisconnect,
  });

  player.rankPoints = rankedUpdate.nextPoints;
  player.rankTier = rankedUpdate.nextRankTier;
  player.winStreak = rankedUpdate.nextWinStreak;
  if (outcome === "win") {
    player.rankedWins += 1;
  } else {
    player.rankedLosses += 1;
  }

  updateUserRankStats(player.userId, {
    rankTier: player.rankTier,
    rankPoints: player.rankPoints,
    winStreak: player.winStreak,
    rankedWins: player.rankedWins,
    rankedLosses: player.rankedLosses,
  });

  recordCompletedMatchForUser({
    userId: player.userId,
    seasonId: room.seasonId,
    mode: room.mode,
    outcome,
    ranked: true,
    rankTier: player.rankTier,
    rankPoints: player.rankPoints,
    winStreak: player.winStreak,
  });

  return {
    pointChange: rankedUpdate.pointChange,
    rankTier: player.rankTier,
    rankPoints: player.rankPoints,
    winStreak: player.winStreak,
  };
}

function finalizeRoomOutcome(room, { winnerPlayer = null, loserPlayer = null, draw = false, reason }) {
  if (room.resultPersisted) {
    return;
  }

  room.resultPersisted = true;
  room.rankChanges = null;
  stopTurnClock(room);
  clearPendingAiTurn(room.code);

  const participants = [];
  let rankChanges = null;

  if (room.mode === "ranked") {
    rankChanges = {};
  }

  for (const player of room.players) {
    const outcome = draw ? "draw" : winnerPlayer?.id === player.id ? "win" : "loss";
    const rankedDisconnect =
      room.mode === "ranked" && loserPlayer?.id === player.id && reason === "disconnect";
    const result =
      player.kind === "human"
        ? recordPlayerMatchResult({ player, room, outcome, rankedDisconnect })
        : {
            pointChange: 0,
            rankTier: player.rankTier,
            rankPoints: player.rankPoints,
            winStreak: player.winStreak,
          };

    participants.push({
      userId: player.userId,
      usernameSnapshot: player.username,
      rankTierSnapshot: result.rankTier,
      result: outcome,
      rankPointsChange: result.pointChange,
      isAi: player.kind === "bot",
    });

    if (room.mode === "ranked" && player.kind === "human") {
      rankChanges[player.id] = {
        pointChange: result.pointChange,
        rankTier: result.rankTier,
        rankPoints: result.rankPoints,
      };
    }
  }

  room.rankChanges = rankChanges;

  finalizeMatchHistoryRecord({
    matchId: room.currentMatchId,
    status: draw ? "draw" : "finished",
    winnerUserId: draw ? null : winnerPlayer?.userId ?? null,
    rankChanges,
    metadata: {
      reason,
      forfeitedByTimer: room.forfeitedByTimer,
      timerEnabled: room.timerEnabled,
      difficulty: room.difficulty ?? null,
    },
    participants,
  });
}

function finishGame(room, { winnerPlayer = null, loserPlayer = null, draw = false, message, reason }) {
  room.status = "finished";
  if (draw) {
    room.gameState = {
      ...room.gameState,
      winner: null,
      isDraw: true,
      winningCells: [],
    };
  } else if (winnerPlayer) {
    room.gameState = {
      ...room.gameState,
      winner: winnerPlayer.color,
      isDraw: false,
    };
  }

  finalizeRoomOutcome(room, { winnerPlayer, loserPlayer, draw, reason });
  return emitRoomState(room, message);
}

function finalizeMove(room, nextState) {
  room.gameState = nextState;
  room.rematchVotes.clear();

  if (room.gameState.winner || room.gameState.isDraw) {
    room.status = "finished";
    stopTurnClock(room);
    clearPendingAiTurn(room.code);
    return;
  }

  if (room.timerEnabled) {
    startTurnClock(room, Date.now());
  }
}

function startTurnClock(room, startedAtMs) {
  if (!room.timerEnabled || room.status !== "playing" || room.mode === "ai") {
    return;
  }

  clearTurnTimerSchedule(room.code);

  room.turnStartedAt = startedAtMs;
  room.activeTurnDeadline = startedAtMs + room.turnTimeLimitMs;
  room.timerWarningsSent = [];

  const timers = [];

  for (const warningRemainingMs of TIMER_WARNING_MS) {
    const timeoutMs = room.activeTurnDeadline - warningRemainingMs - Date.now();
    if (timeoutMs <= 0) {
      continue;
    }

    const timeoutId = setTimeout(() => {
      const liveRoom = rooms.get(room.code);
      if (
        !liveRoom ||
        !liveRoom.timerEnabled ||
        liveRoom.activeTurnDeadline !== room.activeTurnDeadline ||
        liveRoom.status !== "playing"
      ) {
        return;
      }

      if (!liveRoom.timerWarningsSent.includes(warningRemainingMs)) {
        liveRoom.timerWarningsSent.push(warningRemainingMs);
      }

      const currentPlayer = getCurrentTurnPlayer(liveRoom);
      const seconds = Math.floor(warningRemainingMs / 1000);
      const minutesDisplay = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
      emitRoomState(
        liveRoom,
        `${currentPlayer?.username ?? "Player"} has ${minutesDisplay} remaining on the turn timer.`,
      );
    }, timeoutMs);

    timers.push(timeoutId);
  }

  const expiryMs = room.activeTurnDeadline - Date.now();
  if (expiryMs > 0) {
    timers.push(
      setTimeout(() => {
        const liveRoom = rooms.get(room.code);
        if (
          !liveRoom ||
          !liveRoom.timerEnabled ||
          liveRoom.activeTurnDeadline !== room.activeTurnDeadline ||
          liveRoom.status !== "playing"
        ) {
          return;
        }

        const forfeitingPlayer = getCurrentTurnPlayer(liveRoom);
        const winnerPlayer = forfeitingPlayer ? getOpponentPlayer(liveRoom, forfeitingPlayer.id) : null;
        liveRoom.forfeitedByTimer = forfeitingPlayer?.id ?? null;

        finishGame(liveRoom, {
          winnerPlayer,
          loserPlayer: forfeitingPlayer,
          draw: false,
          reason: "timer",
          message: `${forfeitingPlayer?.username ?? "Player"} forfeited on time. ${winnerPlayer?.username ?? "Opponent"} wins.`,
        });
      }, expiryMs),
    );
  }

  pendingTurnTimers.set(room.code, timers);
}

function chooseFallbackColumn(board) {
  const validColumns = getValidColumns(board);
  return validColumns[0] ?? null;
}

function scheduleAiTurn(roomCode, delayMs = 700) {
  const room = rooms.get(roomCode);

  if (!room || room.mode !== "ai" || room.status !== "playing") {
    return false;
  }

  const currentTurnPlayer = getCurrentTurnPlayer(room);
  if (!currentTurnPlayer || currentTurnPlayer.kind !== "bot") {
    return false;
  }

  clearPendingAiTurn(roomCode);

  const timeoutId = setTimeout(() => {
    pendingAiTurns.delete(roomCode);

    const liveRoom = rooms.get(roomCode);
    if (!liveRoom || liveRoom.mode !== "ai" || liveRoom.status !== "playing") {
      return;
    }

    const bot = getCurrentTurnPlayer(liveRoom);
    if (!bot || bot.kind !== "bot") {
      return;
    }

    let column = chooseBotMove(liveRoom.gameState.board, bot.color, liveRoom.difficulty);
    if (column === null) {
      return;
    }

    let result = dropPiece(liveRoom.gameState, column, bot.color);
    if (!result.ok) {
      column = chooseFallbackColumn(liveRoom.gameState.board);
      if (column === null) {
        return;
      }
      result = dropPiece(liveRoom.gameState, column, bot.color);
      if (!result.ok) {
        return;
      }
    }

    finalizeMove(liveRoom, result.nextState);

    if (liveRoom.gameState.winner) {
      finishGame(liveRoom, {
        winnerPlayer: bot,
        loserPlayer: getOpponentPlayer(liveRoom, bot.id),
        draw: false,
        reason: "board",
        message: `${BOT_NAME} wins the game.`,
      });
      return;
    }

    if (liveRoom.gameState.isDraw) {
      finishGame(liveRoom, {
        draw: true,
        reason: "draw",
        message: "Practice match ended in a draw.",
      });
      return;
    }

    emitRoomState(liveRoom, `${BOT_NAME} made a move.`);
  }, delayMs);

  pendingAiTurns.set(roomCode, timeoutId);
  return true;
}

function removeFromQueue(queue, { socketId, userId }) {
  const index = queue.findIndex(
    (entry) =>
      (socketId ? entry.socketId === socketId : false) || (userId ? entry.userId === userId : false),
  );

  if (index >= 0) {
    queue.splice(index, 1);
    return true;
  }

  return false;
}

function removeFromAllQueues({ socketId, userId }) {
  const removedRandom = removeFromQueue(matchmakingQueue, { socketId, userId });
  const removedRanked = removeFromQueue(rankedQueue, { socketId, userId });
  return removedRandom || removedRanked;
}

function ensurePlayerCanStart(socketId, userId) {
  if (socketSessionIndex.has(socketId)) {
    return { ok: false, error: "Leave your current room before starting another match." };
  }

  if (playerRoomIndex.has(userId)) {
    return { ok: false, error: "Finish or leave your current game first." };
  }

  if (
    matchmakingQueue.some((entry) => entry.userId === userId) ||
    rankedQueue.some((entry) => entry.userId === userId)
  ) {
    return { ok: false, error: "You are already queued for matchmaking." };
  }

  return null;
}

function buildQueueEntry(socket, user) {
  return {
    socketId: socket.id,
    userId: user.id,
    user,
    joinedAt: Date.now(),
    tierIndex: getTierIndex(user.rankTier),
  };
}

function processMatchmakingQueue() {
  while (matchmakingQueue.length >= 2) {
    const firstEntry = matchmakingQueue.shift();
    const secondIndex = matchmakingQueue.findIndex((entry) => entry.userId !== firstEntry.userId);

    if (!firstEntry || secondIndex === -1) {
      if (firstEntry) {
        matchmakingQueue.unshift(firstEntry);
      }
      break;
    }

    const [secondEntry] = matchmakingQueue.splice(secondIndex, 1);
    const firstSocket = sockets.get(firstEntry.socketId);
    const secondSocket = sockets.get(secondEntry.socketId);
    if (!firstSocket || !secondSocket) {
      continue;
    }

    const room = createMatchedRoom(
      firstSocket,
      firstEntry.user,
      secondSocket,
      secondEntry.user,
      "matchmaking",
    );

    emitRoomState(room, "Random match found. Good luck.");
  }
}

function areRankedEntriesCompatible(leftEntry, rightEntry, nowMs) {
  const leftAllowed = getAllowedTierIndexes(
    leftEntry.tierIndex,
    getExpansionLevelFromQueueMs(nowMs - leftEntry.joinedAt),
  );
  const rightAllowed = getAllowedTierIndexes(
    rightEntry.tierIndex,
    getExpansionLevelFromQueueMs(nowMs - rightEntry.joinedAt),
  );

  return leftAllowed.has(rightEntry.tierIndex) && rightAllowed.has(leftEntry.tierIndex);
}

function processRankedQueue() {
  const nowMs = Date.now();

  for (let leftIndex = 0; leftIndex < rankedQueue.length; leftIndex += 1) {
    const leftEntry = rankedQueue[leftIndex];

    for (let rightIndex = leftIndex + 1; rightIndex < rankedQueue.length; rightIndex += 1) {
      const rightEntry = rankedQueue[rightIndex];
      if (leftEntry.userId === rightEntry.userId) {
        continue;
      }

      if (!areRankedEntriesCompatible(leftEntry, rightEntry, nowMs)) {
        continue;
      }

      const leftSocket = sockets.get(leftEntry.socketId);
      const rightSocket = sockets.get(rightEntry.socketId);
      if (!leftSocket || !rightSocket) {
        rankedQueue.splice(rightIndex, 1);
        rankedQueue.splice(leftIndex, 1);
        leftIndex -= 1;
        break;
      }

      rankedQueue.splice(rightIndex, 1);
      rankedQueue.splice(leftIndex, 1);

      const room = createMatchedRoom(leftSocket, leftEntry.user, rightSocket, rightEntry.user, "ranked");
      emitRoomState(room, "Ranked match found. Play your best.");
      leftIndex -= 1;
      break;
    }
  }
}

function removeSpectator(socketId, message = "") {
  const session = socketSessionIndex.get(socketId);
  if (!session || session.role !== "spectator") {
    return null;
  }

  const room = rooms.get(session.roomCode);
  clearSocketRoomMembership(socketId, session.roomCode);
  socketSessionIndex.delete(socketId);

  if (!room) {
    return null;
  }

  room.spectators = room.spectators.filter((spectator) => spectator.socketId !== socketId);
  return emitRoomState(room, message);
}

function scheduleDisconnectForfeit(room, player) {
  clearPendingDisconnect(player.id);

  const timeoutId = setTimeout(() => {
    pendingDisconnects.delete(player.id);

    const liveRoom = rooms.get(room.code);
    if (!liveRoom) {
      return;
    }

    const livePlayer = getPlayerById(liveRoom, player.id);
    if (!livePlayer || livePlayer.connected || livePlayer.abandoned) {
      return;
    }

    if (liveRoom.status === "playing" && liveRoom.mode !== "ai") {
      const winnerPlayer = getOpponentPlayer(liveRoom, livePlayer.id);
      finishGame(liveRoom, {
        winnerPlayer,
        loserPlayer: livePlayer,
        draw: false,
        reason: "disconnect",
        message: `${livePlayer.username} disconnected and forfeited. ${winnerPlayer?.username ?? "Opponent"} wins.`,
      });
      playerRoomIndex.delete(livePlayer.userId);
      livePlayer.abandoned = true;
      return;
    }

    if (liveRoom.mode === "ai" || getActiveHumanPlayers(liveRoom).length <= 1) {
      deleteRoom(liveRoom.code);
      return;
    }

    emitRoomState(liveRoom, `${livePlayer.username} is still disconnected.`);
  }, DISCONNECT_FORFEIT_MS);

  pendingDisconnects.set(player.id, timeoutId);
}

function tryRestorePlayer(socket, user) {
  if (!user) {
    return null;
  }

  const roomCode = playerRoomIndex.get(user.id);
  if (!roomCode) {
    return null;
  }

  const room = rooms.get(roomCode);
  if (!room) {
    playerRoomIndex.delete(user.id);
    return null;
  }

  const player = room.players.find((candidate) => candidate.userId === user.id && !candidate.abandoned);
  if (!player) {
    playerRoomIndex.delete(user.id);
    return null;
  }

  player.socketId = socket.id;
  player.connected = true;
  player.disconnectedAt = null;
  clearPendingDisconnect(player.id);
  assignSocketToRoom(socket, room.code, "player");
  return emitRoomState(room, `${player.username} reconnected.`);
}

export function registerSocketConnection(socket, user = null) {
  sockets.set(socket.id, socket);
  return tryRestorePlayer(socket, user);
}

export function unregisterSocketConnection(socketId) {
  sockets.delete(socketId);
}

export function getRoomForSocketId(socketId) {
  return getRoomForSocket(socketId);
}

export function getQueueSize(mode = "matchmaking") {
  return mode === "ranked" ? rankedQueue.length : matchmakingQueue.length;
}

export function createRoom(socket, user) {
  const blocked = ensurePlayerCanStart(socket.id, user.id);
  if (blocked) {
    return blocked;
  }

  const code = generateUniqueRoomCode();
  const room = createRoomRecord({
    code,
    mode: "private",
    players: [createHumanPlayer(socket, user, PLAYER_COLORS.RED)],
    status: "waiting",
  });

  rooms.set(code, room);
  assignSocketToRoom(socket, code, "player");
  playerRoomIndex.set(user.id, code);

  return {
    ok: true,
    room: emitRoomState(room, "Private room created. Share the code with a friend."),
  };
}

export function joinRoom(socket, roomCode, user) {
  const blocked = ensurePlayerCanStart(socket.id, user.id);
  if (blocked) {
    return blocked;
  }

  const code = String(roomCode ?? "").trim().toUpperCase();
  const room = rooms.get(code);

  if (!room) {
    return { ok: false, error: "Room not found." };
  }

  if (room.mode !== "private") {
    return { ok: false, error: "That room cannot be joined by code." };
  }

  if (getActiveHumanPlayers(room).length >= 2) {
    return { ok: false, error: "Room is already full." };
  }

  if (room.players.some((player) => player.userId === user.id && !player.abandoned)) {
    return { ok: false, error: "You cannot join the same room twice." };
  }

  room.players.push(createHumanPlayer(socket, user, PLAYER_COLORS.YELLOW));
  assignSocketToRoom(socket, code, "player");
  playerRoomIndex.set(user.id, code);
  startRound(room);

  return {
    ok: true,
    room: emitRoomState(room, "Both players are connected. Red moves first."),
  };
}

export function joinMatchmakingQueue(socket, user, { ranked = false } = {}) {
  const blocked = ensurePlayerCanStart(socket.id, user.id);
  if (blocked) {
    return blocked;
  }

  const queue = ranked ? rankedQueue : matchmakingQueue;
  queue.push(buildQueueEntry(socket, user));
  ensureQueueProcessor();

  if (ranked) {
    processRankedQueue();
  } else {
    processMatchmakingQueue();
  }

  const room = getRoomForSocket(socket.id);
  if (room) {
    return {
      ok: true,
      matched: true,
      queueSize: queue.length,
      room: buildPublicRoom(room),
    };
  }

  return {
    ok: true,
    matched: false,
    queueSize: queue.length,
    message: ranked ? "Searching for a ranked opponent..." : "Searching for an opponent...",
  };
}

export function leaveMatchmakingQueue(socketId, userId, { ranked = false } = {}) {
  const queue = ranked ? rankedQueue : matchmakingQueue;
  const removed = removeFromQueue(queue, { socketId, userId });

  return {
    ok: true,
    removed,
    queueSize: queue.length,
    message: removed
      ? ranked
        ? "You left the ranked queue."
        : "You left the matchmaking queue."
      : "You were not in the queue.",
  };
}

export function createAiRoom(socket, user, difficulty = "medium") {
  const blocked = ensurePlayerCanStart(socket.id, user.id);
  if (blocked) {
    return blocked;
  }

  if (!AI_DIFFICULTIES.includes(difficulty)) {
    return { ok: false, error: "Unknown AI difficulty." };
  }

  const code = generateUniqueRoomCode();
  const room = createRoomRecord({
    code,
    mode: "ai",
    difficulty,
    players: [
      createHumanPlayer(socket, user, PLAYER_COLORS.RED),
      createBotPlayer(code, PLAYER_COLORS.YELLOW, difficulty),
    ],
  });

  rooms.set(code, room);
  assignSocketToRoom(socket, code, "player");
  playerRoomIndex.set(user.id, code);
  startRound(room);

  return {
    ok: true,
    room: emitRoomState(
      room,
      `Practice match started against ${BOT_NAME} on ${difficulty} difficulty.`,
    ),
  };
}

export function joinSpectator(socket, roomCode, user) {
  const blocked = ensurePlayerCanStart(socket.id, user.id);
  if (blocked) {
    return blocked;
  }

  const code = String(roomCode ?? "").trim().toUpperCase();
  const room = rooms.get(code);

  if (!room) {
    return { ok: false, error: "Live match not found." };
  }

  if (room.mode === "ai") {
    return { ok: false, error: "AI practice rooms are not available for spectators." };
  }

  if (room.spectators.some((spectator) => spectator.userId === user.id)) {
    return { ok: false, error: "You are already spectating this match." };
  }

  room.spectators.push(createSpectator(socket, user));
  assignSocketToRoom(socket, room.code, "spectator");

  return {
    ok: true,
    role: "spectator",
    room: emitRoomState(room, `${user.username} joined as a spectator.`),
  };
}

export function playMove(socketId, column) {
  const room = getRoomForSocket(socketId);

  if (!room) {
    return { ok: false, error: "You are not currently in a game room." };
  }

  if (room.status !== "playing") {
    return { ok: false, error: "The game is not active." };
  }

  const player = getPlayerBySocketId(room, socketId);
  if (!player) {
    return { ok: false, error: "Spectators cannot make moves." };
  }

  const result = dropPiece(room.gameState, column, player.color);
  if (!result.ok) {
    return result;
  }

  finalizeMove(room, result.nextState);

  if (room.gameState.winner) {
    return {
      ok: true,
      room: finishGame(room, {
        winnerPlayer: player,
        loserPlayer: getOpponentPlayer(room, player.id),
        draw: false,
        reason: "board",
        message: `${player.username} wins the game.`,
      }),
    };
  }

  if (room.gameState.isDraw) {
    return {
      ok: true,
      room: finishGame(room, {
        draw: true,
        reason: "draw",
        message: "The board is full. It's a draw.",
      }),
    };
  }

  const currentTurnPlayer = getCurrentTurnPlayer(room);
  if (room.mode === "ai" && currentTurnPlayer?.kind === "bot") {
    scheduleAiTurn(room.code);
    return {
      ok: true,
      aiScheduled: true,
      room: emitRoomState(room, `${BOT_NAME} is thinking...`),
    };
  }

  return {
    ok: true,
    room: emitRoomState(room, `${player.username} dropped a piece.`),
  };
}

export function requestRematch(socketId) {
  const room = getRoomForSocket(socketId);

  if (!room) {
    return { ok: false, error: "You are not currently in a game room." };
  }

  const player = getPlayerBySocketId(room, socketId);
  if (!player) {
    return { ok: false, error: "Spectators cannot request rematches." };
  }

  if (room.status !== "finished") {
    return { ok: false, error: "Rematch is only available after the game ends." };
  }

  if (room.mode === "ai") {
    startRound(room);
    return {
      ok: true,
      room: emitRoomState(room, `New practice match started against ${BOT_NAME}.`),
    };
  }

  const connectedPlayers = getConnectedHumanPlayers(room);
  if (connectedPlayers.length < 2) {
    return { ok: false, error: "Both players need to be connected to start a rematch." };
  }

  room.rematchVotes.add(player.id);
  if (room.rematchVotes.size >= connectedPlayers.length) {
    startRound(room);
    return {
      ok: true,
      room: emitRoomState(room, "Rematch started. Red moves first."),
    };
  }

  return {
    ok: true,
    room: emitRoomState(room, "Rematch vote recorded. Waiting for the other player."),
  };
}

export function setTurnTimer(socketId, enabled) {
  const room = getRoomForSocket(socketId);

  if (!room) {
    return { ok: false, error: "You are not currently in a game room." };
  }

  if (room.mode === "ai") {
    return { ok: false, error: "Turn timer is only available in online multiplayer matches." };
  }

  if (room.status !== "playing") {
    return { ok: false, error: "Turn timer can only be changed during an active game." };
  }

  const player = getPlayerBySocketId(room, socketId);
  if (!player) {
    return { ok: false, error: "Spectators cannot control the turn timer." };
  }

  if (enabled) {
    if (room.timerEnabled) {
      return { ok: false, error: "Turn timer is already active." };
    }

    room.timerEnabled = true;
    room.timerControllerPlayerId = player.id;
    room.forfeitedByTimer = null;
    startTurnClock(room, Date.now());

    return {
      ok: true,
      room: emitRoomState(room, `${player.username} activated the 2-minute turn timer.`),
    };
  }

  if (!room.timerEnabled) {
    return { ok: false, error: "Turn timer is already disabled." };
  }

  if (room.timerControllerPlayerId !== player.id) {
    return { ok: false, error: "Only the player who enabled the timer can disable it." };
  }

  room.timerEnabled = false;
  room.timerControllerPlayerId = null;
  stopTurnClock(room);

  return {
    ok: true,
    room: emitRoomState(room, `${player.username} disabled the turn timer.`),
  };
}

export function leaveRoom(socketId) {
  const room = getRoomForSocket(socketId);
  if (!room) {
    removeFromAllQueues({ socketId });
    return null;
  }

  const session = socketSessionIndex.get(socketId);
  if (session?.role === "spectator") {
    return {
      deleted: false,
      roomCode: room.code,
      room: removeSpectator(socketId),
    };
  }

  const player = getPlayerBySocketId(room, socketId);
  if (!player) {
    return null;
  }

  clearSocketRoomMembership(socketId, room.code);
  socketSessionIndex.delete(socketId);
  removeFromAllQueues({ socketId, userId: player.userId });
  clearPendingDisconnect(player.id);

  if (room.mode === "ai") {
    playerRoomIndex.delete(player.userId);
    deleteRoom(room.code);
    return { deleted: true, roomCode: room.code };
  }

  if (room.status === "waiting" && getActiveHumanPlayers(room).length <= 1) {
    playerRoomIndex.delete(player.userId);
    deleteRoom(room.code);
    return { deleted: true, roomCode: room.code };
  }

  if (room.status === "finished") {
    player.connected = false;
    player.abandoned = true;
    player.socketId = null;
    playerRoomIndex.delete(player.userId);

    if (getActiveHumanPlayers(room).length === 0 && room.spectators.length === 0) {
      deleteRoom(room.code);
      return { deleted: true, roomCode: room.code };
    }

    return {
      deleted: false,
      roomCode: room.code,
      room: emitRoomState(room, `${player.username} left the room.`),
    };
  }

  player.connected = false;
  player.abandoned = true;
  player.socketId = null;
  playerRoomIndex.delete(player.userId);

  return {
    deleted: false,
    roomCode: room.code,
    room: finishGame(room, {
      winnerPlayer: getOpponentPlayer(room, player.id),
      loserPlayer: player,
      draw: false,
      reason: "quit",
      message: `${player.username} left the match. ${getOpponentPlayer(room, player.id)?.username ?? "Opponent"} wins.`,
    }),
  };
}

export function removeSocket(socketId) {
  const room = getRoomForSocket(socketId);
  const session = socketSessionIndex.get(socketId);
  unregisterSocketConnection(socketId);

  if (!room) {
    removeFromAllQueues({ socketId });
    socketSessionIndex.delete(socketId);
    return null;
  }

  if (session?.role === "spectator") {
    return {
      deleted: false,
      roomCode: room.code,
      room: removeSpectator(socketId, "A spectator left the live match."),
    };
  }

  const player = getPlayerBySocketId(room, socketId);
  if (!player) {
    socketSessionIndex.delete(socketId);
    return null;
  }

  player.connected = false;
  player.socketId = null;
  player.disconnectedAt = new Date().toISOString();
  socketSessionIndex.delete(socketId);
  removeFromAllQueues({ socketId, userId: player.userId });
  scheduleDisconnectForfeit(room, player);

  return {
    deleted: false,
    roomCode: room.code,
    room: emitRoomState(
      room,
      `${player.username} disconnected. Reconnect within ${Math.floor(DISCONNECT_FORFEIT_MS / 1000)} seconds to continue.`,
    ),
  };
}

export function resetRoomManagerState() {
  for (const timeoutId of pendingAiTurns.values()) {
    clearTimeout(timeoutId);
  }

  for (const timeouts of pendingTurnTimers.values()) {
    for (const timeoutId of timeouts) {
      clearTimeout(timeoutId);
    }
  }

  for (const timeoutId of pendingDisconnects.values()) {
    clearTimeout(timeoutId);
  }

  if (queueProcessorInterval) {
    clearInterval(queueProcessorInterval);
    queueProcessorInterval = null;
  }

  pendingAiTurns.clear();
  pendingTurnTimers.clear();
  pendingDisconnects.clear();
  matchmakingQueue.length = 0;
  rankedQueue.length = 0;
  rooms.clear();
  sockets.clear();
  socketSessionIndex.clear();
  playerRoomIndex.clear();
}

export { scheduleAiTurn, getRoomForSocket };
