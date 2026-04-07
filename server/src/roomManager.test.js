import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { createUser as insertUser } from "./db/repositories/usersRepository.js";
import {
  createAiRoom,
  createRoom,
  getQueueSize,
  getRoomForSocket,
  joinMatchmakingQueue,
  joinRoom,
  joinSpectator,
  leaveMatchmakingQueue,
  playMove,
  registerSocketConnection,
  removeSocket,
  requestRematch,
  resetRoomManagerState,
  setTurnTimer,
} from "./roomManager.js";

function createFakeSocket(id) {
  return {
    id,
    joinedRooms: [],
    leftRooms: [],
    join(roomCode) {
      this.joinedRooms.push(roomCode);
    },
    leave(roomCode) {
      this.leftRooms.push(roomCode);
    },
  };
}

let testUserCounter = 0;
const TEST_RUN_ID = Date.now().toString(36);

function createUser(idPrefix, usernameBase, rankTier = "Bronze") {
  testUserCounter += 1;
  const now = new Date().toISOString();
  const username = `${usernameBase}_${TEST_RUN_ID}_${testUserCounter}`;

  return insertUser({
    id: `${idPrefix}-${TEST_RUN_ID}-${testUserCounter}`,
    username,
    email: `${username.toLowerCase()}@example.com`,
    passwordHash: "test-password-hash",
    country: "",
    region: "",
    onlineStatus: "online",
    rankTier,
    rankPoints: 100,
    winStreak: 0,
    rankedWins: 0,
    rankedLosses: 0,
    avatarType: "emoji",
    avatarValue: "\uD83C\uDFAE",
    createdAt: now,
    updatedAt: now,
  });
}

afterEach(() => {
  resetRoomManagerState();
});

test("createRoom makes a private waiting room with the creator as red", () => {
  const socket = createFakeSocket("socket-red");
  const user = createUser("user-red", "Alice");
  registerSocketConnection(socket);

  const result = createRoom(socket, user);

  assert.equal(result.ok, true);
  assert.equal(result.room.mode, "private");
  assert.equal(result.room.status, "waiting");
  assert.equal(result.room.players[0].color, "red");
  assert.equal(result.room.players[0].username, user.username);
  assert.equal(socket.joinedRooms[0], result.room.code);
});

test("joinRoom adds a yellow player and starts the private match", () => {
  const redSocket = createFakeSocket("socket-red-join");
  const yellowSocket = createFakeSocket("socket-yellow-join");
  registerSocketConnection(redSocket);
  registerSocketConnection(yellowSocket);

  const created = createRoom(redSocket, createUser("user-a", "Alice"));
  const joined = joinRoom(yellowSocket, created.room.code, createUser("user-b", "Bob"));

  assert.equal(joined.ok, true);
  assert.equal(joined.room.status, "playing");
  assert.equal(joined.room.players.length, 2);
  assert.equal(joined.room.players[1].color, "yellow");
});

test("matchmaking pairs two queued users into one random game room", () => {
  const firstSocket = createFakeSocket("socket-queue-a");
  const secondSocket = createFakeSocket("socket-queue-b");
  registerSocketConnection(firstSocket);
  registerSocketConnection(secondSocket);

  const firstResult = joinMatchmakingQueue(firstSocket, createUser("user-q1", "QueueOne"));
  const secondResult = joinMatchmakingQueue(secondSocket, createUser("user-q2", "QueueTwo"));

  assert.equal(firstResult.ok, true);
  assert.equal(firstResult.matched, false);
  assert.equal(secondResult.ok, true);
  assert.equal(secondResult.matched, true);
  assert.equal(secondResult.room.mode, "matchmaking");
  assert.equal(secondResult.room.players[0].color, "red");
  assert.equal(secondResult.room.players[1].color, "yellow");
  assert.equal(getQueueSize(), 0);
});

test("leaveMatchmakingQueue removes a waiting user", () => {
  const socket = createFakeSocket("socket-queue-cancel");
  registerSocketConnection(socket);

  const user = createUser("user-q3", "QueueThree");
  joinMatchmakingQueue(socket, user);
  const result = leaveMatchmakingQueue(socket.id, user.id);

  assert.equal(result.ok, true);
  assert.equal(result.removed, true);
  assert.equal(getQueueSize(), 0);
});

