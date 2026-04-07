export default function PlaceholderPanel({ title, description, bullets = [] }) {
  return (
    <div className="mode-panel">
      <div>
        <h2>{title}</h2>
        <p className="muted">{description}</p>
      </div>

      {bullets.length ? (
        <div className="info-stack">
          {bullets.map((bullet) => (
            <div key={bullet} className="info-card">
              <p>{bullet}</p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
