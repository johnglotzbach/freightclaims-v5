/**
 * DocumentsService - Document storage and category management
 *
 * Delegates file I/O to storageService (S3 or local disk depending on
 * STORAGE_MODE). Handles category CRUD and AI-powered document processing.
 *
 * Location: apps/api/src/services/documents.service.ts
 * Related: apps/api/src/services/storage.service.ts
 */
import type { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { documentsRepository } from '../repositories/documents.repository';
import { storageService } from './storage.service';
import { logger } from '../utils/logger';

export const documentsService = {
  async list(query: Record<string, unknown>) {
    return documentsRepository.findMany(query);
  },

  async getById(id: string) {
    return documentsRepository.findById(id);
  },

  async upload(req: Request) {
    const file = (req as any).file;
    if (!file) throw new Error('No file provided');

    const user = (req as any).user;
    const claimId = req.body.claimId || 'unlinked';
    const category = req.body.categoryId || 'general';
    const filename = `${randomUUID()}-${file.originalname}`;

    const { key, size } = await storageService.uploadDocument(
      claimId,
      category,
      filename,
      file.buffer,
      file.mimetype,
    );

    const doc = await documentsRepository.create({
      documentName: file.originalname,
      mimeType: file.mimetype,
      fileSize: size,
      s3Key: key,
      claimId: req.body.claimId,
      categoryId: req.body.categoryId || null,
      uploadedBy: user.userId,
    });

    logger.info({ docId: doc.id, key }, 'Document uploaded');
    return doc;
  },

  async download(id: string, res: Response) {
    const doc = await documentsRepository.findById(id);
    if (!doc) throw new Error('Document not found');

    const { body, contentType } = await storageService.downloadDocument(doc.s3Key);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${doc.documentName}"`);
    res.setHeader('Content-Length', String(body.length));
    res.end(body);
  },

  async delete(id: string) {
    const doc = await documentsRepository.findById(id);
    if (doc?.s3Key) {
      await storageService.deleteDocument(doc.s3Key);
    }
    return documentsRepository.delete(id);
  },

  async getSignedUrl(id: string) {
    const doc = await documentsRepository.findById(id);
    if (!doc) throw new Error('Document not found');

    const url = await storageService.getSignedDownloadUrl(doc.s3Key);
    return { url, fileName: doc.documentName, expiresIn: 3600 };
  },

  async getCategories() { return documentsRepository.getCategories(); },
  async createCategory(data: Record<string, unknown>) { return documentsRepository.createCategory(data); },
  async updateCategory(id: string, data: Record<string, unknown>) { return documentsRepository.updateCategory(id, data); },
  async deleteCategory(id: string) { return documentsRepository.deleteCategory(id); },
  async getCategoryMapping() { return documentsRepository.getCategoryMapping(); },
  async updateCategoryMapping(data: Record<string, unknown>) { return documentsRepository.updateCategoryMapping(data); },

  async processWithAI(id: string) {
    const doc = await documentsRepository.findById(id);
    if (!doc) throw new Error('Document not found');

    await documentsRepository.update(id, { aiProcessingStatus: 'processing' });

    logger.info({ docId: id }, 'Document queued for AI processing');
    return { id, status: 'processing', message: 'Document has been queued for AI extraction' };
  },

  async getExtractedData(id: string) { return documentsRepository.getExtractedData(id); },
};
