/**
 * Spoken sight words, compared by pronunciation.
 * The dictionary is bundled. Nothing is sent out, and no audio is stored.
 * A short vowel before n or m may stand in for another: only IH, EH, and AE (pin and pen).
 * AH, AA, AO, UH, and OW do not join that set. An unstressed vowel (stress 0) is close to AH0,
 * which is how the opening "a" of "again" is treated.
 * The heard form counts when it is an exact pronunciation of the target, or when the closest
 * word on the child's current list is the target and no other word on that list is as close.
 */
import { VEKOLE_SETTINGS } from "./settings.ts";
import { CMUDICT_TEXT } from "./cmudict-data.ts";

const NASAL_VOWELS = new Set(["IH", "EH", "AE"]);
const NASALS = new Set(["N", "M"]);

const DIGRAPHS: Record<string, readonly string[]> = {
  ch: ["CH"],
  sh: ["SH"],
  th: ["TH"],
  ph: ["F"],
  wh: ["W"],
  ck: ["K"],
  ng: ["NG"],
  qu: ["K", "W"],
  kn: ["N"],
  wr: ["R"],
};

const CONSONANTS: Record<string, readonly string[]> = {
  b: ["B"],
  c: ["K"],
  d: ["D"],
  f: ["F"],
  g: ["G"],
  h: ["HH"],
  j: ["JH"],
  k: ["K"],
  l: ["L"],
  m: ["M"],
  n: ["N"],
  p: ["P"],
  q: ["K"],
  r: ["R"],
  s: ["S"],
  t: ["T"],
  v: ["V"],
  w: ["W"],
  x: ["K", "S"],
  z: ["Z"],
};

const VOWEL: Record<string, string> = {
  a: "AE",
  e: "EH",
  i: "IH",
  o: "AA",
  u: "AH",
  y: "IH",
};

let dictionary: Map<string, string[][]> | null = null;

function pronunciations(): Map<string, string[][]> {
  if (dictionary) return dictionary;
  const map = new Map<string, string[][]>();
  for (const line of CMUDICT_TEXT.split("\n")) {
    if (!line || line.startsWith("/**") || line.startsWith("export ")) continue;
    const tab = line.indexOf("\t");
    if (tab < 1) continue;
    const word = line.slice(0, tab);
    const listed = line
      .slice(tab + 1)
      .split(" | ")
      .map((pronunciation) => pronunciation.split(" "))
      .filter((phones) => phones.length > 0 && phones[0] !== "");
    if (listed.length > 0) map.set(word, listed);
  }
  dictionary = map;
  return map;
}

/** Letter-to-sound for a spelling the dictionary does not explain. */
export function phoneticFallback(word: string): string[] {
  const spelling = word.toLowerCase().replace(/[^a-z]/g, "");
  const phones: string[] = [];
  let index = 0;
  while (index < spelling.length) {
    const three = spelling.slice(index, index + 3);
    const two = spelling.slice(index, index + 2);
    if (three === "tch") {
      phones.push("CH");
      index += 3;
      continue;
    }
    const digraph = DIGRAPHS[two];
    if (digraph) {
      if (two === "kn" && index !== 0) {
        phones.push("K", "N");
        index += 2;
        continue;
      }
      phones.push(...digraph);
      index += 2;
      continue;
    }
    const letter = spelling[index] ?? "";
    const doubled = index + 1 < spelling.length && letter === spelling[index + 1] && !"aeiouy".includes(letter);
    if (doubled) {
      index += 1;
      continue;
    }
    if (letter === "e" && index === spelling.length - 1 && spelling.length > 2 && phones.length > 0) {
      index += 1;
      continue;
    }
    if ("aeiouy".includes(letter)) {
      const next = index + 1 < spelling.length ? (spelling[index + 1] ?? "") : "";
      const openingA =
        letter === "a" &&
        index === 0 &&
        next !== "" &&
        !"aeiouy".includes(next) &&
        index + 2 < spelling.length &&
        "aeiouy".includes(spelling[index + 2] ?? "");
      if (openingA) {
        phones.push("AH0");
        index += 1;
        continue;
      }
      if (letter === "y" && index === spelling.length - 1) {
        phones.push("IY0");
        index += 1;
        continue;
      }
      phones.push(`${VOWEL[letter] ?? "AH"}1`);
      index += 1;
      continue;
    }
    const consonant = CONSONANTS[letter];
    if (consonant) phones.push(...consonant);
    index += 1;
  }
  return phones;
}

