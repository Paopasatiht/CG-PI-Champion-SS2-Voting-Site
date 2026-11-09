# KAsset PI Champion Season 2 — Live Judge Scoring Platform

> **Implementation-ready Product + UX + Engineering Specification**  
> Document ID: `PI-CHAMPION-S2-SPEC`  
> Version: **1.1 (UI input update)** · Updated: **2026-11-04** · Language: English specifications / Thai-first interface copy  
> Status: **Approved discovery decisions, implementation defaults, and explicitly marked open items**  
> Audience: Product owner, UX designer, Coding Agent (Codex/Claude Code), developers, QA, event operations, security/IT.

**Read this before coding:** The rules tagged **CONFIRMED** reflect decisions made during product discovery. Items tagged **PROPOSED / VERIFY** are implementation recommendations, **not** final event policies. Do not silently convert an example value, AI-generated image, or proposed setting into an official KAsset fact. Build a secure, responsive, online-only web application; a static website alone cannot safely handle authentication, private scoring, locking, or result publication.

> **Latest signed-off UX change (2026-11-04):** Replace all judge scoring sliders with a **tappable 1–10 button grid on mobile, iPad, and desktop**. Keep a separate **0** action and an explicit **+0.5** toggle, so the underlying 0–10 step-0.5 rule stays intact. Any earlier description or AI-generated mockup showing sliders is superseded by this rule.

---

## 0. Kickoff contract for the coding agent

1. Treat this `spec.md` as the product source of truth. Preserve all **CONFIRMED** decisions and explicitly document any assumption you must make.
2. Build the MVP in vertical slices: (a) event/teams/rubrics/data model, (b) private judge scoring, (c) Admin/Demo import/lock, (d) weighted result engine/tie resolution, (e) broadcast displays, (f) comprehensive tests.
3. Start by producing a technical plan and repository structure; then implement a runnable thin slice with seed data, not merely attractive static screens. Keep database migrations and application code together.
4. Place reference images in `assets/references/` and use them as **visual inspiration only**. Images are AI-generated mockups, may contain invented text, names, numbers, people, and approximate branding. Use authentic KAsset brand assets only after authorized sourcing.
5. Keep client-side previews clearly separate from **server-authoritative** submitted results. All permissions and state transitions must be enforced on the server.
6. Implement tests for every critical scoring, ranking, privacy, and publication invariant listed in §15. Do not claim completion unless they pass.
7. Create a `.env.example`, seed data, README, migrations, and scripts for local start/test. Never commit real judge/admin codes, actual employee data, or production secrets.
8. **Do not** implement Popular Vote, judge roster add/remove/deactivate/reactivate, offline scoring, or live public leaderboard during judging.

## 1. Product definition

### 1.1 Purpose

**PI Champion Season 2** is an internal KAsset competition in which employee teams use AI to improve their work and compete by presenting their solutions. The platform collects Final Day scores from authorized judges, combines them with imported Demo Round averages, helps Admins validate/lock scoring, and reveals finalized team results on presentation-ready screens.

### 1.2 Success outcomes

- A judge can scan the event QR code, enter a unique Judge Code, select any team, score every Final Day criterion on one page, and explicitly confirm submission.
- Each judge sees **only their own** scoring and preview total until results are published; judges cannot see other judges' individual scores or the competition averages while judging.
- Admins can control rubrics and weights, import/edit Demo averages, monitor completion, lock/unlock, review ties, and deliberately publish results.
- The competition can show **Shot 1: Top 3** and then **Shot 2: all-team detailed table** via a clean, shareable, fullscreen display.
- A result is reproducible from authoritative records, stable rounding rules, rubric versions, and audit logs.

### 1.3 Scale and event assumptions

| Topic | Value | Status |
|---|---|---|
| Starting teams | **12** | **CONFIRMED**; Admin can add teams one at a time |
| Team presentation order | Pre-drawn order set by Admin | **CONFIRMED**; not randomized by application |
| Judges | Approximately **11–20**, fixed roster during event | **CONFIRMED** |
| Judge assignment | Every judge scores **every team and every Final Day criterion** | **CONFIRMED** |
| Admins | Approximately **2–3**, including **one Super Admin** | **CONFIRMED** |
| Judging mode | **Free Scoring** — any team may be chosen at any time if unlocked | **CONFIRMED** |
| Event domain | Branded `.com` website reached through QR | **INTENT**; domain and deployment still to validate |
| Hosting | User mentioned “GPT Site Host” provisionally | **VERIFY** secure server-side, DB, domain, realtime capabilities before committing |

### 1.4 Out of scope

- Public/employee Popular Vote or People's Choice awards.
- Changing the judge roster after scoring begins; adding, deactivating, or reactivating judges.
- Assigning only some teams/criteria to particular judges.
- Offline scoring or delayed offline sync.
- Revealing public scores before all required team scores are locked and publication is approved.
- Showing individual judges' scores/names on public results.
- Building an arbitrary design competition site, marketing microsite, or photo-based people leaderboard not supported by real event data.

## 2. Actors, identity, and authorization

### 2.1 Judge

- Access the website using a **shared entry QR code** (QR contains a URL, **not** a judge secret).
- Enter an individually pre-generated **Unique Judge Code**; server validates the code and authorizes that judge.
- One judge may have **multiple simultaneous device sessions** (phone, tablet, laptop) with the same identity.
- Can read/edit only their own team scores; has no access to other judges' values or unpublished aggregate results.
- Can score any unlocked team and return later; edits stop immediately if a team is locked or connection is lost.
- Judge Code reissue for a compromised/lost credential may be supported without changing the fixed judge roster.

### 2.2 Admin

- Enter an individual **Unique Admin Code** distinct from Judge Codes; server validates code and checks permissions.
- **Additional verification is required for production** (e.g., OTP/MFA) but its exact method/integration is **VERIFY** with KAsset IT.
- Every sensitive action is attributable to a distinct Admin identity in the audit log.
- The 2–3 Admins may have independently assigned **feature-level permissions**.

**Permission keys** (suggested implementation names; individual grants are configurable):

| Key | Allows |
|---|---|
| `teams.manage` | Add/edit teams, set presentation order |
| `judges.codes.manage` | Issue/reissue/revoke codes for the fixed judge roster |
| `rubrics.manage` | Edit separate Demo/Final criteria and weights subject to lifecycle constraints |
| `demo_scores.manage` | Import, preview, confirm, and manually edit Demo averages |
| `progress.view` | See team/judge completion metadata |
| `scoring.lock` | Lock team/all, unlock before publish |
| `ranking.resolve_ties` | Resolve Top-3 tie order with required explanation |
| `results.publish` | Irreversibly publish results, advance reveal stage |
| `audit.view_export` | View/export authorized audit and results records |
| `admins.manage` | **Super Admin only:** create/revoke Admins and modify Admin permissions |

