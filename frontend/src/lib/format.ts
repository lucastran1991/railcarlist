import { format } from 'date-fns';

/**
 * Format ISO date string for display (e.g. in tables).
 */
export function formatTime(iso: string): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return isNaN(d.getTime()) ? iso : d.toLocaleString();
  } catch {
    return iso;
  }
}

/**
 * Format ISO or datetime-local string for input type="datetime-local" (YYYY-MM-DDTHH:mm).
 */
export function toDatetimeLocalValue(isoOrEmpty: string): string {
  if (!isoOrEmpty.trim()) return '';
  try {
    const d = new Date(isoOrEmpty);
    return format(d, "yyyy-MM-dd'T'HH:mm");
  } catch {
    return '';
  }
}

/**
 * Convert datetime-local input value to ISO 8601 for API.
 */
export function fromDatetimeLocalToISO(localValue: string): string {
  if (!localValue.trim()) return '';
  try {
    return new Date(localValue).toISOString();
  } catch {
    return localValue;
  }
}
