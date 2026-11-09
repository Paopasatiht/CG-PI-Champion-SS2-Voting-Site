# PI Champion Season 2 — Design Journey v4

## Scope

The screens below have been visually refactored in a working browser-only prototype. Visual references were generated separately and are **not** used to replace interactive forms or score tables.

| Flow | Screen | Design treatment |
|---|---|---|
| 01 | Home / Event Cover | Emerald ribbon art, gold editorial display typography, dark stage, clear Judge CTA |
| 02 | Judge Access | Cinematic emerald left panel, Cassie concept visual, functional judge-code form |
| 03 | Judge Team List | Private dashboard with a new gradient intro, team status cards and completion filters |
| 04 | Judge Scoring | Tactile buttons 1–10 with 0 and +0.5, soft ivory components, private score summary |
| 05 | Submit Confirmation | Layered dialog, criterion breakdown and weighted total preview |
| 06 | Submitted / Pending Edit | Current confirmation-versus-draft semantics preserved |
| 07 | Admin Overview | Four-step competition workflow ribbon, progress and action controls |
| 08 | Admin Teams & Demo | Enterprise table styling; presentation order, CSV import/edit controls unchanged |
| 09 | Admin Weights | Distinct controls and scoring-summary cards |
| 10 | Admin Tie Review | Prototype-only design illustrating tie review; official adjudication not implemented |
| 11 | Results Shot 1 | Spotlight-inspired stage with 3 metallic medals and dark translucent podium cards |
| 12 | Results Shot 2 | Grouped Demo, Final Day and Overall headers; all teams and category averages |

## Safeguards

- Demo data is fictional and stored in the current browser only.
- All score calculation, confirmation, locked and published state flows remain local simulations.
- Unique Judge/Admin Code checks are **not production authentication**.
- KAsset logo sprout and Cassie are **concept depictions**, pending authorized brand assets.
- The generated visual concepts might depict inaccurate scoring numbers; trust the live UI's existing calculation, not the concept artwork.
- Before production use implement server-side auth, scoring, audit, database and secure publish workflow.

## Limitations of this iteration

Browser-based screenshot automation was restricted in the execution environment; visual references in `assets/ui-concepts/` are generated *design concepts* rather than verified captures of the deployed implementation. JavaScript/DOM logic tests run locally. The end-user should review the deployed site on iPhone, iPad, and desktop before signoff.

## Useful files

- `assets/ui-concepts/concept-journey-01.png`, `concept-journey-02.png`: multi-screen art direction boards
- Cropped individual screen visual references in the same folder
- `assets/css/design-v4.css`: newest shared component/UI design layer
- `tests/smoke.mjs`: static structure and reference checks
