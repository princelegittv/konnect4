import AvatarBadge from "../profile/AvatarBadge";
import NotificationCenter from "./NotificationCenter";
import { getRankThemeClass } from "../../utils/rankTheme";

export default function ProfileBar({
  user,
  notifications,
  isConnected,
  currentSectionLabel,
  onOpenNotifications,
  onMarkNotificationRead,
  onLogout,
  isSubmitting,
}) {
  const rankThemeClass = getRankThemeClass(user.rankTier);

  return (
    <header className="profile-bar">
      <div className="profile-bar-main compact-profile-main">
        <AvatarBadge avatarType={user.avatarType} avatarValue={user.avatarValue} username={user.username} />

        <div className="profile-bar-copy">
          <div className="profile-bar-title-row">
            <p className="eyebrow">Konnect4</p>
            <span className="section-tag">{currentSectionLabel}</span>
          </div>

          <div className="profile-bar-identity">
            <h2>{user.username}</h2>
            <div className={`rank-pill compact ${rankThemeClass}`}>
              <span>{user.rankTier}</span>
              <strong>{user.rankPoints} RP</strong>
            </div>
          </div>

          <p className="muted profile-email">{user.email}</p>
        </div>
      </div>

      <div className="profile-actions compact-profile-actions">
        <div className="profile-action-row">
          <div className="connection-pill" data-live={isConnected}>
            <span className="connection-dot" />
            {isConnected ? "Online" : "Offline"}
          </div>

          <NotificationCenter
            notifications={notifications}
            onOpenNotifications={onOpenNotifications}
            onMarkNotificationRead={onMarkNotificationRead}
          />
        </div>

        <button type="button" className="ghost-button logout-button" onClick={onLogout} disabled={isSubmitting}>
          {isSubmitting ? "Working..." : "Log out"}
        </button>
      </div>
    </header>
  );
}
