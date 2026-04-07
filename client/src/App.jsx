import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "./api";
import AuthPanel from "./components/auth/AuthPanel";
import LobbyForm from "./components/LobbyForm";
import RoomScreen from "./components/RoomScreen";
import FriendsSection from "./components/friends/FriendsSection";
import LiveMatchesSection from "./components/live/LiveMatchesSection";
import LeaderboardSection from "./components/leaderboards/LeaderboardSection";
import NavigationMenu from "./components/home/NavigationMenu";
import PlayModeSelector from "./components/home/PlayModeSelector";
import PracticePanel from "./components/home/PracticePanel";
import ProfileBar from "./components/home/ProfileBar";
import QueuePanel from "./components/home/QueuePanel";
import RankedPanel from "./components/home/RankedPanel";
import ProfileSection from "./components/profile/ProfileSection";
import { useGameSoundEffects } from "./hooks/useGameSoundEffects";
import { socket } from "./socket";

const guestFeedback = {
  type: "info",
  message: "Create an account or log in to unlock the Konnect4 platform.",
};

const defaultRandomQueueState = {
  active: false,
  message: "Jump into the queue when you are ready for a live opponent.",
  queueSize: 0,
};

const defaultRankedQueueState = {
  active: false,
  message: "Queue up for a competitive Konnect4 match near your rank tier.",
  queueSize: 0,
};

