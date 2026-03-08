/**
 * Documents Routes - Document upload, download, and category management
 *
 * Handles file uploads to S3, document metadata CRUD, category management,
 * category-to-claim mapping, and AI-powered document processing.
 *
 * Location: apps/api/src/routes/documents.routes.ts
 * Related: apps/api/src/controllers/documents.controller.ts
 */
import { Router } from 'express';
import multer from 'multer';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { documentsController } from '../controllers/documents.controller';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

export const documentsRouter: Router = Router();

documentsRouter.use(authenticate);

// --- Document upload (must be before /:id) ---
documentsRouter.post('/upload', upload.array('files', 20), documentsController.upload);

// --- Document merge (must be before /:id) ---
documentsRouter.post('/merge', documentsController.mergeClaimDocs);

// --- Document categories (must be before /:id) ---
documentsRouter.get('/categories/all', documentsController.getCategories);
documentsRouter.post('/categories', authorize(['admin']), documentsController.createCategory);
documentsRouter.put('/categories/:id', authorize(['admin']), documentsController.updateCategory);
documentsRouter.delete('/categories/:id', authorize(['admin']), documentsController.deleteCategory);
documentsRouter.get('/categories/mapping', documentsController.getCategoryMapping);
documentsRouter.post('/categories/mapping', authorize(['admin']), documentsController.updateCategoryMapping);

// --- Document list and CRUD (parameterized routes LAST) ---
documentsRouter.get('/', documentsController.list);
documentsRouter.get('/:id', documentsController.getById);
documentsRouter.delete('/:id', authorize(['admin', 'manager']), documentsController.delete);

// --- Document download / signed URL ---
documentsRouter.get('/:id/download', documentsController.download);
documentsRouter.get('/:id/url', documentsController.getSignedUrl);

// --- AI document processing ---
documentsRouter.post('/:id/process', documentsController.processWithAI);
documentsRouter.get('/:id/extracted-data', documentsController.getExtractedData);

// --- Document conversion (ConvertAPI) ---
documentsRouter.post('/:id/convert-pdf', documentsController.convertToPdf);
