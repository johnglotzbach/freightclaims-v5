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
import { authenticate, authorize } from '../middleware/auth.middleware';
import { documentsController } from '../controllers/documents.controller';

export const documentsRouter = Router();

documentsRouter.use(authenticate);

// --- Document CRUD ---
documentsRouter.get('/', documentsController.list);
documentsRouter.get('/:id', documentsController.getById);
documentsRouter.post('/upload', documentsController.upload);
documentsRouter.delete('/:id', documentsController.delete);

// --- Document download / signed URL ---
documentsRouter.get('/:id/download', documentsController.download);
documentsRouter.get('/:id/url', documentsController.getSignedUrl);

// --- Document categories ---
documentsRouter.get('/categories/all', documentsController.getCategories);
documentsRouter.post('/categories', authorize(['admin']), documentsController.createCategory);
documentsRouter.put('/categories/:id', authorize(['admin']), documentsController.updateCategory);
documentsRouter.delete('/categories/:id', authorize(['admin']), documentsController.deleteCategory);

// --- Category-to-claim mapping ---
documentsRouter.get('/categories/mapping', documentsController.getCategoryMapping);
documentsRouter.post('/categories/mapping', authorize(['admin']), documentsController.updateCategoryMapping);

// --- AI document processing ---
documentsRouter.post('/:id/process', documentsController.processWithAI);
documentsRouter.get('/:id/extracted-data', documentsController.getExtractedData);