### 2.3 Super Admin

- **Exactly one** Super Admin controls other Admin accounts, Admin Codes, and feature permissions. Regular Admins cannot grant themselves or others more privileges.
- After judging has started, **only Super Admin** may modify scoring criteria or weights, and only before public publication.
- A changed rubric/configuration must be confirmed after an impact preview, versioned, audited, and recalculated as specified in §7.6.

### 2.4 Broadcast viewer / MC / audience

- The dedicated display route exposes **no score data before publication**.
- The public display is a separate 16:9, projector-friendly UI without Admin controls or private scoring endpoints.
- Admin controls which of the two reveal shots is currently shown; the display synchronizes to that stage.
- A final shareable result view is optional after publication; never invent a public share link or bypass unpublished controls.

## 3. Immutable business decisions — quick reference

| ID | Rule | Status |
|---|---|---|
| BR-01 | Judge-only voting; no Popular Vote | **CONFIRMED** |
| BR-02 | Final Day inputs range **0–10**, step **0.5** | **CONFIRMED** |
| BR-03 | A criterion starts **unset (`null`)**, displayed `— / 10`; zero is valid | **CONFIRMED** |
| BR-04 | Final Day uses one-page, vertically scrollable scoring form | **CONFIRMED** |
| BR-05 | **All platforms:** tap a visible 1–10 button to set the score directly; provide a separate `0` control and an explicit `+0.5` toggle to support 0–10 in 0.5 steps. No slider. Optional desktop numeric entry must not replace these buttons. | **CONFIRMED · UPDATED 2026-11-04** |
| BR-06 | Autosave Draft; explicit first **Submit** required for Completed | **CONFIRMED** |
| BR-07 | After Submit, edits are **Pending Changes**; **Save Changes** explicitly replaces confirmed scores | **CONFIRMED** |
| BR-08 | My Total is visible only after all criteria have valid inputs, including before Submit; it is a **private preview** | **CONFIRMED** |
| BR-09 | First Submit opens confirmation **modal** showing every criterion and weighted My Total | **CONFIRMED** |
| BR-10 | Score average is calculated **within each criterion** across judges; weighted criterion contributions are **summed**, not averaged again across categories | **CONFIRMED** |
| BR-11 | Demo Round stores **pre-aggregated average per team/criterion**; Admin imports Excel/CSV or edits manually | **CONFIRMED** |
| BR-12 | Demo and Final rubrics are **independent**, each with editable criteria/weights | **CONFIRMED** |
| BR-13 | Overall result combines Demo and Final Day: **default 20% / 80%**, adjustable later | **CONFIRMED** as provisional default |
| BR-14 | Admin can **Lock per team** or **Lock All**; only if **every judge has Completed all criteria** | **CONFIRMED** |
| BR-15 | Pending edits at Lock: warn Admin, allow explicit confirmation; use **last confirmed** scores only | **CONFIRMED** |
| BR-16 | Admin can Unlock only **before Publish**; after Publish, no score/config edits or Unlock | **CONFIRMED** |
| BR-17 | No score/leaderboard reveal while voting; publication is Admin-controlled | **CONFIRMED** |
| BR-18 | Shot 1: **Top 3 together**, each with rank + team name + Overall Final Score | **CONFIRMED** |
| BR-19 | Shot 2: **all teams including Top 3**, Excel-like breakdown with Demo and Final criterion averages; rightmost = Overall Final Score | **CONFIRMED** |
| BR-20 | Full-precision internal math; **round combined Overall Final Score to 2 decimals BEFORE ranking**; display 2 decimals | **CONFIRMED** |
| BR-21 | Ties affecting Top 3 require private review, judge score review, then if still tied Admin chooses unique Top-3 ordering, **without changing score**, with reason | **CONFIRMED** |
| BR-22 | Ties below Top 3 may share rank | **CONFIRMED** |
| BR-23 | Super Admin may change rubric before Publish with version, impact preview, audit, recalculation; structural/meaning changes trigger selective reconfirmation | **CONFIRMED** |
| BR-24 | Impacted previously Locked teams auto-Reopen after Super Admin confirmation; re-Lock after all affected reconfirm | **CONFIRMED** |
| BR-25 | Judges receive real-time in-app banner and badge for reconfirmation; safe refresh, preserve compatible server Draft | **CONFIRMED** |
| BR-26 | **Online-only**; connection loss disables edits and Submit/Save; reconnect reloads latest server state | **CONFIRMED** |
| BR-27 | Multiple judge devices allowed; **Last Server Write Wins** for Draft/Pending fields, not confirmed submission | **CONFIRMED** |
| BR-28 | Fixed judge roster; no add/remove/deactivate/reactivate during event | **CONFIRMED**, supersedes earlier exploratory ideas |

## 4. Key end-to-end user journeys

### 4.1 Judge — first-time score

1. Scan shared QR → open `/judge` or application landing route.
2. Enter private Judge Code → backend authorizes and creates a secure session.
3. See 12+ teams ordered by presentation order; status per team (`Not Started`, `Draft`, `Completed`, `Reconfirmation Required`, `Locked`). Free Scoring: tap any unlocked team.
4. See all Final Day criteria on one page; each score initially `— / 10`, no preselection.
5. Enter values 0–10 with 0.5 steps. Autocomplete is forbidden for missing values. Autosave actual selections as server Draft; show `Saving…` / `Saved` state.
6. Until all required criteria are valid, show `x / n criteria completed` and **no misleading partial My Total**.
7. Once complete, show **My Total Score** as private preview using the Final Day rubric; enable Submit.
8. Tap Submit → open confirmation modal showing team, each criterion and score, weights, and weighted My Total; actions `Back to Edit` and `Confirm Submit`.
9. On backend success only, mark judge-team submission `Completed`; show confirmation and Team List progress.

### 4.2 Judge — edit a submitted team

1. Open a Completed but unlocked team; its confirmed values appear.
2. Adjust any criterion; modifications autosave as **Pending Changes**, separate from last confirmed score.
3. UI distinguishes `Confirmed Total` from `Pending Preview Total` when pending values exist; only confirmed snapshot is official.
4. Tap `Save Changes`; verify complete/valid, present confirmation (recommended), then commit the new confirmed snapshot transactionally.
5. If the team locks before Save Changes, the prior confirmed snapshot remains authoritative; unconfirmed edits are excluded.

### 4.3 Admin — setup and operations

