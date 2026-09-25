/** Accepts international numbers: optional +, 7–15 digits, spaces/dashes/brackets/dots allowed. */
export function isValidPhone(value: string): boolean {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, '');
  return /^\+?[\d\s\-().]+$/.test(trimmed) && digits.length >= 7 && digits.length <= 15;
}
