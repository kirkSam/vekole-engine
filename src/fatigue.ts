import { VEKOLE_SETTINGS, type VekoleSettings } from "./settings.ts";

export type FatigueState = {
  timesMs: number[];
  high: boolean;
  missStreak: number;
  normalStreak: number;
  /** Every answer this sitting, including misses and timeouts. Older rows omit it. */
  answers?: number;
};

export function freshFatigue(): FatigueState {
  return { timesMs: [], high: false, missStreak: 0, normalStreak: 0, answers: 0 };
}

/**
 * Fatigue uses this session's correct answer times only.
 * A miss or a timeout still counts as an answer, but it is not a pace sample.
 * Its length cannot turn fatigue high and cannot change the average.
 * Fatigue cannot turn on before fatigueMinAnswers answers.
 * A normal-pace answer is a correct answer that is not slower than fatiguePace times the previous average.
 * Only a correct answer at that pace counts toward clearing High.
 * A miss resets that count to zero.
 */
export function noteAnswer(
  state: FatigueState,
  ms: number,
  miss: boolean,
  settings: VekoleSettings = VEKOLE_SETTINGS,
): FatigueState {
  const pace = state.timesMs;
  const average = pace.length === 0 ? ms : pace.reduce((sum, time) => sum + time, 0) / pace.length;
  const slow = !miss && pace.length > 0 && ms > settings.fatiguePace * average;
  const answers = (typeof state.answers === "number" ? state.answers : pace.length) + 1;
  const missStreak = miss ? state.missStreak + 1 : 0;
  let high = state.high;
  if (answers >= settings.fatigueMinAnswers && (slow || missStreak >= settings.fatigueMissStreak)) high = true;
  const normal = !slow && !miss;
  let normalStreak = 0;
  if (high && normal) normalStreak = state.normalStreak + 1;
  if (high && normalStreak >= settings.fatigueClearAnswers) {
    high = false;
    normalStreak = 0;
  }
  return {
    timesMs: miss ? pace : [...pace, ms],
    high,
    missStreak,
    normalStreak,
    answers,
  };
}
