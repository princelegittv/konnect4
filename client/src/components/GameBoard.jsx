import { useMemo, useState } from "react";
import { COLUMNS, ROWS } from "@shared/connect4";

function isWinningCell(winningCells, row, column) {
  return winningCells.some((cell) => cell.row === row && cell.column === column);
}

export default function GameBoard({
  board,
  winningCells,
  activeColor,
  currentPlayerColor,
  isMyTurn,
  isSpectator,
  lastMove,
  onColumnClick,
}) {
  const [hoveredColumn, setHoveredColumn] = useState(3);

  const filledColumns = useMemo(
    () => board[0].map((cell, column) => ({ column, isFull: Boolean(cell) })),
    [board],
  );

  return (
    <div className="board-wrap" style={{ "--preview-column": hoveredColumn }}>
      <div className={`preview-track ${isMyTurn ? "active" : ""}`}>
        <div className={`preview-piece ${currentPlayerColor ?? activeColor ?? "red"}`} />
      </div>

      <div className="column-controls">
        {filledColumns.map(({ column, isFull }) => (
          <button
            key={column}
            type="button"
            className="column-button"
            disabled={!isMyTurn || isFull}
            onClick={() => onColumnClick(column)}
            onMouseEnter={() => setHoveredColumn(column)}
            onFocus={() => setHoveredColumn(column)}
            aria-label={`Drop piece into column ${column + 1}`}
          >
            {column + 1}
          </button>
        ))}
      </div>

      <div className="board-grid" role="grid" aria-label="Konnect4 board">
        {Array.from({ length: ROWS }, (_, row) =>
          Array.from({ length: COLUMNS }, (_, column) => {
            const cell = board[row][column];
            const winning = isWinningCell(winningCells, row, column);
            const dropping = lastMove?.row === row && lastMove?.column === column;

            return (
              <div key={`${row}-${column}`} className="cell" role="gridcell">
                <div
                  className={`piece ${cell ?? "empty"} ${winning ? "winning" : ""} ${
                    dropping ? "dropping" : ""
                  }`}
                  style={
                    dropping
                      ? {
                          "--drop-distance": `${(row + 1) * -108}%`,
                        }
                      : undefined
                  }
                />
              </div>
            );
          }),
        )}
      </div>

      <p className="board-caption">
        {isSpectator
          ? `Spectating live. ${activeColor} is on the move.`
          : isMyTurn
            ? `Your move. Hover and drop a ${currentPlayerColor} piece.`
            : `Waiting for the ${activeColor} player.`}
      </p>
    </div>
  );
}
