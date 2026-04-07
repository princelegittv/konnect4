const RANK_CLASS_BY_TIER = {
  bronze: "rank-bronze",
  silver: "rank-silver",
  gold: "rank-gold",
  platinum: "rank-platinum",
  diamond: "rank-diamond",
  master: "rank-master",
  legend: "rank-legend",
};

export function getRankThemeClass(rankTier) {
  if (!rankTier) {
    return "rank-unranked";
  }

  const normalizedTier = String(rankTier).trim().toLowerCase();
  return RANK_CLASS_BY_TIER[normalizedTier] ?? "rank-unranked";
}
