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
  customerId: z.string().optional(),
  shipDate: z.string().datetime().optional(),
  deliveryDate: z.string().datetime().optional(),
  originCity: z.string().optional(),
  originState: z.string().optional(),
  destinationCity: z.string().optional(),
  destinationState: z.string().optional(),
  weight: z.number().optional(),
  pieces: z.number().optional(),
});

export const updateShipmentSchema = createShipmentSchema.partial();
