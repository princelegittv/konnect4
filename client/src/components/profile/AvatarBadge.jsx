export default function AvatarBadge({ avatarType, avatarValue, username, size = "medium" }) {
  const label = username ? `${username} avatar` : "Profile avatar";

  return (
    <div className={`avatar-badge avatar-${size}`} aria-label={label} title={label}>
      {avatarType === "upload" ? (
        <img src={avatarValue} alt={label} className="avatar-image" />
      ) : (
        <span className={`avatar-glyph ${avatarType === "flag" ? "flag-avatar" : ""}`}>
          {avatarValue}
        </span>
      )}
    </div>
  );
}
