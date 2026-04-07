export default function QueuePanel({ queueState, onJoinQueue, onCancelQueue, isBusy }) {
  return (
    <div className="mode-panel">
      <div>
        <h2>Random Matchmaking</h2>
        <p className="muted">
          Join the live queue and we will automatically pair you into a game room.
        </p>
      </div>

      <div className="status-banner">
        <strong>{queueState.active ? "Queue active" : "Queue idle"}</strong>
        <p>{queueState.message}</p>
      </div>

      <div className="summary-card">
        <span className="summary-label">Players waiting</span>
        <strong>{queueState.queueSize}</strong>
      </div>

      {queueState.active ? (
        <button type="button" className="secondary-button" onClick={onCancelQueue} disabled={isBusy}>
          {isBusy ? "Working..." : "Cancel queue"}
        </button>
      ) : (
        <button type="button" className="primary-button" onClick={onJoinQueue} disabled={isBusy}>
          {isBusy ? "Working..." : "Find random match"}
        </button>
      )}
    </div>
  );
}
