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
  readonly behavior: 'signal' | 'wash' | 'guidance' | 'ribbon' | 'wake';
}
export const PERSPECTIVE_REGIONS: Readonly<Record<ArtworkSlide, readonly ArtworkRegion[]>> = {
  engineering: [
    {
      id: 'shaft',
      clip: 'M754 12 L808 6 L811 297 L780 304 L752 292 Z',
      flow: 'M783 300 L783 10',
      color: '#ffd49a',
      width: 7,
      duration: 11,
      delay: -3,
      behavior: 'signal',
    },
    {
      id: 'bridge',
      clip: 'M493 120 L779 146 L1017 117 L1020 124 L783 157 L492 130 Z',
      flow: 'M497 126 L782 151 L1017 120',
      color: '#ffe0ab',
      width: 3,
      duration: 15,
      delay: -9,
      behavior: 'signal',
    },
    {
      id: 'foreground-rail',
      clip: 'M785 287 C910 280 1000 314 1200 338 L1200 366 C1012 331 902 303 786 302 Z',
      flow: 'M790 295 C914 288 1024 328 1200 351',
      color: '#f8ba76',
      width: 5,
      duration: 13,
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
      width: 24,
      duration: 18,
      delay: -7,
      behavior: 'wash',
    },
    {
      id: 'distant-branch',
      clip: 'M928 182 C997 155 1050 127 1156 94 L1167 98 C1128 123 1066 134 1016 165 L963 191 Z',
      flow: 'M940 181 C1010 151 1096 118 1160 98',
      color: '#ecedc5',
      width: 13,
      duration: 21,
      delay: -14,
      behavior: 'wash',
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
      width: 5,
      duration: 17,
      delay: -4,
      behavior: 'ribbon',
    },
    {
      id: 'lower-ribbon',
      clip: 'M435 216 C543 226 571 307 679 305 C756 308 783 277 839 275 L839 286 C780 287 755 320 680 317 C572 320 537 238 434 223 Z',
      flow: 'M438 220 C542 231 574 312 680 311 C756 315 788 281 837 281',
      color: '#9bd4ce',
      width: 6,
      duration: 19,
      delay: -13,
      behavior: 'ribbon',
    },
    {
      id: 'output',
      clip: 'M962 182 L1200 185 L1200 201 L962 198 Z',
      flow: 'M966 190 L1200 193',
      color: '#ffdd9f',
      width: 6,
      duration: 12,
      delay: -6,
      behavior: 'signal',
    },
  ],
  impact: [
    {
      id: 'near-ridge',
      clip: 'M796 152 L825 165 L837 189 L859 201 L876 229 L891 235 L907 272 L928 282 L940 311 L927 317 L914 288 L894 283 L881 250 L864 242 L848 211 L824 198 L815 176 L790 163 Z',
      flow: 'M798 159 L820 172 L830 193 L854 206 L870 235 L886 244 L901 278 L922 287 L934 314',
      color: '#e8d8bd',
      width: 14,
      duration: 5.5,
      delay: -0.5,
      behavior: 'wake',
    },
    {
      id: 'far-ejecta',
      clip: 'M908 41 L922 46 L941 71 L962 74 L989 96 L1023 106 L1040 127 L1032 132 L1017 114 L986 106 L957 84 L936 81 L915 55 L903 52 Z',
      flow: 'M908 47 L920 51 L940 77 L960 79 L988 102 L1020 110 L1035 129',
      color: '#c7dcdf',
      width: 9,
      duration: 7,
      delay: -3.5,
      behavior: 'wake',
    },
  ],
};
