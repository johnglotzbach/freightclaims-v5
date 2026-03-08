/**
 * Claims Validators - Zod schemas for claim request validation
 *
 * Location: apps/api/src/validators/claims.validators.ts
 */
import { z } from 'zod';

export const createClaimSchema = z.object({
  claimNumber: z.string().optional(),
  proNumber: z.string().optional().default(''),
  primaryIdentifier: z.string().optional(),
  identifierType: z.string().optional(),
  status: z.enum(['draft', 'pending', 'in_review']).default('draft'),
  claimType: z.string().min(1, 'Claim type is required'),
  claimMode: z.string().optional(),
  companyDivision: z.string().optional(),
  claimAmount: z.union([z.number(), z.string()]).transform(v => Number(v) || 0),
  description: z.string().optional(),
  note: z.string().optional(),
  shipDate: z.string().optional(),
  deliveryDate: z.string().optional(),
  filingDate: z.string().optional(),
  bolNumber: z.string().optional(),
  poNumber: z.string().optional(),
  referenceNumber: z.string().optional(),
  customIdentifier2: z.string().optional(),
  customIdentifier3: z.string().optional(),
  freightCharges: z.union([z.number(), z.string()]).transform(v => Number(v) || 0).optional(),
  contingencyCharges: z.union([z.number(), z.string()]).transform(v => Number(v) || 0).optional(),
  salvageAllowance: z.union([z.number(), z.string()]).transform(v => Number(v) || 0).optional(),
  isPrivateFreightCharges: z.boolean().optional(),
  parties: z.array(z.record(z.unknown())).optional(),
  products: z.array(z.record(z.unknown())).optional(),
  originCity: z.string().optional(),
  originState: z.string().optional(),
  destinationCity: z.string().optional(),
  destinationState: z.string().optional(),
}).passthrough();

export const updateClaimSchema = z.object({
  claimNumber: z.string().optional(),
  proNumber: z.string().optional(),
  status: z.string().optional(),
  claimType: z.string().optional(),
  claimAmount: z.union([z.number(), z.string()]).transform(v => Number(v) || 0).optional(),
  description: z.string().optional(),
  shipDate: z.string().optional(),
  deliveryDate: z.string().optional(),
  filingDate: z.string().optional(),
  acknowledgmentDate: z.string().optional(),
}).passthrough();

export const listClaimsQuerySchema = z.object({
  page: z.coerce.number().positive().default(1),
  limit: z.coerce.number().positive().max(100).default(25),
  status: z.string().optional(),
  customerId: z.string().optional(),
  search: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  filedDateFrom: z.string().optional(),
  filedDateTo: z.string().optional(),
  hasTasks: z.coerce.boolean().optional(),
  hasOverdueTasks: z.coerce.boolean().optional(),
  unreadEmails: z.coerce.boolean().optional(),
  sortBy: z.string().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
