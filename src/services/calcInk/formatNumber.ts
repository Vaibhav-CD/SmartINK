/**
 * Single number formatter for every math surface (canvas projections,
 * step solutions, scrubbers, voice-adjacent displays) so the same value
 * never renders with different precision depending on where it appears.
 * Integers print plainly; other values use 12-significant-digit cleanup
 * (kills float artifacts like 0.30000000000000004) capped at 6 decimals.
 */
export function formatNumber(num: number): string {
  if (!isFinite(num)) return 'Undefined';
  if (Number.isInteger(num)) return String(num);
  const rounded = Number(num.toPrecision(12));
  if (Number.isInteger(rounded)) return String(rounded);
  return rounded.toFixed(6).replace(/\.?0+$/, '');
}