1. Super Admin provisions the fixed panel of judge codes and 2–3 Admin identities/permissions.
2. Admin enters teams (12 initially, add one at a time), project names and pre-drawn presentation order, without changing existing team identifiers.
3. Admin configures Demo criteria and Final Day criteria independently. Each rubric has an ordered criterion list and within-round weights totaling 100%.
4. Admin downloads/imports Demo Excel/CSV, validates row/team/criterion mapping, previews, confirms, and may manually adjust pre-aggregated averages.
5. During judging, see Judge Progress by team: confirmed Completed / total judges; no need to expose individual score values to ordinary Admins.
6. Once every judge has completed every criterion of a team, optionally Lock Team; Lock All only if **all** teams meet requirements. Warn on pending edits and require confirmation to lock using confirmed snapshots.
7. Privately compute/review Demo + Final results, tie alerts and readiness; resolve affected Top-3 ties before publication.
8. Admin with `results.publish` irreversibly publishes and controls Shot 1 → Shot 2.

### 4.4 Public final announcement

- **Pre-reveal:** neutral branded waiting screen; no score fetch/leak to public.
- **Shot 1 / Top 3:** all Top 1, 2, 3 on one fullscreen 16:9 presentation. Show **rank, team name, Overall Final Score (2 decimals)** only; no criterion breakdown, judge data, or Admin UI.
- **Shot 2 / Detailed Results:** fullscreen Excel-like readable table of **all** teams, including 1–3. Group Demo and Final columns; display criterion averages, round totals, and **Overall Final Score as the rightmost column**. Honor resolved ties and shared ranks below third. No individual judge scores/names.
- MC/organizer can present by browser fullscreen and screen sharing/projector; stage changes reflect Admin control. Never assume broadcasting is the same as sharing a raw Admin dashboard.

## 5. Score definitions and calculation — canonical

> The following implementation formula maps each **0–10 criterion average** onto a normalized **0–100 round score**. The Final Day 0–10 scale is confirmed; for Demo import, **0–10 average scale is the working assumption to verify** with actual Demo data. If Demo uses a different scale, normalization must be configured/documented before importing scores. Do not mix unnormalized scales.

### 5.1 Per-criterion Final Day average

For team `t`, Final Day criterion `c`, and `J` fixed eligible judges:

```text
criterion_average(t, c) =
    SUM(confirmed_score(j, t, c) for every judge j in J) / |J|
```

**Invariants:** No missing submitted criteria for a Locked team; `0` counts as a legitimate value; Draft/Pending scores do **not** count; there is no extra average across categories after this step.

### 5.2 Per-round weighted score

For round `r ∈ {demo, final}` with criteria `C_r` and weights `w[r,c]` in percent:

```text
assert SUM(w[r,c] for c in C_r) == 100
round_score_10(t,r) = SUM(criterion_average(t,r,c) * w[r,c] / 100)
round_score_100(t,r) = round_score_10(t,r) * 10
```

- For **Demo**, `criterion_average(t,demo,c)` is the pre-aggregated value supplied by Admin; do not fabricate individual Demo judges.
- For **Final Day**, average the **last confirmed** values from all fixed judges within each criterion before applying that criterion's weight.
- The public **Final Day Score** (round score) is different from the combined **Overall Final Score**.

### 5.3 Combined competition result

```text
overall_raw_100(t) =
    round_score_100(t, demo) * demo_round_weight_pct / 100
  + round_score_100(t, final) * final_round_weight_pct / 100

assert demo_round_weight_pct + final_round_weight_pct == 100
DEFAULT demo_round_weight_pct  = 20
DEFAULT final_round_weight_pct = 80

overall_display_100(t) = ROUND_TO_2_DECIMAL_PLACES(overall_raw_100(t))
ranking_key(t)          = overall_display_100(t)    # not unrounded raw score
```

Calculate intermediate averages/weighted sums at full practical decimal precision. **Only round the combined Overall Final Score when preparing the ranking and public display**. Implement deterministic decimal arithmetic rather than binary floating point for ranking-critical calculations. **PROPOSED / VERIFY:** use decimal `ROUND_HALF_UP` as the explicit 2-decimal rounding mode (not yet chosen by business owner).

### 5.4 Worked test example (illustrative only)

Final Day rubric:

| Final criterion | Judge's private input | Weight | Contribution to judge's `/100` My Total |
|---|---:|---:|---:|
| AI Innovation | 8.5 / 10 | 30% | 25.50 |
| Business Impact | 9.0 / 10 | 30% | 27.00 |
| Execution | 8.0 / 10 | 25% | 20.00 |
| Presentation | 9.0 / 10 | 15% | 13.50 |
| **My Total (private preview)** | | **100%** | **86.00 / 100** |

If the team's imported Demo round score = `82.50/100` and its aggregated Final Day round score = `86.00/100`, then the **Overall Final Score** is `0.20 × 82.50 + 0.80 × 86.00 = 85.30/100`. **Illustration only** — actual event names/criteria/scores are not known.

### 5.5 Tie detection and ranking policy

1. Calculate combined scores to full precision, **round to 2 decimals**, then detect equal `overall_display_100` values.
2. Only Admin may see tie diagnostics before publication; no public display while an unresolved tie impacts Top 3.
3. If a tie affects **Top 1/2/3 placement, including the 3rd/4th boundary**, the organizer asks affected judges to **review and reconfirm** scores for tied teams. Judges may confirm unchanged scores, should never be forced to alter values, and never see other judges' ratings.
4. If tied scores remain after review, Admin with tie-resolution permission manually determines a **unique Top-3 placement** among tied teams and **records an explanation**, actor, timestamp and affected teams. **Do not modify computed score** to manufacture separation.
5. Ties **from rank 4 onward** may remain shared ranks. **PROPOSED / VERIFY:** use competition ranking `4, 4, 6` rather than dense ranking `4, 4, 5`; business has not selected which numbering convention.
6. Any authoritative score/configuration change before Publish invalidates stale tie decisions/ranking approvals and triggers new calculation/review.
7. The public display shows final resolved ranks even when two score values display identically; Admin audit records explain why positions differ.

## 6. Scoring lifecycle and state machine

### 6.1 Judge-team submission

```text
NOT_STARTED
    └─ edit any criterion ─> DRAFT (server autosave)
DRAFT (incomplete)
    └─ fill all required criteria ─> DRAFT_COMPLETE (My Total preview)
DRAFT_COMPLETE
    └─ Submit -> confirmation modal -> Confirm Submit -> server success ─> COMPLETED
COMPLETED
    └─ edit ─> COMPLETED_WITH_PENDING_CHANGES (old confirmed values remain official)
COMPLETED_WITH_PENDING_CHANGES
    └─ Save Changes -> server success ─> COMPLETED (new confirmed revision)
    └─ Admin Lock ─> LOCKED (pending excluded; old confirmed values frozen)
COMPLETED
    └─ Admin Lock ─> LOCKED
COMPLETED / LOCKED
    └─ affected structural rubric change before Publish ─> RECONFIRMATION_REQUIRED
RECONFIRMATION_REQUIRED
    └─ review full updated rubric -> explicit reconfirm -> server success ─> COMPLETED
LOCKED
    └─ Admin Unlock (before Publish only) ─> COMPLETED/editable
```

