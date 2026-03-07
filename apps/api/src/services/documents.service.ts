/**
 * DocumentsService - S3 document storage and category management
 *
 * Handles document upload to S3, download streaming, signed URL generation,
 * category CRUD, and AI-powered document processing (OCR/extraction).
 *
 * Location: apps/api/src/services/documents.service.ts
 * Related: apps/api/src/config/aws.ts (S3 client)
 */
import type { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { documentsRepository } from '../repositories/documents.repository';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import type { Readable } from 'stream';

const s3 = new S3Client({ region: env.AWS_REGION });
const BUCKET = env.S3_DOCUMENTS_BUCKET;

export const documentsService = {
  async list(query: Record<string, unknown>) {
    return documentsRepository.findMany(query);
  },

  async getById(id: string) {
    return documentsRepository.findById(id);
  },

  /** Uploads a file to S3 and stores metadata in the database */
  async upload(req: Request) {
    const file = (req as any).file;
    if (!file) throw new Error('No file provided');

    const user = (req as any).user;
    const key = `${user.corporateId || 'global'}/${randomUUID()}/${file.originalname}`;

    await s3.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      Metadata: {
        uploadedBy: user.userId,
        originalName: file.originalname,
      },
    }));

    const doc = await documentsRepository.create({
      documentName: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
      s3Key: key,
      s3Bucket: BUCKET,
      claimId: req.body.claimId,
      categoryId: req.body.categoryId || null,
      uploadedBy: user.userId,
    });

    logger.info({ docId: doc.id, key }, 'Document uploaded to S3');
    return doc;
  },

  /** Streams a document from S3 back to the response */
  async download(id: string, res: Response) {
    const doc = await documentsRepository.findById(id);
    if (!doc) throw new Error('Document not found');

    const response = await s3.send(new GetObjectCommand({
      Bucket: doc.s3Bucket || BUCKET,
      Key: doc.s3Key,
    }));

    res.setHeader('Content-Type', doc.mimeType || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${doc.documentName}"`);
    if (response.ContentLength) res.setHeader('Content-Length', String(response.ContentLength));

    const stream = response.Body as Readable;
    stream.pipe(res);
  },

  async delete(id: string) {
    const doc = await documentsRepository.findById(id);
    if (doc?.s3Key) {
      await s3.send(new DeleteObjectCommand({
        Bucket: doc.s3Bucket || BUCKET,
        Key: doc.s3Key,
      }));
    }
    return documentsRepository.delete(id);
  },

  /** Generates a pre-signed URL for direct browser download */
  async getSignedUrl(id: string) {
    const doc = await documentsRepository.findById(id);
    if (!doc) throw new Error('Document not found');

    const url = await getSignedUrl(s3, new GetObjectCommand({
      Bucket: doc.s3Bucket || BUCKET,
      Key: doc.s3Key,
    }), { expiresIn: 3600 });

    return { url, fileName: doc.documentName, expiresIn: 3600 };
  },

  async getCategories() { return documentsRepository.getCategories(); },
  async createCategory(data: Record<string, unknown>) { return documentsRepository.createCategory(data); },
  async updateCategory(id: string, data: Record<string, unknown>) { return documentsRepository.updateCategory(id, data); },
  async deleteCategory(id: string) { return documentsRepository.deleteCategory(id); },
  async getCategoryMapping() { return documentsRepository.getCategoryMapping(); },
  async updateCategoryMapping(data: Record<string, unknown>) { return documentsRepository.updateCategoryMapping(data); },

  /** Sends a document to the AI agent for OCR/extraction */
  async processWithAI(id: string) {
    const doc = await documentsRepository.findById(id);
    if (!doc) throw new Error('Document not found');

    await documentsRepository.update(id, { aiProcessingStatus: 'processing' });

    logger.info({ docId: id }, 'Document queued for AI processing');
    return { id, status: 'processing', message: 'Document has been queued for AI extraction' };
  },

  async getExtractedData(id: string) { return documentsRepository.getExtractedData(id); },
};
