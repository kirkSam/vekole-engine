import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { allowsEarlyStepDown } from "../src/memory.ts";
import { runParity } from "../src/parity.ts";

describe("Update 8 parity examples", () => {
  it("reproduces every agreed example", () => {
    const failed = runParity().filter((result) => !result.ok);
    assert.deepEqual(
      failed.map((result) => `${result.name}: ${result.detail}`),
      [],
    );
  });

  it("does not step Sight Words or Alphabet down early", () => {
    assert.equal(allowsEarlyStepDown("sw", true), false);
    assert.equal(allowsEarlyStepDown("sp", true), false);
    assert.equal(allowsEarlyStepDown("m", true), true);
  });
});
