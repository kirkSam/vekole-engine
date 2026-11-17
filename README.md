# vekole-engine

Shared VEKOLE rules. Memory, fatigue, and grading. No network and no student records.

The app and the website do not install this yet. Both sides install the same git tag when Sam says to connect it. Neither side points at a branch. The tag is `v0.1.2`, also written in `src/agreed-version.ts`.

```json
"@kirkpatrick/vekole-engine": "github:kirkSam/vekole-engine#v0.1.2"
```

Read-only access is for the website's Vercel project and for the app's builds (the Grok platform and Sam's Mac). The package does not call Grok. Each side makes that call with the instruction this package writes.

A correct same-session re-check leaves strength at 4.5 days. The on-time review gaps are about 1 day, then 2.5, 6, 16, and 40. Equivalent fractions count only when the question allows them. Answers sent to Grok are cut at 500 characters. `removePersonalDetails` replaces an email, a phone-shaped number, or a street address with `[removed]` before that cut. A plain number is not removed.
