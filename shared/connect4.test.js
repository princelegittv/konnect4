import test from "node:test";
import assert from "node:assert/strict";
import {
  COLUMNS,
  PLAYER_COLORS,
  ROWS,
  applyMove,
  checkDraw,
  checkWin,
  createEmptyBoard,
  createGameState,
  dropPiece,
  isValidMove,
} from "./connect4.js";

test("createEmptyBoard returns a 6x7 board filled with null", () => {
  const board = createEmptyBoard();

  assert.equal(board.length, ROWS);
  assert.equal(board[0].length, COLUMNS);
  assert.ok(board.every((row) => row.every((cell) => cell === null)));
});

test("applyMove drops a piece into the lowest open row", () => {
  const board = createEmptyBoard();
  const firstMove = applyMove(board, 3, PLAYER_COLORS.RED);
  const secondMove = applyMove(firstMove.board, 3, PLAYER_COLORS.YELLOW);

  assert.equal(firstMove.ok, true);
  assert.equal(firstMove.row, 5);
  assert.equal(secondMove.row, 4);
  assert.equal(secondMove.board[5][3], PLAYER_COLORS.RED);
  assert.equal(secondMove.board[4][3], PLAYER_COLORS.YELLOW);
});

test("isValidMove rejects out-of-range and full-column moves", () => {
  let board = createEmptyBoard();

  assert.equal(isValidMove(board, -1), false);
  assert.equal(isValidMove(board, 7), false);

  for (let move = 0; move < ROWS; move += 1) {
    board = applyMove(board, 0, PLAYER_COLORS.RED).board;
  }

  assert.equal(isValidMove(board, 0), false);
});

test("dropPiece rejects invalid turns and invalid columns", () => {
  const gameState = createGameState();

  assert.deepEqual(dropPiece(gameState, -1, PLAYER_COLORS.RED), {
    ok: false,
    error: "Invalid column.",
  });

  assert.deepEqual(dropPiece(gameState, 0, PLAYER_COLORS.YELLOW), {
    ok: false,
    error: "It is not your turn.",
  });
});

test("checkWin detects horizontal wins", () => {
  const board = createEmptyBoard();
  board[5][0] = PLAYER_COLORS.RED;
  board[5][1] = PLAYER_COLORS.RED;
  board[5][2] = PLAYER_COLORS.RED;
  board[5][3] = PLAYER_COLORS.RED;

  const winningCells = checkWin(board, 5, 3);

  assert.equal(winningCells.length, 4);
});

test("checkWin detects vertical wins", () => {
  const board = createEmptyBoard();
  board[5][2] = PLAYER_COLORS.YELLOW;
  board[4][2] = PLAYER_COLORS.YELLOW;
  board[3][2] = PLAYER_COLORS.YELLOW;
  board[2][2] = PLAYER_COLORS.YELLOW;

  const winningCells = checkWin(board, 2, 2);

  assert.equal(winningCells.length, 4);
});

test("checkWin detects diagonal wins", () => {
  const board = createEmptyBoard();
  board[5][0] = PLAYER_COLORS.RED;
  board[4][1] = PLAYER_COLORS.RED;
  board[3][2] = PLAYER_COLORS.RED;
  board[2][3] = PLAYER_COLORS.RED;

  const winningCells = checkWin(board, 2, 3);

  assert.equal(winningCells.length, 4);
});

test("checkDraw detects a full board", () => {
  const board = [
    ["red", "yellow", "red", "yellow", "red", "yellow", "red"],
    ["yellow", "red", "yellow", "red", "yellow", "red", "yellow"],
    ["red", "yellow", "red", "yellow", "red", "yellow", "red"],
    ["yellow", "red", "yellow", "red", "yellow", "red", "yellow"],
    ["red", "yellow", "red", "yellow", "red", "yellow", "red"],
    ["yellow", "red", "yellow", "red", "yellow", "red", "yellow"],
  ];

  assert.equal(checkDraw(board), true);
});
