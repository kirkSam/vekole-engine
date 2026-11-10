import { isDue, retention, type MemoryRecord } from "./memory.ts";
import { VEKOLE_SETTINGS, type VekoleSettings } from "./settings.ts";

export function reviewSlotOpen(
  itemsServed: number,
  reviewsServed: number,
  fatigueHigh: boolean,
  settings: VekoleSettings = VEKOLE_SETTINGS,
): boolean {
  if (fatigueHigh) return false;
  if (reviewsServed >= settings.reviewMaxPerSession) return false;
  return (reviewsServed + 1) / (itemsServed + 1) <= 1 / settings.reviewEvery;
}

export function recheckDue(
  elapsedMs: number,
  itemsSinceNew: number,
  fatigueHigh: boolean,
  settings: VekoleSettings = VEKOLE_SETTINGS,
): boolean {
  if (fatigueHigh) return false;
  return elapsedMs >= settings.recheckAfterMs || itemsSinceNew >= settings.recheckAfterItems;
}

/** Lowest R first. Items that are not due are left out. */
export function mostFaded(records: readonly MemoryRecord[], now: Date, settings: VekoleSettings = VEKOLE_SETTINGS): MemoryRecord | null {
  let best: MemoryRecord | null = null;
  let bestR = Number.POSITIVE_INFINITY;
  for (const record of records) {
    if (!isDue(record, now, settings)) continue;
    const remembered = retention(record.strengthDays, (now.getTime() - Date.parse(record.lastPracticedAt)) / 86_400_000);
    if (remembered < bestR) {
      best = record;
      bestR = remembered;
    }
  }
  return best;
}
