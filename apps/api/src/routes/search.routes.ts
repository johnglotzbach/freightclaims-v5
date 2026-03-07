/**
 * Search Routes - Universal cross-entity search
 *
 * Provides a single search endpoint that queries across claims, customers,
 * shipments, carriers, and contacts. Results are ranked by relevance and
 * grouped by entity type.
 *
 * Location: apps/api/src/routes/search.routes.ts
 * Related: apps/api/src/controllers/search.controller.ts
 */
import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { searchController } from '../controllers/search.controller';

export const searchRouter = Router();

searchRouter.use(authenticate);

// Universal search across all entities
searchRouter.get('/', searchController.universalSearch);

// Entity-specific search (optional filtering)
searchRouter.get('/claims', searchController.searchClaims);
searchRouter.get('/customers', searchController.searchCustomers);
searchRouter.get('/carriers', searchController.searchCarriers);
searchRouter.get('/shipments', searchController.searchShipments);
