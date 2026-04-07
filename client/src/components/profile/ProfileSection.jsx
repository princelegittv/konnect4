import { getRankThemeClass } from "../../utils/rankTheme";
import AvatarBadge from "./AvatarBadge";
import AvatarPicker from "./AvatarPicker";

function statValue(value) {
  return value ?? 0;
}

export default function ProfileSection({
  profile,
  currentSeason,
  currentSeasonStats,
  allTimeStats,
  onSaveAvatar,
  isSavingAvatar,
}) {
  const rankThemeClass = getRankThemeClass(profile.rankTier);
  const seasonRankThemeClass = getRankThemeClass(currentSeasonStats?.rankTier ?? profile.rankTier);

  return (
    <div className="profile-layout">
      <section className="profile-overview-card">
        <div className="profile-overview-top">
          <div className="profile-header">
            <AvatarBadge
              avatarType={profile.avatarType}
              avatarValue={profile.avatarValue}
              username={profile.username}
              size="xl"
            />

            <div>
              <p className="eyebrow">Profile</p>
              <h2>{profile.username}</h2>
              <p className="muted">{profile.email}</p>
            </div>
          </div>

          <div className={`rank-pill large ${rankThemeClass}`}>
            <span>{profile.rankTier}</span>
            <strong>{profile.rankPoints} RP</strong>
          </div>
        </div>

        <div className="profile-stats-grid">
          <div className={`summary-card rank-summary ${rankThemeClass}`}>
            <span className="summary-label">Current tier</span>
            <strong>{profile.rankTier}</strong>
          </div>
          <div className="summary-card">
            <span className="summary-label">Rank points</span>
            <strong>{profile.rankPoints}</strong>
          </div>
          <div className="summary-card">
            <span className="summary-label">Win streak</span>
            <strong>{profile.winStreak}</strong>
          </div>
          <div className="summary-card">
            <span className="summary-label">Ranked record</span>
            <strong>
              {profile.rankedWins}-{profile.rankedLosses}
            </strong>
          </div>
          <div className="summary-card">
            <span className="summary-label">Overall online record</span>
            <strong>
              {statValue(allTimeStats?.onlineWins)}-{statValue(allTimeStats?.onlineLosses)}
            </strong>
          </div>
          <div className="summary-card">
            <span className="summary-label">Season</span>
            <strong>{currentSeason?.label ?? "Current season"}</strong>
          </div>
        </div>
      </section>

      <section className="profile-stats-columns">
        <div className="profile-card">
          <h3>Current Season Stats</h3>
          <div className="profile-stats-grid compact">
            <div className={`summary-card rank-summary ${seasonRankThemeClass}`}>
              <span className="summary-label">Tier</span>
              <strong>{currentSeasonStats?.rankTier ?? profile.rankTier}</strong>
            </div>
            <div className="summary-card">
              <span className="summary-label">Points</span>
              <strong>{statValue(currentSeasonStats?.rankPoints)}</strong>
            </div>
            <div className="summary-card">
              <span className="summary-label">Wins</span>
              <strong>{statValue(currentSeasonStats?.wins)}</strong>
            </div>
            <div className="summary-card">
              <span className="summary-label">Losses</span>
              <strong>{statValue(currentSeasonStats?.losses)}</strong>
            </div>
            <div className="summary-card">
              <span className="summary-label">Ranked wins</span>
              <strong>{statValue(currentSeasonStats?.rankedWins)}</strong>
            </div>
            <div className="summary-card">
              <span className="summary-label">Ranked losses</span>
              <strong>{statValue(currentSeasonStats?.rankedLosses)}</strong>
            </div>
          </div>
        </div>

        <div className="profile-card">
          <h3>All-Time Stats</h3>
          <div className="profile-stats-grid compact">
            <div className="summary-card">
              <span className="summary-label">Matches</span>
              <strong>{statValue(allTimeStats?.matchesPlayed)}</strong>
            </div>
            <div className="summary-card">
              <span className="summary-label">Wins</span>
              <strong>{statValue(allTimeStats?.wins)}</strong>
            </div>
            <div className="summary-card">
              <span className="summary-label">Losses</span>
              <strong>{statValue(allTimeStats?.losses)}</strong>
            </div>
            <div className="summary-card">
              <span className="summary-label">Private record</span>
              <strong>
                {statValue(allTimeStats?.privateWins)}-{statValue(allTimeStats?.privateLosses)}
              </strong>
            </div>
            <div className="summary-card">
              <span className="summary-label">Random record</span>
              <strong>
                {statValue(allTimeStats?.randomWins)}-{statValue(allTimeStats?.randomLosses)}
              </strong>
            </div>
            <div className="summary-card">
              <span className="summary-label">AI record</span>
              <strong>
                {statValue(allTimeStats?.aiWins)}-{statValue(allTimeStats?.aiLosses)}
              </strong>
            </div>
          </div>
        </div>
      </section>

      <AvatarPicker
        currentAvatarType={profile.avatarType}
        currentAvatarValue={profile.avatarValue}
        username={profile.username}
        onSave={onSaveAvatar}
        isSaving={isSavingAvatar}
      />
    </div>
  );
}
