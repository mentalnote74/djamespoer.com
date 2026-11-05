# SCRUM-102 — original-frame full-cast rework, November 5, 2026

James chose the existing 1664 × 936 scene. The experimental plaza extension is
removed. The 20–25-person reduction and shared-height workaround are rejected.

The renderer spaces native visible silhouettes instead of reserving transparent
image rectangles, with a clear 12px world-space minimum plus raster conservatism.
Tables remain full solid exclusion zones. It uses the existing streets, stairs,
roof surfaces and supported window/bench fixtures, separating the tables to make
their former narrow gap usable. Torso-only artwork is fixture-only, without the
invented two-person cap. The open queue barrier is drawn behind residents and
does not reserve its whole transparent rectangle as an opaque wall.

Near-ground reference proportions include Scoob/Shag 270×245 and Marmaduke
280×200; depth changes scale consistently. Large animals cannot be assigned to
small roof/window slots. No shrinking to a leftover slot, population limit, new
character artwork, scene extension, new dependency or animation system.

The selector and manifest remain unchanged. Rendered cast members are placed
independently, with alternate packing and bounded relocation when a greedy
choice blocks someone. Geometry is cached across alternative attempts. Direct
occupancy-owner lookups avoid the slow all-character scan found during review.

## Validation

- Native-artwork checker: 24 deterministic draws, alternating 1440px/390px.
  Every draw retained all 50 selected cutouts in the original frame. Zero actual
  opaque-artwork overlaps, table-zone intrusion or frame clipping. Checks read
  the rendered images independently of the runtime silhouette cache.
- Layout timing in that run: mean 1.45s, max 3.19s. This is local evidence, not
  a production Lighthouse result. No new Lighthouse claim is made.
- Focused placement and source/copy preservation suite: 10 passed.
- Original scene.js and scene-data.js unchanged. The approved article is unchanged.
- Prior 500-draw/20–25 population/Lighthouse evidence above is superseded for
  visual acceptance. The checker now requires the entire selected cast.

Reproduce: node --test scripts/creative-town-placement.test.mjs scripts/creative-town-copy.test.mjs
and node scripts/creative-town-scene-check.mjs --seeds=24.

Visual review remains James's decision. This receipt reports tested draws and
does not claim every theoretically possible future cast has been exhaustively
enumerated.
