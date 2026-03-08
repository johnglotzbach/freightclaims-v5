/**
 * StorageService - Document storage operations
 *
 * Supports two backends:
 *   - S3 (production with AWS credentials)
 *   - Local disk (development / Render without AWS)
 *
 * The active backend is selected by the STORAGE_MODE env var.
 * When STORAGE_MODE=local, files are written under LOCAL_UPLOAD_DIR.
 * When STORAGE_MODE=s3, files go to the S3_DOCUMENTS_BUCKET.
 *
 * Location: apps/api/src/services/storage.service.ts
 */
import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3Client } from '../config/aws';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';

const BUCKET = env.S3_DOCUMENTS_BUCKET;
const SIGNED_URL_EXPIRY = 3600;
const useS3 = env.STORAGE_MODE === 's3' && s3Client !== null;
const uploadDir = path.resolve(env.LOCAL_UPLOAD_DIR);

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

/**
 * Builds a storage key organized by tenant/claim/category.
 * Structure:  tenant/{corporateId}/claims/{claimId}/{category}/{filename}
 *         or: tenant/_global/general/{filename}  (unlinked docs)
 *
 * This keeps each workspace's files physically separated on disk,
 * makes browsing/debugging easier, and prepares for per-tenant quotas.
 */
function buildKey(claimId: string, category: string, filename: string, corporateId?: string): string {
  const tenant = corporateId || '_global';
  if (claimId === 'unlinked') {
    return `tenant/${tenant}/general/${filename}`;
  }
  return `tenant/${tenant}/claims/${claimId}/${category}/${filename}`;
}

function localPath(key: string): string {
  return path.join(uploadDir, ...key.split('/'));
}

// ── S3 backend ──────────────────────────────────────────────

const s3Backend = {
  async upload(key: string, body: Buffer, contentType: string, claimId: string, category: string, filename: string) {
    await s3Client!.send(new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
      ServerSideEncryption: 'AES256',
      Metadata: { claimId, category, originalFilename: filename },
    }));
  },

  async getDownloadUrl(key: string): Promise<string> {
    const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
    return getSignedUrl(s3Client!, command, { expiresIn: SIGNED_URL_EXPIRY });
  },

  async getUploadUrl(key: string, contentType: string): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: contentType,
      ServerSideEncryption: 'AES256',
    });
    return getSignedUrl(s3Client!, command, { expiresIn: SIGNED_URL_EXPIRY });
  },

  async remove(key: string) {
    await s3Client!.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
  },

  async list(prefix: string) {
    const response = await s3Client!.send(new ListObjectsV2Command({ Bucket: BUCKET, Prefix: prefix }));
    return (response.Contents || []).map((obj) => ({
      key: obj.Key!,
      size: obj.Size || 0,
      lastModified: obj.LastModified || new Date(),
    }));
  },

  async download(key: string): Promise<{ body: Buffer; contentType: string }> {
    const response = await s3Client!.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
    const chunks: Uint8Array[] = [];
    const stream = response.Body as AsyncIterable<Uint8Array>;
    for await (const chunk of stream) chunks.push(chunk);
    return { body: Buffer.concat(chunks), contentType: response.ContentType || 'application/octet-stream' };
  },
};

// ── Local disk backend ──────────────────────────────────────

const localBackend = {
  async upload(key: string, body: Buffer, _contentType: string) {
    const filePath = localPath(key);
    await ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, body);
    const metaPath = filePath + '.meta.json';
    await fs.writeFile(metaPath, JSON.stringify({ contentType: _contentType, size: body.length, createdAt: new Date().toISOString() }));
  },

  async getDownloadUrl(key: string): Promise<string> {
    const token = crypto.randomBytes(16).toString('hex');
    return `/api/v1/files/${encodeURIComponent(key)}?token=${token}`;
  },

  async getUploadUrl(_key: string, _contentType: string): Promise<string> {
    return `/api/v1/files/upload`;
  },

  async remove(key: string) {
    const filePath = localPath(key);
    await fs.unlink(filePath).catch(() => {});
    await fs.unlink(filePath + '.meta.json').catch(() => {});
  },

  async list(prefix: string) {
    const dir = path.join(uploadDir, ...prefix.split('/'));
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true, recursive: true });
      const results: { key: string; size: number; lastModified: Date }[] = [];
      for (const entry of entries) {
        if (entry.isFile() && !entry.name.endsWith('.meta.json')) {
          const fullPath = path.join(dir, entry.name);
          const stat = await fs.stat(fullPath);
          results.push({ key: prefix + entry.name, size: stat.size, lastModified: stat.mtime });
        }
      }
      return results;
    } catch {
      return [];
    }
  },

  async download(key: string): Promise<{ body: Buffer; contentType: string }> {
    const filePath = localPath(key);
    const body = await fs.readFile(filePath);
    let contentType = 'application/octet-stream';
    try {
      const meta = JSON.parse(await fs.readFile(filePath + '.meta.json', 'utf-8'));
      contentType = meta.contentType || contentType;
    } catch {}
    return { body, contentType };
  },
};

// ── Public API (delegates to active backend) ────────────────

const backend = useS3 ? s3Backend : localBackend;

if (!useS3) {
  logger.info({ uploadDir }, 'Storage: using local disk (set STORAGE_MODE=s3 and provide AWS credentials for S3)');
} else {
  logger.info({ bucket: BUCKET }, 'Storage: using AWS S3');
}

export const storageService = {
  async uploadDocument(
    claimId: string,
    category: string,
    filename: string,
    body: Buffer,
    contentType: string,
    corporateId?: string,
  ): Promise<{ key: string; size: number }> {
    const key = buildKey(claimId, category, filename, corporateId);
    await backend.upload(key, body, contentType, claimId, category, filename);
    logger.info({ key, size: body.length, backend: useS3 ? 's3' : 'local' }, 'Document uploaded');
    return { key, size: body.length };
  },

  async getSignedDownloadUrl(key: string): Promise<string> {
    return backend.getDownloadUrl(key);
  },

  async getSignedUploadUrl(
    claimId: string,
    category: string,
    filename: string,
    contentType: string,
  ): Promise<{ url: string; key: string }> {
    const key = buildKey(claimId, category, filename);
    const url = await backend.getUploadUrl(key, contentType);
    return { url, key };
  },

  async deleteDocument(key: string): Promise<void> {
    await backend.remove(key);
    logger.info({ key }, 'Document deleted');
  },

  async listDocuments(claimId: string): Promise<{ key: string; size: number; lastModified: Date }[]> {
    return backend.list(`claims/${claimId}/`);
  },

  async downloadDocument(key: string): Promise<{ body: Buffer; contentType: string }> {
    return backend.download(key);
  },
};
