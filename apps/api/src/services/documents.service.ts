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
import { generateJSON, generateMultimodalJSON } from './agents/gemini-client';
import { prisma } from '../config/database';
import type { JwtPayload } from '../middleware/auth.middleware';
import { NotFoundError } from '../utils/errors';
import { env } from '../config/env';
import { usageService } from './usage.service';

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
  if (!user.isSuperAdmin && doc.claim && doc.claim.corporateId && doc.claim.corporateId !== user.corporateId) {
    throw new NotFoundError(`Document ${id} not found`);
  }
  return doc;
}

async function quickRelevanceCheck(file: Express.Multer.File): Promise<{ relevant: boolean; reason?: string }> {
  if (!env.GEMINI_API_KEY?.trim()) return { relevant: true };

  try {
    const isImage = file.mimetype.startsWith('image/');
    const isPdf = file.mimetype === 'application/pdf' || file.mimetype.includes('pdf');

    if (isImage) {
      const result = await generateMultimodalJSON<{ relevant: boolean; reason: string }>(
        [
          { inline_data: { mime_type: file.mimetype, data: file.buffer.toString('base64') } },
          { text: `Is this image related to freight, shipping, logistics, transportation, cargo, claims, damage documentation, invoices, bills of lading, proof of delivery, or any business document that could be part of a freight claim? Answer JSON: {"relevant": true/false, "reason": "brief explanation"}. Be lenient — any business document, receipt, invoice, photo of goods/damage, or shipping paperwork counts as relevant.` },
        ],
        { systemInstruction: 'You are a freight document relevance checker. Respond only with JSON.' },
      );
      return result;
    }

    if (isPdf) {
      const result = await generateMultimodalJSON<{ relevant: boolean; reason: string }>(
        [
          { inline_data: { mime_type: 'application/pdf', data: file.buffer.toString('base64') } },
          { text: `Look at this PDF document. Is it related to freight, shipping, logistics, transportation, cargo, claims, damage documentation, invoices, bills of lading, proof of delivery, or any business document that could be part of a freight claim? Do NOT rely on the filename — analyze the actual document content. Answer JSON: {"relevant": true/false, "reason": "brief explanation"}. Be lenient — any business document, receipt, invoice, or shipping paperwork counts as relevant.` },
        ],
        { systemInstruction: 'You are a freight document relevance checker. Analyze the actual document content, not the filename. Respond only with JSON.' },
      );
      return result;
    }

    if (file.mimetype.includes('text') || file.mimetype.includes('csv') || file.mimetype.includes('word') || file.mimetype.includes('sheet') || file.mimetype.includes('excel')) {
      const textSample = file.buffer.toString('utf-8', 0, Math.min(file.buffer.length, 2000));

      const result = await generateJSON<{ relevant: boolean; reason: string }>(
        `Is this document related to freight, shipping, logistics, transportation, cargo, claims, damage, invoices, bills of lading, proof of delivery, or any business document?\n\nContent preview:\n${textSample}\n\nAnswer JSON: {"relevant": true/false, "reason": "brief explanation"}. Do NOT rely on the filename — analyze the content. Be lenient — any business document, receipt, invoice, or shipping paperwork counts as relevant.`,
        { systemInstruction: 'You are a freight document relevance checker. Analyze content, not filename. Respond only with JSON.' },
      );
      return result;
    }

    return { relevant: true };
  } catch (err) {
    logger.warn({ err, filename: file.originalname }, 'Relevance check failed — allowing upload');
    return { relevant: true };
  }
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
    if (!user?.userId) {
      logger.error({ hasUser: !!user, headers: Object.keys(req.headers) }, 'Upload: no user context after auth middleware');
      throw new Error('No user context — re-login and try again');
    }

    const ALLOWED_TYPES = new Set([
      'application/pdf',
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/tiff', 'image/bmp',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv', 'text/plain',
    ]);

    const storageClaimId = req.body.claimId || 'unlinked';
    const storageCategory = req.body.categoryId || 'general';
    const corporateId = user.corporateId || undefined;
    const results = [];
    const errors: string[] = [];

    for (const file of allFiles) {
      try {
        if (!ALLOWED_TYPES.has(file.mimetype)) {
          errors.push(`${file.originalname}: File type ${file.mimetype} not allowed`);
          continue;
        }

        const relevance = await quickRelevanceCheck(file);
        if (!relevance.relevant) {
          errors.push(`${file.originalname}: This file doesn't appear to be freight/shipping related. ${relevance.reason || 'Please upload documents related to your freight claims.'}`);
          continue;
        }

        const ext = file.originalname.split('.').pop()?.toLowerCase() || 'bin';
        const filename = `${randomUUID()}.${ext}`;

        const { key, size } = await storageService.uploadDocument(
          storageClaimId,
          storageCategory,
          filename,
          file.buffer,
          file.mimetype,
          corporateId,
        );

        const pdfConversion = await convertService.autoConvertToPdf(file.buffer, file.originalname, file.mimetype);
        if (pdfConversion) {
          const pdfFilename = `${randomUUID()}.pdf`;
          await storageService.uploadDocument(storageClaimId, storageCategory, pdfFilename, pdfConversion.buffer, 'application/pdf', corporateId);
          logger.info({ originalKey: key }, 'Auto-converted document to PDF');
        }

        const createPayload: Record<string, unknown> = {
          documentName: req.body.documentName || file.originalname,
          mimeType: file.mimetype,
          fileSize: size,
          s3Key: key,
          uploadedBy: user.userId,
        };

        const catId = req.body.categoryId;
        if (catId && typeof catId === 'string') {
          if (catId.length > 10) {
            createPayload.categoryId = catId;
          } else {
            const cat = await prisma.documentCategory.findFirst({
              where: { OR: [{ code: catId }, { name: { equals: catId, mode: 'insensitive' } }] },
            }).catch(() => null);
            if (cat) createPayload.categoryId = cat.id;
          }
        }

        if (req.body.claimId) {
          createPayload.claimId = req.body.claimId;
        }

        let doc: any;
        try {
          doc = await documentsRepository.create(createPayload);
        } catch (createErr: any) {
          if (createErr?.code === 'P2011' || createErr?.message?.includes('Null constraint')) {
            logger.warn('Null constraint hit — auto-fixing claim_id / category_id columns');
            await prisma.$executeRawUnsafe(`ALTER TABLE claim_documents ALTER COLUMN claim_id DROP NOT NULL`).catch(() => {});
            await prisma.$executeRawUnsafe(`ALTER TABLE claim_documents ALTER COLUMN category_id DROP NOT NULL`).catch(() => {});
            doc = await documentsRepository.create(createPayload);
          } else {
            throw createErr;
          }
        }
        const isImage = file.mimetype.startsWith('image/');
        if (isImage) {
          await documentsRepository.update(doc.id, { thumbnailKey: key });
          doc.thumbnailKey = key;
        }

        logger.info({ docId: doc.id, key, size }, 'Document uploaded');
        results.push(doc);

        if (env.GEMINI_API_KEY?.trim()) {
          this._runAIExtraction(doc.id, { ...doc, s3Key: key, mimeType: file.mimetype, documentName: file.originalname, claimId: req.body.claimId || null })
            .catch((err) => logger.warn({ err, docId: doc.id }, 'Auto AI extraction failed (non-blocking)'));
        }
      } catch (fileErr: any) {
        logger.error({ err: fileErr, fileName: file.originalname }, 'Failed to process uploaded file');
        errors.push(`${file.originalname}: ${fileErr.message}`);
      }
    }

    if (results.length > 0 && corporateId) {
      usageService.incrementUsage(corporateId, 'documents', results.length).catch(() => {});
    }

    if (results.length === 0 && errors.length > 0) {
      throw new Error(`All uploads failed: ${errors.join('; ')}`);
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

  async thumbnail(id: string, res: Response, user: JwtPayload) {
    const doc = await verifyDocumentAccess(id, user);
    const thumbKey = (doc as any).thumbnailKey;
    if (!thumbKey) {
      res.status(404).json({ error: 'No thumbnail available' });
      return;
    }
    const { body, contentType } = await storageService.downloadDocument(thumbKey);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Content-Length', String(body.length));
    res.end(body);
  },

  async delete(id: string, user: JwtPayload) {
    const doc = await verifyDocumentAccess(id, user);

    if (doc.s3Key) {
      await storageService.deleteDocument(doc.s3Key).catch((err) =>
        logger.warn({ err, docId: id, key: doc.s3Key }, 'Failed to delete file from disk'));
    }

    const thumbKey = (doc as any).thumbnailKey;
    if (thumbKey) {
      await storageService.deleteDocument(thumbKey).catch((err) =>
        logger.warn({ err, docId: id, key: thumbKey }, 'Failed to delete thumbnail from disk'));
    }

    await prisma.aiDocument.deleteMany({ where: { documentId: id } }).catch((err) =>
      logger.warn({ err, docId: id }, 'Failed to clean up AI document records'));

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
    const existing = await prisma.aiDocument.findFirst({ where: { documentId: id } });
    if (existing) {
      logger.info({ docId: id }, 'AI document record already exists, skipping duplicate extraction');
      return;
    }

    const aiDocRecord = await prisma.aiDocument.create({
      data: {
        documentId: id,
        claimId: doc.claimId || null,
        agentType: 'intake',
        extractedData: {} as any,
        confidence: 0,
        status: 'processing',
      },
    });

    try {
      const { body } = await storageService.downloadDocument(doc.s3Key);
      const isImage = doc.mimeType?.startsWith('image/');
      const isPdf = doc.mimeType === 'application/pdf' || doc.mimeType?.includes('pdf');

      const ANALYSIS_PROMPT = `Analyze this freight/shipping document thoroughly and extract ALL available information.
Document name: ${doc.documentName}

Return JSON:
{
  "category": "ONE of: bill_of_lading, proof_of_delivery, delivery_receipt, product_invoice, commercial_invoice, claim_form, damage_photos, inspection_report, weight_certificate, packing_list, rate_confirmation, notice_of_claim, carrier_response, insurance_certificate, purchase_order, freight_bill, correspondence, other",
  "confidence": 0.0-1.0,
  "extractedFields": [
    { "key": "field_name", "label": "Human Label", "value": "extracted value", "confidence": 0.0-1.0 }
  ],
  "commodities": [
    { "description": "item name/description", "quantity": 1, "weight": "100 lbs", "unit_cost": "50.00", "claim_amount": "50.00", "sku": "", "po_number": "", "condition": "Broken/Crushed/etc", "claim_type": "damage/shortage/loss" }
  ],
  "matchingIdentifiers": {
    "pro_number": "",
    "bol_number": "",
    "po_number": "",
    "reference_number": "",
    "tracking_number": ""
  },
  "summary": "Brief description of what this document is and key information found"
}

CATEGORY RULES: A BOL is bill_of_lading. A signed delivery is proof_of_delivery. An invoice for goods is product_invoice. A freight carrier invoice is freight_bill. A claim filing form is claim_form. Photos showing damage are damage_photos. A rate quote/confirmation is rate_confirmation. A letter notifying of a claim is notice_of_claim. Do NOT default to product_invoice unless it truly is one.

EXTRACT EVERY FIELD YOU CAN FIND. Use these exact keys:
- Identifiers: pro_number, bol_number, po_number, reference_number, tracking_number
- Dates: ship_date, delivery_date, filing_date, incident_date, received_date (use YYYY-MM-DD format)
- Carrier: carrier_name, carrier_scac, carrier_phone, carrier_email, carrier_contact, carrier_address
- Shipper: shipper_name, shipper_address, shipper_city, shipper_state, shipper_zip, shipper_phone, shipper_email
- Consignee: consignee_name, consignee_address, consignee_city, consignee_state, consignee_zip, consignee_phone, consignee_email
- Shipment: weight, pieces, freight_class, nmfc_number, commodity, description, packaging_type, transport_mode
- Financial: amount, claim_amount, freight_charges, invoice_total, unit_cost, salvage_value
- Damage: damage_description, damage_type, damage_severity, visible_damage, concealed_damage, damage_location
- Other: special_instructions, notes, seal_number, trailer_number, driver_name, temperature_range

For the "commodities" array, extract EVERY line item you can find — each product/commodity as a separate entry with as many fields filled as possible. If only one item exists, still return it as an array.

For "matchingIdentifiers", extract ANY reference numbers that could link this document to an existing claim.

Be exhaustive. Extract everything visible in the document. Do not skip fields.`;

      let extraction: {
        category: string;
        confidence: number;
        extractedFields: Array<{ key: string; label: string; value: string; confidence: number }>;
        commodities?: Array<{ description: string; quantity?: number; weight?: string; unit_cost?: string; claim_amount?: string; sku?: string; po_number?: string; condition?: string; claim_type?: string }>;
        matchingIdentifiers?: { pro_number?: string; bol_number?: string; po_number?: string; reference_number?: string; tracking_number?: string };
        summary: string;
      };

      if (isImage || isPdf) {
        extraction = await generateMultimodalJSON(
          [
            { inline_data: { mime_type: doc.mimeType, data: body.toString('base64') } },
            { text: ANALYSIS_PROMPT },
          ],
          { systemInstruction: 'You are a freight document analysis AI. Classify documents and extract structured data from shipping documents, photos of damage, bills of lading, invoices, and inspection reports.' },
        );
      } else {
        const textContent = body.toString('utf-8', 0, Math.min(body.length, 50000));
        extraction = await generateJSON(
          `${ANALYSIS_PROMPT}\n\nDocument content:\n"""\n${textContent.slice(0, 8000)}\n"""`,
          { systemInstruction: 'You are a freight document analysis AI. Classify documents and extract structured data from shipping documents, bills of lading, invoices, and damage reports.' },
        );
      }

      await prisma.aiDocument.update({
        where: { id: aiDocRecord.id },
        data: {
          extractedData: extraction as any,
          confidence: extraction.confidence,
          status: 'completed',
        },
      });

      await documentsRepository.update(id, { aiProcessingStatus: 'completed' });
      logger.info({ docId: id, category: extraction.category, confidence: extraction.confidence }, 'AI extraction completed');
    } catch (err) {
      await prisma.aiDocument.update({
        where: { id: aiDocRecord.id },
        data: { status: 'failed', extractedData: { error: String(err) } as any },
      }).catch(() => {});
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
      return { id, status: 'skipped', message: 'PDF conversion not available (ConvertAPI not configured). Document stored as-is.' };
    }

    const { body } = await storageService.downloadDocument(doc.s3Key);
    const result = await convertService.autoConvertToPdf(body, doc.documentName ?? 'document', doc.mimeType ?? 'application/octet-stream');
    if (!result) {
      return { id, status: 'unsupported', message: `Format ${doc.mimeType} cannot be converted to PDF` };
    }

    const pdfFilename = `${randomUUID()}-${result.fileName}`;
    const parts = doc.s3Key.split('/');
    const claimId = parts[1] || 'unlinked';
    const category = parts[2] || 'general';
    const { key: pdfKey } = await storageService.uploadDocument(claimId, category, pdfFilename, result.buffer, 'application/pdf');

    return { id, status: 'converted', pdfKey };
  },

  async linkDocumentsToClaim(claimId: string, documentIds: string[], user: JwtPayload) {
    const claim = await prisma.claim.findUnique({ where: { id: claimId }, select: { corporateId: true } });
    if (!claim) throw new NotFoundError(`Claim ${claimId} not found`);
    if (!user.isSuperAdmin && claim.corporateId && claim.corporateId !== user.corporateId) {
      throw new NotFoundError(`Claim ${claimId} not found`);
    }

    const updated = [];
    for (const docId of documentIds) {
      const doc = await prisma.claimDocument.update({
        where: { id: docId },
        data: { claimId },
      });
      updated.push(doc);
    }

    logger.info({ claimId, documentIds, userId: user.userId }, 'Linked documents to claim');
    return updated;
  },

  async mergeClaimDocs(claimId: string, documentIds: string[], user: JwtPayload) {
    const claim = await prisma.claim.findUnique({ where: { id: claimId }, select: { corporateId: true } });
    if (!user.isSuperAdmin && claim?.corporateId && claim.corporateId !== user.corporateId) {
      throw new NotFoundError(`Claim ${claimId} not found`);
    }

    if (!convertService.isConfigured) {
      return { status: 'skipped', message: 'Document merging requires ConvertAPI. Upload each document individually instead.' };
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
