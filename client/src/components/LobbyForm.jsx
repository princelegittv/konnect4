import { useState } from "react";

export default function LobbyForm({
  username,
  onCreateRoom,
  onJoinRoom,
  isSubmitting,
  roomCode,
}) {
  const [joinCode, setJoinCode] = useState("");

  function handleCreate(event) {
    event.preventDefault();
    onCreateRoom();
  }

  function handleJoin(event) {
    event.preventDefault();
    onJoinRoom({
      roomCode: joinCode.trim().toUpperCase(),
    });
  }

  return (
    <section className="mode-panel lobby-shell">
      <div className="lobby-hero">
        <div>
          <span className="summary-label">Private Match</span>
          <h2>Quick room setup for you and a friend</h2>
          <p className="muted">
            Create a room in one tap or enter a code to jump straight into a match. Signed in as{" "}
            {username}.
          </p>
        </div>

        <div className="lobby-side-note">
          <span className="summary-label">Match flow</span>
          <p className="muted">Red creates the room first. Yellow joins instantly with the room code.</p>
        </div>
      </div>

      <div className="lobby-grid">
        <form className="action-card lobby-action-card" onSubmit={handleCreate}>
          <div className="lobby-action-copy">
            <span className="summary-label">Host a room</span>
            <h3>Create room</h3>
            <p className="muted">You will be assigned red and take the opening move.</p>
          </div>

          <button type="submit" className="primary-button" disabled={isSubmitting}>
            {isSubmitting ? "Working..." : "Create private room"}
          </button>
        </form>

        <form className="action-card lobby-action-card" onSubmit={handleJoin}>
          <div className="lobby-action-copy">
            <span className="summary-label">Join a friend</span>
            <h3>Enter room code</h3>
          </div>

          <label className="field">
            <span>Room code</span>
            <input
              type="text"
              maxLength="5"
              placeholder="ABCDE"
              value={joinCode}
              onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
            />
          </label>

          <button
            type="submit"
            className="secondary-button"
            disabled={isSubmitting || !joinCode.trim()}
          >
            {isSubmitting ? "Working..." : "Join private room"}
          </button>
        </form>
      </div>

      {roomCode ? (
        <div className="room-code-banner lobby-room-banner">
          <div>
            <span className="summary-label">Latest room code</span>
            <strong>{roomCode}</strong>
          </div>
          <p className="muted">Share this with your friend so they can join your room.</p>
        </div>
      ) : null}
    </section>
  );
}