Implementation note: distinguish **team lock state** from **per-judge submission state**; `LOCKED` may be a derived UI state applied to a Completed submission, not a replacement in the database.

### 6.2 Team lock rules

- `Lock Team` enabled **only if each fixed judge has an authoritative completed submission for every current Final Day criterion under valid rubric rules**, and any reconfirmation is complete.
- `Lock All` enabled only if **all teams** satisfy `Lock Team` preconditions; include teams added after setup.
- `0` is valid; `null`/missing or unsubmitted Draft is incomplete.
- If any judge has autosaved **Pending Changes** after a previous Submit, show **Admin warning and confirmation**. If confirmed, Lock using last confirmed scores only; never silently promote Pending to confirmed.
- Admin may `Unlock Team` before Publish only, with confirmation and audit; never after Publish.
- Perform rechecks and Lock atomically server-side to prevent race conditions with a concurrent Save Changes or rubric update.

### 6.3 Event/publication state (suggested implementation)

```text
CONFIGURING → SCORING_OPEN → READY_TO_PUBLISH
                               │
                               └─ Publish (irreversible for edits)
                                  → REVEAL_TOP3 → REVEAL_ALL
```

- `READY_TO_PUBLISH` is available only after all teams Locked, Demo import valid, rubrics valid, relevant reviews done, no unresolved Top-3 tie, and authorized final approval.
- Publication immediately makes scores/config/locks immutable. Moving from Top 3 to all-team Shot 2 changes **display stage only**, not scoring state.
- Consider snapshotting the official calculated result set at Publish to keep the two shots consistent.
- Public/read-only display must be empty/neutral before Publish, even if someone guesses the URL.

## 7. Functional requirements

### 7.1 Teams and presentation order

- Seed **12 placeholder teams** for development, not official event names.
- Admin can add **one team at a time**, assign non-empty name, optional project title/description, and a unique presentation order.
- Admin can reorder (drag-and-drop on desktop + accessible up/down controls); ordering comes from the real-life drawing, not app randomization.
- Judge Team List is ordered by `presentation_order` but **selection is unrestricted** for unlocked teams.
- Team IDs remain immutable when presentation order or name changes; a change must not break imported Demo scores or existing judge scores.
- Prevent duplicate presentation orders, empty team names, missing rubric mapping; the need to remove teams after scoring begins is **not** confirmed and should not be included in MVP without a new policy.

### 7.2 Final Day judge scoring

- One vertically scrollable screen per selected team containing all configured Final Day criteria.
- Per criterion: icon (optional), name, description, weight, numeric score display, a tappable **1–10 button grid**, a separate **0 button**, and a **+0.5 toggle**. The selected score must be highlighted and match the numeric display.
- Use the **same direct-score button interaction on iPhone, iPad, and desktop**. On narrow phones wrap the score buttons into two rows of five; on desktop show ten across when space allows. Desktop numeric typing may remain an optional secondary method; validate `0 ≤ n ≤ 10` and `n * 2` is an integer.
- A newly opened team starts every score as **unset** (`null`), with `— / 10`. Do not preselect any button or default 0/5.
- Judge sees only their own My Total once **every** criterion is valid; before that show completion progress only.
- Never show public averages, other judges' ratings, or the overall Demo+Final competition score to an unpublished Judge.
- Autosave Draft; show distinct Saving / Saved / Error states and last server acknowledged time where helpful.
- First Submit = confirmation popup with per-criterion values/weights, weighted My Total, `Back to Edit` / `Confirm Submit`; mark Completed **after server acknowledgement**.
- After confirmation, edits are pending; **Save Changes** explicitly confirms updates; last confirmed revision remains authoritative until then.
- Reconfirmation uses the current rubric and must be explicit; if an added criterion exists, require actual input rather than filling 0.

### 7.3 Demo score administration

- Demo Round uses **different criteria and weights** from Final Day.
- Admin imports a pre-aggregated **average per team per Demo criterion** from `.xlsx` or `.csv`, and can manually add/edit any team's criterion averages.
- Provide `Download Template`, `Select File`, `Validate & Preview`, `Confirm Import`, `Edit Scores`.
- Validate: known team mapping; criterion mapping to active Demo rubric/version; missing required cells; numeric format/range; duplicate rows; mismatched headers; unexpected or extra rows; overwrite conflicts; imported values may be fractional values such as **8.25**, not necessarily 0.5 steps.
- Preview errors before mutation; require explicit confirmation for overwriting stored Demo data; apply valid import transactionally; log who/when/what changed.
- Calculate Demo round score from imported per-criterion averages and Demo weights; **do not average Demo again across imagined judge records**.
- If Demo criterion structure changes, Admin must re-map/revalidate affected imported values; Final Day judges cannot reconfirm nonexistent individual Demo votes.
- Exports of normalized scores/result summary may be supported via authorized Admin; ensure no accidental public exposure of judge-level private values.

### 7.4 Admin progress and locking

- Show per-team `Completed / Total Judges`, incomplete judge names/IDs to Admin with `progress.view`, list of teams still pending, per-criterion completeness if useful, lock readiness, pending edits count, and timestamp of last authoritative update.
- `Lock Team` and `Lock All` distinct, confirmation required; buttons disabled if completion preconditions fail.
- If all have Completed but pending edits exist, warn `N judges have unsaved changes; locking uses their last confirmed scores`, and offer `Cancel` / `Confirm Lock`.
- `Unlock` before publish only; re-lock after any required new reviews.
- Do not expose judge score values merely because an Admin can see completion status. Raw score inspection, if necessary for regulated audit, needs explicitly authorized access and is not part of public UI.

### 7.5 Results calculation, private validation, and broadcast

- Admin privately sees calculated Demo/Final round contributions, combined Overall Final Scores, ranking preview and tie alerts before publish.
- Public route exposes only stage-safe data after publish.
- **Shot 1:** premium podium/Top-3 announcement for projector; three ranks simultaneously, team name, combined Overall Final Score with `0.00` formatting; no average breakdown.
- **Shot 2:** Excel-style readable results table **including Top 1–3**; ordered ranks, team name, grouped Demo criteria-average columns, Demo Round Score, grouped Final Day criteria-average columns, Final Day Score, and **Overall Final Score at the far right**. Long rubrics: horizontal table scroll or fit/paginate for 16:9 while preserving legibility; never cut off the final total silently.
- Public results show aggregated averages only. No judge identity or individual score columns.
- Provide **dedicated fullscreen display URL** and a minimal presenter-stage control route; browsers can share/project the screen. `Share results`/download cards after publication are nice-to-have, **not core MVP**.
- The Admin control pane should not be shown inside the public display.

### 7.6 Controlled rubric/configuration changes after scoring starts