export default function App() {
  const [sessionStatus, setSessionStatus] = useState("loading");
  const [authMode, setAuthMode] = useState("signup");
  const [user, setUser] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [room, setRoom] = useState(null);
  const [selectedMenu, setSelectedMenu] = useState("play");
  const [playMode, setPlayMode] = useState("private");
  const [randomQueueState, setRandomQueueState] = useState(defaultRandomQueueState);
  const [rankedQueueState, setRankedQueueState] = useState(defaultRankedQueueState);
  const [feedback, setFeedback] = useState(guestFeedback);
  const [isConnected, setIsConnected] = useState(false);
  const [lastRoomCode, setLastRoomCode] = useState("");
  const [aiDifficulty, setAiDifficulty] = useState("medium");
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);
  const [isActionSubmitting, setIsActionSubmitting] = useState(false);
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);
  const intentionalDisconnectRef = useRef(false);

  useGameSoundEffects(room);

  async function loadProfile() {
    const result = await api.getProfile();
    setProfileData(result);
    setUser(result.profile);
    return result;
  }

  async function loadNotifications() {
    const result = await api.getNotifications();
    setNotifications(result.notifications ?? []);
    return result;
  }

  function markNotificationsReadLocally(markAll = false, notificationId = "") {
    const readAt = new Date().toISOString();

    setNotifications((current) =>
      current.map((notification) => {
        if (notification.readAt) {
          return notification;
        }

        if (markAll || notification.id === notificationId) {
          return {
            ...notification,
            readAt,
          };
        }

        return notification;
      }),
    );
  }

  async function loadAuthenticatedData() {
    const [profileResult, notificationsResult] = await Promise.allSettled([
      api.getProfile(),
      api.getNotifications(),
    ]);

    if (profileResult.status !== "fulfilled") {
      throw profileResult.reason;
    }

    setProfileData(profileResult.value);
    setUser(profileResult.value.profile);

    if (notificationsResult.status === "fulfilled") {
      setNotifications(notificationsResult.value.notifications ?? []);
    } else {
      setNotifications([]);
    }

    return profileResult.value;
  }

  function resetHomeState() {
    setRoom(null);
    setRandomQueueState(defaultRandomQueueState);
    setRankedQueueState(defaultRankedQueueState);
  }

  function reconnectSocket() {
    intentionalDisconnectRef.current = false;
    if (socket.connected) {
      socket.disconnect();
    }
    socket.connect();

socket.on("connect", () => {
  const user = JSON.parse(localStorage.getItem("user"));

  if (!user) return;

  socket.emit(
    "auth:identify",
    {
      userId: user.id,
      username: user.username,
    },
    (response) => {
      console.log("Auth identify:", response);
    }
  );
});
  }

  function disconnectSocket() {
    intentionalDisconnectRef.current = true;
    if (socket.connected) {
      socket.disconnect();
    }
    setIsConnected(false);
  }

  function emitWithAck(eventName, payload = {}) {
    return new Promise((resolve) => {
      if (!socket.connected) {
        resolve({
          ok: false,
          error: "Realtime connection is unavailable.",
        });
        return;
      }

      socket.emit(eventName, payload, (response) => {
        resolve(
          response ?? {
            ok: false,
            error: "No response from the game server.",
          },
        );
      });
    });
  }

  async function requestPlatformSnapshot() {
    const response = await emitWithAck("live:matches:list");
    if (!response.ok) {
      return;
    }

    setRandomQueueState((current) => ({
      ...current,
      queueSize: response.randomQueueSize ?? current.queueSize,
    }));
    setRankedQueueState((current) => ({
      ...current,
      queueSize: response.rankedQueueSize ?? current.queueSize,
    }));
  }

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      try {
        const result = await api.getSession();
        if (cancelled) {
          return;
        }

        if (result.user) {
          setSessionStatus("authenticated");
          await loadAuthenticatedData();
          if (cancelled) {
            return;
          }

          setFeedback({
            type: "success",
            message: `Welcome back, ${result.user.username}. Pick a Konnect4 mode to start playing.`,
          });
          socket.connect();
          return;
        }

        setSessionStatus("guest");
        setFeedback(guestFeedback);
      } catch (error) {
        if (cancelled) {
          return;
        }

        setSessionStatus("guest");
        setFeedback({
          type: "error",
          message: error.message || "Unable to restore your session.",
        });
      }
    }

    loadSession();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function handleConnect() {
      intentionalDisconnectRef.current = false;
      setIsConnected(true);
      void requestPlatformSnapshot();
      void loadNotifications().catch(() => {});
    }

    function handleDisconnect() {
      setIsConnected(false);

      if (!intentionalDisconnectRef.current && sessionStatus === "authenticated") {
        setFeedback({
          type: "error",
          message: "Realtime connection dropped. Trying to reconnect...",
        });
      }
    }

    function handleRoomState(nextRoom) {
      setRoom(nextRoom);
      setLastRoomCode(nextRoom.code);
      setRandomQueueState(defaultRandomQueueState);
      setRankedQueueState(defaultRankedQueueState);

      if (nextRoom.message) {
        setFeedback({
          type: nextRoom.status === "finished" ? "success" : "info",
          message: nextRoom.message,
        });
      }

      if (nextRoom.status === "finished") {
        void loadProfile().catch(() => {});
      }
    }

    function handleNotificationsUpdate(payload = {}) {
      if (Array.isArray(payload.notifications)) {
        setNotifications(payload.notifications);
        return;
      }

      void loadNotifications().catch(() => {});
    }

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("room:state", handleRoomState);
    socket.on("notifications:update", handleNotificationsUpdate);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("room:state", handleRoomState);
      socket.off("notifications:update", handleNotificationsUpdate);
    };
  }, [sessionStatus]);

  const self = useMemo(() => {
    if (!room || !user?.id) {
      return null;
    }

    return room.players.find((player) => player.userId === user.id) ?? null;
  }, [room, user?.id]);

  const isSpectator = Boolean(room && !self);
  const activeColor = room?.gameState.currentPlayer;
  const isMyTurn = Boolean(self && room?.status === "playing" && activeColor === self.color);
  const canRequestRematch = Boolean(room?.status === "finished" && !isSpectator);

  async function handleAuthSubmit(payload) {
    setIsAuthSubmitting(true);

    try {
      const result = authMode === "signup" ? await api.signup(payload) : await api.login(payload);
      setSessionStatus("authenticated");
      await loadAuthenticatedData();
      resetHomeState();
      setSelectedMenu("play");
      setFeedback({
        type: "success",
        message: `Welcome, ${result.user.username}. Choose how you want to play.`,
      });
      reconnectSocket();
    } catch (error) {
      setFeedback({
        type: "error",
        message: error.message || "Authentication failed.",
      });
    } finally {
      setIsAuthSubmitting(false);
    }
  }

  async function handleLogout() {
    setIsActionSubmitting(true);

    try {
      await api.logout();
    } catch {
      // Clearing the local session state is enough for logout UX.
    } finally {
      disconnectSocket();
      setUser(null);
      setProfileData(null);
      setNotifications([]);
      setSessionStatus("guest");
      setSelectedMenu("play");
      setPlayMode("private");
      resetHomeState();
      setFeedback({
        type: "info",
        message: "You have been logged out.",
      });
      setIsActionSubmitting(false);
    }
  }

  async function handleCreateRoom() {
    setIsActionSubmitting(true);
    const response = await emitWithAck("room:create");
    setIsActionSubmitting(false);

    if (!response.ok) {
      setFeedback({ type: "error", message: response.error ?? "Unable to create a room." });
      return;
    }

    setLastRoomCode(response.room.code);
    setRoom(response.room);
  }

  async function handleJoinRoom({ roomCode }) {
    setIsActionSubmitting(true);
    const response = await emitWithAck("room:join", { roomCode });
    setIsActionSubmitting(false);

    if (!response.ok) {
      setFeedback({ type: "error", message: response.error ?? "Unable to join that room." });
      return;
    }

    setLastRoomCode(response.room.code);
    setRoom(response.room);
  }

  async function handleJoinRandomQueue() {
    setIsActionSubmitting(true);
    const response = await emitWithAck("queue:join");
    setIsActionSubmitting(false);

    if (!response.ok) {
      setFeedback({ type: "error", message: response.error ?? "Unable to join matchmaking." });
      return;
    }

    if (response.matched && response.room) {
      setRoom(response.room);
      setFeedback({
        type: "success",
        message: response.room.message ?? "Random match found.",
      });
      return;
    }

    setRandomQueueState({
      active: true,
      message: response.message ?? "Searching for an opponent...",
      queueSize: response.queueSize ?? 1,
    });
    setFeedback({
      type: "info",
      message: response.message ?? "Searching for an opponent...",
    });
  }

  async function handleLeaveRandomQueue() {
    setIsActionSubmitting(true);
    const response = await emitWithAck("queue:leave");
    setIsActionSubmitting(false);

    setRandomQueueState({
      active: false,
      message: response.message ?? defaultRandomQueueState.message,
      queueSize: response.queueSize ?? 0,
    });

    setFeedback({
      type: "info",
      message: response.message ?? "You left the queue.",
    });
  }

  async function handleJoinRankedQueue() {
    setIsActionSubmitting(true);
    const response = await emitWithAck("ranked:queue:join");
    setIsActionSubmitting(false);

    if (!response.ok) {
      setFeedback({ type: "error", message: response.error ?? "Unable to queue for ranked." });
      return;
    }

    if (response.matched && response.room) {
      setRoom(response.room);
      setFeedback({
        type: "success",
        message: response.room.message ?? "Ranked match found.",
      });
      return;
    }

    setRankedQueueState({
      active: true,
      message: response.message ?? "Searching for a ranked opponent...",
      queueSize: response.queueSize ?? 1,
    });
    setFeedback({
      type: "info",
      message: response.message ?? "Searching for a ranked opponent...",
    });
  }

  async function handleLeaveRankedQueue() {
    setIsActionSubmitting(true);
    const response = await emitWithAck("ranked:queue:leave");
    setIsActionSubmitting(false);

    setRankedQueueState({
      active: false,
      message: response.message ?? defaultRankedQueueState.message,
      queueSize: response.queueSize ?? 0,
    });

    setFeedback({
      type: "info",
      message: response.message ?? "You left the ranked queue.",
    });
  }

  async function handleStartPractice() {
    setIsActionSubmitting(true);
    const response = await emitWithAck("practice:create", { difficulty: aiDifficulty });
    setIsActionSubmitting(false);

    if (!response.ok) {
      setFeedback({ type: "error", message: response.error ?? "Unable to start practice." });
      return;
    }

    setRoom(response.room);
    setFeedback({
      type: "success",
      message: response.room.message ?? "Practice match started.",
    });
  }

  async function handleSpectateMatch(roomCode) {
    const response = await emitWithAck("spectate:join", { roomCode });

    if (!response.ok) {
      setFeedback({ type: "error", message: response.error ?? "Unable to spectate that match." });
      return;
    }

    setRoom(response.room);
    setFeedback({
      type: "info",
      message: response.room.message ?? "You joined as a spectator.",
    });
  }

  async function handleLeaveRoom() {
    await emitWithAck("room:leave");
    resetHomeState();
    await requestPlatformSnapshot();
    setFeedback({
      type: "info",
      message: "You left the room.",
    });
  }

  async function handleColumnClick(column) {
    if (!isMyTurn) {
      return;
    }

    const response = await emitWithAck("game:move", { column });
    if (!response.ok) {
      setFeedback({ type: "error", message: response.error ?? "Move rejected." });
    }
  }

  async function handleRematch() {
    const response = await emitWithAck("game:rematch");
    if (!response.ok) {
      setFeedback({ type: "error", message: response.error ?? "Unable to request rematch." });
    }
  }

  async function handleSetTurnTimer(enabled) {
    const response = await emitWithAck("timer:set", { enabled });
    if (!response.ok) {
      setFeedback({ type: "error", message: response.error ?? "Unable to update the turn timer." });
    }
  }

  async function handleSaveAvatar(nextAvatar) {
    setIsSavingAvatar(true);

    try {
      const result = await api.updateProfileAvatar(nextAvatar);
      setProfileData((current) =>
        current
          ? {
              ...current,
              profile: result.profile,
            }
          : current,
      );
      setUser(result.profile);
      setFeedback({
        type: "success",
        message: "Profile avatar updated.",
      });
    } catch (error) {
      setFeedback({
        type: "error",
        message: error.message || "Unable to save avatar.",
      });
    } finally {
      setIsSavingAvatar(false);
    }
  }

  async function handleOpenNotifications() {
    if (!notifications.some((notification) => !notification.readAt)) {
      return;
    }

    markNotificationsReadLocally(true);

    try {
      const result = await api.markAllNotificationsRead();
      setNotifications(result.notifications ?? []);
    } catch (error) {
      void loadNotifications().catch(() => {});
      setFeedback({
        type: "error",
        message: error.message || "Unable to clear notifications right now.",
      });
    }
  }

  async function handleMarkNotificationRead(notificationId) {
    const target = notifications.find((notification) => notification.id === notificationId);
    if (!target || target.readAt) {
      return;
    }

    markNotificationsReadLocally(false, notificationId);

    try {
      const result = await api.markNotificationRead(notificationId);
      setNotifications(result.notifications ?? []);
    } catch (error) {
      void loadNotifications().catch(() => {});
      setFeedback({
        type: "error",
        message: error.message || "Unable to update that notification.",
      });
    }
  }

  if (sessionStatus === "loading") {
    return (
      <main className="app-shell">
        <section className="loading-card">
          <strong>Loading Konnect4...</strong>
          <p>Restoring your session and preparing the platform.</p>
        </section>
      </main>
    );
  }

  if (sessionStatus !== "authenticated" || !user) {
    return (
      <main className="app-shell auth-shell">
        <AuthPanel
          mode={authMode}
          onModeChange={setAuthMode}
          onSubmit={handleAuthSubmit}
          isSubmitting={isAuthSubmitting}
          feedback={feedback}
        />
      </main>
    );
  }

  if (room) {
    return (
      <main className="app-shell">
        <RoomScreen
          room={room}
          self={self}
          feedback={feedback}
          isConnected={isConnected}
          isMyTurn={isMyTurn}
          canRequestRematch={canRequestRematch}
          isSpectator={isSpectator}
          onColumnClick={handleColumnClick}
          onRematch={handleRematch}
          onSetTimer={handleSetTurnTimer}
          onLeaveRoom={handleLeaveRoom}
        />
      </main>
    );
  }

  return (
    <main className="app-shell home-shell">
      <ProfileBar
        user={user}
        notifications={notifications}
        isConnected={isConnected}
        onOpenNotifications={handleOpenNotifications}
        onMarkNotificationRead={handleMarkNotificationRead}
        onLogout={handleLogout}
        isSubmitting={isActionSubmitting}
      />

      <section className="home-hero">
        <div>
          <p className="eyebrow">Konnect4 Platform</p>
          <h1>Play Konnect4 your way</h1>
          <p className="hero-text">
            Private rooms, random matchmaking, ranked progression, AI practice, friends, live
            matches, and leaderboards all live in one place.
          </p>
        </div>

        <div className="status-banner compact-banner">
          <strong>Platform status</strong>
          <p>{feedback.message}</p>
        </div>
      </section>

      <NavigationMenu activeItem={selectedMenu} onSelect={setSelectedMenu} />

      <section className="home-main">
        {selectedMenu === "play" ? (
          <div className="panel main-panel">
            <div className="info-stack">
              <PlayModeSelector activeMode={playMode} onSelect={setPlayMode} />

              {playMode === "private" ? (
                <LobbyForm
                  username={user.username}
                  roomCode={lastRoomCode}
                  isSubmitting={isActionSubmitting}
                  onCreateRoom={handleCreateRoom}
                  onJoinRoom={handleJoinRoom}
                />
              ) : null}

              {playMode === "random" ? (
                <QueuePanel
                  queueState={randomQueueState}
                  onJoinQueue={handleJoinRandomQueue}
                  onCancelQueue={handleLeaveRandomQueue}
                  isBusy={isActionSubmitting}
                />
              ) : null}
            </div>
          </div>
        ) : null}

        {selectedMenu === "ranked" ? (
          <div className="panel main-panel">
            <RankedPanel
              user={user}
              queueState={rankedQueueState}
              onJoinQueue={handleJoinRankedQueue}
              onCancelQueue={handleLeaveRankedQueue}
              isBusy={isActionSubmitting}
            />
          </div>
        ) : null}

        {selectedMenu === "practice" ? (
          <div className="panel main-panel">
            <PracticePanel
              difficulty={aiDifficulty}
              onDifficultyChange={setAiDifficulty}
              onStartPractice={handleStartPractice}
              isBusy={isActionSubmitting}
            />
          </div>
        ) : null}

        {selectedMenu === "live" ? (
          <div className="panel main-panel">
            <LiveMatchesSection onSpectate={handleSpectateMatch} />
          </div>
        ) : null}

        {selectedMenu === "friends" ? (
          <div className="panel main-panel">
            <FriendsSection />
          </div>
        ) : null}

        {selectedMenu === "leaderboards" ? (
          <div className="panel main-panel">
            <LeaderboardSection currentUser={user} />
          </div>
        ) : null}

        {selectedMenu === "account" && profileData ? (
          <ProfileSection
            profile={profileData.profile}
            currentSeason={profileData.currentSeason}
            currentSeasonStats={profileData.currentSeasonStats}
            allTimeStats={profileData.allTimeStats}
            onSaveAvatar={handleSaveAvatar}
            isSavingAvatar={isSavingAvatar}
          />
        ) : null}

        {selectedMenu === "account" && !profileData ? (
          <div className="panel main-panel">
            <div className="status-banner">
              <strong>Loading profile</strong>
              <p>Your Konnect4 stats and avatar settings are on the way.</p>
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
