/**
 * Documents Controller - Request handling for document management
 *
 * Location: apps/api/src/controllers/documents.controller.ts
 * Related: apps/api/src/services/documents.service.ts
 */
import type { Request, Response, NextFunction } from 'express';
import { documentsService } from '../services/documents.service';
import type { JwtPayload } from '../middleware/auth.middleware';

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

function getUser(req: Request): JwtPayload {
  return (req as Request & { user: JwtPayload }).user;
}

export const documentsController = {
  list: asyncHandler(async (req, res) => { const user = getUser(req); res.json(await documentsService.list(req.query, user)); }),
  getById: asyncHandler(async (req, res) => { const user = getUser(req); res.json(await documentsService.getById(req.params.id as string, user)); }),
  upload: asyncHandler(async (req, res) => { res.status(201).json(await documentsService.upload(req)); }),
  delete: asyncHandler(async (req, res) => { const user = getUser(req); await documentsService.delete(req.params.id as string, user); res.status(204).send(); }),
  download: asyncHandler(async (req, res) => { const user = getUser(req); await documentsService.download(req.params.id as string, res, user); }),
  getSignedUrl: asyncHandler(async (req, res) => { const user = getUser(req); res.json(await documentsService.getSignedUrl(req.params.id as string, user)); }),

  // Categories (shared reference data)
  getCategories: asyncHandler(async (req, res) => { const user = getUser(req); res.json(await documentsService.getCategories(user)); }),
  createCategory: asyncHandler(async (req, res) => { const user = getUser(req); res.status(201).json(await documentsService.createCategory(req.body, user)); }),
  updateCategory: asyncHandler(async (req, res) => { const user = getUser(req); res.json(await documentsService.updateCategory(req.params.id as string, req.body, user)); }),
  deleteCategory: asyncHandler(async (req, res) => { const user = getUser(req); await documentsService.deleteCategory(req.params.id as string, user); res.status(204).send(); }),

  // Category mapping
  getCategoryMapping: asyncHandler(async (req, res) => { const user = getUser(req); res.json(await documentsService.getCategoryMapping(user)); }),
  updateCategoryMapping: asyncHandler(async (req, res) => { const user = getUser(req); res.json(await documentsService.updateCategoryMapping(req.body, user)); }),

  // AI processing
  processWithAI: asyncHandler(async (req, res) => { const user = getUser(req); res.json(await documentsService.processWithAI(req.params.id as string, user)); }),
  getExtractedData: asyncHandler(async (req, res) => { const user = getUser(req); res.json(await documentsService.getExtractedData(req.params.id as string, user)); }),

  // ConvertAPI conversions
  convertToPdf: asyncHandler(async (req, res) => { const user = getUser(req); res.json(await documentsService.convertToPdf(req.params.id as string, user)); }),
  mergeClaimDocs: asyncHandler(async (req, res) => { const user = getUser(req); res.json(await documentsService.mergeClaimDocs(req.body.claimId, req.body.documentIds, user)); }),
};