1. Before scoring starts, authorized rubric-managing Admin can configure separate Demo/Final criteria, descriptions, order, weights (within each round totals 100%), and combined round weights (totals 100%).
2. After scoring starts but **before Publish**, **only Super Admin** may change criteria/weights.
3. Super Admin sees **Impact Preview** (changed fields, teams, submissions affected, rounding/rank changes, locked teams that would reopen), supplies confirmation, and system saves a new **version + audit event**.
4. **Weight-only changes** (criterion weights, Demo/Final weights): recalculate results and require **Admin review**. No Final Day judge reconfirmation solely due to weight changes.
5. **Structural/semantic criterion changes** (add/remove/redefine): only **already Submitted AND affected** Final Day judge-team scores become `Reconfirmation Required`; never force Not Started entries to reconfirm. Validate/migrate compatible Draft fields without changing unrelated entries.
6. If affected team was already Locked, automatically **Reopen affected team(s) after Super Admin confirmation**, audit the action, require judge reconfirmation, then Admin must re-Lock.
7. Send impacted judges **real-time in-app banner** and **Dashboard badge**, with `Review Scores` action and count. Safe refresh of current form; preserve compatible server-autosaved Draft, block outdated-rubric Submit.
8. Validate updated Demo imported averages manually when Demo rubric structure changes, since there are no per-judge Demo records.
9. Invalidate previously computed rank/tie approval where changes affect scores; no Publish until valid again.
10. **After Publish:** no scoring, rubric, round-weight, team-lock, or ranking edits. Any post-publication correction workflow is **out of scope** and needs a new approved policy.

### 7.7 Multi-device and network

- Multiple active sessions may use one Judge Code.
- **Draft and Pending Changes field-level Last Server Write Wins**; backend processing order / successful server arrival defines the winner, **not device clock**. Sync latest acknowledged value to other active devices.
- Crucially, **LWW does not silently overwrite the last confirmed submission**: only explicit Submit or Save Changes transaction can replace confirmed snapshot.
- Reject any write if team is Locked, event Published, session invalid, or rubric version outdated.
- No manual conflict popups needed for Draft field collisions, but provide Saved state so judges know which value persisted.
- **Online-only:** on detected network loss, disable editing and Submit/Save; show Connection Lost/Offline banner; only server-acknowledged Draft/confirmed scores are durable. On recovery, fetch latest server Draft, rubric, team lock, and session state; warn if an in-flight edit was never saved. No offline queue/sync feature.

## 8. UI/UX design system

### 8.1 Design goals

The user selected a **premium KAsset-style** visual direction based on AI-generated mockups: editorial typography, cream/white clean surfaces, corporate green, dark emerald accents, elegant curved wave/line motif at card/hero edges, large score numerals, soft elevation, restrained highlights. Avoid neon-saturated or generic dashboard-heavy styling. Visual confidence should not undermine scoring clarity.

**Important:** All reference images contain approximate/mock KAsset logos. The real **KAsset logotype/emblem and brand palette must come from authorized official brand assets or KAsset corporate design files**; do not trace, approximate, or reuse a generated logo as the production asset.

**PROPOSED temporary tokens** (replace with confirmed corporate design tokens):

```css
--brand-green: #008c45;       /* provisional, NOT an official KAsset color claim */
--brand-forest: #004c36;      /* provisional dark hero/results tone */
--brand-green-deep: #003c2b;  /* provisional background for broadcast */
--surface-ivory: #faf9f5;
--surface-white: #ffffff;
--text-primary: #18352a;
--text-secondary: #5d7067;
--accent-soft: #e4f3e7;
--border-muted: #e3e9e4;
--warning: #ad7316;
--danger: #b63b39;
```

- Typography: legible Thai+English modern sans for UI (choose corporate-approved font when supplied); editorial display serif may be used **sparingly** in presentation order/team hero or trophy shot, never in dense score controls.
- Spacing: consistent 8px grid, ample breathing room, clear criterion grouping, no unnecessary nested cards.
- Touch targets at least 44×44 CSS px; keyboard/focus support on desktop; screen reader names include criterion and current score; don't use color alone for state.
- Meet WCAG AA contrast on essential text and controls; prefer reduced-motion option and readable projector text sizes.
- The user prefers a high-end `wow` reveal aesthetic, but all score values and team names must remain highly legible.

### 8.2 Responsive layout matrix

| Device | Key layout | Input / navigation |
|---|---|---|
| iPhone / mobile | One column, prominent team/order hero, vertically scrolling criteria, sticky-or-accessible preview & Submit | **1–10 score buttons (wrap 5+5) + separate 0 and +0.5** |
| iPad / tablet | Wider criterion rows or balanced columns; preserve same scoring logic; no overcrowding | **1–10 score buttons + separate 0 and +0.5** |
| Laptop / desktop | Sidebar for teams/order/progress + main scoring pane + total summary/action area | **1–10 score buttons + separate 0 and +0.5**; optional secondary numeric entry |
| Broadcast 16:9 | **No sidebar or score form**. Dedicated podium shot and detailed table shot | Admin controls shot transitions from separate screen |

### 8.3 Screen inventory

| Route (suggested) | Audience | Responsibilities |
|---|---|---|
| `/` | All | Branded entry and QR destination; route to Judge or Admin login |
| `/judge/login` | Judge | Unique Judge Code entry, validation, recovery UI |
| `/judge/teams` | Judge | Ordered Team List, Free Scoring selection, status/progress/badges |
| `/judge/teams/:teamId` | Judge | All-criteria one-page score form, My Total, autosave, Submit/Save Changes, read-only locked |
| `/admin/login` | Admin | Admin Code + additional verification |
| `/admin` | Admin | Completion/readiness overview, event status, alerts |
| `/admin/teams` | Permitted Admin | Add team and set presentation order |
| `/admin/judges` | Permitted Admin | Fixed roster + code issuance/reissue, completion (no roster add/remove) |
| `/admin/rubrics` | Permitted Admin / Super Admin post-start | Independent Demo/Final criteria + weights; impact preview/version management |
| `/admin/demo-scores` | Permitted Admin | Template, Excel/CSV import preview, manual average editor |
| `/admin/progress` | Permitted Admin | Judge/team progress, per-team Lock/Unlock, Lock All, pending-warning |
| `/admin/results` | Permitted Admin | Private score/rank review, Top-3 tie handling, publish readiness |
| `/admin/permissions` | Super Admin only | Manage Admins and per-feature permissions |
| `/admin/audit` | Permitted Admin | Read/search/export authorized audit events |
| `/presenter` | Permitted Admin | Start reveal, switch Shot 1/2, view stage status |
| `/display` | Audience/Projector | Public waiting screen, Top-3 Shot 1, full table Shot 2; server gated |

### 8.4 UI copy and component states (Thai-first suggestions)

