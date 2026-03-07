/**
 * Express Type Augmentations
 *
 * Extends the Express Request interface to include the authenticated user
 * payload injected by the auth middleware.
 *
 * Location: apps/api/src/types/express.d.ts
 */
import type { JwtPayload } from '../middleware/auth.middleware';

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