test("playMove enforces turn order and stacks pieces", () => {
  const redSocket = createFakeSocket("socket-play-red");
  const yellowSocket = createFakeSocket("socket-play-yellow");
  registerSocketConnection(redSocket);
  registerSocketConnection(yellowSocket);

  const created = createRoom(redSocket, createUser("user-red-play", "Alice"));
  joinRoom(yellowSocket, created.room.code, createUser("user-yellow-play", "Bob"));

  const firstMove = playMove(redSocket.id, 0);
  const secondMove = playMove(yellowSocket.id, 0);

  assert.equal(firstMove.ok, true);
  assert.equal(secondMove.ok, true);
  assert.equal(firstMove.room.gameState.board[5][0], "red");
  assert.equal(secondMove.room.gameState.board[4][0], "yellow");
});

test("playMove rejects moves when it is not the player's turn", () => {
  const redSocket = createFakeSocket("socket-turn-red");
  const yellowSocket = createFakeSocket("socket-turn-yellow");
  registerSocketConnection(redSocket);
  registerSocketConnection(yellowSocket);

  const created = createRoom(redSocket, createUser("user-turn-a", "Alice"));
  joinRoom(yellowSocket, created.room.code, createUser("user-turn-b", "Bob"));

  const result = playMove(yellowSocket.id, 3);

  assert.deepEqual(result, {
    ok: false,
    error: "It is not your turn.",
  });
});

test("playMove detects a win and marks the room finished", () => {
  const redSocket = createFakeSocket("socket-win-red");
  const yellowSocket = createFakeSocket("socket-win-yellow");
  registerSocketConnection(redSocket);
  registerSocketConnection(yellowSocket);

  const created = createRoom(redSocket, createUser("user-win-a", "Alice"));
  joinRoom(yellowSocket, created.room.code, createUser("user-win-b", "Bob"));

  playMove(redSocket.id, 0);
  playMove(yellowSocket.id, 0);
  playMove(redSocket.id, 1);
  playMove(yellowSocket.id, 1);
  playMove(redSocket.id, 2);
  playMove(yellowSocket.id, 2);
  const winningMove = playMove(redSocket.id, 3);

  assert.equal(winningMove.ok, true);
  assert.equal(winningMove.room.status, "finished");
  assert.equal(winningMove.room.gameState.winner, "red");
  assert.equal(winningMove.room.gameState.winningCells.length >= 4, true);
});

test("spectators can join a live room but cannot make moves", () => {
  const redSocket = createFakeSocket("socket-spec-red");
  const yellowSocket = createFakeSocket("socket-spec-yellow");
  const spectatorSocket = createFakeSocket("socket-spec-viewer");
  registerSocketConnection(redSocket);
  registerSocketConnection(yellowSocket);
  registerSocketConnection(spectatorSocket);

  const created = createRoom(redSocket, createUser("user-spec-a", "Alice"));
  joinRoom(yellowSocket, created.room.code, createUser("user-spec-b", "Bob"));
  const spectateResult = joinSpectator(
    spectatorSocket,
    created.room.code,
    createUser("user-spec-c", "Casey"),
  );

  assert.equal(spectateResult.ok, true);
  assert.equal(spectateResult.role, "spectator");
  assert.equal(spectateResult.room.spectatorCount, 1);
  assert.deepEqual(playMove(spectatorSocket.id, 0), {
    ok: false,
    error: "Spectators cannot make moves.",
  });
});

test("turn timer can be enabled by any player and only disabled by the controller", () => {
  const redSocket = createFakeSocket("socket-timer-red");
  const yellowSocket = createFakeSocket("socket-timer-yellow");
  registerSocketConnection(redSocket);
  registerSocketConnection(yellowSocket);

  const redUser = createUser("user-timer-a", "Alice");
  const yellowUser = createUser("user-timer-b", "Bob");
  const created = createRoom(redSocket, redUser);
  joinRoom(yellowSocket, created.room.code, yellowUser);

  const enabled = setTurnTimer(yellowSocket.id, true);
  const blockedDisable = setTurnTimer(redSocket.id, false);
  const disabled = setTurnTimer(yellowSocket.id, false);

  assert.equal(enabled.ok, true);
  assert.equal(enabled.room.timerEnabled, true);
  assert.equal(enabled.room.timerControllerPlayerId, yellowUser.id);
  assert.deepEqual(blockedDisable, {
    ok: false,
    error: "Only the player who enabled the timer can disable it.",
  });
  assert.equal(disabled.ok, true);
  assert.equal(disabled.room.timerEnabled, false);
});