function basePhone(phone: string): string {
  return phone.replace(/[012]$/, "");
}

function stressMark(phone: string): string {
  return /([012])$/.exec(phone)?.[1] ?? "";
}

function phoneCost(left: string, leftNext: string, right: string, rightNext: string): number {
  const leftBase = basePhone(left);
  const rightBase = basePhone(right);
  if (leftBase !== "" && leftBase === rightBase) return 0;
  const leftNasal = NASALS.has(basePhone(leftNext));
  const rightNasal = NASALS.has(basePhone(rightNext));
  if (leftNasal && rightNasal && NASAL_VOWELS.has(leftBase) && NASAL_VOWELS.has(rightBase)) {
    return VEKOLE_SETTINGS.sightNasalVowelCost;
  }
  const leftUnstressed = stressMark(left) === "0";
  const rightUnstressed = stressMark(right) === "0";
  if (
    (leftUnstressed && rightBase === "AH" && stressMark(right) === "0") ||
    (rightUnstressed && leftBase === "AH" && stressMark(left) === "0")
  ) {
    return VEKOLE_SETTINGS.sightNasalVowelCost;
  }
  return VEKOLE_SETTINGS.sightPhoneEditCost;
}

/** How many phone changes separate two pronunciations. Lower is closer. */
export function pronunciationDistance(left: readonly string[], right: readonly string[]): number {
  const edit = VEKOLE_SETTINGS.sightPhoneEditCost;
  const width = right.length;
  const row = Array.from({ length: width + 1 }, (_, column) => column * edit);
  for (let i = 1; i <= left.length; i += 1) {
    let diagonal = row[0] ?? 0;
    row[0] = i * edit;
    for (let j = 1; j <= width; j += 1) {
      const previous = row[j] ?? 0;
      const cost = phoneCost(left[i - 1] ?? "", i < left.length ? (left[i] ?? "") : "", right[j - 1] ?? "", j < width ? (right[j] ?? "") : "");
      const inserted = (row[j - 1] ?? 0) + edit;
      const deleted = previous + edit;
      row[j] = Math.min(inserted, deleted, diagonal + cost);
      diagonal = previous;
    }
  }
  return row[width] ?? 0;
}

