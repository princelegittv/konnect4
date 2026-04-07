const PLAY_MODES = [
  {
    id: "private",
    title: "Private Match",
    description: "Create a room and invite a friend by code.",
  },
  {
    id: "random",
    title: "Random Match",
    description: "Find the next available online opponent.",
  },
];

export default function PlayModeSelector({ activeMode, onSelect }) {
  return (
    <div className="mode-grid">
      {PLAY_MODES.map((mode) => (
        <button
          key={mode.id}
          type="button"
          className={`mode-card ${activeMode === mode.id ? "active" : ""}`}
          data-mode={mode.id}
          onClick={() => onSelect(mode.id)}
        >
          <strong>{mode.title}</strong>
          <span>{mode.description}</span>
        </button>
      ))}
    </div>
  );
}