test("turn timer forfeits the active player when time expires", async () => {
  const redSocket = createFakeSocket("socket-timer-expire-red");
  const yellowSocket = createFakeSocket("socket-timer-expire-yellow");
  registerSocketConnection(redSocket);
  registerSocketConnection(yellowSocket);

  const redUser = createUser("user-timer-expire-a", "Alice");
  const yellowUser = createUser("user-timer-expire-b", "Bob");
  const created = createRoom(redSocket, redUser);
  joinRoom(yellowSocket, created.room.code, yellowUser);

  const liveRoom = getRoomForSocket(redSocket.id);
  liveRoom.turnTimeLimitMs = 25;

  const enabled = setTurnTimer(redSocket.id, true);
  assert.equal(enabled.ok, true);

  await new Promise((resolve) => setTimeout(resolve, 60));

  const updatedRoom = getRoomForSocket(redSocket.id);
  assert.equal(updatedRoom.status, "finished");
  assert.equal(updatedRoom.forfeitedByTimer, redUser.id);
  assert.equal(updatedRoom.gameState.winner, "yellow");
});

test("requestRematch waits for both human players", () => {
  const redSocket = createFakeSocket("socket-rematch-red");
  const yellowSocket = createFakeSocket("socket-rematch-yellow");
  registerSocketConnection(redSocket);
  registerSocketConnection(yellowSocket);

  const created = createRoom(redSocket, createUser("user-rematch-a", "Alice"));
  joinRoom(yellowSocket, created.room.code, createUser("user-rematch-b", "Bob"));

  playMove(redSocket.id, 0);
  playMove(yellowSocket.id, 0);
  playMove(redSocket.id, 1);
  playMove(yellowSocket.id, 1);
  playMove(redSocket.id, 2);
  playMove(yellowSocket.id, 2);
  playMove(redSocket.id, 3);

  const firstVote = requestRematch(redSocket.id);
  const secondVote = requestRematch(yellowSocket.id);

  assert.equal(firstVote.ok, true);
  assert.equal(firstVote.room.status, "finished");
  assert.equal(secondVote.ok, true);
  assert.equal(secondVote.room.status, "playing");
  assert.equal(secondVote.room.gameState.board.flat().every((cell) => cell === null), true);
});

test("createAiRoom creates a practice match against PrinceLegitTV", () => {
  const socket = createFakeSocket("socket-ai");
  registerSocketConnection(socket);

  const result = createAiRoom(socket, createUser("user-ai", "Solo"), "hard");

  assert.equal(result.ok, true);
  assert.equal(result.room.mode, "ai");
  assert.equal(result.room.difficulty, "hard");
  assert.equal(result.room.players[1].kind, "bot");
  assert.equal(result.room.players[1].username, "PrinceLegitTV");
});

test("removeSocket marks a player disconnected and keeps the room alive for reconnect", () => {
  const redSocket = createFakeSocket("socket-disconnect-red");
  const yellowSocket = createFakeSocket("socket-disconnect-yellow");
  registerSocketConnection(redSocket);
  registerSocketConnection(yellowSocket);

  const redUser = createUser("user-disc-a", "Alice");
  const yellowUser = createUser("user-disc-b", "Bob");
  const created = createRoom(redSocket, redUser);
  joinRoom(yellowSocket, created.room.code, yellowUser);
  playMove(redSocket.id, 4);

  const result = removeSocket(yellowSocket.id);
  const remainingRoom = getRoomForSocket(redSocket.id);
  const disconnectedPlayer = result.room.players.find((player) => player.id === yellowUser.id);

  assert.equal(result.deleted, false);
  assert.equal(result.room.status, "playing");
  assert.equal(disconnectedPlayer.connected, false);
  assert.match(result.room.message, /Reconnect within 60 seconds/);
  assert.equal(remainingRoom.status, "playing");
});
