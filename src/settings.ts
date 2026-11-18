/** Every tunable number. One-line changes belong here. */
export const VEKOLE_SETTINGS = {
  startingStrengthDays: 4.5,
  dueThreshold: 0.8,
  reviewMultiplier: 2.5,
  spacingBonus: 2,
  missFactor: 0.4,
  minimumStrengthDays: 1,
  recheckAfterMs: 10 * 60 * 1000,
  recheckAfterItems: 8,
  reviewEvery: 4,
  reviewMaxPerSession: 10,
  fatiguePace: 1.8,
  fatigueMinAnswers: 5,
  fatigueMissStreak: 3,
  fatigueClearAnswers: 3,
  answerLimit: 500,
  sightWordsSeconds: 20,
  phonemicAwarenessSeconds: 20,
  alphabetSeconds: 6,
  sightWordsListRule: 0.7,
  /** New words between a sight-word miss and its return in the same sitting. */
  spiralGapItems: 3,
  /** How many times a missed sight word may return in one sitting. */
  spiralMaxReturns: 2,
} as const;

export type VekoleSettings = typeof VEKOLE_SETTINGS;
