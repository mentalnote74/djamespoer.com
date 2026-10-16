export const COOKIE_VARIETIES = [
  { id: 'chocolate-chip', label: 'Chocolate Chip', bit: 0 },
  { id: 'snickerdoodle', label: 'Snickerdoodle', bit: 1 },
  { id: 'peanut-butter', label: 'Peanut Butter', bit: 2 },
  { id: 'sugar-cookie', label: 'Sugar Cookie', bit: 4 },
  { id: 'oatmeal-raisin', label: 'Oatmeal Raisin', bit: 3 },
  { id: 'shortbread', label: 'Shortbread', bit: 5 },
  { id: 'ginger-snap', label: 'Ginger Snap', bit: 6 },
  { id: 'white-chocolate-macadamia', label: 'White Chocolate Macadamia', bit: 7 },
  { id: 'double-chocolate', label: 'Double Chocolate', bit: 8 },
  { id: 'molasses', label: 'Molasses', bit: 9 },
  { id: 'thumbprint', label: 'Thumbprint', bit: 10 },
  { id: 'lemon-cookie', label: 'Lemon Cookie', bit: 11 },
] as const;
export const PREFERENCE_COOKIE = 'portfolio_cookie_preferences';
export const PREFERENCE_MAX_AGE = 180 * 24 * 60 * 60;
// Explicit stable bits preserve the six original v1 selections even when display order changes.
// New varieties use unused bits. Bump version only for incompatible meaning/schema changes.
export function decodePreferences(value: string | undefined): readonly string[] | null {
  if (!value || !/^1\.(0|[1-9]\d{0,3})$/.test(value)) return null;
  const bits = Number(value.slice(2));
  if (bits >= 2 ** COOKIE_VARIETIES.length) return null;
  return COOKIE_VARIETIES.filter((item) => bits & (1 << item.bit)).map((v) => v.id);
}
export function encodePreferences(selected: readonly string[]): string {
  if (selected.some((id) => !COOKIE_VARIETIES.some((v) => v.id === id)))
    throw new Error('Invalid cookie preference');
  return (
    '1.' +
    COOKIE_VARIETIES.reduce(
      (bits, item) => (selected.includes(item.id) ? bits | (1 << item.bit) : bits),
      0,
    )
  );
}
