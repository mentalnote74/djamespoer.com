# Bedlam - seeded procedural 2D engine

`createBedlam(palette, seed, config)` in `src/app/components/bedlam/engine.ts` is a pure deterministic recipe generator. It has no DOM, clock, canvas, WebGL, external dependency or animation loop. Identical inputs reproduce identical layers; different seeds/configurations intentionally produce different scenes.

Palette entries accept CSS colors or semantic custom-property references. The header passes existing theme references, so Living Theme updates cascade directly into the same geometry without regenerating it every animation frame. Angular computed state regenerates recipes only when palette/seed/config/speed inputs change. Each component owns its inputs, recipe and pause/visibility state.

Modules are nebula gradients, repeating rings, conic rays, stationary fine streak texture and optional particles. Default: six decorative spans, no particles. Density is bounded to 0-1, particles to 24, position to +/-25%, scale to 0.7-2, and intensity/symmetry/turbulence/opacity/speed/depth to 0-1. Invalid numeric values use defaults. Disabling a module leaves the retained slots deterministic. Config also selects blend and motion direction; speed zero pauses.

CSS owns slow independent transforms, near/far scaling, blur falloff, layered occlusion, edge highlights and theme-directed cast shadows. These are 2D depth cues, not a 3D scene. Consumers can use the pure recipe with their own CSS treatment rather than copying header artwork.

The header integration uses the navbar itself as the clipping field. Procedural forms use the home-link/wordmark footprint as their origin, then overflow that footprint into the header; controls remain above the decorative field. There is no enclosing field mask/fade, panel, oval or wrapper shadow. Individual gradient falloff and finite fragments retain open space. Light wordmarks remain black; dark wordmarks use navigation foreground over the same transparent navbar field. The transparent parent of the canonical masked silhouette alone casts the existing shared-theme directional shadow (half box blur for equivalent filter softness). The immutable SVG path is unchanged. Home link semantics and hit target remain owned by Header.

Reduced motion disables CSS animation, including live preference changes. Existing pause input, document visibility and intersection state pause animation without running a JavaScript frame loop. Destroy disconnects observers/listeners. Forced colors removes the field and uses Canvas/CanvasText. Unsupported masks/gradients still leave the accessible Home link name; the procedural field is not information.

Validation: production build/budgets; focused recipe/component tests; canonical vector hash test; rendered desktop/mobile theme checks; visual inspection of actual light/dark composites; scoped logo axe and reduced-motion/forced-colors checks. Logo artwork is exempt from WCAG text contrast ratios; actual filled composites and the accessible link/focus indicator are inspected rather than inventing a numeric contrast score for a changing gradient. No new Lighthouse run or broad site audit.

## Cosmic recipe correction

The engine contract is unchanged. The default composition separates a broad soft far field, shaded midground masses and smaller sharp foreground debris. Scale, blur, drift vector and duration vary by depth. Former ring/ray slots now render a broken front and a clipped fragment, not repeating concentric/conic wallpaper. Static per-instance SVG noise/displacement and height-derived diffuse lighting roughen only atmospheric forms; they never modify the canonical SVG silhouette or add lettering edges. Seeds and distortion are recipe-derived and bounded. SVG definitions have instance-local IDs to avoid cross-instance collisions. CSS still owns all motion; there is no extra clock, animation loop, canvas or 3D stack.

Secondary opacity is attenuated by layer: far atmosphere 40%, mid atmosphere 32%, broken fronts/fragments/particles 35%, texture 40%; strongest near atmosphere is unchanged. Geometry, seeded draws and motion remain unchanged. Forced colors suppresses decorative shadows and retains the canonical CanvasText silhouette.

## Navbar emitter integration

The reusable engine contract and CSS motion remain unchanged. Far atmosphere/texture opacity reduced another 25%, mid atmosphere/fronts/fragments/particles another 20%, strongest near atmosphere unchanged. Header supplies only composition/stacking; no extra renderer, timer or dependency. Grain is a finite irregular source-anchored fragment rather than a rectangular full-field texture.
