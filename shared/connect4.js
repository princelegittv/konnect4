export const ROWS = 6;
export const COLUMNS = 7;
export const PLAYER_COLORS = {
  RED: "red",
  YELLOW: "yellow",
};

const DIRECTIONS = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1],
];

export function createEmptyBoard() {
  return Array.from({ length: ROWS }, () => Array(COLUMNS).fill(null));
}

export function createGameState(board = createEmptyBoard()) {
  return {
    board,
    currentPlayer: PLAYER_COLORS.RED,
    winner: null,
    isDraw: false,
    winningCells: [],
    lastMove: null,
  };
}

export function getLowestOpenRow(board, column) {
  if (!Number.isInteger(column) || column < 0 || column >= COLUMNS) {
    return -1;
  }

  for (let row = ROWS - 1; row >= 0; row -= 1) {
    if (!board[row][column]) {
      return row;
    }
  }

  return -1;
}

export function isBoardFull(board) {
  return board[0].every(Boolean);
}

export function getNextPlayer(color) {
  return color === PLAYER_COLORS.RED ? PLAYER_COLORS.YELLOW : PLAYER_COLORS.RED;
}

export function isValidMove(board, column) {
  return Number.isInteger(column) && column >= 0 && column < COLUMNS && getLowestOpenRow(board, column) !== -1;
}

export function getValidColumns(board) {
  return Array.from({ length: COLUMNS }, (_, column) => column).filter((column) =>
    isValidMove(board, column),
  );
}

export function dropPiece(gameState, column, color) {
  if (!Number.isInteger(column) || column < 0 || column >= COLUMNS) {
    return { ok: false, error: "Invalid column." };
  }

  if (gameState.winner || gameState.isDraw) {
    return { ok: false, error: "Game already finished." };
  }

  if (gameState.currentPlayer !== color) {
    return { ok: false, error: "It is not your turn." };
  }

  const row = getLowestOpenRow(gameState.board, column);

  if (row === -1) {
    return { ok: false, error: "Column is full." };
  }

  const board = gameState.board.map((boardRow) => [...boardRow]);
  board[row][column] = color;

  const win = findWinningCells(board, row, column, color);
  const draw = !win && isBoardFull(board);

  return {
    ok: true,
    nextState: {
      board,
      currentPlayer: win || draw ? gameState.currentPlayer : getNextPlayer(color),
      winner: win ? color : null,
      isDraw: draw,
      winningCells: win ?? [],
      lastMove: { row, column, color },
    },
  };
}

export function applyMove(board, column, color) {
  if (!isValidMove(board, column)) {
    return { ok: false, error: "Invalid move." };
  }

  const row = getLowestOpenRow(board, column);
  const nextBoard = board.map((boardRow) => [...boardRow]);
  nextBoard[row][column] = color;

  return {
    ok: true,
    row,
    column,
    board: nextBoard,
  };
}

export function findWinningCells(board, row, column, color) {
  for (const [rowStep, columnStep] of DIRECTIONS) {
    const line = [{ row, column }];

    line.push(...collectDirection(board, row, column, rowStep, columnStep, color));
    line.unshift(...collectDirection(board, row, column, -rowStep, -columnStep, color));

    if (line.length >= 4) {
      return line;
    }
  }

  return null;
}

export function checkWin(board, row, column) {
  const color = board[row]?.[column];

  if (!color) {
    return null;
  }

  return findWinningCells(board, row, column, color);
}

export function checkDraw(board) {
  return isBoardFull(board);
}

function collectDirection(board, row, column, rowStep, columnStep, color) {
  const cells = [];
  let nextRow = row + rowStep;
  let nextColumn = column + columnStep;

  while (
    nextRow >= 0 &&
    nextRow < ROWS &&
    nextColumn >= 0 &&
    nextColumn < COLUMNS &&
    board[nextRow][nextColumn] === color
  ) {
    cells.push({ row: nextRow, column: nextColumn });
    nextRow += rowStep;
    nextColumn += columnStep;
  }

  return cells;
}

export function createRoomCode(length = 5) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";

  for (let index = 0; index < length; index += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }

  return code;
}
