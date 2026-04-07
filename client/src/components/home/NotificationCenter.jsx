import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

function getNotificationCopy(notification) {
  if (notification.type === "friend_request_received") {
    return {
      title: "Friend request",
      body: `${notification.payload?.fromUsername ?? "A player"} sent you a friend request.`,
    };
  }

  if (notification.type === "friend_request_response") {
    return {
      title: "Friend request update",
      body: `${notification.payload?.fromUsername ?? "A player"} ${notification.payload?.decision === "accept" ? "accepted" : "declined"} your friend request.`,
    };
  }

  if (notification.type === "game_invite") {
    return {
      title: "Game invite",
      body: `${notification.payload?.fromUsername ?? "A player"} invited you to a private Konnect4 match.`,
    };
  }

  if (notification.type === "system_update") {
    return {
      title: "Platform update",
      body: notification.payload?.message ?? "A new Konnect4 system update is available.",
    };
  }

  return {
    title: "Konnect4 activity",
    body: "New Konnect4 activity is waiting for you.",
  };
}

function formatTimestamp(value) {
  if (!value) {
    return "";
  }

  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function NotificationCenter({
  notifications = [],
  onOpenNotifications,
  onMarkNotificationRead,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [panelPosition, setPanelPosition] = useState({
    top: 72,
    right: 16,
  });
  const triggerRef = useRef(null);
  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.readAt).length,
    [notifications],
  );

  function updatePanelPosition() {
    const trigger = triggerRef.current;
    if (!trigger) {
      return;
    }

    const rect = trigger.getBoundingClientRect();
    setPanelPosition({
      top: Math.max(16, rect.bottom + 12),
      right: Math.max(16, window.innerWidth - rect.right),
    });
  }

  useLayoutEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    updatePanelPosition();

    function handleWindowUpdate() {
      updatePanelPosition();
    }

    window.addEventListener("resize", handleWindowUpdate);
    window.addEventListener("scroll", handleWindowUpdate, true);

    return () => {
      window.removeEventListener("resize", handleWindowUpdate);
      window.removeEventListener("scroll", handleWindowUpdate, true);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  function handleTriggerClick() {
    if (isOpen) {
      setIsOpen(false);
      return;
    }

    setIsOpen(true);
    if (unreadCount > 0) {
      onOpenNotifications?.();
    }
  }

  async function handleNotificationClick(notification) {
    if (!notification.readAt) {
      await onMarkNotificationRead?.(notification.id);
    }
  }

  const panel = isOpen
    ? createPortal(
        <div className="notification-layer" aria-live="polite">
          <button
            type="button"
            className="notification-scrim"
            aria-label="Close notifications"
            onClick={() => setIsOpen(false)}
          />

          <section
            className="notification-panel"
            style={panelPosition}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="section-header">
              <div>
                <h3>Notifications</h3>
                <p className="muted">Realtime activity from friends, invites, and platform systems.</p>
              </div>

              <div className="status-chip muted-chip">
                {unreadCount ? `${unreadCount} new` : "All caught up"}
              </div>
            </div>

            <div className="list-stack">
              {notifications.length ? (
                notifications.slice(0, 8).map((notification) => {
                  const copy = getNotificationCopy(notification);

                  return (
                    <button
                      key={notification.id}
                      type="button"
                      className="notification-item"
                      data-unread={!notification.readAt}
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="notification-copy">
                        <strong>{copy.title}</strong>
                        <p>{copy.body}</p>
                      </div>

                      <time className="notification-meta" dateTime={notification.createdAt}>
                        {formatTimestamp(notification.createdAt)}
                      </time>
                    </button>
                  );
                })
              ) : (
                <div className="info-card">
                  <p>No new notifications.</p>
                </div>
              )}
            </div>
          </section>
        </div>,
        document.body,
      )
    : null;

  return (
    <div className="notification-center">
      <button
        ref={triggerRef}
        type="button"
        className="ghost-button notification-trigger"
        onClick={handleTriggerClick}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        Notifications
        {unreadCount ? <span className="notification-badge">{unreadCount}</span> : null}
      </button>

      {panel}
    </div>
  );
}
