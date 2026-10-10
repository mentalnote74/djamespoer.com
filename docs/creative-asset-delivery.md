# Creative production asset delivery

The approved master is `public/assets/perspectives/SCRUM-64-Larry-V2-C.png` (2172 ? 724, RGB/sRGB PNG, 3,608,344 bytes). Never overwrite or regenerate it for delivery optimization.

Run `npm run assets:creative` from the repository root with ImageMagick 7 installed and `magick` on PATH. The Node script verifies the approved master SHA-256, resizes without cropping, strips metadata and creates WebP quality-90 derivatives. Outputs are committed; Cloudflare builds do not need ImageMagick. Run this explicitly after creative approval, inspect output against the master, test and commit the derivatives. Do not automatically recompress unrelated assets. A changed master requires explicit approval and an updated hash guard.

| Output             | Dimensions | Bytes   | Reduction from master |
| ------------------ | ---------- | ------- | --------------------- |
| creative-600.webp  | 600 ? 200  | 70,610  | 98.04%                |
| creative-1200.webp | 1200 ? 400 | 255,464 | 92.92%                |
| creative-1800.webp | 1800 ? 600 | 520,140 | 85.58%                |
| creative-2172.webp | 2172 ? 724 | 709,748 | 80.33%                |

All outputs live in `public/assets/perspectives/`. Native width-descriptor source sets allow browsers to choose according to viewport, layout and pixel density. Hero sizes follow the existing 80rem container and fluid gutters; carousel sizes additionally account for slide padding and borders. Both preserve the whole 3:1 artwork, existing alt text and intrinsic dimensions. The hero remains eager/high priority; the carousel remains lazy. Modern supported browsers decode WebP; the largest WebP is the default source. The archival PNG remains preserved and is not the download fallback.

Format comparison at full dimensions: lossless WebP 2,702,674 bytes; WebP quality 85 589,976 bytes; WebP quality 90 709,748 bytes; AVIF quality 90 727,452 bytes. Encoder quality numbers are not equivalent across formats. Quality-90 WebP was selected for fidelity and simplicity; no AVIF alternate is shipped. Direct master/derivative image inspection showed no material visual degradation; rendered desktop/mobile acceptance remains necessary.

## Authoritative baseline

James's preserved, unmodified local Lighthouse export `traces/djamespoer.com-20261010T094057.json` captured production `/creative` at 2026-10-10T13:40:57.092Z. Report SHA-256: `6cd808049d740b817543033610f8f71a9421ef9a0768280b77feed6e7a407897`. Keep traces untracked; heavyweight reports belong in Jira under the existing evidence convention.

Performance 80; Accessibility, Best Practices and SEO 100; Agentic Browsing category score 100%. FCP 0.567 s; LCP 3.658 s; TBT 0 ms; CLS 0; Speed Index 0.567 s. The LCP node is `img.proof-page__artwork`, measured at 1231 ? 410 CSS pixels, downloading the 3,608,344-byte PNG. Estimated image-delivery savings: 3,346,256 bytes (3,268 KiB). This establishes the target resource; improvement must be measured rather than assumed.

## Acceptance still required

After exact-SHA deployment verify selected `currentSrc` and transfer bytes at desktop/mobile and higher pixel density, visual fidelity/reflow/no cropping, console, canonical/meta and axe. Rerun production Lighthouse and record all categories plus FCP/LCP/TBT/CLS/Speed Index and remaining image savings. Do not claim a new score or LCP before measurement. SCRUM-7 comment 10047 establishes this production optimization gate for future approved visual assets.
