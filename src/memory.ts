import { VEKOLE_SETTINGS, type VekoleSettings } from "./settings.ts";

export type MemoryRecord = {
  strengthDays: number;
  lastPracticedAt: string;
  reviews: number;
  misses: number;
};

const DAY_MS = 86_400_000;

export function daysSince(lastPracticedAt: string, now: Date): number {
  return (now.getTime() - Date.parse(lastPracticedAt)) / DAY_MS;
}

/** R = e^(-t/S). */
export function retention(strengthDays: number, days: number): number {
  if (strengthDays <= 0) return 0;
  return Math.exp(-days / strengthDays);
}

export function isDue(record: MemoryRecord, now: Date, settings: VekoleSettings = VEKOLE_SETTINGS): boolean {
  return retention(record.strengthDays, daysSince(record.lastPracticedAt, now)) < settings.dueThreshold;
}

export function createMemory(now: Date, settings: VekoleSettings = VEKOLE_SETTINGS): MemoryRecord {
  return {
    strengthDays: settings.startingStrengthDays,
    lastPracticedAt: now.toISOString(),
    reviews: 0,
    misses: 0,
  };
}

function miss(record: MemoryRecord, now: Date, settings: VekoleSettings): MemoryRecord {
  return {
    strengthDays: Math.max(settings.minimumStrengthDays, record.strengthDays * settings.missFactor),
    lastPracticedAt: now.toISOString(),
    reviews: record.reviews,
    misses: record.misses + 1,
  };
}

/**
 * A correct re-check does not boost strength and does not move the due clock.
 * A miss still shortens strength.
 */
export function applyRecheck(
  record: MemoryRecord,
  correct: boolean,
  now: Date,
  settings: VekoleSettings = VEKOLE_SETTINGS,
): MemoryRecord {
  if (correct) return { ...record };
  return miss(record, now, settings);
}

export function applyReview(
  record: MemoryRecord,
  correct: boolean,
  now: Date,
  settings: VekoleSettings = VEKOLE_SETTINGS,
): MemoryRecord {
  if (!correct) return miss(record, now, settings);
  const remembered = retention(record.strengthDays, daysSince(record.lastPracticedAt, now));
  const factor =
    settings.reviewMultiplier + settings.spacingBonus * Math.max(0, settings.dueThreshold - remembered);
  return {
    strengthDays: record.strengthDays * factor,
    lastPracticedAt: now.toISOString(),
    reviews: record.reviews + 1,
    misses: record.misses,
  };
}

/** Sight Words and Alphabet do not take an early step down from fatigue. */
export function allowsEarlyStepDown(engine: string, fatigueHigh: boolean): boolean {
  if (!fatigueHigh) return false;
  if (engine === "sw" || engine === "sp") return false;
  return true;
}
