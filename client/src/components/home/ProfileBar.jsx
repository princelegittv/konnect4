import AvatarBadge from "../profile/AvatarBadge";
import NotificationCenter from "./NotificationCenter";
import { getRankThemeClass } from "../../utils/rankTheme";

export default function ProfileBar({
  user,
  notifications,
  isConnected,
  onOpenNotifications,
  onMarkNotificationRead,
  onLogout,
  isSubmitting,
}) {
  const rankThemeClass = getRankThemeClass(user.rankTier);

  return (
    <header className="profile-bar">
      <div className="profile-bar-main">
        <AvatarBadge
          avatarType={user.avatarType}
          avatarValue={user.avatarValue}
          username={user.username}
        />

        <div>
          <p className="eyebrow">Konnect4 Account</p>
          <h2>{user.username}</h2>
          <div className="profile-bar-meta">
            <p className="muted">{user.email}</p>
            <div className={`rank-pill ${rankThemeClass}`}>
              <span>{user.rankTier}</span>
              <strong>{user.rankPoints} RP</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="profile-actions">
        <NotificationCenter
          notifications={notifications}
          onOpenNotifications={onOpenNotifications}
          onMarkNotificationRead={onMarkNotificationRead}
        />

        <div className="connection-pill" data-live={isConnected}>
          <span className="connection-dot" />
          {isConnected ? "Realtime online" : "Realtime offline"}
        </div>

        <button type="button" className="ghost-button" onClick={onLogout} disabled={isSubmitting}>
          {isSubmitting ? "Working..." : "Log out"}
        </button>
      </div>
    </header>
  );
}
