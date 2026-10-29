# Rigby tail wag v2

Generated with the built-in image generator on October 29, 2026, using Rigby's
existing behaviors and tricks atlases as character/style references. No new
runtime dependency. The generator produced isolated fluffy tail poses on alpha;
Chrome canvas mechanically packed the eight poses into 64px cells and aligned
their roots. This replaces rigid CSS tail deformation.

Prompt: isolated curly orange-gold goldendoodle tail only; eight sequential poses
in a four-column, two-row transparent pixel-art atlas; natural flexible side to
side wag, changing curved silhouette with delayed tip; same root and size in
every pose; no body, props, labels, straight rod, rudder, vertical wag or border
bleed. Match the existing Rigby sprite palette and dark pixel shading.

Output: `public/assets/rigby/tail-wag-v2.webp`, 256x128, 12,614 bytes.
SHA256: `951919a98a3fed9d191be89beea0d8dee035d33381043f4d9d1683dc976fa3fe`.
Generated source SHA256:
`2f367a6c323954eb812c98e15c799c1a6738786b389cba78c3b706a455e4bfa2`.

The resting body uses a stepped CSS contour to remove the original upright tail
without cutting its back fur. Tail atlas timing and placement remain independent
of body facing, and pause/reduced motion disable the decorative animation.