function prepareSpeech(value: string): string {
  return value
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[^a-z0-9'\s-]/g, " ")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function speechTokens(value: string): string[] {
  const prepared = prepareSpeech(value);
  if (!prepared) return [];
  return prepared
    .split(" ")
    .map((token) => token.replace(/'/g, ""))
    .filter(Boolean);
}

function compactSpeech(value: string): string {
  return prepareSpeech(value).replace(/['\s]/g, "");
}

function sameTokens(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((token, index) => token === right[index]);
}

function hasRun(heard: readonly string[], target: readonly string[]): boolean {
  for (let start = 0; start + target.length <= heard.length; start += 1) {
    if (target.every((token, offset) => heard[start + offset] === token)) return true;
  }
  return false;
}

/** The same exact-word rule the sides already use. Sound-alike does not replace it. */
export function exactSightMatch(expected: string, heard: string, also: readonly string[] = []): boolean {
  const heardTokens = speechTokens(heard);
  if (heardTokens.length === 0) return false;
  const targetTokens = speechTokens(expected);
  if (targetTokens.length === 0) return false;
  if (sameTokens(heardTokens, targetTokens)) return true;
  if (targetTokens.length > 1 && hasRun(heardTokens, targetTokens)) return true;
  const accepted = new Set<string>();
  if (targetTokens.length === 1 && targetTokens[0]) accepted.add(targetTokens[0]);
  const compactTarget = compactSpeech(expected);
  if (compactTarget) accepted.add(compactTarget);
  for (const alias of also) {
    for (const token of speechTokens(alias)) accepted.add(token);
    const compactAlias = compactSpeech(alias);
    if (compactAlias) accepted.add(compactAlias);
  }
  return heardTokens.some((token) => accepted.has(token));
}

function letters(value: string): string {
  return value.toLowerCase().replace(/[^a-z]/g, "");
}

function listedPronunciations(word: string): string[][] {
  const known = pronunciations().get(word);
  if (known && known.length > 0) return known;
  const fallback = phoneticFallback(word);
  return fallback.length > 0 ? [fallback] : [];
}

function samePhones(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((phone, index) => phone === right[index]);
}

function heardPronunciations(word: string, listPhones: readonly (readonly (readonly string[])[])[]): string[][] {
  const known = pronunciations().get(word) ?? [];
  const fallback = phoneticFallback(word);
  if (known.length === 0) return fallback.length > 0 ? [fallback] : [];
  for (const pronunciation of known) {
    for (const options of listPhones) {
      for (const listed of options) {
        if (pronunciationDistance(pronunciation, listed) === 0) return known;
      }
    }
  }
  const combined = [...known];
  if (fallback.length > 0 && !combined.some((pronunciation) => samePhones(pronunciation, fallback))) combined.push(fallback);
  return combined;
}

function wordDistances(heard: string, listWords: readonly string[]): { word: string; distance: number }[] | null {
  const listPhones = listWords.map((word) => listedPronunciations(word));
  const heardPhones = heardPronunciations(heard, listPhones);
  if (heardPhones.length === 0 || listWords.length === 0) return null;
  const scores: { word: string; distance: number }[] = [];
  for (let index = 0; index < listWords.length; index += 1) {
    const options = listPhones[index] ?? [];
    let distance = Number.POSITIVE_INFINITY;
    for (const heardPronunciation of heardPhones) {
      for (const listed of options) {
        const next = pronunciationDistance(heardPronunciation, listed);
        if (next < distance) distance = next;
      }
    }
    scores.push({ word: listWords[index] ?? "", distance });
  }
  return scores;
}

function soundMatches(target: string, heard: string, currentList: readonly string[]): boolean {
  const list = [...new Set(currentList.map(letters).filter(Boolean))];
  const want = letters(target);
  if (!want || !list.includes(want)) return false;
  for (const token of speechTokens(heard)) {
    const key = letters(token);
    if (!key) continue;
    const scores = wordDistances(key, list);
    if (!scores) continue;
    const targetDistance = scores.find((score) => score.word === want)?.distance;
    if (targetDistance === 0) return true;
    const best = Math.min(...scores.map((score) => score.distance));
    const winners = scores.filter((score) => score.distance === best).map((score) => score.word);
    if (winners.length === 1 && winners[0] === want && best <= VEKOLE_SETTINGS.sightSoundTolerance) return true;
  }
  return false;
}

/**
 * True when the child said the word, when the hearing is the same pronunciation
 * as the word, or when that word is the closest one on this list.
 */
export function sightHearingMatches(
  target: string,
  heard: string,
  currentList: readonly string[],
  also: readonly string[] = [],
): boolean {
  if (exactSightMatch(target, heard, also)) return true;
  return soundMatches(target, heard, currentList);
}

/** True when any recognition alternative matches. The first miss does not decide it. */
export function anySightAlternativeMatches(
  target: string,
  alternatives: readonly string[],
  currentList: readonly string[],
  also: readonly string[] = [],
): boolean {
  return alternatives.some((heard) => sightHearingMatches(target, heard, currentList, also));
}
