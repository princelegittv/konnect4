function toUtcDateParts(date = new Date()) {
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth(),
  };
}

export function getSeasonForDate(date = new Date()) {
  const { year, month } = toUtcDateParts(date);
  const quarter = Math.floor(month / 3) + 1;
  const startMonth = (quarter - 1) * 3;
  const endMonth = startMonth + 3;

  const startAt = new Date(Date.UTC(year, startMonth, 1, 0, 0, 0)).toISOString();
  const endAt = new Date(Date.UTC(year, endMonth, 1, 0, 0, 0)).toISOString();

  return {
    id: `${year}-Q${quarter}`,
    label: `Season ${year} Q${quarter}`,
    startAt,
    endAt,
    quarter,
    year,
  };
}

export function isSeasonExpired(season, now = new Date()) {
  return new Date(season.endAt).getTime() <= now.getTime();
}
