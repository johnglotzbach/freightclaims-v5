/**
 * Frontend Utilities - Helper functions for the web app
 *
 * Location: apps/web/lib/utils.ts
 */
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge Tailwind CSS classes safely, handling conflicts and conditional classes */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Status badge color mapping for claim statuses */
export function getStatusBadgeClass(status: string): string {
  const map: Record<string, string> = {
    draft: 'badge-neutral',
    pending: 'badge-warning',
    in_review: 'badge-info',
    approved: 'badge-success',
    denied: 'badge-danger',
    appealed: 'badge-warning',
    in_negotiation: 'badge-info',
    settled: 'badge-success',
    closed: 'badge-neutral',
    cancelled: 'badge-neutral',
  };
  return map[status] || 'badge-neutral';
}
