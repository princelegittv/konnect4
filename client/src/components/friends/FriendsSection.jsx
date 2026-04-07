import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { socket } from "../../socket";
import { getRankThemeClass } from "../../utils/rankTheme";
import AvatarBadge from "../profile/AvatarBadge";

function FriendIdentity({ avatarType, avatarValue, username, rankTier, rankPoints, subtitle }) {
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

      {rankTier ? (
        <div className={`rank-pill compact ${getRankThemeClass(rankTier)}`}>
          <span>{rankTier}</span>
          <strong>{rankPoints} RP</strong>
        </div>
      ) : null}
    </div>
  );
}

function RequestCard({ request, onRespond, isBusy }) {
  const isIncoming = request.direction === "incoming";
  const username = isIncoming ? request.senderUsername : request.receiverUsername;
  const avatarType = isIncoming ? request.senderAvatarType : request.receiverAvatarType;
  const avatarValue = isIncoming ? request.senderAvatarValue : request.receiverAvatarValue;
  const rankTier = isIncoming ? request.senderRankTier : request.receiverRankTier;
  const rankPoints = isIncoming ? request.senderRankPoints : request.receiverRankPoints;

  return (
    <div className="list-card">
      <FriendIdentity
        avatarType={avatarType}
        avatarValue={avatarValue}
        username={username}
        rankTier={rankTier}
        rankPoints={rankPoints}
        subtitle={isIncoming ? "Incoming request" : "Outgoing request"}
      />

      {isIncoming ? (
        <div className="row-actions">
          <button
            type="button"
            className="primary-button"
            disabled={isBusy}
            onClick={() => onRespond(request.id, "accept")}
          >
            Accept
          </button>
          <button
            type="button"
            className="ghost-button"
            disabled={isBusy}
            onClick={() => onRespond(request.id, "decline")}
          >
            Decline
          </button>
        </div>
      ) : (
        <div className="status-chip muted-chip">Pending</div>
      )}
    </div>
  );
}

function FriendRow({ friend }) {
  return (
    <div className="list-card">
      <FriendIdentity
        avatarType={friend.avatarType}
        avatarValue={friend.avatarValue}
        username={friend.username}
        rankTier={friend.rankTier}
        rankPoints={friend.rankPoints}
        subtitle={[friend.country, friend.region].filter(Boolean).join(" | ") || "Konnect4 player"}
      />

      <div className="row-actions">
        <div
          className={`status-chip ${friend.onlineStatus === "online" ? "status-online" : "muted-chip"}`}
        >
          {friend.onlineStatus === "online" ? "Online" : "Offline"}
        </div>
      </div>
    </div>
  );
}

function SearchRow({ player, onSendRequest, isBusy }) {
  return (
    <div className="list-card">
      <FriendIdentity
        avatarType={player.avatarType}
        avatarValue={player.avatarValue}
        username={player.username}
        rankTier={player.rankTier}
        rankPoints={player.rankPoints}
        subtitle={[player.country, player.region].filter(Boolean).join(" | ") || "Available player"}
      />

      <div className="row-actions">
        <div
          className={`status-chip ${player.onlineStatus === "online" ? "status-online" : "muted-chip"}`}
        >
          {player.onlineStatus === "online" ? "Online" : "Offline"}
        </div>
        <button
          type="button"
          className="secondary-button"
          disabled={isBusy}
          onClick={() => onSendRequest(player.id)}
        >
          Add friend
        </button>
      </div>
    </div>
  );
}

