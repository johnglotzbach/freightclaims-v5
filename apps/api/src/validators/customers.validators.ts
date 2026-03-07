/**
 * Customers Validators - Zod schemas for customer request validation
 *
 * Location: apps/api/src/validators/customers.validators.ts
 */
import { z } from 'zod';

export const createCustomerSchema = z.object({
  name: z.string().min(1, 'Customer name is required'),
  code: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  website: z.string().url().optional(),
  industry: z.string().optional(),
});

export const updateCustomerSchema = z.object({
  name: z.string().optional(),
  code: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  website: z.string().url().optional(),
  industry: z.string().optional(),
});

export const listCustomersQuerySchema = z.object({
  page: z.coerce.number().positive().default(1),
  limit: z.coerce.number().positive().max(100).default(25),
  search: z.string().optional(),
});
