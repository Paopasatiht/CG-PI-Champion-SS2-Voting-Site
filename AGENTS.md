> LATEST OVERRIDE: See `SPEC_DELTA.md`; button grid 1–10, plus 0 and +0.5, replaces sliders on every device.

# Coding Agent Guide — PI Champion Season 2

This repository is for the **KAsset PI Champion Season 2 Live Judge Scoring Platform**.

## Mandatory workflow

1. Read [`spec.md`](spec.md) fully before coding. Confirmed business decisions supersede reference-image examples.
2. Begin with a short implementation plan, architecture decision, and task checklist. Then execute in small, tested increments.
3. Implement a **real server-side** application with authentication, persisted scores, roles/permissions, Decimal calculations, publication gates, and audit trail; do not stop after a visual-only mockup.
4. Use `assets/ui-concepts/` only for style references. AI-generated images are not official KAsset assets and contain fictional data. Request/accept official corporate assets before production.
5. Keep **Draft/Pending scores separate from Confirmed scores**; only explicit Submit/Save Changes change confirmed values. The all-judge completion condition blocks locking incomplete teams.
6. Respect fixed judge roster: do not implement adding, removing, deactivating or reactivating judges. Admin may rotate a credential without changing the roster.
7. A public observer must see zero scores until Publish. Shot 1 shows Top 3; Shot 2 shows all-team criterion breakdown. Individual judge scores never appear publicly.
8. Validate every critical rule on the server. Create repeatable unit, integration and e2e tests for scoring math, 2-decimal tie rules, locks, reconfirmation, Admin RBAC, concurrency and no pre-publication leakage.
9. Seed development data with **fictional** team/judge/admin identities only. Do not commit real codes, secrets, employee details, or raw corporate data.
10. Update README, DB migrations, `.env.example`, and tests whenever code changes affect setup or behavior.

## Initial task

Implement milestone 0 and the first thin slice of milestone 1/2 as defined in `spec.md`: repository scaffolding, local Postgres schema/migrations, fixture seed, code-based Judge login with a secure backend check, ordered 12-team dashboard, and one team's one-page Final Day score form with autosaved Draft, validation and Submit confirmation modal. Run tests; report any spec gap as an explicit proposed default.