export default function FriendsSection() {
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [feedback, setFeedback] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [busyRequestId, setBusyRequestId] = useState("");

  async function loadFriends() {
    const result = await api.getFriends();
    setFriends(result.friends);
    setRequests(result.requests);
  }

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      try {
        const result = await api.getFriends();
        if (!active) {
          return;
        }

        setFriends(result.friends);
        setRequests(result.requests);
      } catch (error) {
        if (!active) {
          return;
        }
        setFeedback(error.message || "Unable to load your friends.");
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    }

    bootstrap();

    function handleFriendsRefresh() {
      loadFriends().catch(() => {});
    }

    socket.on("friends:refresh", handleFriendsRefresh);

    return () => {
      active = false;
      socket.off("friends:refresh", handleFriendsRefresh);
    };
  }, []);

  const incomingRequests = useMemo(
    () => requests.filter((request) => request.direction === "incoming"),
    [requests],
  );
  const outgoingRequests = useMemo(
    () => requests.filter((request) => request.direction === "outgoing"),
    [requests],
  );

  async function handleSearch(event) {
    event.preventDefault();
    const nextQuery = searchQuery.trim();

    if (!nextQuery) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const result = await api.searchFriends(nextQuery);
      setSearchResults(result.users);
      setFeedback(result.users.length ? "" : "No players matched that search.");
    } catch (error) {
      setFeedback(error.message || "Unable to search right now.");
    } finally {
      setIsSearching(false);
    }
  }

  async function handleSendRequest(receiverUserId) {
    setBusyRequestId(receiverUserId);
    try {
      await api.sendFriendRequest(receiverUserId);
      await loadFriends();
      setFeedback("Friend request sent.");
    } catch (error) {
      setFeedback(error.message || "Unable to send friend request.");
    } finally {
      setBusyRequestId("");
    }
  }

  async function handleRespond(requestId, decision) {
    setBusyRequestId(requestId);
    try {
      await api.respondToFriendRequest(requestId, decision);
      await loadFriends();
      setFeedback(
        decision === "accept" ? "Friend request accepted." : "Friend request declined.",
      );
    } catch (error) {
      setFeedback(error.message || "Unable to update friend request.");
    } finally {
      setBusyRequestId("");
    }
  }

  if (isLoading) {
    return (
      <div className="mode-panel">
        <div className="panel-heading">
          <div>
            <h2>Friends</h2>
            <p className="muted">Loading your Konnect4 network.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mode-panel">
      <div className="panel-heading">
        <div>
          <h2>Friends</h2>
          <p className="muted">
            Search for players, manage requests, and keep an eye on who is online.
          </p>
        </div>
      </div>

      {feedback ? (
        <div className="status-banner">
          <strong>Friends activity</strong>
          <p>{feedback}</p>
        </div>
      ) : null}

      <form className="action-card search-card" onSubmit={handleSearch}>
        <div>
          <h3>Find players</h3>
          <p className="muted">Search by username to send a friend request.</p>
        </div>

        <div className="inline-form">
          <label className="field">
            <span>Username</span>
            <input
              type="text"
              value={searchQuery}
              placeholder="Search Konnect4 players"
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </label>

          <button type="submit" className="primary-button" disabled={isSearching}>
            {isSearching ? "Searching..." : "Search"}
          </button>
        </div>
      </form>

      {searchResults.length ? (
        <section className="section-card">
          <div className="section-header">
            <div>
              <h3>Search results</h3>
              <p className="muted">Players matching your search.</p>
            </div>
          </div>

          <div className="list-stack">
            {searchResults.map((player) => (
              <SearchRow
                key={player.id}
                player={player}
                isBusy={busyRequestId === player.id}
                onSendRequest={handleSendRequest}
              />
            ))}
          </div>
        </section>
      ) : null}

      <div className="dashboard-grid">
        <section className="section-card">
          <div className="section-header">
            <div>
              <h3>Incoming requests</h3>
              <p className="muted">Accept or decline new requests.</p>
            </div>
          </div>

          <div className="list-stack">
            {incomingRequests.length ? (
              incomingRequests.map((request) => (
                <RequestCard
                  key={request.id}
                  request={request}
                  isBusy={busyRequestId === request.id}
                  onRespond={handleRespond}
                />
              ))
            ) : (
              <div className="info-card">
                <p>No incoming requests right now.</p>
              </div>
            )}
          </div>
        </section>

        <section className="section-card">
          <div className="section-header">
            <div>
              <h3>Outgoing requests</h3>
              <p className="muted">Pending requests you have already sent.</p>
            </div>
          </div>

          <div className="list-stack">
            {outgoingRequests.length ? (
              outgoingRequests.map((request) => (
                <RequestCard
                  key={request.id}
                  request={request}
                  isBusy={false}
                  onRespond={() => {}}
                />
              ))
            ) : (
              <div className="info-card">
                <p>No outgoing requests right now.</p>
              </div>
            )}
          </div>
        </section>
      </div>

      <section className="section-card">
        <div className="section-header">
          <div>
            <h3>Friends list</h3>
            <p className="muted">Your current Konnect4 friends and their live status.</p>
          </div>
        </div>

        <div className="list-stack">
          {friends.length ? (
            friends.map((friend) => <FriendRow key={friend.id} friend={friend} />)
          ) : (
            <div className="info-card">
              <p>Your friends list is empty. Search for a player above to get started.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
