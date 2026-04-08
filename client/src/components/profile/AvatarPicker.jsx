import { useMemo, useState } from "react";
import AvatarBadge from "./AvatarBadge";

const EMOJI_OPTIONS = [
  { value: "🎮", label: "Gaming" },
  { value: "🔥", label: "Fire" },
  { value: "⚡", label: "Lightning" },
  { value: "👑", label: "Crown" },
  { value: "🧠", label: "Brain" },
  { value: "🚀", label: "Rocket" },
  { value: "🛡️", label: "Shield" },
  { value: "🎯", label: "Target" },
  { value: "🐉", label: "Dragon" },
  { value: "🌙", label: "Moon" },
  { value: "🦅", label: "Eagle" },
  { value: "🌟", label: "Star" },
  { value: "💎", label: "Diamond" },
  { value: "🎧", label: "Headphones" },
  { value: "🤖", label: "Robot" },
  { value: "😎", label: "Cool" },
  { value: "🦁", label: "Lion" },
  { value: "🐺", label: "Wolf" },
  { value: "🦈", label: "Shark" },
  { value: "☄️", label: "Comet" },
];

const FLAG_OPTIONS = [
  { code: "US", value: "🇺🇸", label: "United States" },
  { code: "CA", value: "🇨🇦", label: "Canada" },
  { code: "MX", value: "🇲🇽", label: "Mexico" },
  { code: "BR", value: "🇧🇷", label: "Brazil" },
  { code: "GB", value: "🇬🇧", label: "United Kingdom" },
  { code: "FR", value: "🇫🇷", label: "France" },
  { code: "DE", value: "🇩🇪", label: "Germany" },
  { code: "JP", value: "🇯🇵", label: "Japan" },
  { code: "KR", value: "🇰🇷", label: "South Korea" },
  { code: "AU", value: "🇦🇺", label: "Australia" },
  { code: "IN", value: "🇮🇳", label: "India" },
  { code: "PH", value: "🇵🇭", label: "Philippines" },
  { code: "NG", value: "🇳🇬", label: "Nigeria" },
  { code: "ZA", value: "🇿🇦", label: "South Africa" },
  { code: "ES", value: "🇪🇸", label: "Spain" },
  { code: "IT", value: "🇮🇹", label: "Italy" },
  { code: "PT", value: "🇵🇹", label: "Portugal" },
  { code: "AR", value: "🇦🇷", label: "Argentina" },
  { code: "SE", value: "🇸🇪", label: "Sweden" },
  { code: "NO", value: "🇳🇴", label: "Norway" },
];

function findEmojiOption(value) {
  return EMOJI_OPTIONS.find((option) => option.value === value) ?? EMOJI_OPTIONS[0];
}

function findFlagOption(value) {
  return FLAG_OPTIONS.find((option) => option.value === value) ?? FLAG_OPTIONS[0];
}

export default function AvatarPicker({
  currentAvatarType,
  currentAvatarValue,
  username,
  onSave,
  isSaving,
}) {
  const initialEmoji = findEmojiOption(
    currentAvatarType === "emoji" ? currentAvatarValue : EMOJI_OPTIONS[0].value,
  );
  const initialFlag = findFlagOption(
    currentAvatarType === "flag" ? currentAvatarValue : FLAG_OPTIONS[0].value,
  );

  const [selectedType, setSelectedType] = useState(currentAvatarType ?? "emoji");
  const [selectedValue, setSelectedValue] = useState(currentAvatarValue ?? "🎮");
  const [selectedEmoji, setSelectedEmoji] = useState(initialEmoji.value);
  const [selectedFlag, setSelectedFlag] = useState(initialFlag.value);

  const selectedEmojiOption = useMemo(() => findEmojiOption(selectedEmoji), [selectedEmoji]);
  const selectedFlagOption = useMemo(() => findFlagOption(selectedFlag), [selectedFlag]);

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

  function handleEmojiSelect(event) {
    const nextValue = event.target.value;
    setSelectedEmoji(nextValue);
    selectPreset("emoji", nextValue);
  }

  function handleFlagSelect(event) {
    const nextValue = event.target.value;
    setSelectedFlag(nextValue);
    selectPreset("flag", nextValue);
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
          <small>Images are cropped to fit cleanly inside the circular avatar frame.</small>
        </label>

        <div className="picker-section">
          <div className="picker-header">
            <span className="summary-label">Emoji avatars</span>
            <label className="avatar-select-field">
              <span>More emojis</span>
              <select value={selectedEmoji} onChange={handleEmojiSelect}>
                {EMOJI_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.value} {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="avatar-current-choice">
            <span className="avatar-current-glyph">{selectedEmojiOption.value}</span>
            <span className="muted">{selectedEmojiOption.label}</span>
          </div>

          <div className="avatar-option-grid">
            {EMOJI_OPTIONS.slice(0, 10).map((option) => (
              <button
                key={option.value}
                type="button"
                className={`avatar-option ${
                  selectedType === "emoji" && selectedValue === option.value ? "active" : ""
                }`}
                onClick={() => {
                  setSelectedEmoji(option.value);
                  selectPreset("emoji", option.value);
                }}
                title={option.label}
              >
                {option.value}
              </button>
            ))}
          </div>
        </div>

        <div className="picker-section">
          <div className="picker-header">
            <span className="summary-label">Flag avatars</span>
            <label className="avatar-select-field">
              <span>Choose country</span>
              <select value={selectedFlag} onChange={handleFlagSelect}>
                {FLAG_OPTIONS.map((option) => (
                  <option key={option.code} value={option.value}>
                    {option.value} {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="avatar-current-choice">
            <span className="avatar-current-glyph flag-avatar">{selectedFlagOption.value}</span>
            <span className="muted">{selectedFlagOption.label}</span>
          </div>

          <div className="avatar-option-grid">
            {FLAG_OPTIONS.slice(0, 10).map((option) => (
              <button
                key={option.code}
                type="button"
                className={`avatar-option avatar-flag-option ${
                  selectedType === "flag" && selectedValue === option.value ? "active" : ""
                }`}
                onClick={() => {
                  setSelectedFlag(option.value);
                  selectPreset("flag", option.value);
                }}
                title={option.label}
              >
                <span className="flag-avatar">{option.value}</span>
                <span className="avatar-option-label">{option.code}</span>
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
