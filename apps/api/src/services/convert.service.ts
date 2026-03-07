/**
 * ConvertAPI Service - Document conversion (PDF, Word, images, etc.)
 *
 * Uses ConvertAPI (https://www.convertapi.com) to convert documents between
 * formats. Primary use cases:
 *   - Converting uploaded Word/Excel docs to PDF for standardized viewing
 *   - Converting images to PDF for claim documentation packages
 *   - Merging multiple PDFs into a single claim package
 *   - Converting PDF to images for AI document analysis
 *
 * Location: apps/api/src/services/convert.service.ts
 */
import { env } from '../config/env';
import { logger } from '../utils/logger';

const BASE_URL = 'https://v2.convertapi.com';

interface ConvertResult {
  Files: Array<{
    FileName: string;
    FileExt: string;
    FileSize: number;
    FileData: string;
  }>;
  ConversionCost: number;
}

function ensureConfigured() {
  if (!env.CONVERT_API_SECRET) {
    throw new Error('ConvertAPI not configured — set CONVERT_API_SECRET environment variable');
  }
}

async function apiRequest(endpoint: string, body: Record<string, unknown>): Promise<ConvertResult> {
  ensureConfigured();

  const response = await fetch(`${BASE_URL}/${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.CONVERT_API_SECRET}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120_000),
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`ConvertAPI ${response.status}: ${errBody}`);
  }

  return response.json() as Promise<ConvertResult>;
}

export const convertService = {
  get isConfigured() {
    return Boolean(env.CONVERT_API_SECRET);
  },

  /**
   * Convert a file from one format to another.
   * Returns the converted file as a Buffer with metadata.
   */
  async convert(params: {
    fromFormat: string;
    toFormat: string;
    file: Buffer;
    fileName: string;
  }): Promise<{ buffer: Buffer; fileName: string; fileSize: number; cost: number }> {
    const result = await apiRequest(`convert/${params.fromFormat}/to/${params.toFormat}`, {
      Parameters: [
        {
          Name: 'File',
          FileValue: {
            Name: params.fileName,
            Data: params.file.toString('base64'),
          },
        },
        { Name: 'StoreFile', Value: 'true' },
      ],
    });

    const file = result.Files[0];
    if (!file) throw new Error('ConvertAPI returned no files');

    const buffer = Buffer.from(file.FileData, 'base64');

    logger.info(
      { from: params.fromFormat, to: params.toFormat, fileName: params.fileName, cost: result.ConversionCost },
      'Document converted via ConvertAPI',
    );

    return {
      buffer,
      fileName: file.FileName,
      fileSize: file.FileSize,
      cost: result.ConversionCost,
    };
  },

  /** Convert Word document (docx/doc) to PDF */
  async wordToPdf(file: Buffer, fileName: string) {
    const ext = fileName.toLowerCase().endsWith('.doc') ? 'doc' : 'docx';
    return this.convert({ fromFormat: ext, toFormat: 'pdf', file, fileName });
  },

  /** Convert Excel spreadsheet to PDF */
  async excelToPdf(file: Buffer, fileName: string) {
    const ext = fileName.toLowerCase().endsWith('.xls') ? 'xls' : 'xlsx';
    return this.convert({ fromFormat: ext, toFormat: 'pdf', file, fileName });
  },

  /** Convert image (JPG, PNG, TIFF, BMP) to PDF */
  async imageToPdf(file: Buffer, fileName: string) {
    const ext = fileName.split('.').pop()?.toLowerCase() || 'jpg';
    return this.convert({ fromFormat: ext, toFormat: 'pdf', file, fileName });
  },

  /** Convert PDF pages to images (for AI processing / thumbnails) */
  async pdfToImages(file: Buffer, fileName: string) {
    return this.convert({ fromFormat: 'pdf', toFormat: 'jpg', file, fileName });
  },

  /**
   * Merge multiple PDF files into a single document.
   * Useful for creating complete claim packages.
   */
  async mergePdfs(files: Array<{ buffer: Buffer; fileName: string }>): Promise<{ buffer: Buffer; fileName: string; fileSize: number }> {
    ensureConfigured();

    const fileParams = files.map((f) => ({
      Name: 'Files',
      FileValue: {
        Name: f.fileName,
        Data: f.buffer.toString('base64'),
      },
    }));

    const result = await apiRequest('merge/to/pdf', {
      Parameters: fileParams,
    });

    const merged = result.Files[0];
    if (!merged) throw new Error('ConvertAPI merge returned no files');

    const buffer = Buffer.from(merged.FileData, 'base64');

    logger.info({ fileCount: files.length, outputSize: buffer.length }, 'PDFs merged via ConvertAPI');

    return {
      buffer,
      fileName: merged.FileName,
      fileSize: merged.FileSize,
    };
  },

  /**
   * Auto-convert an uploaded file to PDF if it's not already a PDF.
   * Returns null if the file is already a PDF (no conversion needed).
   */
  async autoConvertToPdf(file: Buffer, fileName: string, mimeType: string): Promise<{ buffer: Buffer; fileName: string } | null> {
    if (mimeType === 'application/pdf') return null;

    const converters: Record<string, (f: Buffer, n: string) => ReturnType<typeof this.wordToPdf>> = {
      'application/msword': (f, n) => this.wordToPdf(f, n),
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': (f, n) => this.wordToPdf(f, n),
      'application/vnd.ms-excel': (f, n) => this.excelToPdf(f, n),
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': (f, n) => this.excelToPdf(f, n),
      'image/jpeg': (f, n) => this.imageToPdf(f, n),
      'image/png': (f, n) => this.imageToPdf(f, n),
      'image/tiff': (f, n) => this.imageToPdf(f, n),
      'image/bmp': (f, n) => this.imageToPdf(f, n),
    };

    const converter = converters[mimeType];
    if (!converter) return null;

    if (!this.isConfigured) {
      logger.warn({ mimeType, fileName }, 'ConvertAPI not configured — skipping auto-conversion');
      return null;
    }

    try {
      const result = await converter(file, fileName);
      return { buffer: result.buffer, fileName: result.fileName };
    } catch (err) {
      logger.error({ err, fileName, mimeType }, 'Auto-conversion to PDF failed');
      return null;
    }
  },
};