- `— / 10` = ยังไม่ได้ให้คะแนน
- `บันทึกฉบับร่างแล้ว` / `กำลังบันทึก…` / `ยังบันทึกไม่สำเร็จ`
- `ให้คะแนนแล้ว 2 จาก 4 เกณฑ์`
- `คะแนนรวมของฉัน (ตัวอย่างก่อนส่ง)`; **not** `คะแนนรวมการแข่งขัน`
- `ตรวจสอบและส่งคะแนน` → confirmation modal `ยืนยันการส่งคะแนน`
- `บันทึกการแก้ไข` for post-Submit edits
- `ต้องยืนยันคะแนนใหม่` + `ตรวจสอบคะแนน`
- `ปิดรับคะแนนแล้ว` for Locked
- `การเชื่อมต่อขาดหาย` with read-only state
- `พร้อมล็อก 15/15` vs `ยังล็อกไม่ได้ 13/15`
- `มีการแก้ไขที่ยังไม่ได้บันทึกจาก N คน` in Admin Lock warning
- `พบคะแนนเสมอที่กระทบ Top 3` only on private Admin UI
- `ประกาศผล` is an irreversible Admin action; show a clear second confirmation.

**Do not imply** that Draft is official; don't mark `Completed` until the server confirms; don't display My Total while inputs are incomplete; don't imply the display is “LIVE SCORES” before Publish.

## 9. Suggested database/domain model (implementation proposal)

The model can be adapted to chosen backend, but preserve the separation of **Draft/Pending**, **Confirmed**, and **Published** data and snapshot histories.

| Entity | Core fields / relationship |
|---|---|
| `events` | `id`, `slug`, `name`, lifecycle state, Demo/Final weight pct, published timestamp, reveal stage |
| `teams` | `id`, `event_id`, stable code, name, project title/description, unique `presentation_order` |
| `judges` | `id`, `event_id`, display name/reference, credential hash, fixed roster membership |
| `admins` | `id`, display name, admin-code hash, super-admin flag, authentication metadata |
| `admin_permissions` | admin ID, permission key, granted by/at |
| `rubric_versions` | `id`, `event_id`, round (`DEMO`/`FINAL`), version, effective time, created by, snapshot/hash |
| `criteria` | stable criterion key, rubric version, label, description, max score, weight pct, order |
| `demo_criterion_averages` | team ID, criterion key/version, imported average decimal, import batch / editor / timestamps |
| `import_batches` | filename metadata, preview/validation, confirmed by/at, row counts, audit linkage |
| `judge_team_submissions` | judge ID, team ID, authoritative confirmed revision ID, status, rubric-version reference, completion timestamps |
| `judge_draft_values` | judge ID, team ID, criterion key, draft/pending value nullable, last server write time/sequence, rubric version |
| `confirmed_submission_revisions` | immutable revision ID, judge/team ID, every criterion value snapshot, rubric version, submitted/saved by/at |
| `team_locks` | team ID, locked state, actor/time/reason, revision/event version used |
| `scoring_review_requests` | affected team IDs, judge IDs, rubric/tie reason, required/confirmed, timestamps |
| `tie_resolutions` | tied team IDs, calculated equal scores, forced Top-3 ordering, mandatory reason, actor/time, result version |
| `result_snapshots` | authoritative round/criterion averages, rounded overall scores, resolved ranks, version/hash, published time |
| `audit_events` | actor, role, action, entity, before/after metadata, reason, timestamp, request ID; no raw codes/secrets |
| `sessions` | secured session identity, expiration/revocation, active device metadata where approved |

**Core constraints:**

- Uniqueness: `(event_id, presentation_order)`, `(judge_id, team_id)`, `(team_id, demo_criterion_id/version)`, single active Super Admin per event as appropriate.
- Store authoritative scoring numbers using fixed-precision decimals rather than floats; keep full practical precision (e.g., DECIMAL with adequate fractional scale).
- Treat credentials as secrets: securely hash/verify high-entropy codes; never store or log codes in plaintext after issuance.
- Keep immutable submission revisions to support audit and prove which confirmed snapshot was used at Lock and Publish.
- All data fetches must be scoped to authorized identity/role/event. Clients cannot decide who they are by passing arbitrary judge IDs.

## 10. Suggested API/service boundaries (implementation proposal)

Choose REST, typed RPC, or server actions, but **retain semantic endpoints and server-side enforcement**. Suggested REST-like boundaries:

```text
POST   /api/auth/judge/verify-code
POST   /api/auth/admin/verify-code
POST   /api/auth/admin/verify-extra-factor     # exact factor VERIFY
POST   /api/auth/logout

GET    /api/judge/teams
GET    /api/judge/teams/:teamId/scores
PUT    /api/judge/teams/:teamId/draft/:criterionKey  # autosave, LWW, rubric version check
POST   /api/judge/teams/:teamId/submit                # first confirm, idempotent
POST   /api/judge/teams/:teamId/save-changes          # pending -> confirmed, idempotent
POST   /api/judge/teams/:teamId/reconfirm

GET    /api/admin/teams
POST   /api/admin/teams
PATCH  /api/admin/teams/:teamId
PUT    /api/admin/teams/presentation-order
GET    /api/admin/rubrics/:round
POST   /api/admin/rubrics/:round/impact-preview
POST   /api/admin/rubrics/:round/apply
GET    /api/admin/demo-scores
POST   /api/admin/demo-import/preview
POST   /api/admin/demo-import/confirm
PATCH  /api/admin/demo-scores/:teamId/:criterionKey
GET    /api/admin/progress
POST   /api/admin/teams/:teamId/lock
POST   /api/admin/teams/:teamId/unlock
POST   /api/admin/lock-all
GET    /api/admin/results/preview
POST   /api/admin/results/request-tie-review
POST   /api/admin/results/resolve-top3-tie
POST   /api/admin/results/publish
POST   /api/admin/results/advance-shot
GET    /api/admin/audit

GET    /api/display/state               # waiting only before Publish
GET    /api/display/official-results    # only stage-authorized published data
GET    /api/realtime/stream             # SSE/WebSocket, authenticated channel rules
```

- Every write must recheck authorization, event state, team lock, rubric version, and required completion in a **transaction**.
- Publish and Lock are critical operations; use idempotency keys and appropriate database transaction/isolation/locking to prevent double execution/races.
- Never expose unreleased result data through public route, preloaded page JSON, client bundle, cache, websocket channel, or `view-source`.
- Real-time channels: judge-specific score/draft/reconfirmation updates, Admin-only progress/config/rank preview, and public stage-only reveal; **do not broadcast private scores** to all clients.
- Preserve a server-clock ordering strategy for LWW Draft/Pending fields and an immutable confirmed submission revision.

## 11. Security, privacy, and operational constraints

