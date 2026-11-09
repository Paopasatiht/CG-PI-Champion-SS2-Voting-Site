# Design Changes — PI Champion Season 2 / v2

| Area | Previous prototype | v2 design decision |
|---|---|---|
| Brand | flat artificial leaf icon and emoji | refined prototype mark and standalone original Cassie concept asset; official CI asset remains pending |
| Colors | many slightly different greens | semantic emerald/evergreen/ivory/gold palette |
| Ribbon | four thick SVG stroked curves with `preserveAspectRatio=none` | multi-layer filled ribbon with highlights, fine lines, proper aspect preservation and optional low-overhead WebGL 3D |
| Hero | generic bright card | cinematic deep evergreen hero with 3D ribbon |
| Scores | small beveled button tiles | tactile tiles with focus and pressed state, fractional score badge, preserved integer +0.5 model |
| Cards | near-identical visual elevation | varied elevation, spacing, typography and chrome |
| Result Shot 1 | static emoji awards | layered metallic vector medals and staged entrance |
| Result Shot 2 | flat spread table | high-contrast, grouping-friendly broadcast table and emphasized overall score |
| Accessibility | limited dialog focus | dialog focus trap, score focus retained on DOM re-render, reduced motion fallback |
| Performance | no 3D | selective lightweight 3D, 30fps cap, pause when hidden, no dependencies, static fallback |

## Non-goals
- NO alteration to vote eligibility, weighting, ranking, lock, draft/submit/confirmed data logic.
- NO backend or secure authentication was added.
- NO production replacement of KAsset corporate assets without an approved original file.
