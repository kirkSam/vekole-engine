import { applyRecheck, applyReview, createMemory, type MemoryRecord } from "./memory.ts";
import { mostFaded, reviewSlotOpen } from "./serve.ts";
import { VEKOLE_SETTINGS, type VekoleSettings } from "./settings.ts";

/**
 * Sight Words only. A missed word can return in this same sitting.
 * Other engines do not use this until Sam says so.
 * The gap and the return cap live in VEKOLE_SETTINGS. Do not copy them.
 */
export type SpiralWord = {
  itemKey: string;
  /** New words served since this word was last missed. */
  newWords: number;
  /** Times it has already come back this sitting. */
  returns: number;
  /** False after a correct answer. Also false for the rest of the sitting once the return cap is used. */
  waiting: boolean;
};

export type SightServeKind = "new" | "spiral" | "review";

export type KeyedMemory = MemoryRecord & { itemKey: string };

export function freshSpirals(): SpiralWord[] {
  return [];
}

/** A spiral uses the re-check rule. A correct answer leaves strength and the due clock. */
export function applySpiral(
  record: MemoryRecord,
  correct: boolean,
  now: Date,
  settings: VekoleSettings = VEKOLE_SETTINGS,
): MemoryRecord {
  return applyRecheck(record, correct, now, settings);
}

function dueSpiral(spirals: readonly SpiralWord[], settings: VekoleSettings): SpiralWord | undefined {
  return spirals.find(
    (word) => word.waiting && word.newWords >= settings.spiralGapItems && word.returns < settings.spiralMaxReturns,
  );
}

/**
 * What to show next.
 * A due spiral takes the shared review slot before an Ebbinghaus review.
 * High fatigue, or a closed slot, serves a new word instead.
 */
export function chooseSightServe(input: {
  /** Items served since the last spiral or review. The package owns how many open the slot. */
  itemsSinceMixed: number;
  reviewsServed: number;
  fatigueHigh: boolean;
  spirals: readonly SpiralWord[];
  records: readonly KeyedMemory[];
  now: Date;
  settings?: VekoleSettings;
}): { kind: SightServeKind; itemKey: string } {
  const settings = input.settings ?? VEKOLE_SETTINGS;
  if (!reviewSlotOpen(input.itemsSinceMixed, input.reviewsServed, input.fatigueHigh, settings)) {
    return { kind: "new", itemKey: "" };
  }
  const spiral = dueSpiral(input.spirals, settings);
  if (spiral) return { kind: "spiral", itemKey: spiral.itemKey };
  const faded = mostFaded(input.records, input.now, settings);
  const review = faded ? input.records.find((row) => row === faded) : undefined;
  if (review) return { kind: "review", itemKey: review.itemKey };
  return { kind: "new", itemKey: "" };
}

function without(spirals: readonly SpiralWord[], itemKey: string): SpiralWord[] {
  return spirals.filter((word) => word.itemKey !== itemKey);
}

/** Remember a miss. A word that has used its returns stays out for the rest of the sitting. */
function queueMiss(spirals: readonly SpiralWord[], itemKey: string, returns: number, settings: VekoleSettings): SpiralWord[] {
  const prior = spirals.find((word) => word.itemKey === itemKey);
  const used = Math.max(returns, prior?.returns ?? 0);
  const rest = without(spirals, itemKey);
  const capped = used >= settings.spiralMaxReturns;
  return [...rest, { itemKey, newWords: 0, returns: capped ? settings.spiralMaxReturns : used, waiting: !capped }];
}

function restWord(spirals: readonly SpiralWord[], itemKey: string, returns: number): SpiralWord[] {
  const rest = without(spirals, itemKey);
  if (returns <= 0) return rest;
  return [...rest, { itemKey, newWords: 0, returns, waiting: false }];
}

/**
 * Apply one sight-word answer.
 * A new miss starts a spiral. A spiral miss may schedule one more return.
 * After the return cap, the word rests until an Ebbinghaus review is due.
 * A correct spiral counts as known and does not move the growth level.
 */
export function settleSightWord(input: {
  itemsServed: number;
  reviewsServed: number;
  itemsSinceMixed: number;
  spirals: readonly SpiralWord[];
  itemKey: string;
  kind: SightServeKind;
  correct: boolean;
  record: MemoryRecord | null;
  known: boolean;
  now: Date;
  settings?: VekoleSettings;
}): {
  itemsServed: number;
  reviewsServed: number;
  itemsSinceMixed: number;
  spirals: SpiralWord[];
  record: MemoryRecord;
  known: boolean;
  holdLevel: boolean;
} {
  const settings = input.settings ?? VEKOLE_SETTINGS;
  const prior = input.spirals.find((word) => word.itemKey === input.itemKey);
  let spirals = input.spirals.map((word) => ({ ...word }));
  if (input.kind === "new") {
    spirals = spirals.map((word) =>
      word.itemKey === input.itemKey || !word.waiting ? word : { ...word, newWords: word.newWords + 1 },
    );
  }

  let record: MemoryRecord;
  if (input.kind === "spiral") {
    record = applySpiral(input.record ?? createMemory(input.now, settings), input.correct, input.now, settings);
  } else if (input.kind === "review") {
    record = applyReview(input.record ?? createMemory(input.now, settings), input.correct, input.now, settings);
  } else if (input.correct) {
    record = !input.record || !input.known ? createMemory(input.now, settings) : input.record;
  } else {
    record = applyRecheck(input.record ?? createMemory(input.now, settings), false, input.now, settings);
  }

  if (input.correct) {
    const used = input.kind === "spiral" ? (prior?.returns ?? 0) + 1 : (prior?.returns ?? 0);
    spirals = restWord(spirals, input.itemKey, used);
  } else if (input.kind === "spiral") {
    spirals = queueMiss(spirals, input.itemKey, (prior?.returns ?? 0) + 1, settings);
  } else {
    spirals = queueMiss(spirals, input.itemKey, prior?.returns ?? 0, settings);
  }

  return {
    itemsServed: input.itemsServed + 1,
    reviewsServed: input.reviewsServed + (input.kind === "new" ? 0 : 1),
    itemsSinceMixed: input.kind === "new" ? input.itemsSinceMixed + 1 : 0,
    spirals,
    record,
    known: input.correct ? true : input.known,
    holdLevel: input.kind !== "new",
  };
}
