import { VEKOLE_SETTINGS, type VekoleSettings } from "./settings.ts";

export type FatigueState = {
  timesMs: number[];
  high: boolean;
  missStreak: number;
  normalStreak: number;
};

export function freshFatigue(): FatigueState {
  return { timesMs: [], high: false, missStreak: 0, normalStreak: 0 };
}

/**
 * Fatigue uses this session's answer times only.
 * It cannot turn on before 5 answers.
 * A normal-pace answer is one that is not slower than 1.8 times the previous average.
 * A miss at a normal pace counts toward clearing High.
 */
export function noteAnswer(
  state: FatigueState,
  ms: number,
  miss: boolean,
  settings: VekoleSettings = VEKOLE_SETTINGS,
): FatigueState {
  const previous = state.timesMs;
  const average = previous.length === 0 ? ms : previous.reduce((sum, time) => sum + time, 0) / previous.length;
  const slow = ms > settings.fatiguePace * average;
  const answered = previous.length + 1;
  const missStreak = miss ? state.missStreak + 1 : 0;
  let high = state.high;
  if (answered >= settings.fatigueMinAnswers && (slow || missStreak >= settings.fatigueMissStreak)) high = true;
  const normal = !slow;
  let normalStreak = 0;
  if (high && normal) normalStreak = state.normalStreak + 1;
  if (high && normalStreak >= settings.fatigueClearAnswers) {
    high = false;
    normalStreak = 0;
  }
  return { timesMs: [...previous, ms], high, missStreak, normalStreak };
}