- Internal corporate event data: obtain KAsset security approval for hosting, storage location, public `.com` domain, logs, account management and retention. **Do not assume “GPT Site Host” supports the required protected backend** without verification.
- Use HTTPS/TLS, secure HttpOnly SameSite session cookies, session expiration/revocation, CSRF protection where needed, rate limiting/lockout on code guessing, high-entropy unique secrets and server-side verification. Admin authentication needs a second factor before production.
- One code per identity; QR must not contain reusable login credentials.
- Apply authorization per endpoint/operation; UI hiding is insufficient. Only Super Admin can manage admins/permissions and make post-start rubric changes.
- Separate ordinary Admin completion visibility from any privileged judge-level audit access; never publish or share identifiable judge scores to viewers.
- Log sensitive action metadata (import, edit, rubric versions, lock/unlock, review requests, tie override, Publish, permission changes) but do not log plaintext codes, tokens, or full secrets.
- Published result snapshots are immutable from the app; any correction or incident needs separate authorized procedure outside this MVP.
- Backup/restore and deployment rollback need an event-day rehearsal, with restoration preserving audit and immutability.

## 12. Reliability, realtime, and performance targets

**Engineering targets, not business-confirmed SLAs:**

- Support at least **20 simultaneous judges + 3 admins + broadcast viewers**, with headroom for several browser tabs/devices each.
- Server-authoritative autosave acknowledgment and visible Saving/Saved indicators; debounce rapid button updates where helpful without dropping final value.
- Aim for broadcast state changes appearing within **1–2 seconds** on supported network during rehearsal; allow fallback manual refresh.
- All judge edits disabled while offline; no promise of local autosave recovery. After reconnect, reload server-acknowledged state.
- Real-time notifications on rubric updates and Lock/Unlock should not allow stale submissions to sneak through. Server validation is always final.
- Format scoring data consistently in Asia/Bangkok timezone in operations logs/UI, store UTC timestamps in DB.
- Fullscreen 16:9 UI should be tested at 1920×1080 and common projector resolutions; desktop 1366×768; tablets; iPhone width ~375–430 CSS px.
- QA of cross-device simultaneous Draft updates and admin lock races is mandatory.

## 13. Import/export specification

### 13.1 Demo import example (wide format, **illustrative**)

```csv
team_code,criterion_ai_innovation,criterion_business_impact
TEAM-01,8.25,9.00
TEAM-02,9.00,8.75
```

- Export a template generated from **current Demo rubric** (dynamic columns, stable IDs, user-readable headers).
- Consider long format if criterion count varies, e.g. `team_code,criterion_key,average_score`; **PROPOSED default** to accept both, or implement one clearly documented format first.
- Validate current mapping and imported averages; don't require each average to be a multiple of 0.5.
- Commit import in a transaction after confirmation; if any required row is invalid, do not partially mutate official data unless Admin explicitly chooses a separately specified partial-import flow (**not in MVP**).

### 13.2 Result/export

- Admin may export official ranked results and aggregate criterion averages after publication.
- The public/safe export never includes Judge Codes, Admin Codes, individual judge score values or raw personal data.
- Privileged internal audit export, if needed, is separate, permission-gated and subject to corporate policy.

## 14. Design references and asset policy

Reference images bundled with the starter ZIP:

1. [`assets/references/mobile-judge-scoring.png`](assets/references/mobile-judge-scoring.png) — selected premium mobile scoring look, KAsset-themed green, wave motif, editable criteria and private score preview.
2. [`assets/references/responsive-judge-scoring.png`](assets/references/responsive-judge-scoring.png) — desktop + iPad + phone responsive interpretation, team sidebar on desktop.
3. [`assets/references/final-results-concept.png`](assets/references/final-results-concept.png) — concept board for final results, multiple presentation/share formats.
4. [`assets/references/reveal-and-broadcast.png`](assets/references/reveal-and-broadcast.png) — reveal/TV/score breakdown reference; **some generated examples show photographs and screen sequences not agreed as MVP**.

**Critical constraints:**

- These images are **not screenshots of a working application**, verified event scores, exact KAsset guidelines, source assets, or a requirement to show fake team photos.
- Follow the **written business rules** over any inconsistent image labels, numeric values, extra screens, or fabricated award categories.
- Replace generated logos with authorized **official KAsset** files before launch. Preserve logo aspect ratio and corporate color standards once supplied.
- Preserve the strongest visual ideas: flowing green edge/wave, spacious ivory, strong information hierarchy, rounded but restrained cards, clear numeric scoring, elegant trophy reveal.
- Shot 1 must contain **Top 3 only** with rank/name/overall score, and Shot 2 must contain **all teams** with detailed average criterion table, regardless of what some reference screenshots depict.

## 15. Acceptance tests / Definition of Done

Every `AC-*` below should be covered by automated tests where practical and by UAT on actual phone/laptop/projector. Use 12 fake teams, 15 fake judges, independent Demo/Final rubric fixtures, and fake credentials in local development.

### 15.1 Judge scoring

- **AC-01** Judge Code logs in only the intended judge; invalid codes rate-limited; no cross-judge scores accessible.
- **AC-02** Team list starts with 12 teams in Admin-entered presentation order; judge can select any unlocked team regardless of order.
- **AC-03** New criterion value is `null` / `— / 10`, not automatically zero or five; deliberate `0.0` counts as valid.
- **AC-04** On **all devices**, score 1–10 buttons, 0 control and +0.5 toggle cover all 0–10 values in 0.5 increments. Missing remains null until deliberately selected; any optional direct input rejects 8.3, −0.5, 10.5 or invalid values as completed.
- **AC-05** All Final Day criteria visible on one scrollable page, with descriptions and weights.
- **AC-06** Before all criteria complete, show only progress; after complete, immediately show private weighted My Total, even pre-Submit.
- **AC-07** Draft autosave alone never marks Completed; first Submit opens full criterion + weighted total modal, and Completed only after backend Confirm Submit succeeds.
- **AC-08** Editing a Completed team creates Pending Changes; last confirmed values remain official until Save Changes succeeds.
- **AC-09** One judge may use multiple devices; latest server Draft/Pending write wins per field, synced to other devices; confirmed snapshot remains protected from autosave writes.
- **AC-10** When offline, UI disables edits and submissions; reconnect reloads latest server-acknowledged Draft/lock/rubric state, never claims unacknowledged data was saved.

### 15.2 Formula, Demo and ranks

- **AC-11** Demo Excel/CSV import and manual editor work with current separate Demo criteria; imports use pre-aggregated per-team/per-criterion averages including 8.25; invalid uploads do not partially commit.
- **AC-12** Within each Final Day criterion, compute judge mean, multiply by criterion weight, sum across criteria; do **not** average category scores a second time.
- **AC-13** Independent rubric weights each sum 100%; default competition round weights are 20/80, editable with sum validation.
- **AC-14** Compute internal values without premature rounding; round combined Overall Score to **2 decimals before ranks**, display two decimals on both reveal shots.
- **AC-15** Scores equal only after final rounding are correctly marked tied; unresolved tie impacting ranks 1–3 or 3/4 blocks publication.
- **AC-16** Top-3 tie review allows judges to reconfirm even unchanged values; if still tied, Admin's rank-only resolution requires reason and never modifies computed score.
- **AC-17** Rank 4 onward can be shared; unconfirmed ranking convention for skips must be implemented per documented assumption and made explicit.

