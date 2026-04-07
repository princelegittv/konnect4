# Konnect4 UI Blueprint

## Tailwind Config Updates

Tailwind-ready config lives in `client/tailwind.config.js`.

Recommended install when you are ready to activate it:

```bash
npm install -D tailwindcss postcss autoprefixer
```

Recommended theme tokens:

```js
colors: {
  konnect4: {
    bg: "#0B1220",
    card: "#111827",
    gold: "#FACC15",
    "gold-hover": "#FDE047",
    "gold-active": "#EAB308",
    blue: "#2563EB",
    green: "#22C55E",
    red: "#EF4444",
    yellow: "#FACC15",
    text: "#F9FAFB",
    muted: "#9CA3AF",
    board: "#1E3A8A",
    hole: "#0B1220",
    bronze: "#CD7F32",
    silver: "#C0C0C0",
    goldrank: "#FFD700",
    platinum: "#60A5FA",
    diamond: "#22D3EE",
    master: "#A855F7"
  }
}
```

## Reusable Utility Classes

Live plain-CSS helpers are in `client/src/styles/utilities.css`.

Recommended utility patterns:

```css
.u-surface-card { ... }
.u-gold-glow { ... }
.u-text-muted { ... }
.u-stack-md { ... }
.u-responsive-grid-2 { ... }
.u-identity-row { ... }
```

## Profile Page Layout

Recommended structure:

```text
ProfileSection
- Profile overview hero
- Rank pill and identity summary
- Current season stats grid
- All-time stats grid
- Avatar settings card
```

Use:
- large circular avatar
- tier-colored rank pill
- compact stat cards with muted labels
- two-column layout on desktop
- stacked cards on mobile

## Leaderboard Page Layout

Recommended structure:

```text
LeaderboardSection
- hero summary row
- filter card
- rank showcase card
- standings list
```

Leaderboard rows should include:
- placement
- avatar
- username
- country/region
- rank pill
- rank points
- record
- win rate
- online status

## React Component Structure

Recommended frontend slices:

```text
components/
  auth/
  friends/
    FriendsSection.jsx
  home/
  leaderboards/
    LeaderboardSection.jsx
  profile/
    AvatarBadge.jsx
    AvatarPicker.jsx
    ProfileSection.jsx
  game/
    GameBoard.jsx
    RoomScreen.jsx
    StatusPanel.jsx
utils/
  rankTheme.js
styles/
  app.css
  utilities.css
```

## Avatar UI Guidance

Avatar interaction model:

1. Upload image from device and preview in a circular crop.
2. Pick an emoji avatar.
3. Pick a country flag emoji avatar.
4. Save avatar through `PATCH /api/profile/avatar`.

Avatar rendering rules:

- uploaded images: `object-fit: cover`
- emoji avatars: centered glyph in the same circular badge
- flag avatars: same circular badge, slightly smaller font for balance
- use the same `AvatarBadge` component everywhere

## Responsive Layout Guidance

Desktop:
- keep dashboard content centered at `~940px`
- use 2-column grids for stats and utility panels
- keep hero/status compact

Tablet/mobile:
- collapse to one column under `960px`
- stack action rows and list-card controls under `640px`
- keep board padding tight and touch targets large

## Implementation-Ready Examples

### Profile identity row

```jsx
<div className="identity-row">
  <AvatarBadge avatarType={profile.avatarType} avatarValue={profile.avatarValue} username={profile.username} size="small" />
  <div className="identity-copy">
    <strong>{profile.username}</strong>
    <small>{profile.email}</small>
  </div>
  <div className={`rank-pill compact ${getRankThemeClass(profile.rankTier)}`}>
    <span>{profile.rankTier}</span>
    <strong>{profile.rankPoints} RP</strong>
  </div>
</div>
```

### Leaderboard row

```jsx
<div className="leaderboard-row">
  <div className="leaderboard-rank">1</div>
  <div className="identity-row">
    <AvatarBadge avatarType={entry.avatarType} avatarValue={entry.avatarValue} username={entry.username} size="small" />
    <div className="identity-copy">
      <strong>{entry.username}</strong>
      <small>{entry.country} • {entry.region}</small>
    </div>
    <div className={`rank-pill compact ${getRankThemeClass(entry.rankTier)}`}>
      <span>{entry.rankTier}</span>
      <strong>{entry.rankPoints} RP</strong>
    </div>
  </div>
  <div className="leaderboard-stats">
    <div className="metric-chip">
      <span className="summary-label">Record</span>
      <strong>{entry.rankedWins}-{entry.rankedLosses}</strong>
    </div>
  </div>
</div>
```

### Avatar picker presets

```jsx
const EMOJIS = ["🎮", "🔥", "⚡", "👑", "🧠"];
const FLAGS = ["🇺🇸", "🇨🇦", "🇲🇽", "🇯🇵", "🇬🇧"];
```
