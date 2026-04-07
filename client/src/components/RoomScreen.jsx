import GameBoard from "./GameBoard";
import StatusPanel from "./StatusPanel";

function getRoomHeading(room) {
  if (room.mode === "ai") {
    return "AI Practice";
  }

  if (room.mode === "ranked") {
    return "Ranked Match";
  }

  if (room.mode === "matchmaking") {
    return "Random Match";
  }

  return "Private Match";
}

export default function RoomScreen({
  room,
  self,
  feedback,
  isConnected,
  isMyTurn,
  canRequestRematch,
  isSpectator,
  onColumnClick,
  onRematch,
  onSetTimer,
  onLeaveRoom,
}) {
  const roomHeading = getRoomHeading(room);

  return (
    <section className="room-screen">
      <header className="room-hero">
        <div>
          <p className="eyebrow">{roomHeading}</p>
          <h1>{roomHeading}</h1>
          <p className="hero-text">
            {room.mode === "ai"
              ? `You are practicing against PrinceLegitTV on ${room.difficulty} difficulty.`
              : isSpectator
                ? "Spectate live Konnect4 action in real time without affecting the match."
                : "Stay synced in real time and race to connect four in Konnect4."}
          </p>
        </div>

        <div className="room-hero-meta">
          <div className="connection-pill" data-live={isConnected}>
            <span className="connection-dot" />
            {isConnected ? "Realtime synced" : "Trying to reconnect"}
          </div>

          <div className="room-code-banner compact">
            <span>Room code</span>
            <strong>{room.code}</strong>
          </div>

          <button type="button" className="secondary-button" onClick={onLeaveRoom}>
            Leave room
          </button>
        </div>
      </header>

      <div className="room-layout">
        <aside className="panel sidebar-panel">
          <StatusPanel
            room={room}
            self={self}
            feedback={feedback}
            isSpectator={isSpectator}
            canRequestRematch={canRequestRematch}
            onRematch={onRematch}
            onSetTimer={onSetTimer}
          />
        </aside>

        <section className="panel board-panel">
          <GameBoard
            board={room.gameState.board}
            winningCells={room.gameState.winningCells ?? []}
            activeColor={room.gameState.currentPlayer}
            currentPlayerColor={self?.color ?? room.gameState.currentPlayer}
            isMyTurn={isMyTurn}
            isSpectator={isSpectator}
            lastMove={room.gameState.lastMove}
            onColumnClick={onColumnClick}
          />
        </section>
      </div>
    </section>
  );
}
