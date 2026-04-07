const NAV_ITEMS = [
  { id: "play", label: "Play" },
  { id: "ranked", label: "Ranked" },
  { id: "practice", label: "Practice" },
  { id: "live", label: "Live Matches" },
  { id: "friends", label: "Friends" },
  { id: "leaderboards", label: "Leaderboards" },
  { id: "account", label: "Profile" },
];

export default function NavigationMenu({ activeItem, onSelect }) {
  return (
    <div className="nav-menu">
      {NAV_ITEMS.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`pill-button ${activeItem === item.id ? "active" : ""}`}
          onClick={() => onSelect(item.id)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