### 15.3 Administration and publication

- **AC-18** No Lock Team unless every required fixed judge has a valid Completed/current submission for all criteria; no Lock All until every team qualifies.
- **AC-19** Locking with Pending Changes warns and requires explicit Admin confirmation; only last confirmed scores are frozen, pending excluded.
- **AC-20** Unlock before Publish works with correct permission/audit; Unlock after Publish is denied at API level.
- **AC-21** One Super Admin alone manages Admin accounts/permissions and may modify scoring configuration after judging starts.
- **AC-22** Weight-only changes recalculate + Admin review, without judge reconfirmation; structural/semantic changes selectively flag impacted Submitted scores and auto-Reopen impacted Locked teams after Super Admin confirmation.
- **AC-23** Affected judge receives in-app banner and team badge in real time; stale rubric-version writes rejected; unaffected Draft values preserved after safe refresh.
- **AC-24** Admin cannot Publish before all Locked, required Demo data valid, reviews/Top-3 tie resolutions complete; publishing is confirmed/audited and freezes edits permanently.
- **AC-25** Public display before Publish exposes no rankings/scores in API, HTML or realtime stream; after Publish Shot 1 contains exactly Top-3 rank/name/score, Shot 2 contains all-team criterion-average table and rightmost Overall Final Score.
- **AC-26** No public display shows individual judge scores, judge names linked to values, credentials, or Admin-only metadata.
- **AC-27** Presentation order, imported data, scores, permissions, Lock and Publish are auditable to actor/time.
- **AC-28** 16:9 broadcast presentation and responsive mobile/iPad/laptop UAT complete without cut-off critical scores or controls.

## 16. Recommended implementation milestones

### Milestone 0 — Repository and architecture

- Select a hosting-compatible secure full-stack architecture and DB, subject to KAsset IT approval.
- **Suggested stack (PROPOSED)**: TypeScript, Next.js (App Router), PostgreSQL, a schema/ORM layer such as Prisma/Drizzle, Tailwind CSS + accessible component library, Zod schema validation, SSE/WebSocket for realtime, Vitest for logic tests, Playwright for end-to-end.
- Configure linting, formatting, typed API, migrations, `.env.example`, local seed/demo, CI checks and security secrets handling.
- Publish ADR for the chosen deploy target; **do not assume a simple static site is sufficient**.

### Milestone 1 — Database, auth and event setup

- Models, constraints, seeded 12 fake teams + 15 fake judges + 3 fake Admins (1 Super), credential hashing and permissions; login.
- Team order management, Admin permission management, two configurable rubrics; no score form yet.

### Milestone 2 — Judge scoring vertical slice

- Mobile-first Judge Team List + all-criteria scoring page; autosave Draft, preview, Submit modal, Save Changes, server-authoritative state and offline restrictions.
- Desktop and iPad responsive version; multi-device LWW and session behavior.

### Milestone 3 — Demo data and Admin controls

- Import Excel/CSV, preview validation, manual average editor; Admin progress/lock/unlock and warning; audit.
- Rubric versioning, impact preview, reconfirm, automatic Reopen, realtime banner.

### Milestone 4 — Score engine, ranking and reveal

- Tested Decimal scoring module, 2-decimal ranking, Top-3 tie workflow, permissioned Admin approval.
- Dedicated fullscreen `/display` Shot 1 and Shot 2, presentation-stage controls and leak-proof publication boundary.

### Milestone 5 — Rehearsal and release readiness

- All AC tests green, visual/UX QA with official brand assets, projectors and devices, 20 judges / 3 Admin simulated load, recovery and concurrency drills.
- Security review of Codes, session, API, unreleased results and deployment; backup, runbook and operator training.

## 17. Event-day operator runbook (brief)

1. Verify production deployment, HTTPS, backup, database, realtime, countdown/waiting display, and authorized domain.
2. Super Admin checks Admin permissions and pre-generated fixed Judge Codes; test QR entry and private scoring with sample identities.
3. Confirm actual 12+ teams, drawn presentation order, Demo import and criteria/weight sums.
4. Let each judge score all teams; monitor real completion; no public scores while judging.
5. Confirm every team Completed by every judge, resolve Pending warnings, Lock Team/Lock All.
6. Preview result math, tie status and first/second shot privately. If Top-3 tie, request judge review and re-Lock, then document rank override only if still necessary.
7. Authorized Admin confirms Publish; broadcaster shows Shot 1 Top 3.
8. On stage cue, advance to Shot 2 full all-team criterion averages/Final Score table.
9. Export/retain approved aggregate results and audit; publication stays immutable.

## 18. Remaining items to verify (do not block building local prototype)

These are **not new discovery questions to ask immediately**; implement sensible configuration/abstractions and validate before live deployment.

1. Actual official KAsset logo/artwork, approved hex colors, font/style guide, and event logo/license.
2. Final real Team names/project titles, actual judge roster codes, actual Demo and Final criterion names, descriptions and weights.
3. Whether imported Demo averages are precisely 0–10 and how many fractional digits can occur; agree on deterministic rounding mode (`ROUND_HALF_UP` proposed).
4. Whether shared ranks below third use `4, 4, 6` or `4, 4, 5`; default proposal documented in §5.5.
5. Actual custom domain, approved hosting/data residency/integrations, public QR distribution, and whether “GPT Site Host” meets full-stack security/data requirements.
6. Exact Admin additional authentication factor (OTP/MFA), code rotation/recovery policy, retention and permissioned audit access.
7. Whether public results should remain accessible online after event or only on controlled event screen; MVP can keep separate secured presenter route and publish-gated display.
8. Projector/table width for many configurable criteria; choose legible horizontal scrolling/pagination without hiding the Overall Final Score column.

---

## 19. Quick start prompt for Codex / coding agent

> You are starting a NEW GitHub project for **KAsset PI Champion Season 2 Live Judge Scoring Platform**. Read `spec.md` completely and inspect `assets/references/`. Implement the MVP following confirmed business rules, without implementing out-of-scope judge roster changes or Popular Vote. Begin by writing a concise technical plan and architecture decision, then create the repository scaffolding, migrations, seed data and a runnable vertical slice for Judge Code login, ordered team list and one-page Draft/Submit scoring. Use secure server-side auth/authorization, separate Draft/Pending vs Confirmed values, a tested Decimal score engine, and explicit lock/publish state boundaries. Keep all images as design references only; use placeholder branding until official KAsset assets are provided. Write automated tests for score math, rounding/ties and privacy invariants, maintain `README.md` instructions, and continue milestone by milestone rather than coding all screens as static mockups.

**End of spec.**
