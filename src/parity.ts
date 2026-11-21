/**
 * The fixed examples both sides must reproduce.
 * Running this list is the parity check. It does not save a record.
 */
import { AGREED_VERSION } from "./agreed-version.ts";
import { noteAnswer, freshFatigue } from "./fatigue.ts";
import { applyRecheck, applyReview, allowsEarlyStepDown, createMemory, dueInDays, isDue } from "./memory.ts";
import { mostFaded, recheckDue, reviewSlotOpen } from "./serve.ts";
import { chooseSightServe, freshSpirals, settleSightWord, type SpiralWord } from "./spiral.ts";
import { dueForReviewToday, reviewedToday } from "./sentences.ts";
import { VEKOLE_SETTINGS } from "./settings.ts";

export type ParityResult = { name: string; ok: boolean; detail: string };

const DAY = 86_400_000;

function close(actual: number, expected: number, slack: number): boolean {
  return Math.abs(actual - expected) <= slack;
}

function addDays(start: Date, days: number): Date {
  return new Date(start.getTime() + days * DAY);
}

export function runParity(now = new Date("2026-11-15T19:00:00.000Z")): ParityResult[] {
  const results: ParityResult[] = [];
  const check = (name: string, ok: boolean, detail: string) => results.push({ name, ok, detail });

  const first = createMemory(now);
  check(
    "first correct answer",
    first.strengthDays === 4.5 && first.reviews === 0 && first.misses === 0 && close(dueInDays(4.5), 1.004, 0.0005),
    `S=${first.strengthDays}, due in ${dueInDays(4.5).toFixed(4)} days`,
  );

  const rechecked = applyRecheck(first, true, addDays(now, 10 / 1440));
  check(
    "correct same-session re-check",
    rechecked.strengthDays === 4.5 && rechecked.lastPracticedAt === first.lastPracticedAt && rechecked.reviews === 0,
    `S=${rechecked.strengthDays}`,
  );

  const missedRecheck = applyRecheck(first, false, addDays(now, 10 / 1440));
  check(
    "missed re-check",
    close(missedRecheck.strengthDays, 1.8, 1e-9) && close(dueInDays(missedRecheck.strengthDays), 0.4, 0.005),
    `S=${missedRecheck.strengthDays}, due in ${dueInDays(missedRecheck.strengthDays).toFixed(3)} days`,
  );

  const strengths = [11.25, 28.125, 70.3125, 175.78125];
  const gaps = [2.51, 6.28, 15.69, 39.22];
  let record = rechecked;
  let cursor = now;
  for (let i = 0; i < 4; i += 1) {
    const due = dueInDays(record.strengthDays);
    cursor = addDays(cursor, due);
    const before = record.strengthDays;
    record = applyReview(record, true, cursor);
    check(
      `on-time review ${i + 1}`,
      close(record.strengthDays, strengths[i], 1e-6) && close(due, i === 0 ? 1.004 : gaps[i - 1], 0.01),
      `from ${before} to ${record.strengthDays}, previous gap ${due.toFixed(3)} days`,
    );
  }
  check(
    "next gaps after those reviews",
    close(dueInDays(strengths[0]), gaps[0], 0.01) &&
      close(dueInDays(strengths[1]), gaps[1], 0.01) &&
      close(dueInDays(strengths[2]), gaps[2], 0.01) &&
      close(dueInDays(strengths[3]), gaps[3], 0.01),
    strengths.map((strength) => dueInDays(strength).toFixed(2)).join(", "),
  );

  const overdueDays = -4.5 * Math.log(0.6);
  const overdue = applyReview(createMemory(now), true, addDays(now, overdueDays));
  check(
    "overdue correct review at R = 0.60",
    close(overdue.strengthDays, 4.5 * 2.9, 1e-6),
    `S=${overdue.strengthDays}, multiplier ${overdue.strengthDays / 4.5}`,
  );

  const missedReview = applyReview(first, false, addDays(now, 2));
  check(
    "missed review",
    close(missedReview.strengthDays, 1.8, 1e-9) && missedReview.misses === 1,
    `S=${missedReview.strengthDays}`,
  );

  check(
    "reviews never change the growth level",
    !("level" in record) && !("level" in rechecked) && !("level" in missedReview),
    "no level field",
  );

  check("no review in the first three items", reviewSlotOpen(0, 0, false) === false && reviewSlotOpen(2, 0, false) === false, "closed");
  check(
    "one review in every four items",
    reviewSlotOpen(VEKOLE_SETTINGS.reviewEvery - 1, 0, false) === true && reviewSlotOpen(0, 1, false) === false,
    "opens after the gap, then closes",
  );
  check("ten reviews is the session cap", reviewSlotOpen(100, 10, false) === false, "closed");
  check("fatigue blocks a review slot", reviewSlotOpen(3, 0, true) === false, "closed");

  const faded = { ...createMemory(addDays(now, -20)), strengthDays: 4.5 };
  const fresh = { ...createMemory(addDays(now, -1)), strengthDays: 4.5 };
  check("lowest R is served first", mostFaded([fresh, faded], now) === faded, faded.lastPracticedAt);

  check(
    "a re-check waits for 10 minutes or 8 items",
    recheckDue(VEKOLE_SETTINGS.recheckAfterMs, 0, false) === true &&
      recheckDue(0, VEKOLE_SETTINGS.recheckAfterItems, false) === true &&
      recheckDue(0, 7, false) === false,
    "10 minutes or 8 items",
  );
  check("fatigue blocks a re-check", recheckDue(VEKOLE_SETTINGS.recheckAfterMs, 8, true) === false, "waits");

  let fatigue = freshFatigue();
  for (let n = 0; n < 4; n += 1) fatigue = noteAnswer(fatigue, 1000, false);
  check("fatigue stays clear before 5 answers", fatigue.high === false, `${fatigue.timesMs.length} answers`);
  const slow = noteAnswer(fatigue, 1000 * VEKOLE_SETTINGS.fatiguePace + 1, false);
  check("a slow fifth answer turns fatigue high", slow.high === true, "high");
  let longMiss = freshFatigue();
  for (let n = 0; n < 4; n += 1) longMiss = noteAnswer(longMiss, 1000, false);
  longMiss = noteAnswer(longMiss, 20000, true);
  check(
    "a long miss is not a pace sample",
    longMiss.high === false && longMiss.timesMs.length === 4 && longMiss.timesMs.every((time) => time === 1000),
    `${longMiss.timesMs.length}`,
  );
  let misses = freshFatigue();
  for (let n = 0; n < 2; n += 1) misses = noteAnswer(misses, 1000, false);
  for (let n = 0; n < 3; n += 1) misses = noteAnswer(misses, 1000, true);
  check("three misses in a row turn fatigue high", misses.high === true, "high");
  let clearing = slow;
  clearing = noteAnswer(clearing, 1000, false);
  clearing = noteAnswer(clearing, 1000, false);
  check("two normal answers do not clear fatigue", clearing.high === true, "still high");
  clearing = noteAnswer(clearing, 1000, false);
  check("three normal answers clear fatigue", clearing.high === false, "clear");
  let missesWhileHigh = slow;
  missesWhileHigh = noteAnswer(missesWhileHigh, 1000, true);
  missesWhileHigh = noteAnswer(missesWhileHigh, 1000, true);
  missesWhileHigh = noteAnswer(missesWhileHigh, 1000, true);
  check("misses at a normal pace do not clear fatigue", missesWhileHigh.high === true, "still high");
  let clearedByCorrect = missesWhileHigh;
  clearedByCorrect = noteAnswer(clearedByCorrect, 1000, false);
  clearedByCorrect = noteAnswer(clearedByCorrect, 1000, false);
  clearedByCorrect = noteAnswer(clearedByCorrect, 1000, false);
  check("three correct answers at a normal pace clear fatigue", clearedByCorrect.high === false, "clear");

  check("Sight Words never steps to an easier list", allowsEarlyStepDown("sw", true) === false, "no");
  check("Alphabet keeps its own step-back", allowsEarlyStepDown("sp", true) === false, "no");
  check("windows stay 20, 20, and 6 seconds", VEKOLE_SETTINGS.sightWordsSeconds === 20 && VEKOLE_SETTINGS.phonemicAwarenessSeconds === 20 && VEKOLE_SETTINGS.alphabetSeconds === 6, "20, 20, 6");
  check("Sight Words list rule stays 70%", VEKOLE_SETTINGS.sightWordsListRule === 0.7, String(VEKOLE_SETTINGS.sightWordsListRule));
  check(
    "spiral settings stay 3 new words and 2 returns",
    VEKOLE_SETTINGS.spiralGapItems === 3 && VEKOLE_SETTINGS.spiralMaxReturns === 2,
    `${VEKOLE_SETTINGS.spiralGapItems}, ${VEKOLE_SETTINGS.spiralMaxReturns}`,
  );
  const spiral = replayMissedThe(now);
  check(
    "a miss at item 5 returns after 3 new words",
    spiral.served[4] === "new:the" && spiral.served[8] === "spiral:the",
    spiral.served.slice(0, 9).join(" "),
  );
  check(
    "a second miss returns at item 13 and then rests",
    spiral.served[12] === "spiral:the" && spiral.served.slice(13).every((item) => item !== "spiral:the" && item !== "review:the"),
    spiral.served.slice(8).join(" "),
  );
  check(
    "spirals and reviews stay at most one in four",
    spiral.windowsOk,
    "window",
  );
  check("high fatigue serves no spiral", spiral.fatigueBlocks, "paused");
  check(
    "a correct spiral counts as known and holds the level",
    spiral.correctKnown && spiral.correctHolds && spiral.correctCrossesList,
    "known",
  );
  check("the first review is not due before its time", isDue(first, addDays(now, dueInDays(4.5) - 0.01)) === false, "not yet");
  check("due line is hidden at zero", dueForReviewToday(0) === null, "hidden");
  check("due line names the count", dueForReviewToday(2) === "Due for review today: 2", dueForReviewToday(2) ?? "");
  check("session report sentence", reviewedToday(4, 3) === "Reviewed today: 4. Remembered: 3.", reviewedToday(4, 3));
  check("agreed tag", AGREED_VERSION === "v0.2.4", AGREED_VERSION);

  return results;
}

