# Bedlam - seeded procedural 2D engine

`createBedlam(palette, seed, config)` in `src/app/components/bedlam/engine.ts` is a pure deterministic recipe generator. It has no DOM, clock, canvas, WebGL, external dependency or animation loop. Identical inputs reproduce identical layers; different seeds/configurations intentionally produce different scenes.

Palette entries accept CSS colors or semantic custom-property references. The header passes existing theme references, so Living Theme updates cascade directly into the same geometry without regenerating it every animation frame. Angular computed state regenerates recipes only when palette/seed/config/speed inputs change. Each component owns its inputs, recipe and pause/visibility state.

Modules are nebula gradients, repeating rings, conic rays, stationary fine streak texture and optional particles. Default: six decorative spans, no particles. Density is bounded to 0-1, particles to 24, position to +/-25%, scale to 0.7-2, and intensity/symmetry/turbulence/opacity/speed/depth to 0-1. Invalid numeric values use defaults. Disabling a module leaves the retained slots deterministic. Config also selects blend and motion direction; speed zero pauses.

CSS owns slow independent transforms, near/far scaling, blur falloff, layered occlusion, edge highlights and theme-directed cast shadows. These are 2D depth cues, not a 3D scene. Consumers can use the pure recipe with their own CSS treatment rather than copying header artwork.

Light themes retain a neutral black canonical wordmark with a white edge over the surrounding procedural field. Rum Runner/Bloody Mary move the field into the same SVG silhouette on black, with a neutral white edge preserving recognition. The SVG asset/geometry remains unchanged. The Home link/accessibility name and full outer hit target remain owned by Header; every visual layer is decorative and ignores pointer events.

Reduced motion disables CSS animation, including live preference changes. Existing pause input, document visibility and intersection state pause animation without running a JavaScript frame loop. Destroy disconnects observers/listeners. Forced colors removes the field and uses Canvas/CanvasText. Unsupported masks/gradients still leave the accessible Home link name; the procedural field is not information.

Validation: production build/budgets; focused recipe/component tests; canonical vector hash test; rendered desktop/mobile theme checks; visual inspection of actual light/dark composites; scoped logo axe and reduced-motion/forced-colors checks. Logo artwork is exempt from WCAG text contrast ratios; neutral edges and the accessible link/focus indicator are checked rather than inventing a numeric contrast score for a changing gradient. No new Lighthouse run or broad site audit.
