/**
 * Search Controller - Universal cross-entity search
 *
 * Location: apps/api/src/controllers/search.controller.ts
 * Related: apps/api/src/services/search.service.ts
 */
import type { Request, Response, NextFunction } from 'express';
import { searchService } from '../services/search.service';
import type { JwtPayload } from '../middleware/auth.middleware';

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

function getUser(req: Request): JwtPayload {
  return (req as Request & { user: JwtPayload }).user;
}

export const searchController = {
  universalSearch: asyncHandler(async (req, res) => {
    const user = getUser(req);
    const tenant = req.tenant;
    const results = await searchService.universalSearch(req.query.q as string, user, tenant);
    res.json(results);
  }),

  searchClaims: asyncHandler(async (req, res) => {
    const user = getUser(req);
    res.json(await searchService.searchClaims(req.query, user));
  }),

  searchCustomers: asyncHandler(async (req, res) => {
    const user = getUser(req);
    res.json(await searchService.searchCustomers(req.query, user));
  }),

  searchCarriers: asyncHandler(async (req, res) => {
    res.json(await searchService.searchCarriers(req.query));
  }),

  searchShipments: asyncHandler(async (req, res) => {
    const user = getUser(req);
    res.json(await searchService.searchShipments(req.query, user));
  }),
};
