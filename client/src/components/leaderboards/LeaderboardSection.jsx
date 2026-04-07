import { useEffect, useState } from "react";
import { api } from "../../api";
import { getRankThemeClass } from "../../utils/rankTheme";
import AvatarBadge from "../profile/AvatarBadge";

const SCOPES = [
  { id: "global", label: "Global" },
  { id: "region", label: "Region" },
  { id: "country", label: "Country" },
];

const TIMEFRAMES = [
  { id: "season", label: "Current Season" },
  { id: "all-time", label: "All-Time" },
];

function formatRecord(entry) {
  return `${entry.rankedWins}-${entry.rankedLosses}`;
}

function PlayerIdentity({ avatarType, avatarValue, username, rankTier, rankPoints, subtitle }) {
  return (
    <div className="identity-row">
      <AvatarBadge
        avatarType={avatarType}
        avatarValue={avatarValue}
        username={username}
        size="small"
      />

      <div className="identity-copy">
        <strong>{username}</strong>
        <small>{subtitle}</small>
      </div>

      <div className={`rank-pill compact ${getRankThemeClass(rankTier)}`}>
        <span>{rankTier}</span>
        <strong>{rankPoints} RP</strong>
      </div>
    </div>
  );
}

export default function LeaderboardSection({ currentUser }) {
  const [scope, setScope] = useState("global");
  const [timeframe, setTimeframe] = useState("season");
  const [region, setRegion] = useState(currentUser?.region ?? "");
  const [country, setCountry] = useState(currentUser?.country ?? "");
  const [entries, setEntries] = useState([]);
  const [season, setSeason] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadBoard() {
      setIsLoading(true);
      setError("");

      try {
        const result = await api.getLeaderboards({
          scope,
          timeframe,
          region,
          country,
        });

        if (!active) {
          return;
        }

        setEntries(result.entries);
        setSeason(result.season);
      } catch (nextError) {
        if (!active) {
          return;
        }

        setError(nextError.message || "Unable to load leaderboards.");
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    loadBoard();

    return () => {
      active = false;
    };
  }, [scope, timeframe, region, country]);

  const topEntry = entries[0] ?? null;

  return (
    <div className="mode-panel">
      <div className="panel-heading">
        <div>
          <h2>Leaderboards</h2>
          <p className="muted">
            Track the strongest Konnect4 players across seasonal and all-time competition.
          </p>
        </div>
      </div>

      <div className="leaderboard-hero">
        <div className="summary-card leaderboard-highlight">
          <span className="summary-label">
            {timeframe === "season" ? season?.label ?? "Current season" : "All-time standings"}
          </span>
          <strong>{topEntry ? `${topEntry.username} is leading` : "Leaderboard loading"}</strong>
          <p className="muted">
            {topEntry
              ? `${topEntry.rankTier} | ${topEntry.rankPoints} RP | ${formatRecord(topEntry)}`
              : "The next set of ranked standings will appear here."}
          </p>
        </div>

        <div className="summary-card">
          <span className="summary-label">Entries loaded</span>
          <strong>{entries.length}</strong>
        </div>

        <div className="summary-card">
          <span className="summary-label">Scope</span>
          <strong>{scope}</strong>
        </div>
      </div>

      <div className="dashboard-grid">
        <section className="section-card">
          <div className="section-header">
            <div>
              <h3>Leaderboard filters</h3>
              <p className="muted">Switch between seasonal and all-time views.</p>
            </div>
          </div>

          <div className="filter-group">
            <span className="summary-label">Scope</span>
            <div className="toggle-row">
              {SCOPES.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  className={`pill-button ${scope === entry.id ? "active" : ""}`}
                  onClick={() => setScope(entry.id)}
                >
                  {entry.label}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-group">
            <span className="summary-label">Timeframe</span>
            <div className="toggle-row">
              {TIMEFRAMES.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  className={`pill-button ${timeframe === entry.id ? "active" : ""}`}
                  onClick={() => setTimeframe(entry.id)}
                >
                  {entry.label}
                </button>
              ))}
            </div>
          </div>

          {scope === "region" ? (
            <label className="field">
              <span>Region filter</span>
              <input
                type="text"
                value={region}
                placeholder="Enter a region"
                onChange={(event) => setRegion(event.target.value)}
              />
            </label>
          ) : null}

          {scope === "country" ? (
            <label className="field">
              <span>Country filter</span>
              <input
                type="text"
                value={country}
                placeholder="Enter a country"
                onChange={(event) => setCountry(event.target.value)}
              />
            </label>
          ) : null}
        </section>

        <section className="section-card">
          <div className="section-header">
            <div>
              <h3>Rank tier colors</h3>
              <p className="muted">Competitive accents used across profile, ranked, and boards.</p>
            </div>
          </div>

          <div className="rank-showcase">
            {["Bronze", "Silver", "Gold", "Platinum", "Diamond", "Master", "Legend"].map(
              (rankTier) => (
                <div key={rankTier} className={`rank-pill compact ${getRankThemeClass(rankTier)}`}>
                  <span>{rankTier}</span>
                </div>
              ),
            )}
          </div>
        </section>
      </div>

      {error ? (
        <div className="status-banner">
          <strong>Leaderboard unavailable</strong>
          <p>{error}</p>
        </div>
      ) : null}

      <section className="section-card">
        <div className="section-header">
          <div>
            <h3>Standings</h3>
            <p className="muted">
              {isLoading ? "Refreshing leaderboard..." : "Live ranked standings from the backend."}
            </p>
          </div>
        </div>

        <div className="list-stack leaderboard-list">
          {isLoading ? (
            <div className="info-card">
              <p>Loading leaderboard standings.</p>
            </div>
          ) : entries.length ? (
            entries.map((entry, index) => (
              <div key={`${entry.username}-${index}`} className="leaderboard-row">
                <div className="leaderboard-rank">{index + 1}</div>

                <PlayerIdentity
                  avatarType={entry.avatarType}
                  avatarValue={entry.avatarValue}
                  username={entry.username}
                  rankTier={entry.rankTier}
                  rankPoints={entry.rankPoints}
                  subtitle={[entry.country, entry.region].filter(Boolean).join(" | ") || "Global"}
                />

                <div className="leaderboard-stats">
                  <div className="metric-chip">
                    <span className="summary-label">Record</span>
                    <strong>{formatRecord(entry)}</strong>
                  </div>
                  <div className="metric-chip">
                    <span className="summary-label">Win rate</span>
                    <strong>{entry.winRate}%</strong>
                  </div>
                  <div
                    className={`status-chip ${entry.onlineStatus === "online" ? "status-online" : "muted-chip"}`}
                  >
                    {entry.onlineStatus === "online" ? "Online" : "Offline"}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="info-card">
              <p>No leaderboard entries match this filter yet.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
