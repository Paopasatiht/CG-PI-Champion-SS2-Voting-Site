# Product UX Change — Direct Score Buttons (2026-11-04)

The latest stakeholder feedback **supersedes the earlier slider proposal** in every scoring view across **mobile, iPad and desktop**.

## New scoring interaction

- Show visibly selectable score buttons **1, 2, 3, ... 10** for each criterion.
- **No 0 button** on the judge scoring page (removed per product owner, 2026-11-09). Judges pick 1–10, optionally +0.5. Validation still accepts 0 so imported/legacy data is not rejected.
- Provide a clearly labeled **+0.5** half-point control. When a whole score `n` is selected, this chooses `n+0.5` (where `n < 10`); toggling it off returns to `n`.
- On narrow iPhones wrap buttons into **two rows of five** so hit targets remain accessible. Use ten columns on wide screens when possible.
- Highlight the **whole-number base button and the half-toggle** when the score is fractional (for example, an 8.5 value highlights `8` and `+0.5`, never `9`). Show the precise numeric score separately.
- Initial state is **unset** (`null`) and displays `— / 10`. Do not preselect a value.
- Save the same 0–10, 0.5-increment numerical values in data structures and validation. Do not change the scoring formula or round weights.
- All other agreed workflows still apply: autosave Draft; private My Total only after every criterion is scored; explicit Submit modal; pending edits need Save Changes; Admin Lock blocks editing; results only after Publish.
- Optional desktop numeric typing can be a **secondary** control, but score buttons must remain the primary visible interaction on all devices.

## Prototype-specific limitation

This folder implements the **client-side visual and functional demonstration only**. Real private multi-judge scoring, lock/publish transactions, rubric migration, audits and secure code verification must be built and tested on a backend according to `spec.md`.
