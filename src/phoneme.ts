/** Quiet after the child has spoken, before that answer is judged. */
export const phonemeQuietMs = 3000;

export type PhonemeHearing = {
  /** Pieces heard so far. A short pause is not a new item. */
  pieces: readonly string[];
  /** The pieces said so far are the full expected answer. */
  complete: boolean;
  /** Milliseconds since the last piece. Ignored until something has been heard. */
  quietMs: number;
  /** Milliseconds since the answer window opened. */
  elapsedMs: number;
  /** The answer window, in milliseconds. */
  windowMs: number;
  /** This item was already judged. */
  judged: boolean;
};

export type PhonemePlan =
  | { judge: false }
  | { judge: true; outcome: "correct" | "miss"; at: "answer" | "quiet" | "window" };

/**
 * Judge a full answer at once.
 * After speech, judge a miss at 3 seconds of quiet.
 * Judge a miss when the window ends, including when nothing was heard.
 * A shorter pause waits. An item is judged once.
 */
export function planPhonemeHearing(input: PhonemeHearing): PhonemePlan {
  if (input.judged) return { judge: false };
  if (input.complete) return { judge: true, outcome: "correct", at: "answer" };
  const heard = input.pieces.some((piece) => piece.trim().length > 0);
  if (heard && input.quietMs >= phonemeQuietMs) return { judge: true, outcome: "miss", at: "quiet" };
  if (input.elapsedMs >= input.windowMs) return { judge: true, outcome: "miss", at: "window" };
  return { judge: false };
}
