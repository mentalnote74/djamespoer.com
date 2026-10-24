# Big Dumb Bass — approved source package

SCRUM-145. Original supplied masters, manifest, provenance and reference previews
are retained here; none is a runtime PNG or public career-source document.

Package: `big-dumb-bass-slide-handoff.zip`, supplied October 24, 2026.
SHA-256: `0d9d321deb4c9668a4de3794f62afb4fde23a6596278e8263651806abde5f905`.

The 30 unchanged production exports are under
`public/assets/registered-slides/big-dumb-bass/desktop/`: pond, bass, lure,
fish-free opening poster and reduced-motion fallback, each at 768/1440/2172px,
AVIF/WebP. One full 3:1 registered family serves all widths; there is no
independent mobile crop. All 30 files match the supplied manifest's SHA-256.
The existing asset registry validates their geometry and skips re-encoding these
supplied exports. Source masters and prompts are preserved, not regenerated.

`HANDOFF.md`, `preview.html` and `scene.css` are the unmodified original design
reference. Their original `assets/` relative paths describe the package layout;
the integrated Angular preview uses the production paths above. Full concept
compressed variants are not runtime assets; the concept PNG master is retained.

Read [integration evidence](../../docs/evidence/scrum-145/README.md) and run
`node scripts/big-dumb-bass-slide/preview.mjs` after a production build for the
actual component. No source-master request or new asset-generation step is
needed to run the application.
