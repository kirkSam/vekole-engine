/** The same parent sentences on the app and the website. */

export function dueForReviewToday(count: number): string | null {
  if (!Number.isFinite(count) || count <= 0) return null;
  return `Due for review today: ${Math.floor(count)}`;
}

export function reviewedToday(reviewed: number, remembered: number): string {
  const shown = Number.isFinite(reviewed) && reviewed > 0 ? Math.floor(reviewed) : 0;
  const kept = Number.isFinite(remembered) && remembered > 0 ? Math.floor(remembered) : 0;
  return `Reviewed today: ${shown}. Remembered: ${kept}.`;
}
