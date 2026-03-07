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
import { generateJSON } from './agents/gemini-client';
import { prisma } from '../config/database';
import type { JwtPayload } from '../middleware/auth.middleware';
import { NotFoundError } from '../utils/errors';

/**
 * Loads a document and verifies the requesting user has access via the
 * parent claim's corporateId. Super-admins bypass the check.
 */
async function verifyDocumentAccess(id: string, user: JwtPayload) {
  const doc = await prisma.claimDocument.findUnique({
    where: { id },
    include: { claim: { select: { corporateId: true } } },
  });
  if (!doc) throw new NotFoundError(`Document ${id} not found`);
  if (!user.isSuperAdmin && doc.claim?.corporateId && doc.claim.corporateId !== user.corporateId) {
    throw new NotFoundError(`Document ${id} not found`);
  }
  return doc;
}

export const documentsService = {
  async list(query: Record<string, unknown>, user: JwtPayload) {
    return documentsRepository.findMany(query, user);
  },

  async getById(id: string, user: JwtPayload) {
    return verifyDocumentAccess(id, user);
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

  async download(id: string, res: Response, user: JwtPayload) {
    const doc = await verifyDocumentAccess(id, user);

    const { body, contentType } = await storageService.downloadDocument(doc.s3Key);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${doc.documentName}"`);
    res.setHeader('Content-Length', String(body.length));
    res.end(body);
  },

  async delete(id: string, user: JwtPayload) {
    const doc = await verifyDocumentAccess(id, user);
    if (doc.s3Key) {
      await storageService.deleteDocument(doc.s3Key);
    }
    return documentsRepository.delete(id);
  },

  async getSignedUrl(id: string, user: JwtPayload) {
    const doc = await verifyDocumentAccess(id, user);

    const url = await storageService.getSignedDownloadUrl(doc.s3Key);
    return { url, fileName: doc.documentName, expiresIn: 3600 };
  },

  // Categories are shared reference data (no corporateId)
  async getCategories(_user: JwtPayload) { return documentsRepository.getCategories(); },
  async createCategory(data: Record<string, unknown>, _user: JwtPayload) { return documentsRepository.createCategory(data); },
  async updateCategory(id: string, data: Record<string, unknown>, _user: JwtPayload) { return documentsRepository.updateCategory(id, data); },
  async deleteCategory(id: string, _user: JwtPayload) { return documentsRepository.deleteCategory(id); },
  async getCategoryMapping(_user: JwtPayload) { return documentsRepository.getCategoryMapping(); },
  async updateCategoryMapping(data: Record<string, unknown>, _user: JwtPayload) { return documentsRepository.updateCategoryMapping(data); },

  async processWithAI(id: string, user: JwtPayload) {
    const doc = await verifyDocumentAccess(id, user);

    await documentsRepository.update(id, { aiProcessingStatus: 'processing' });
    logger.info({ docId: id, name: doc.documentName }, 'Starting AI document processing');

    this._runAIExtraction(id, doc).catch((err) => {
      logger.error({ err, docId: id }, 'AI extraction failed');
    });

    return { id, status: 'processing', message: 'Document is being processed by AI' };
  },

  async _runAIExtraction(id: string, doc: Record<string, any>) {
    try {
      const { body } = await storageService.downloadDocument(doc.s3Key);

      let textContent = '';
      if (doc.mimeType === 'application/pdf' || doc.mimeType?.includes('pdf')) {
        textContent = body.toString('utf-8', 0, Math.min(body.length, 50000));
        if (textContent.includes('%PDF')) {
          textContent = `[PDF Document: ${doc.documentName}] Binary content - extracting metadata from filename and context.`;
        }
      } else if (doc.mimeType?.startsWith('image/')) {
        textContent = `[Image Document: ${doc.documentName}] Image file - classify based on filename and context.`;
      } else {
        textContent = body.toString('utf-8', 0, Math.min(body.length, 50000));
      }

      const extraction = await generateJSON<{
        category: string;
        confidence: number;
        extractedFields: Array<{ key: string; label: string; value: string; confidence: number }>;
        summary: string;
      }>(
        `Analyze this freight/shipping document and extract all relevant information.

Document name: ${doc.documentName}
MIME type: ${doc.mimeType}
Content:
"""
${textContent.slice(0, 8000)}
"""

Return JSON:
{
  "category": "bill_of_lading | proof_of_delivery | product_invoice | damage_photos | inspection_report | weight_certificate | packing_list | correspondence | carrier_response | insurance_certificate | other",
  "confidence": 0.0-1.0,
  "extractedFields": [
    { "key": "field_name", "label": "Human Label", "value": "extracted value", "confidence": 0.0-1.0 }
  ],
  "summary": "Brief description of what this document is and key information found"
}

Extract fields like: carrier_name, pro_number, bol_number, shipper, consignee, ship_date, delivery_date, weight, pieces, commodity, amount, damage_description, etc. Only include fields that are present in the document.`,
        { systemInstruction: 'You are a freight document analysis AI. Classify documents and extract structured data from shipping documents, bills of lading, invoices, and damage reports.' },
      );

      await prisma.aiDocument.create({
        data: {
          documentId: id,
          claimId: doc.claimId || null,
          agentType: 'intake',
          extractedData: extraction as any,
          confidence: extraction.confidence,
          status: 'completed',
        },
      });

      await documentsRepository.update(id, { aiProcessingStatus: 'completed' });
      logger.info({ docId: id, category: extraction.category, confidence: extraction.confidence }, 'AI extraction completed');
    } catch (err) {
      await documentsRepository.update(id, { aiProcessingStatus: 'failed' }).catch(() => {});
      logger.error({ err, docId: id }, 'AI extraction failed');
      throw err;
    }
  },

  async getExtractedData(id: string, user: JwtPayload) {
    await verifyDocumentAccess(id, user);
    return documentsRepository.getExtractedData(id);
  },

  async convertToPdf(id: string, user: JwtPayload) {
    const doc = await verifyDocumentAccess(id, user);

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

  async mergeClaimDocs(claimId: string, documentIds: string[], user: JwtPayload) {
    // Verify the user has access to the claim being merged
    const claim = await prisma.claim.findUnique({ where: { id: claimId }, select: { corporateId: true } });
    if (!user.isSuperAdmin && claim?.corporateId && claim.corporateId !== user.corporateId) {
      throw new NotFoundError(`Claim ${claimId} not found`);
    }

    if (!convertService.isConfigured) {
      throw new Error('ConvertAPI not configured — set CONVERT_API_SECRET');
    }

    const files = [];
    for (const docId of documentIds) {
      const doc = await verifyDocumentAccess(docId, user);
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
      uploadedBy: user.userId,
    });

    return doc;
  },
};
