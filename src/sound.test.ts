import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { VEKOLE_SETTINGS } from "./settings.ts";
import {
  anySightAlternativeMatches,
  exactSightMatch,
  phoneticFallback,
  pronunciationDistance,
  sightHearingMatches,
} from "./sound.ts";

/** Dolch first grade, the list where an, any, and again are practiced. */
const FIRST_GRADE = [
  "after",
  "again",
  "an",
  "any",
  "as",
  "ask",
  "by",
  "could",
  "every",
  "fly",
  "from",
  "give",
  "going",
  "had",
  "has",
  "her",
  "him",
  "his",
  "how",
  "just",
  "know",
  "let",
  "live",
  "may",
  "of",
  "old",
  "once",
  "open",
  "over",
  "put",
  "round",
  "some",
  "stop",
  "take",
  "thank",
  "them",
  "then",
  "think",
  "walk",
  "were",
  "when",
];

const WITH_NEIGHBORS = [...FIRST_GRADE, "in", "and", "on", "a", "one"];

/** Dolch pre-primer. "to" and "two" are both on this list. */
const PRE_PRIMER = [
  "a",
  "and",
  "away",
  "big",
  "blue",
  "can",
  "come",
  "down",
  "find",
  "for",
  "funny",
  "go",
  "help",
  "here",
  "I",
  "in",
  "is",
  "it",
  "jump",
  "little",
  "look",
  "make",
  "me",
  "my",
  "not",
  "one",
  "play",
  "red",
  "run",
  "said",
  "see",
  "the",
  "three",
  "to",
  "two",
  "up",
  "we",
  "where",
  "yellow",
  "you",
];

describe("sight-word sound", () => {
  it("keeps the tolerance and the five alternatives in the one settings list", () => {
    assert.equal(VEKOLE_SETTINGS.recognitionAlternatives, 5);
    assert.equal(VEKOLE_SETTINGS.sightSoundTolerance, 1);
    assert.equal(VEKOLE_SETTINGS.sightNasalVowelCost, 1);
    assert.equal(VEKOLE_SETTINGS.sightPhoneEditCost, 2);
  });

  it("accepts Southern forms when no other current-list word is closer", () => {
    assert.equal(sightHearingMatches("again", "agin", FIRST_GRADE), true);
    assert.equal(sightHearingMatches("any", "inny", FIRST_GRADE), true);
    assert.equal(sightHearingMatches("an", "un", FIRST_GRADE), true);
    assert.equal(sightHearingMatches("again", "agin", WITH_NEIGHBORS), true);
    assert.equal(sightHearingMatches("any", "inny", WITH_NEIGHBORS), true);
    assert.equal(sightHearingMatches("an", "un", WITH_NEIGHBORS), true);
    assert.deepEqual(phoneticFallback("agin"), ["AH0", "G", "IH1", "N"]);
    assert.deepEqual(phoneticFallback("inny"), ["IH1", "N", "IY0"]);
  });

  it("does not treat AH as a pin-pen vowel, and does treat an unstressed vowel as close to AH0", () => {
    assert.equal(sightHearingMatches("run", "ran", PRE_PRIMER), false);
    assert.equal(sightHearingMatches("run", "ran", ["run", "ran"]), false);
    assert.equal(pronunciationDistance(["R", "AE1", "N"], ["R", "AH1", "N"]), VEKOLE_SETTINGS.sightPhoneEditCost);
    assert.equal(pronunciationDistance(["P", "IH1", "N"], ["P", "EH1", "N"]), VEKOLE_SETTINGS.sightNasalVowelCost);
    assert.equal(pronunciationDistance(["AH0"], ["IH0"]), VEKOLE_SETTINGS.sightNasalVowelCost);
    assert.equal(pronunciationDistance(["AH1"], ["IH1"]), VEKOLE_SETTINGS.sightPhoneEditCost);
    assert.equal(pronunciationDistance(["AA1", "N"], ["AH1", "N"]), VEKOLE_SETTINGS.sightPhoneEditCost);
  });

  it("does not accept in for an when in is on the current list", () => {
    assert.equal(sightHearingMatches("an", "in", WITH_NEIGHBORS), false);
    assert.equal(sightHearingMatches("an", "in", ["an", "in"]), false);
  });

  it("never accepts a different sight word on the current list", () => {
    assert.equal(sightHearingMatches("an", "and", WITH_NEIGHBORS), false);
    assert.equal(sightHearingMatches("an", "on", WITH_NEIGHBORS), false);
    assert.equal(sightHearingMatches("an", "a", WITH_NEIGHBORS), false);
    assert.equal(sightHearingMatches("in", "an", WITH_NEIGHBORS), false);
    assert.equal(sightHearingMatches("then", "them", FIRST_GRADE), false);
    assert.equal(sightHearingMatches("them", "then", FIRST_GRADE), false);
    for (const heard of FIRST_GRADE) {
      for (const target of FIRST_GRADE) {
        if (heard === target) continue;
        assert.equal(sightHearingMatches(target, heard, FIRST_GRADE), false, `${heard} must not count as ${target}`);
      }
    }
  });

  it("leaves exact matches unchanged", () => {
    assert.equal(exactSightMatch("an", "an"), true);
    assert.equal(exactSightMatch("any", "Any"), true);
    assert.equal(exactSightMatch("again", "again"), true);
    assert.equal(exactSightMatch("an", "and"), false);
    assert.equal(exactSightMatch("there", "the"), false);
    assert.equal(exactSightMatch("there", "there"), true);
    assert.equal(exactSightMatch("them", "the"), false);
    assert.equal(exactSightMatch("to", "too", ["too"]), true);
    assert.equal(sightHearingMatches("an", "an", FIRST_GRADE), true);
    assert.equal(sightHearingMatches("any", "any", FIRST_GRADE), true);
    assert.equal(sightHearingMatches("again", "again", FIRST_GRADE), true);
    assert.equal(sightHearingMatches("to", "too", ["to", "too"]), true);
    assert.equal(sightHearingMatches("to", "two", PRE_PRIMER), true);
    assert.equal(sightHearingMatches("two", "too", PRE_PRIMER), true);
    assert.equal(sightHearingMatches("to", "go", PRE_PRIMER), false);
    assert.equal(sightHearingMatches("to", "too", ["to"], ["too"]), true);
    for (const word of FIRST_GRADE) {
      assert.equal(sightHearingMatches(word, word, FIRST_GRADE), true, word);
    }
  });

  it("accepts the word from a later alternative", () => {
    assert.equal(anySightAlternativeMatches("an", ["xx", "and", "an"], WITH_NEIGHBORS), true);
    assert.equal(anySightAlternativeMatches("an", ["xx", "and", "in"], WITH_NEIGHBORS), false);
    assert.equal(anySightAlternativeMatches("again", ["hello", "nope", "agin"], FIRST_GRADE), true);
    assert.equal(VEKOLE_SETTINGS.recognitionAlternatives, 5);
  });
});
