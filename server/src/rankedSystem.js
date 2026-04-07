export const RANK_TIERS = [
  { name: "Bronze", minPoints: 0 },
  { name: "Silver", minPoints: 400 },
  { name: "Gold", minPoints: 850 },
  { name: "Platinum", minPoints: 1400 },
  { name: "Diamond", minPoints: 2100 },
  { name: "Master", minPoints: 3000 },
  { name: "Legend", minPoints: 4200 },
];

const TIER_INDEX = new Map(RANK_TIERS.map((tier, index) => [tier.name, index]));

export function getTierIndex(rankTier) {
  return TIER_INDEX.get(rankTier) ?? 0;
}

export function getRankTierForPoints(rankPoints) {
  let activeTier = RANK_TIERS[0].name;

  for (const tier of RANK_TIERS) {
    if (rankPoints >= tier.minPoints) {
      activeTier = tier.name;
    }
  }

  return activeTier;
}

export function getAllowedTierIndexes(baseIndex, expansionLevel = 0) {
  const lower = Math.max(0, baseIndex - expansionLevel);
  const upper = Math.min(RANK_TIERS.length - 1, baseIndex + expansionLevel);
  return new Set(
    Array.from({ length: upper - lower + 1 }, (_, offset) => lower + offset),
  );
}

export function getExpansionLevelFromQueueMs(queueDurationMs) {
  if (queueDurationMs >= 120_000) {
    return 3;
  }

  if (queueDurationMs >= 60_000) {
    return 2;
  }

  if (queueDurationMs >= 25_000) {
    return 1;
  }

  return 0;
}

export function calculateRankedPointChange({ outcome, winStreak = 0, disconnect = false }) {
  if (outcome === "win") {
    const basePoints = 28;
    const streakBonus = winStreak >= 3 ? 16 + (winStreak - 3) * 8 : 0;
    return basePoints + streakBonus;
  }

  if (disconnect) {
    return -34;
  }

  return -20;
}

export function applyRankedResult({
  currentPoints = 0,
  currentWinStreak = 0,
  outcome,
  disconnect = false,
}) {
  const nextWinStreak = outcome === "win" ? currentWinStreak + 1 : 0;
  const pointChange = calculateRankedPointChange({
    outcome,
    winStreak: nextWinStreak,
    disconnect,
  });
  const nextPoints = Math.max(0, currentPoints + pointChange);

  return {
    pointChange,
    nextPoints,
    nextWinStreak,
    nextRankTier: getRankTierForPoints(nextPoints),
  };
}
