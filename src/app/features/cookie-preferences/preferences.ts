export const COOKIE_VARIETIES = [
  { id: 'chocolate-chip', label: 'Chocolate Chip' },
  { id: 'snickerdoodle', label: 'Snickerdoodle' },
  { id: 'peanut-butter', label: 'Peanut Butter' },
  { id: 'oatmeal-raisin', label: 'Oatmeal Raisin' },
  { id: 'sugar-cookie', label: 'Sugar Cookie' },
  { id: 'shortbread', label: 'Shortbread' },
] as const;
export const PREFERENCE_COOKIE = 'portfolio_cookie_preferences';
export const PREFERENCE_MAX_AGE = 180 * 24 * 60 * 60;
// Bit positions are stable within v1. Bump version for incompatible list/schema changes.
export function decodePreferences(value: string | undefined): readonly string[] | null {
  if (!value || !/^1\.(0|[1-9]\d?)$/.test(value)) return null;
  const bits = Number(value.slice(2));
  if (bits >= 2 ** COOKIE_VARIETIES.length) return null;
  return COOKIE_VARIETIES.filter((_, index) => bits & (1 << index)).map((v) => v.id);
}
export function encodePreferences(selected: readonly string[]): string {
  if (selected.some((id) => !COOKIE_VARIETIES.some((v) => v.id === id)))
    throw new Error('Invalid cookie preference');
  return (
    '1.' +
    COOKIE_VARIETIES.reduce(
      (bits, item, index) => (selected.includes(item.id) ? bits | (1 << index) : bits),
      0,
    )
  );
}
