/**
 * Documents Controller - Request handling for document management
 *
 * Location: apps/api/src/controllers/documents.controller.ts
 * Related: apps/api/src/services/documents.service.ts
 */
import type { Request, Response, NextFunction } from 'express';
import { documentsService } from '../services/documents.service';
import type { JwtPayload } from '../middleware/auth.middleware';
import { logger } from '../utils/logger';

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
  upload: async (req: Request, res: Response) => {
    try {
      const filesArr = (req as any).files as any[] | undefined;
      const singleFile = (req as any).file as any | undefined;
      const contentType = req.headers['content-type'] || '(none)';
      const fileCount = filesArr?.length || (singleFile ? 1 : 0);

      logger.info({
        contentType: contentType.substring(0, 80),
        fileCount,
        bodyKeys: req.body ? Object.keys(req.body) : [],
        hasAuth: !!req.headers.authorization,
      }, 'Upload request received');

      if (fileCount === 0) {
        logger.warn({ contentType, method: req.method }, 'Upload: multer found 0 files');
        res.status(400).json({
          success: false,
          error: 'No files received. Make sure the form sends files as multipart/form-data.',
        });
        return;
      }

      const result = await documentsService.upload(req);
      const uploaded = Array.isArray(result) ? result : [result];
      res.status(201).json({ success: true, data: { uploaded }, uploaded });
    } catch (err: any) {
      const msg = err?.message || 'Upload failed';
      logger.error({ err, path: req.path }, `Upload error: ${msg}`);
      const isClientError = msg.includes('No files') || msg.includes('not allowed') || msg.includes('No user');
      res.status(isClientError ? 400 : 500).json({ success: false, error: msg });
    }
  },
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
