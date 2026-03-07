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
import { convertService } from './convert.service';
import { logger } from '../utils/logger';

export const documentsService = {
  async list(query: Record<string, unknown>) {
    return documentsRepository.findMany(query);
  },

  async getById(id: string) {
    return documentsRepository.findById(id);
  },

  async upload(req: Request) {
    const files = (req as any).files as Express.Multer.File[] | undefined;
    const singleFile = (req as any).file as Express.Multer.File | undefined;
    const allFiles = files?.length ? files : singleFile ? [singleFile] : [];
    if (allFiles.length === 0) throw new Error('No files provided');

    const user = (req as any).user;
    const claimId = req.body.claimId || 'unlinked';
    const category = req.body.categoryId || 'general';
    const results = [];

    for (const file of allFiles) {
      const filename = `${randomUUID()}-${file.originalname}`;

      const { key, size } = await storageService.uploadDocument(
        claimId,
        category,
        filename,
        file.buffer,
        file.mimetype,
      );

      let pdfKey: string | null = null;
      const pdfConversion = await convertService.autoConvertToPdf(file.buffer, file.originalname, file.mimetype);
      if (pdfConversion) {
        const pdfFilename = `${randomUUID()}-${pdfConversion.fileName}`;
        const pdfResult = await storageService.uploadDocument(claimId, category, pdfFilename, pdfConversion.buffer, 'application/pdf');
        pdfKey = pdfResult.key;
        logger.info({ originalKey: key, pdfKey }, 'Auto-converted document to PDF');
      }

      const doc = await documentsRepository.create({
        documentName: file.originalname,
        mimeType: file.mimetype,
        fileSize: size,
        s3Key: key,
        pdfKey: pdfKey,
        claimId: req.body.claimId,
      categoryId: req.body.categoryId || null,
      uploadedBy: user.userId,
    });

      logger.info({ docId: doc.id, key, hasPdf: Boolean(pdfKey) }, 'Document uploaded');
      results.push(doc);
    }

    return results.length === 1 ? results[0] : results;
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

  /** Convert a document to PDF on demand */
  async convertToPdf(id: string) {
    const doc = await documentsRepository.findById(id);
    if (!doc) throw new Error('Document not found');

    if (doc.mimeType === 'application/pdf') {
      return { id, status: 'already_pdf', message: 'Document is already a PDF' };
    }

    if (!convertService.isConfigured) {
      throw new Error('ConvertAPI not configured — set CONVERT_API_SECRET');
    }

    const { body } = await storageService.downloadDocument(doc.s3Key);
    const result = await convertService.autoConvertToPdf(body, doc.documentName ?? 'document', doc.mimeType ?? 'application/octet-stream');
    if (!result) {
      throw new Error(`Unsupported format for conversion: ${doc.mimeType}`);
    }

    const pdfFilename = `${randomUUID()}-${result.fileName}`;
    const parts = doc.s3Key.split('/');
    const claimId = parts[1] || 'unlinked';
    const category = parts[2] || 'general';
    const { key: pdfKey } = await storageService.uploadDocument(claimId, category, pdfFilename, result.buffer, 'application/pdf');

    await documentsRepository.update(id, { pdfKey });

    return { id, status: 'converted', pdfKey };
  },

  /** Merge multiple claim documents into a single PDF package */
  async mergeClaimDocs(claimId: string, documentIds: string[]) {
    if (!convertService.isConfigured) {
      throw new Error('ConvertAPI not configured — set CONVERT_API_SECRET');
    }

    const files = [];
    for (const docId of documentIds) {
      const doc = await documentsRepository.findById(docId);
      if (!doc) continue;
      const { body } = await storageService.downloadDocument(doc.s3Key);

      if (doc.mimeType !== 'application/pdf') {
        const converted = await convertService.autoConvertToPdf(body, doc.documentName ?? 'document', doc.mimeType ?? 'application/octet-stream');
        if (converted) {
          files.push({ buffer: converted.buffer, fileName: converted.fileName });
          continue;
        }
      }
      files.push({ buffer: body, fileName: doc.documentName });
    }

    if (files.length === 0) throw new Error('No valid documents to merge');

    const merged = await convertService.mergePdfs(files);
    const mergedFilename = `${randomUUID()}-claim-package.pdf`;
    const { key } = await storageService.uploadDocument(claimId, 'packages', mergedFilename, merged.buffer, 'application/pdf');

    const doc = await documentsRepository.create({
      documentName: `Claim Package - ${new Date().toISOString().split('T')[0]}.pdf`,
      mimeType: 'application/pdf',
      fileSize: merged.fileSize,
      s3Key: key,
      claimId,
      categoryId: null,
      uploadedBy: 'system',
    });

    return doc;
  },
};
