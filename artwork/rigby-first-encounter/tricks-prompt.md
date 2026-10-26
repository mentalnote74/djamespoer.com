# Rigby additional poses — October 25, 2026

Owner requested sit, shake, beg, roll-over, and an articulated jump instead of translating a static pose. Built-in imagegen used the existing behaviors.webp as the character/style reference and produced a transparent 4×4 atlas. Runtime: public/assets/rigby/tricks-v1.webp (256×256, 78,718 bytes). Original full-resolution generated source retained in this chat's outputs/rigby-poses-source.png.

Rows (left to right):
1. sit, paw lift, shake, beg
2. beg variation, side, back, opposite side
3. recovery crouch, stand, jump crouch, takeoff
4. rise, apex, descend, landing

Uniform 64px cells, transparent gutters, no repeat. Greeting uses 128px cells via CSS scaling. Frames are selected discretely, never interpolated across neighboring cells. Pause/reduced-motion behavior remains respected. Original movement/greeting artwork remains intact.
