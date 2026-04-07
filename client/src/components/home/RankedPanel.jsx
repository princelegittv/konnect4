import { getRankThemeClass } from "../../utils/rankTheme";

export default function RankedPanel({
  user,
  queueState,
  onJoinQueue,
  onCancelQueue,
  isBusy,
}) {
  const rankThemeClass = getRankThemeClass(user.rankTier);

  return (
    <div className="mode-panel">
      <div className="panel-heading">
        <div>
          <h2>Ranked Matchmaking</h2>
          <p className="muted">
            Queue into competitive Konnect4 matchmaking against nearby rank tiers and climb the
            seasonal leaderboard.
          </p>
        </div>

        <div className={`rank-pill ${rankThemeClass}`}>
          <span>{user.rankTier}</span>
          <strong>{user.rankPoints} RP</strong>
        </div>
      </div>

      <div className="room-summary-grid">
        <div className={`summary-card rank-summary ${rankThemeClass}`}>
          <span className="summary-label">Current tier</span>
          <strong>{user.rankTier}</strong>
        </div>
        <div className="summary-card">
          <span className="summary-label">Rank points</span>
          <strong>{user.rankPoints}</strong>
        </div>
        <div className="summary-card">
          <span className="summary-label">Win streak</span>
          <strong>{user.winStreak}</strong>
        </div>
        <div className="summary-card">
          <span className="summary-label">Ranked record</span>
          <strong>
            {user.rankedWins}-{user.rankedLosses}
          </strong>
        </div>
      </div>

      <div className="status-banner">
        <strong>{queueState.active ? "Ranked queue active" : "Ready for ranked"}</strong>
        <p>{queueState.message}</p>
      </div>

      <div className="summary-card">
        <span className="summary-label">Players waiting</span>
        <strong>{queueState.queueSize}</strong>
      </div>

      {queueState.active ? (
        <button type="button" className="secondary-button" onClick={onCancelQueue} disabled={isBusy}>
          {isBusy ? "Working..." : "Cancel ranked queue"}
        </button>
      ) : (
        <button type="button" className="primary-button" onClick={onJoinQueue} disabled={isBusy}>
          {isBusy ? "Working..." : "Queue for ranked"}
        </button>
      )}
    </div>
  );
}
