/**
 * Claims Validators - Zod schemas for claim request validation
 *
 * Location: apps/api/src/validators/claims.validators.ts
 */
import { z } from 'zod';

export const createClaimSchema = z.object({
  claimNumber: z.string().optional(),
  proNumber: z.string().min(1, 'PRO number is required'),
  status: z.enum(['draft', 'pending']).default('draft'),
  claimType: z.string().min(1, 'Claim type is required'),
  claimAmount: z.number().positive('Claim amount must be positive'),
  description: z.string().optional(),
  shipDate: z.string().datetime().optional(),
  deliveryDate: z.string().datetime().optional(),
  filingDate: z.string().datetime().optional(),
});

export const updateClaimSchema = z.object({
  claimNumber: z.string().optional(),
  proNumber: z.string().optional(),
  status: z.string().optional(),
  claimType: z.string().optional(),
  claimAmount: z.number().positive().optional(),
  description: z.string().optional(),
  shipDate: z.string().datetime().optional(),
  deliveryDate: z.string().datetime().optional(),
  filingDate: z.string().datetime().optional(),
});

export const listClaimsQuerySchema = z.object({
  page: z.coerce.number().positive().default(1),
  limit: z.coerce.number().positive().max(100).default(25),
  status: z.string().optional(),
  customerId: z.string().optional(),
  search: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  sortBy: z.string().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});
