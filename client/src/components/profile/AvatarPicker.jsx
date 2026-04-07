import { useState } from "react";
import AvatarBadge from "./AvatarBadge";

const EMOJIS = [
  "\uD83C\uDFAE",
  "\uD83D\uDD25",
  "\u26A1",
  "\uD83D\uDC51",
  "\uD83E\uDDE0",
  "\uD83D\uDE80",
  "\uD83D\uDEE1\uFE0F",
  "\uD83C\uDFAF",
  "\uD83D\uDC09",
  "\uD83C\uDF19",
];

const FLAGS = [
  "\uD83C\uDDFA\uD83C\uDDF8",
  "\uD83C\uDDE8\uD83C\uDDE6",
  "\uD83C\uDDF2\uD83C\uDDFD",
  "\uD83C\uDDE7\uD83C\uDDF7",
  "\uD83C\uDDEC\uD83C\uDDE7",
  "\uD83C\uDDEB\uD83C\uDDF7",
  "\uD83C\uDDE9\uD83C\uDDEA",
  "\uD83C\uDDEF\uD83C\uDDF5",
  "\uD83C\uDDF0\uD83C\uDDF7",
  "\uD83C\uDDE6\uD83C\uDDFA",
];

export default function AvatarPicker({
  currentAvatarType,
  currentAvatarValue,
  username,
  onSave,
  isSaving,
}) {
  const [selectedType, setSelectedType] = useState(currentAvatarType ?? "emoji");
  const [selectedValue, setSelectedValue] = useState(currentAvatarValue ?? "\uD83C\uDFAE");

  function handleFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedType("upload");
      setSelectedValue(String(reader.result));
    };
    reader.readAsDataURL(file);
  }

  function selectPreset(type, value) {
    setSelectedType(type);
    setSelectedValue(value);
  }

  function handleSave() {
    onSave({
      avatarType: selectedType,
      avatarValue: selectedValue,
    });
  }

  return (
    <div className="profile-card avatar-settings-card">
      <div className="profile-card-header">
        <div>
          <h3>Avatar Settings</h3>
          <p className="muted">Preview your avatar before saving it to your profile.</p>
        </div>
        <AvatarBadge
          avatarType={selectedType}
          avatarValue={selectedValue}
          username={username}
          size="large"
        />
      </div>

      <div className="avatar-picker-grid">
        <label className="upload-tile">
          <span>Upload image</span>
          <input type="file" accept="image/*" onChange={handleFileChange} />
          <small>Images are displayed inside the same circular avatar frame.</small>
        </label>

        <div className="picker-section">
          <span className="summary-label">Emoji avatars</span>
          <div className="avatar-option-grid">
            {EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className={`avatar-option ${
                  selectedType === "emoji" && selectedValue === emoji ? "active" : ""
                }`}
                onClick={() => selectPreset("emoji", emoji)}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        <div className="picker-section">
          <span className="summary-label">Flag avatars</span>
          <div className="avatar-option-grid">
            {FLAGS.map((flag) => (
              <button
                key={flag}
                type="button"
                className={`avatar-option ${
                  selectedType === "flag" && selectedValue === flag ? "active" : ""
                }`}
                onClick={() => selectPreset("flag", flag)}
              >
                {flag}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button type="button" className="primary-button" onClick={handleSave} disabled={isSaving}>
        {isSaving ? "Saving..." : "Save avatar"}
      </button>
    </div>
  );
}
