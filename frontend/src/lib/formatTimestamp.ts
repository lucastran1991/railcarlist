/**
 * Format epoch ms timestamp for chart axis labels.
 * Adapts format based on the data's time granularity.
 */

export type TimeGranularity = 'hourly' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

/** Detect granularity from an array of timestamps */
export function detectGranularity(timestamps: number[]): TimeGranularity {
  if (timestamps.length < 2) return 'daily';
  const diff = timestamps[1] - timestamps[0];
  if (diff <= 7200000) return 'hourly';       // <= 2h
  if (diff <= 172800000) return 'daily';      // <= 2d
  if (diff <= 1209600000) return 'weekly';    // <= 14d
  if (diff <= 5270400000) return 'monthly';   // <= 61d
  if (diff <= 15811200000) return 'quarterly'; // <= 183d
  return 'yearly';
}

/** Format a single epoch ms timestamp for chart labels */
export function formatTs(ts: number, granularity?: TimeGranularity): string {
  const d = new Date(ts);
  const g = granularity ?? 'daily';
  switch (g) {
    case 'hourly':
      return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    case 'daily':
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    case 'weekly':
      return `W${getISOWeek(d)}`;
    case 'monthly':
      return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
    case 'quarterly':
      return `Q${Math.ceil((d.getMonth() + 1) / 3)} ${d.getFullYear()}`;
    case 'yearly':
      return String(d.getFullYear());
    default:
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}

/** Format for tooltip (always show full date+time) */
export function formatTsTooltip(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

function getISOWeek(d: Date): number {
  const date = new Date(d.getTime());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const week1 = new Date(date.getFullYear(), 0, 4);
  return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
}
