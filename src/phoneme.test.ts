import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { phonemeQuietMs, planPhonemeHearing, type PhonemeHearing } from "./phoneme.ts";

const WINDOW = 20_000;

function plan(over: Partial<PhonemeHearing>) {
  return planPhonemeHearing({
    pieces: [],
    complete: false,
    quietMs: 0,
    elapsedMs: 0,
    windowMs: WINDOW,
    judged: false,
    ...over,
  });
}

describe("phoneme hearing", () => {
  it("accepts k, a, t across pauses shorter than 3 seconds", () => {
    assert.equal(phonemeQuietMs, 3000);
    const pauses = [1000, 2000];
    let pieces = ["k"];
    assert.deepEqual(plan({ pieces, quietMs: pauses[0], elapsedMs: pauses[0] }), { judge: false });
    pieces = ["k", "a"];
    assert.deepEqual(plan({ pieces, quietMs: pauses[1], elapsedMs: 3000 }), { judge: false });
    const heard = plan({ pieces: ["k", "a", "t"], complete: true, quietMs: 0, elapsedMs: 4000 });
    assert.deepEqual(heard, { judge: true, outcome: "correct", at: "answer" });
    assert.deepEqual(plan({ pieces: ["k", "a", "t"], complete: true, quietMs: 0, elapsedMs: 4000, judged: true }), {
      judge: false,
    });
  });

  it("misses k once after 3 seconds of quiet, not at 20 seconds", () => {
    const early = plan({ pieces: ["k"], quietMs: phonemeQuietMs - 1, elapsedMs: phonemeQuietMs - 1 });
    assert.deepEqual(early, { judge: false });
    const judged = plan({ pieces: ["k"], quietMs: phonemeQuietMs, elapsedMs: phonemeQuietMs });
    assert.deepEqual(judged, { judge: true, outcome: "miss", at: "quiet" });
    assert.notEqual(judged.judge && judged.at, "window");
    assert.deepEqual(plan({ pieces: ["k"], quietMs: phonemeQuietMs, elapsedMs: phonemeQuietMs, judged: true }), {
      judge: false,
    });
  });

  it("accepts a full answer at once", () => {
    assert.deepEqual(plan({ pieces: ["kuh aeh tuh"], complete: true, quietMs: 0, elapsedMs: 0 }), {
      judge: true,
      outcome: "correct",
      at: "answer",
    });
  });

  it("misses the whole word cat on a sound-by-sound item after 3 seconds of quiet", () => {
    assert.deepEqual(plan({ pieces: ["cat"], complete: false, quietMs: phonemeQuietMs, elapsedMs: 4000 }), {
      judge: true,
      outcome: "miss",
      at: "quiet",
    });
  });

  it("misses silence at 20 seconds and does not judge it at 3 seconds", () => {
    assert.deepEqual(plan({ pieces: [], quietMs: phonemeQuietMs, elapsedMs: phonemeQuietMs }), { judge: false });
    assert.deepEqual(plan({ pieces: [], elapsedMs: WINDOW - 1 }), { judge: false });
    assert.deepEqual(plan({ pieces: [], elapsedMs: WINDOW }), { judge: true, outcome: "miss", at: "window" });
  });
});
