/**
 * Shared Utilities - Helper functions used across frontend and backend
 *
 * Location: packages/shared/src/utils/index.ts
 */

/**
 * Formats a number as USD currency string.
 * @example formatCurrency(1234.5) // "$1,234.50"
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
}

/**
 * Formats a date string into a human-readable format.
 * @example formatDate('2026-01-15T10:30:00Z') // "Jan 15, 2026"
 */
export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  });
}

/**
 * Formats a date string with time included.
 * @example formatDateTime('2026-01-15T10:30:00Z') // "Jan 15, 2026 10:30 AM"
 */
export function formatDateTime(date: string | Date): string {
  return formatDate(date, { hour: 'numeric', minute: '2-digit' });
}

/**
 * Generates a sequential claim number with a prefix.
 * @example generateClaimNumber(1234) // "FC-001234"
 */
export function generateClaimNumber(sequence: number): string {
  return `FC-${String(sequence).padStart(6, '0')}`;
}

/**
 * Truncates text to a maximum length, adding ellipsis if truncated.
 * @example truncate('Hello World', 8) // "Hello..."
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Returns the full name from first and last name parts.
 * Handles missing parts gracefully.
 */
export function fullName(firstName?: string, lastName?: string): string {
  return [firstName, lastName].filter(Boolean).join(' ') || 'Unknown';
}

/**
 * Calculates the number of days between two dates.
 * Useful for Carmack compliance deadline calculations.
 */
export function daysBetween(startDate: string | Date, endDate: string | Date): number {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate;
  const diffMs = end.getTime() - start.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Checks if a date is past a given deadline (in days from the start date).
 * @example isOverdue('2026-01-01', 30) // true if today is Feb 1+ 2026
 */
export function isOverdue(startDate: string | Date, deadlineDays: number): boolean {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate;
  const deadline = new Date(start.getTime() + deadlineDays * 24 * 60 * 60 * 1000);
  return new Date() > deadline;
}
