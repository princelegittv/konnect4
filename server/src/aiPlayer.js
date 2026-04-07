import {
  PLAYER_COLORS,
  applyMove,
  checkDraw,
  checkWin,
  getNextPlayer,
  getValidColumns,
} from "../../shared/connect4.js";

export const BOT_NAME = "PrinceLegitTV";
export const AI_DIFFICULTIES = ["easy", "medium", "hard", "extreme", "impossible"];

const WIN_SCORE = 1_000_000;

function orderColumns(columns) {
  const preferredOrder = [3, 2, 4, 1, 5, 0, 6];
  return [...columns].sort(
    (left, right) => preferredOrder.indexOf(left) - preferredOrder.indexOf(right),
  );
}

function getRandomColumn(columns) {
  return columns[Math.floor(Math.random() * columns.length)];
}

function getWinningMove(board, color) {
  for (const column of orderColumns(getValidColumns(board))) {
    const move = applyMove(board, column, color);
    if (move.ok && checkWin(move.board, move.row, move.column)) {
      return column;
    }
  }

  return null;
}

function evaluateWindow(window, aiColor) {
  const opponentColor = getNextPlayer(aiColor);
  const aiCount = window.filter((cell) => cell === aiColor).length;
  const opponentCount = window.filter((cell) => cell === opponentColor).length;
  const emptyCount = window.filter((cell) => cell === null).length;

  if (aiCount === 4) {
    return 10_000;
  }

  if (aiCount === 3 && emptyCount === 1) {
    return 120;
  }

  if (aiCount === 2 && emptyCount === 2) {
    return 24;
  }

  if (opponentCount === 3 && emptyCount === 1) {
    return -160;
  }

  if (opponentCount === 2 && emptyCount === 2) {
    return -18;
  }

  return 0;
}

function evaluateBoard(board, aiColor) {
  let score = 0;
  const centerColumn = board.map((row) => row[3]);
  score += centerColumn.filter((cell) => cell === aiColor).length * 9;

  for (let row = 0; row < board.length; row += 1) {
    for (let column = 0; column < board[0].length - 3; column += 1) {
      score += evaluateWindow(
        [board[row][column], board[row][column + 1], board[row][column + 2], board[row][column + 3]],
        aiColor,
      );
    }
  }

  for (let column = 0; column < board[0].length; column += 1) {
    for (let row = 0; row < board.length - 3; row += 1) {
      score += evaluateWindow(
        [board[row][column], board[row + 1][column], board[row + 2][column], board[row + 3][column]],
        aiColor,
      );
    }
  }

  for (let row = 0; row < board.length - 3; row += 1) {
    for (let column = 0; column < board[0].length - 3; column += 1) {
      score += evaluateWindow(
        [
          board[row][column],
          board[row + 1][column + 1],
          board[row + 2][column + 2],
          board[row + 3][column + 3],
        ],
        aiColor,
      );
    }
  }

  for (let row = 3; row < board.length; row += 1) {
    for (let column = 0; column < board[0].length - 3; column += 1) {
      score += evaluateWindow(
        [
          board[row][column],
          board[row - 1][column + 1],
          board[row - 2][column + 2],
          board[row - 3][column + 3],
        ],
        aiColor,
      );
    }
  }

  return score;
}

function minimax(board, depth, alpha, beta, currentColor, aiColor, cache) {
  const cacheKey = `${JSON.stringify(board)}:${depth}:${currentColor}:${aiColor}`;
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  const validColumns = orderColumns(getValidColumns(board));
  if (depth === 0 || validColumns.length === 0) {
    const result = {
      column: validColumns[0] ?? null,
      score: evaluateBoard(board, aiColor),
    };
    cache.set(cacheKey, result);
    return result;
  }

  const maximizing = currentColor === aiColor;
  let bestColumn = validColumns[0] ?? null;
  let bestScore = maximizing ? -Infinity : Infinity;

  for (const column of validColumns) {
    const move = applyMove(board, column, currentColor);
    if (!move.ok) {
      continue;
    }

    const win = checkWin(move.board, move.row, move.column);
    if (win) {
      const result = {
        column,
        score: currentColor === aiColor ? WIN_SCORE + depth : -WIN_SCORE - depth,
      };
      cache.set(cacheKey, result);
      return result;
    }

    if (checkDraw(move.board)) {
      const result = { column, score: 0 };
      if (maximizing ? result.score > bestScore : result.score < bestScore) {
        bestScore = result.score;
        bestColumn = column;
      }
      continue;
    }

    const nextResult = minimax(
      move.board,
      depth - 1,
      alpha,
      beta,
      getNextPlayer(currentColor),
      aiColor,
      cache,
    );

    if (maximizing) {
      if (nextResult.score > bestScore) {
        bestScore = nextResult.score;
        bestColumn = column;
      }
      alpha = Math.max(alpha, bestScore);
    } else {
      if (nextResult.score < bestScore) {
        bestScore = nextResult.score;
        bestColumn = column;
      }
      beta = Math.min(beta, bestScore);
    }

    if (beta <= alpha) {
      break;
    }
  }

  const result = { column: bestColumn, score: bestScore };
  cache.set(cacheKey, result);
  return result;
}

function chooseMediumMove(board, aiColor) {
  const winningMove = getWinningMove(board, aiColor);
  if (winningMove !== null) {
    return winningMove;
  }

  const blockingMove = getWinningMove(board, getNextPlayer(aiColor));
  if (blockingMove !== null) {
    return blockingMove;
  }

  const validColumns = orderColumns(getValidColumns(board));
  return validColumns[0] ?? 3;
}

function chooseScoredMove(board, aiColor, depth) {
  const immediateWin = getWinningMove(board, aiColor);
  if (immediateWin !== null) {
    return immediateWin;
  }

  const immediateBlock = getWinningMove(board, getNextPlayer(aiColor));
  if (immediateBlock !== null) {
    return immediateBlock;
  }

  const result = minimax(board, depth, -Infinity, Infinity, aiColor, aiColor, new Map());
  return result.column;
}

export function chooseBotMove(board, aiColor = PLAYER_COLORS.YELLOW, difficulty = "medium") {
  const validColumns = getValidColumns(board);
  if (validColumns.length === 0) {
    return null;
  }

  if (difficulty === "easy") {
    if (Math.random() < 0.75) {
      return getRandomColumn(validColumns);
    }
    return chooseMediumMove(board, aiColor);
  }

  if (difficulty === "medium") {
    return chooseMediumMove(board, aiColor);
  }

  if (difficulty === "hard") {
    return chooseScoredMove(board, aiColor, 4);
  }

  if (difficulty === "extreme") {
    return chooseScoredMove(board, aiColor, 6);
  }

  return chooseScoredMove(board, aiColor, 8);
}
