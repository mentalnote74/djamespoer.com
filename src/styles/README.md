# Sass foundation

`styles.scss` loads emitting `base` and `layout` layers once. Components import only the non-emitting `abstracts` facade with `@use`; importing it adds no browser CSS.

## Public API

- `foundation.breakpoint($name)` returns a validated width.
- `@include foundation.at-or-below($name) { ... }` emits one inclusive max-width query containing only caller content.
- Names: `controls-grid` 32rem, `content-stack` 40rem, `artwork-compact` 48rem, `navigation-wrap` 64rem. These preserve existing transitions, not device categories. Unknown names produce a compilation error. Reduced motion remains an independent preference query.
- Compile-time values: `$font-stack`, `$body-line-height`, `$heading-weight`, `$control-target`, `$focus-width`, `$focus-offset`, `$link-hover-thickness`.

The facade explicitly forwards public members. `_responsive.scss` keeps its `$-breakpoints` map private; callers cannot mutate policy through configuration. `_foundations.scss` supplies compile-time values. Import the facade rather than internal files. Neither module emits CSS.

`base/_elements.scss` owns inherited typography, native paragraph spacing, heading weight, link treatment, control font inheritance and basic table alignment. Contextual component margins, heading sizes, control appearance and table borders/padding remain local. `base/_accessibility.scss` owns ordinary native-control focus geometry and `.visually-hidden`; its important declarations intentionally prevent contextual rules from exposing hidden copy. Skip-link behavior remains in App.

Runtime colors use `--page-background` and `--page-foreground`; existing layout custom properties retain their ownership. Changing page colors does not require rebuilding Sass. This is not a complete theme system.

Group responsive changes in one mixin call per component transition. Angular styles are compiled separately: the shared API does not merge media rules across component chunks. No utility generation, loops, placeholders or extends are needed. Extends would couple selectors and potentially expand generated selector lists; maps here represent policy, not generators.

Tests: `node --test scripts/styles-foundation.test.mjs` uses the Sass compiler already installed for Angular builds. They cover non-emission, established thresholds, validation, grouped output and private-policy access.

## Chunk 1 output comparison

The accepted audit baseline and fresh production artifacts use the same extraction categories:

| Measurement                                | Before |  After |
| ------------------------------------------ | -----: | -----: |
| Sass files                                 |     13 |     19 |
| Sass lines                                 |    652 |    716 |
| Sass source bytes                          | 10,547 | 12,067 |
| Minified global CSS bytes                  |    698 |  1,262 |
| Component CSS bytes embedded in JavaScript |  9,036 |  8,434 |
| Total extracted application CSS bytes      |  9,734 |  9,696 |
| Combined gzip comparison bytes             |  2,311 |  2,371 |

The gzip comparison compresses concatenated extracted CSS; it is not an actual network-transfer measurement. The four width media blocks and one reduced-motion block remain unchanged. Hero and Smart Grid account for the component reduction; Carousel output is unchanged. The total CSS footprint is approximately unchanged, with clearer ownership rather than a claimed performance improvement.

## Native accordion/disclosure

Use `<details class="disclosure surface-card surface-raised">` with a native
`<summary>`, an optional decorative `.disclosure-chevron` SVG, and a
`.disclosure-content` body. Leave off `open` for the collapsed default.
`components/_disclosure.scss` owns only header/body layout and open-state geometry.
Existing surface classes own colors/radius/shadows; shared base styles own UI
fonts, action icons and keyboard focus. No component-specific accordion chrome
or JavaScript state is needed. Other native details remain unchanged until they
opt in to this treatment.

Transparent character art can use `.sprite-shadow`. Its `--sprite-shadow` filter
is derived from the existing live light direction, blur, ink and opacity roles.
Place it outside a facing/mirroring wrapper so cursor direction does not reverse
the light source. It follows theme changes without another animation clock.
