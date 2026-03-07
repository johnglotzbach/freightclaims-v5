/**
 * Shipments Validators - Zod schemas for shipment request validation
 *
 * Location: apps/api/src/validators/shipments.validators.ts
 */
import { z } from 'zod';

export const createShipmentSchema = z.object({
  proNumber: z.string().min(1, 'PRO number is required'),
  bolNumber: z.string().optional(),
  carrierId: z.string().optional(),
  carrierName: z.string().optional(),
  customerId: z.string().optional(),
  shipDate: z.string().optional(),
  deliveryDate: z.string().optional(),
  originCity: z.string().optional(),
  originState: z.string().optional(),
  destinationCity: z.string().optional(),
  destinationState: z.string().optional(),
  weight: z.union([z.string(), z.number()]).optional(),
  pieces: z.union([z.string(), z.number()]).optional(),
  commodity: z.string().optional(),
  notes: z.string().optional(),
});

export const updateShipmentSchema = createShipmentSchema.partial();
