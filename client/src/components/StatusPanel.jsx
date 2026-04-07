import { useEffect, useMemo, useState } from "react";
import { PLAYER_COLORS } from "@shared/connect4";
import { getRankThemeClass } from "../utils/rankTheme";
import AvatarBadge from "./profile/AvatarBadge";

function formatColor(color) {
  if (!color) {
    return "Waiting";
  }

  return color === PLAYER_COLORS.RED ? "Red" : "Yellow";
}

function formatDuration(milliseconds) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function getStatusText(room, self, isSpectator) {
  if (room.status === "waiting") {
    return room.mode === "private"
      ? "Waiting for someone to join your private room."
      : "Waiting for the game to resume.";
  }

  if (room.gameState.winner) {
    const winner =
      room.players.find((player) => player.color === room.gameState.winner)?.username ?? "Player";
    return room.forfeitedByTimer
      ? `${winner} wins by timer forfeit.`
      : `${winner} wins the game.`;
  }

  if (room.gameState.isDraw) {
    return "The board is full. It's a draw.";
  }

  const currentPlayer =
    room.players.find((player) => player.color === room.gameState.currentPlayer)?.username ??
    "Player";
  if (isSpectator) {
    return `${currentPlayer}'s turn.`;
  }

  return self?.color === room.gameState.currentPlayer ? "Your turn." : `${currentPlayer}'s turn.`;
}

export default function StatusPanel({
  room,
  self,
  feedback,
  isSpectator,
  canRequestRematch,
  onRematch,
  onSetTimer,
}) {
  const [nowMs, setNowMs] = useState(Date.now());
  const connectedPlayersCount = useMemo(
    () => room.players.filter((player) => player.kind !== "bot" && player.connected).length,
    [room.players],
  );

  useEffect(() => {
    if (!room.timerEnabled || !room.activeTurnDeadline || room.status !== "playing") {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 250);

    return () => window.clearInterval(intervalId);
  }, [room.activeTurnDeadline, room.status, room.timerEnabled]);

  const timerRemainingMs =
    room.timerEnabled && room.activeTurnDeadline ? Math.max(0, room.activeTurnDeadline - nowMs) : 0;

  const timerStateClass =
    timerRemainingMs <= 10_000
      ? "timer-critical"
      : timerRemainingMs <= 30_000
        ? "timer-warning"
        : "timer-normal";

  const timerController = useMemo(
    () => room.players.find((player) => player.id === room.timerControllerPlayerId) ?? null,
    [room.players, room.timerControllerPlayerId],
  );

  const canEnableTimer =
    Boolean(self) && !isSpectator && room.mode !== "ai" && room.status === "playing" && !room.timerEnabled;
  const canDisableTimer =
    Boolean(self) &&
    !isSpectator &&
    room.mode !== "ai" &&
    room.status === "playing" &&
    room.timerEnabled &&
    room.timerControllerPlayerId === self.id;

  return (
    <div className="status-stack">
      <div className="status-header">
        <div>
          <h2>Game status</h2>
          <p className="muted">
            {room.mode === "ai"
              ? `Difficulty: ${room.difficulty}`
              : `${connectedPlayersCount}/2 players connected | ${room.spectatorCount} spectators`}
          </p>
        </div>
        {self ? <div className={`badge badge-${self.color}`}>{formatColor(self.color)}</div> : null}
      </div>

      <div className="player-list">
        {room.players.map((player) => (
          <div
            key={player.id}
            className="player-chip"
            data-active={room.gameState.currentPlayer === player.color}
            data-self={player.id === self?.id}
          >
            <div className="player-chip-main">
              <AvatarBadge
                avatarType={player.avatarType}
                avatarValue={player.avatarValue}
                username={player.username}
                size="small"
              />
              <span className={`piece-preview ${player.color}`} />
              <div className="player-chip-copy">
                <span>{player.username}</span>
                <small>
                  {player.kind === "bot"
                    ? "bot"
                    : player.connected
                      ? formatColor(player.color)
                      : "reconnecting"}
                </small>
              </div>
            </div>

            {player.rankTier ? (
              <div className={`rank-pill compact ${getRankThemeClass(player.rankTier)}`}>
                <span>{player.rankTier}</span>
                <strong>{player.rankPoints} RP</strong>
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <div className="room-summary-grid">
        <div className="summary-card">
          <span className="summary-label">{isSpectator ? "View mode" : "Your color"}</span>
          <strong>{isSpectator ? "Spectator" : formatColor(self?.color)}</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">Current turn</span>
          <strong>{formatColor(room.gameState.currentPlayer)}</strong>
        </div>
      </div>

      <div className={`timer-card ${timerStateClass}`}>
        <div className="timer-head">
          <div>
            <span className="summary-label">Turn timer</span>
            <strong>{room.timerEnabled ? "ON" : "OFF"}</strong>
          </div>
          <div className="timer-display">
            {room.timerEnabled && room.status === "playing" ? formatDuration(timerRemainingMs) : "--:--"}
          </div>
        </div>

        <p className="muted">
          {room.timerEnabled
            ? `Controlled by ${timerController?.username ?? "Unknown player"}`
            : "Any player can activate the 2-minute turn timer."}
        </p>

        {!isSpectator && room.mode !== "ai" ? (
          <div className="row-actions">
            <button
              type="button"
              className="primary-button"
              disabled={!canEnableTimer}
              onClick={() => onSetTimer(true)}
            >
              Activate timer
            </button>
            <button
              type="button"
              className="ghost-button"
              disabled={!canDisableTimer}
              onClick={() => onSetTimer(false)}
            >
              Disable timer
            </button>
          </div>
        ) : null}
      </div>

      <div className="status-banner">
        <strong>{getStatusText(room, self, isSpectator)}</strong>
        <p>{feedback.message}</p>
      </div>

      <button
        className="primary-button"
        type="button"
        onClick={onRematch}
        disabled={!canRequestRematch}
      >
        {canRequestRematch
          ? room.mode === "ai"
            ? "Play PrinceLegitTV again"
            : `Request rematch (${room.rematchVotes}/${room.rematchTarget})`
          : "Rematch unlocks after the match ends"}
      </button>
    </div>
  );
}
