import { useEffect, useState } from "react";

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
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth > 960) {
        setIsOpen(false);
      }
    }

    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  function handleSelect(itemId) {
    onSelect(itemId);
    setIsOpen(false);
  }

  return (
    <>
      <div className="mobile-nav-bar">
        <div className="mobile-nav-copy">
          <span className="summary-label">Navigation</span>
          <strong>{NAV_ITEMS.find((item) => item.id === activeItem)?.label ?? "Play"}</strong>
        </div>

        <button
          type="button"
          className={`hamburger-button ${isOpen ? "active" : ""}`}
          onClick={() => setIsOpen((current) => !current)}
          aria-expanded={isOpen}
          aria-label="Toggle navigation menu"
        >
          <span />
          <span />
          <span />
        </button>
      </div>

      <div className="nav-menu nav-menu-desktop">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`pill-button ${activeItem === item.id ? "active" : ""}`}
            onClick={() => handleSelect(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {isOpen ? (
        <div className="mobile-nav-layer">
          <button
            type="button"
            className="mobile-nav-backdrop"
            onClick={() => setIsOpen(false)}
            aria-label="Close navigation"
          />

          <aside className="mobile-nav-sheet">
            <div className="mobile-nav-sheet-header">
              <div>
                <span className="summary-label">Konnect4</span>
                <h3>Menu</h3>
              </div>

              <button type="button" className="ghost-button" onClick={() => setIsOpen(false)}>
                Close
              </button>
            </div>

            <div className="mobile-nav-list">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`mobile-nav-item ${activeItem === item.id ? "active" : ""}`}
                  onClick={() => handleSelect(item.id)}
                >
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
