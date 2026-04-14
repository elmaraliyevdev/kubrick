/** Inclusive range check for ISO date strings against range from API (ISO datetimes). */
export function isIsoDateInRange(iso: string, rangeStartIso: string, rangeEndIso: string): boolean {
  const t = new Date(iso).getTime();
  const a = new Date(rangeStartIso).getTime();
  const b = new Date(rangeEndIso).getTime();
  if (Number.isNaN(t) || Number.isNaN(a) || Number.isNaN(b)) return false;
  return t >= a && t <= b;
}
