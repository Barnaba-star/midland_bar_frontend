/**
 * A calendar day as yyyy-MM-dd in this device's own time.
 *
 * Not toISOString(): that turns the date into UTC first, and in Tanzania
 * (UTC+3) a day picked at midnight became the day before - a sale filed on
 * the 8th went in as the 7th, and anything done before 03:00 too.
 */
export function localDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
