import type { ArtworkSlide } from './perspective-slide';

/** Traced on the approved 1200x400 exports: the exact 3:1 projection of 2172x724.
 * Both the raster and SVG cover the same rectangle. Clips stay fixed; only light inside moves.
 */
interface ArtworkRegion {
  readonly id: string;
  readonly clip: string;
  readonly flow: string;
  readonly color: string;
  readonly width: number;
  readonly duration: number;
  readonly delay: number;
  readonly behavior: 'signal' | 'wash' | 'guidance' | 'ribbon' | 'branch' | 'crater';
}
export const PERSPECTIVE_REGIONS: Readonly<Record<ArtworkSlide, readonly ArtworkRegion[]>> = {
  engineering: [
    {
      id: 'shaft',
      clip: 'M754 12 L808 6 L811 297 L780 304 L752 292 Z',
      flow: 'M783 300 L783 10',
      color: '#ffd49a',
      width: 14,
      duration: 4.8,
      delay: -3,
      behavior: 'signal',
    },
    {
      id: 'bridge',
      clip: 'M493 120 L779 146 L1017 117 L1020 124 L783 157 L492 130 Z',
      flow: 'M497 126 L782 151 L1017 120',
      color: '#ffe0ab',
      width: 6,
      duration: 6.2,
      delay: -9,
      behavior: 'signal',
    },
    {
      id: 'foreground-rail',
      clip: 'M785 287 C910 280 1000 314 1200 338 L1200 366 C1012 331 902 303 786 302 Z',
      flow: 'M790 295 C914 288 1024 328 1200 351',
      color: '#f8ba76',
      width: 10,
      duration: 5.5,
      delay: -5,
      behavior: 'signal',
    },
  ],
  ux: [
    {
      id: 'near-walkway',
      clip: 'M705 400 C714 352 700 307 679 283 C745 288 799 252 851 226 L861 235 C832 284 830 341 847 400 Z',
      flow: 'M773 400 C767 340 747 306 777 280 L849 234',
      color: '#b7e9df',
      width: 36,
      duration: 6.8,
      delay: -1.3,
      behavior: 'wash',
    },
    {
      id: 'distant-branch',
      clip: 'M928 182 C997 155 1050 127 1156 94 L1167 98 C1128 123 1066 134 1016 165 L963 191 Z',
      flow: 'M940 181 C1010 151 1096 118 1160 98',
      color: '#ecedc5',
      width: 20,
      duration: 9.4,
      delay: -5.7,
      behavior: 'branch',
    },
  ],
  accessibility: [
    {
      id: 'far-threshold',
      clip: 'M595 108 L735 108 L735 259 L725 259 L725 120 L595 120 Z',
      flow: 'M600 114 L730 114 L730 258',
      color: '#fff3c5',
      width: 7,
      duration: 6,
      delay: -4,
      behavior: 'guidance',
    },
    {
      id: 'middle-threshold',
      clip: 'M541 73 L777 73 L777 270 L761 270 L761 88 L541 88 Z',
      flow: 'M547 81 L769 81 L769 269',
      color: '#fff0c2',
      width: 12,
      duration: 6,
      delay: -2,
      behavior: 'guidance',
    },
    {
      id: 'floor-guide',
      clip: 'M488 294 L780 294 L831 310 L463 311 Z',
      flow: 'M489 302 L812 302',
      color: '#dceeff',
      width: 9,
      duration: 6,
      delay: 0,
      behavior: 'guidance',
    },
  ],
  ai: [
    {
      id: 'upper-ribbon',
      clip: 'M435 182 C548 162 640 29 740 48 C780 49 804 70 837 72 L838 81 C799 80 780 58 739 58 C634 41 552 178 436 191 Z',
      flow: 'M438 186 C550 170 638 36 739 53 C782 53 803 76 835 76',
      color: '#f7d6a0',
      width: 10,
      duration: 4.6,
      delay: -4,
      behavior: 'ribbon',
    },
    {
      id: 'lower-ribbon',
      clip: 'M435 216 C543 226 571 307 679 305 C756 308 783 277 839 275 L839 286 C780 287 755 320 680 317 C572 320 537 238 434 223 Z',
      flow: 'M438 220 C542 231 574 312 680 311 C756 315 788 281 837 281',
      color: '#9bd4ce',
      width: 12,
      duration: 6.1,
      delay: -2.8,
      behavior: 'ribbon',
    },
    {
      id: 'output',
      clip: 'M962 182 L1200 185 L1200 201 L962 198 Z',
      flow: 'M966 190 L1200 193',
      color: '#ffdd9f',
      width: 12,
      duration: 3.7,
      delay: -6,
      behavior: 'signal',
    },
  ],
  impact: [
    {
      id: 'main-crater',
      clip: 'M712 86 C777 54 901 50 1008 83 C1101 107 1146 160 1146 224 C1145 293 1034 341 924 340 C795 339 700 292 673 229 C643 162 667 119 712 86 Z',
      flow: 'M733 119 C785 90 879 94 969 118 C1047 140 1094 175 1093 223 C1089 272 1009 301 924 301 C821 299 754 264 720 222 C694 180 699 146 733 119 Z',
      color: '#f2d7b1',
      width: 8,
      duration: 8.6,
      delay: -1.2,
      behavior: 'crater',
    },
    {
      id: 'upper-crater',
      clip: 'M579 25 C602 4 658 2 687 22 C718 40 719 68 699 90 C674 118 615 117 586 96 C560 78 557 48 579 25 Z',
      flow: 'M585 30 C607 11 654 10 682 28 C708 43 710 66 692 85 C669 109 620 108 592 91 C570 76 568 50 585 30 Z',
      color: '#d5e7ee',
      width: 4,
      duration: 6.7,
      delay: -4.6,
      behavior: 'crater',
    },
    {
      id: 'lower-crater',
      clip: 'M649 311 C671 291 707 290 730 305 C752 319 750 344 731 361 C707 382 671 378 649 362 C630 347 631 326 649 311 Z',
      flow: 'M654 316 C674 299 705 297 725 312 C744 325 742 341 725 355 C705 372 676 371 655 356 C640 344 640 330 654 316 Z',
      color: '#ecd3af',
      width: 4,
      duration: 7.9,
      delay: -6.1,
      behavior: 'crater',
    },
  ],
};
