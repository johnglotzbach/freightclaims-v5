/**
 * Shared Constants - Business rules, enums, and configuration values
 *
 * Single source of truth for values that appear in both frontend and backend.
 * Never hardcode these values elsewhere -- import from here.
 *
 * Location: packages/shared/src/constants/index.ts
 */

/** All possible claim statuses with their display labels */
export const CLAIM_STATUSES = {
  draft: 'Draft',
  pending: 'Pending',
  in_review: 'In Review',
  approved: 'Approved',
  denied: 'Denied',
  appealed: 'Appealed',
  in_negotiation: 'In Negotiation',
  settled: 'Settled',
  closed: 'Closed',
  cancelled: 'Cancelled',
} as const;

/** All possible claim types with their display labels */
export const CLAIM_TYPES = {
  damage: 'Damage',
  shortage: 'Shortage',
  loss: 'Loss',
  concealed_damage: 'Concealed Damage',
  refused: 'Refused',
  theft: 'Theft',
} as const;

/** Carmack Amendment compliance timelines (in days) */
export const CARMACK_TIMELINES = {
  carrierAcknowledgmentDays: 30,      // Carrier must acknowledge within 30 days
  carrierDispositionDays: 120,         // Carrier must accept/decline within 120 days
  filingWindowMonths: 9,               // Claim must be filed within 9 months of delivery
  lawsuitDeadlineYears: 2,            // 2 years + 1 day to file lawsuit after denial
  lawsuitGraceDays: 1,                // Extra day added to the 2-year lawsuit window
} as const;

/** Pagination defaults */
export const PAGINATION = {
  defaultPage: 1,
  defaultLimit: 25,
  maxLimit: 100,
} as const;

/** Document category names (matches seed data) */
export const DOCUMENT_CATEGORIES = [
  'Bill of Lading',
  'Proof of Delivery',
  'Invoice',
  'Damage Photos',
  'Inspection Report',
  'Carrier Response',
  'Settlement',
  'Correspondence',
] as const;

/** User roles */
export const USER_ROLES = {
  admin: 'admin',
  manager: 'manager',
  user: 'user',
  viewer: 'viewer',
} as const;

/** Claim party types */
export const PARTY_TYPES = ['claimant', 'carrier', 'payee', 'shipper', 'consignee'] as const;

/** Status color mapping for UI badges */
export const STATUS_COLORS: Record<string, string> = {
  draft: 'gray',
  pending: 'yellow',
  in_review: 'blue',
  approved: 'green',
  denied: 'red',
  appealed: 'orange',
  in_negotiation: 'purple',
  settled: 'emerald',
  closed: 'slate',
  cancelled: 'gray',
};