/** Miss "the" at item 5. The package, not the caller, chooses when it returns. */
function replayMissedThe(now: Date): {
  served: string[];
  windowsOk: boolean;
  fatigueBlocks: boolean;
  correctKnown: boolean;
  correctHolds: boolean;
  correctCrossesList: boolean;
} {
  const planned = ["a", "b", "c", "d", "the", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q"];
  let itemsServed = 0;
  let reviewsServed = 0;
  let itemsSinceMixed = 0;
  let spirals: SpiralWord[] = freshSpirals();
  const rows = new Map<string, { strengthDays: number; lastPracticedAt: string; reviews: number; misses: number; known: boolean }>();
  const served: string[] = [];
  let plan = 0;
  for (let step = 0; step < 30 && plan <= planned.length; step += 1) {
    const records = [...rows.entries()].map(([itemKey, row]) => ({ itemKey, ...row }));
    const choice = chooseSightServe({ itemsSinceMixed, reviewsServed, fatigueHigh: false, spirals, records, now });
    let key = choice.itemKey;
    let correct = choice.kind === "spiral" ? false : true;
    if (choice.kind === "new") {
      const next = planned[plan];
      plan += 1;
      if (!next) break;
      key = next;
      correct = next !== "the";
    }
    const prior = rows.get(key);
    const settled = settleSightWord({
      itemsServed,
      reviewsServed,
      itemsSinceMixed,
      spirals,
      itemKey: key,
      kind: choice.kind,
      correct,
      record: prior ?? null,
      known: prior?.known === true,
      now,
    });
    itemsServed = settled.itemsServed;
    reviewsServed = settled.reviewsServed;
    itemsSinceMixed = settled.itemsSinceMixed;
    spirals = settled.spirals;
    rows.set(key, { ...settled.record, known: settled.known });
    served.push(`${choice.kind}:${key}`);
  }
  let windowsOk = served.length >= 16;
  for (let index = 0; index + 4 <= served.length; index += 1) {
    const mixed = served.slice(index, index + 4).filter((item) => !item.startsWith("new:")).length;
    if (mixed > 1) windowsOk = false;
  }

  let probeServed = 0;
  let probeReviews = 0;
  let probeSince = 0;
  let probeSpirals: SpiralWord[] = freshSpirals();
  const probeRows = new Map<string, { strengthDays: number; lastPracticedAt: string; reviews: number; misses: number; known: boolean }>();
  const probePlan = ["a", "b", "c", "d", "the", "e", "f", "g"];
  let probeAt = 0;
  let correctKnown = false;
  let correctHolds = false;
  let blocked = false;
  let cleared = false;
  for (let step = 0; step < 12; step += 1) {
    const records = [...probeRows.entries()].map(([itemKey, row]) => ({ itemKey, ...row }));
    const high = step === 8;
    const choice = chooseSightServe({
      itemsSinceMixed: probeSince,
      reviewsServed: probeReviews,
      fatigueHigh: high,
      spirals: probeSpirals,
      records,
      now,
    });
    if (high) {
      blocked = choice.kind !== "spiral";
      const again = chooseSightServe({
        itemsSinceMixed: probeSince,
        reviewsServed: probeReviews,
        fatigueHigh: false,
        spirals: probeSpirals,
        records,
        now,
      });
      cleared = again.kind === "spiral" && again.itemKey === "the";
      if (again.kind === "spiral") {
        const prior = probeRows.get(again.itemKey);
        const settled = settleSightWord({
          itemsServed: probeServed,
          reviewsServed: probeReviews,
          itemsSinceMixed: probeSince,
          spirals: probeSpirals,
          itemKey: again.itemKey,
          kind: "spiral",
          correct: true,
          record: prior ?? null,
          known: false,
          now,
        });
        correctKnown =
          settled.known &&
          settled.record.strengthDays === prior?.strengthDays &&
          settled.record.lastPracticedAt === prior?.lastPracticedAt;
        correctHolds = settled.holdLevel;
      }
      break;
    }
    let key = choice.itemKey;
    let correct = true;
    if (choice.kind === "new") {
      const next = probePlan[probeAt];
      probeAt += 1;
      if (!next) break;
      key = next;
      correct = next !== "the";
    }
    const prior = probeRows.get(key);
    const settled = settleSightWord({
      itemsServed: probeServed,
      reviewsServed: probeReviews,
      itemsSinceMixed: probeSince,
      spirals: probeSpirals,
      itemKey: key,
      kind: choice.kind,
      correct,
      record: prior ?? null,
      known: prior?.known === true,
      now,
    });
    probeServed = settled.itemsServed;
    probeReviews = settled.reviewsServed;
    probeSince = settled.itemsSinceMixed;
    probeSpirals = settled.spirals;
    probeRows.set(key, { ...settled.record, known: settled.known });
    if (choice.kind === "spiral") {
      correctKnown = settled.known && key === "the";
      correctHolds = settled.holdLevel;
    }
  }
  const knownBefore = 6;
  const knownAfter = knownBefore + (correctKnown ? 1 : 0);
  const rule = VEKOLE_SETTINGS.sightWordsListRule;
  return {
    served,
    windowsOk,
    fatigueBlocks: blocked && cleared,
    correctKnown,
    correctHolds,
    correctCrossesList: knownBefore / 10 < rule && knownAfter / 10 >= rule,
  };
}
