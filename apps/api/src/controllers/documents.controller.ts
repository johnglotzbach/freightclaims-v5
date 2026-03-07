/**
 * Documents Controller - Request handling for document management
 *
 * Location: apps/api/src/controllers/documents.controller.ts
 * Related: apps/api/src/services/documents.service.ts
 */
import type { Request, Response, NextFunction } from 'express';
import { documentsService } from '../services/documents.service';

function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

export const documentsController = {
  list: asyncHandler(async (req, res) => { res.json(await documentsService.list(req.query)); }),
  getById: asyncHandler(async (req, res) => { res.json(await documentsService.getById(req.params.id as string)); }),
  upload: asyncHandler(async (req, res) => { res.status(201).json(await documentsService.upload(req)); }),
  delete: asyncHandler(async (req, res) => { await documentsService.delete(req.params.id as string); res.status(204).send(); }),
  download: asyncHandler(async (req, res) => { await documentsService.download(req.params.id as string, res); }),
  getSignedUrl: asyncHandler(async (req, res) => { res.json(await documentsService.getSignedUrl(req.params.id as string)); }),

  // Categories
  getCategories: asyncHandler(async (_req, res) => { res.json(await documentsService.getCategories()); }),
  createCategory: asyncHandler(async (req, res) => { res.status(201).json(await documentsService.createCategory(req.body)); }),
  updateCategory: asyncHandler(async (req, res) => { res.json(await documentsService.updateCategory(req.params.id as string, req.body)); }),
  deleteCategory: asyncHandler(async (req, res) => { await documentsService.deleteCategory(req.params.id as string); res.status(204).send(); }),

  // Category mapping
  getCategoryMapping: asyncHandler(async (_req, res) => { res.json(await documentsService.getCategoryMapping()); }),
  updateCategoryMapping: asyncHandler(async (req, res) => { res.json(await documentsService.updateCategoryMapping(req.body)); }),

  // AI processing
  processWithAI: asyncHandler(async (req, res) => { res.json(await documentsService.processWithAI(req.params.id as string)); }),
  getExtractedData: asyncHandler(async (req, res) => { res.json(await documentsService.getExtractedData(req.params.id as string)); }),

  // ConvertAPI conversions
  convertToPdf: asyncHandler(async (req, res) => { res.json(await documentsService.convertToPdf(req.params.id as string)); }),
  mergeClaimDocs: asyncHandler(async (req, res) => { res.json(await documentsService.mergeClaimDocs(req.body.claimId, req.body.documentIds)); }),
};
