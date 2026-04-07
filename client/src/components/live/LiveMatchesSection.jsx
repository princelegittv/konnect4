import { useEffect, useState } from "react";
import { api } from "../../api";
import { socket } from "../../socket";
import { getRankThemeClass } from "../../utils/rankTheme";
import AvatarBadge from "../profile/AvatarBadge";

function MiniBoard({ board = [] }) {
  return (
    <div className="mini-board" aria-hidden="true">
      {board.flatMap((row, rowIndex) =>
        row.map((cell, columnIndex) => (
          <div key={`${rowIndex}-${columnIndex}`} className="mini-cell">
            <span className={`mini-piece ${cell ?? "empty"}`} />
          </div>
        )),
      )}
    </div>
  );
}

function PlayerCard({ player }) {
  return (
    <div className="identity-row">
      <AvatarBadge
        avatarType={player.avatarType}
        avatarValue={player.avatarValue}
        username={player.username}
        size="small"
      />

      <div className="identity-copy">
        <strong>{player.username}</strong>
      </div>

      <div className={`rank-pill compact ${getRankThemeClass(player.rankTier)}`}>
        <span>{player.rankTier}</span>
        <strong>{player.rankPoints} RP</strong>
      </div>
    </div>
  );
}

export default function LiveMatchesSection({ onSpectate }) {
  const [matches, setMatches] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [joiningRoomCode, setJoiningRoomCode] = useState("");

  useEffect(() => {
    let active = true;

    async function loadMatches() {
      try {
        const result = await api.getLiveMatches();
        if (!active) {
          return;
        }

        setMatches(result.matches);
      } catch (nextError) {
        if (!active) {
          return;
        }

        setError(nextError.message || "Unable to load live matches.");
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    loadMatches();

    function handleLiveMatchesUpdate(payload) {
      setMatches(payload.matches ?? []);
    }

    socket.on("live:matches:update", handleLiveMatchesUpdate);

    return () => {
      active = false;
      socket.off("live:matches:update", handleLiveMatchesUpdate);
    };
  }, []);

  async function handleSpectate(roomCode) {
    setJoiningRoomCode(roomCode);
    try {
      await onSpectate(roomCode);
    } finally {
      setJoiningRoomCode("");
    }
  }

  return (
    <div className="mode-panel">
      <div className="panel-heading">
        <div>
          <h2>Live Matches</h2>
          <p className="muted">Jump into ongoing Konnect4 games as a live spectator.</p>
        </div>
      </div>

      {error ? (
        <div className="status-banner">
          <strong>Live matches unavailable</strong>
          <p>{error}</p>
        </div>
      ) : null}

      <div className="list-stack">
        {isLoading ? (
          <div className="info-card">
            <p>Loading live matches.</p>
          </div>
        ) : matches.length ? (
          matches.map((match) => (
            <div key={match.roomCode} className="live-match-card">
              <div className="live-match-head">
                <div>
                  <span className="summary-label">Room code</span>
                  <strong>{match.roomCode}</strong>
                </div>
                <div className="status-chip muted-chip">
                  {match.mode} | {match.spectatorCount} spectators
                </div>
              </div>

              <div className="dashboard-grid live-match-grid">
                <div className="list-stack">
                  {match.players.map((player) => (
                    <PlayerCard key={`${match.roomCode}-${player.username}`} player={player} />
                  ))}
                </div>

                <MiniBoard board={match.board} />
              </div>

              <button
                type="button"
                className="primary-button"
                disabled={joiningRoomCode === match.roomCode}
                onClick={() => handleSpectate(match.roomCode)}
              >
                {joiningRoomCode === match.roomCode ? "Joining..." : "Spectate match"}
              </button>
            </div>
          ))
        ) : (
          <div className="info-card">
            <p>No live matches are available right now.</p>
          </div>
        )}
      </div>
    </div>
  );
}
