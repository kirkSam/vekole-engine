# vekole-engine

Shared VEKOLE rules. Memory, fatigue, and grading. No network and no student records.

The app and the website install the same git tag. Neither side points at a branch. The tag is `v0.2.4`, also written in `src/agreed-version.ts`. Connect it only after Claude reviews this tag and Sam says to.

```json
"@kirkpatrick/vekole-engine": "github:kirkSam/vekole-engine#v0.2.4"
```

A spoken sight word can match by pronunciation, not only by spelling. The package carries the CMU Pronouncing Dictionary and a letter-to-sound fallback. It does not call out, and it does not keep audio. The dictionary is reached only through `@kirkpatrick/vekole-engine/server`. The main entry does not load it, so a browser or phone bundle of the main entry cannot contain it. Matching runs on the server, where answers are already checked.

Before n or m, only IH, EH, and AE count as close (pin and pen, any and inny, an). AH, AA, AO, UH, and OW do not. An unstressed vowel (stress 0), such as the opening "a" of "again", is close to AH0. A hearing with the exact same pronunciation as the word is accepted even when another word on the list sounds the same. Otherwise the hearing is accepted only when the closest word on the child's current list is the word on the card, within `sightSoundTolerance`. `recognitionAlternatives` is 5. This tag is not connected yet.

A missed Sight Word comes back in the same sitting, after `spiralGapItems` new words, at most `spiralMaxReturns` times. Those numbers live only in `VEKOLE_SETTINGS`. A spiral shares the review slot with Ebbinghaus reviews and goes first. The slot counts items since the last spiral or review, so any four items in a row hold at most one of them. It pauses while fatigue is high. A miss or a timeout is not a pace sample: its length cannot turn fatigue high and cannot change the average. A spiral answer does not move the growth level. Its memory uses the re-check rule: a correct answer leaves strength where the miss put it (about 10 hours until the next review), and a miss multiplies strength by 0.4, at least 1 day. A correct spiral counts as known for the 70% list rule. Other engines do not spiral until Sam says.

Read-only access is for the website's Vercel project and for the app's builds (the Grok platform and Sam's Mac). The package does not call Grok. Each side makes that call with the instruction this package writes.

A correct same-session re-check leaves strength at 4.5 days. The on-time review gaps are about 1 day, then 2.5, 6, 16, and 40. Equivalent fractions count only when the question allows them. Answers sent to Grok are cut at 500 characters. `removePersonalDetails` replaces an email, a phone-shaped number, or a street address with `[removed]` before that cut. A plain number is not removed.
