const DIFFICULTIES = ["easy", "medium", "hard", "extreme", "impossible"];

export default function PracticePanel({
  difficulty,
  onDifficultyChange,
  onStartPractice,
  isBusy,
}) {
  return (
    <div className="mode-panel">
      <div>
        <h2>Practice vs AI</h2>
        <p className="muted">
          Train against PrinceLegitTV, from casual random play all the way to near-perfect search.
        </p>
      </div>

      <div className="difficulty-grid">
        {DIFFICULTIES.map((entry) => (
          <button
            key={entry}
            type="button"
            className={`pill-button ${difficulty === entry ? "active" : ""}`}
            onClick={() => onDifficultyChange(entry)}
          >
            {entry}
          </button>
        ))}
      </div>

      <div className="status-banner">
        <strong>Selected difficulty: {difficulty}</strong>
        <p>
          Easy is mostly random, medium blocks basic threats, and impossible uses deeper minimax
          with alpha-beta pruning.
        </p>
      </div>

      <button type="button" className="primary-button" onClick={onStartPractice} disabled={isBusy}>
        {isBusy ? "Working..." : "Start practice match"}
      </button>
    </div>
  );
}
