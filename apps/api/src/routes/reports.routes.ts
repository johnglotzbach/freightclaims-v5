/**
 * Reports Routes - Insights, analytics, and report generation
 *
 * Provides endpoints for dashboard insights, carrier performance metrics,
 * collection percentages, write-off amounts, and exportable reports.
 *
 * Location: apps/api/src/routes/reports.routes.ts
 * Related: apps/api/src/controllers/reports.controller.ts
 */
import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { reportsController } from '../controllers/reports.controller';

export const reportsRouter = Router();

reportsRouter.use(authenticate);

// --- Insights / dashboard analytics ---
reportsRouter.post('/insights', reportsController.getInsightsReport);
reportsRouter.post('/insights/top-customers', reportsController.getTopCustomers);
reportsRouter.post('/insights/top-carriers', reportsController.getTopCarriers);
reportsRouter.post('/insights/collection-percentage', reportsController.getCollectionPercentage);
reportsRouter.post('/insights/metrics-per-carrier', reportsController.getMetricsPerCarrier);
reportsRouter.post('/insights/metrics-per-destination', reportsController.getMetricsPerDestination);
reportsRouter.post('/insights/write-off-amount', reportsController.getWriteOffAmount);

// --- Exportable reports ---
reportsRouter.get('/export/:type', reportsController.exportReport);
