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
    <div className="mode-panel">
      <div>
        <h2>Private Match</h2>
        <p className="muted">
          Create a Konnect4 room code for a friend or join one directly. Signed in as {username}.
        </p>
      </div>

      <form className="action-card" onSubmit={handleCreate}>
        <h3>Create room</h3>
        <p className="muted">You will be assigned the red pieces and move first.</p>
        <button type="submit" className="primary-button" disabled={isSubmitting}>
          {isSubmitting ? "Working..." : "Create private room"}
        </button>
      </form>

      <form className="action-card" onSubmit={handleJoin}>
        <h3>Join room</h3>
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
          className="primary-button"
          disabled={isSubmitting || !joinCode.trim()}
        >
          {isSubmitting ? "Working..." : "Join private room"}
        </button>
      </form>

      {roomCode ? (
        <div className="room-code-banner">
          <span>Latest room code</span>
          <strong>{roomCode}</strong>
        </div>
      ) : null}
    </div>
  );
}
