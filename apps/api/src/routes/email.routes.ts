/**
 * Email Routes - Email sending, notifications, and preferences
 *
 * Handles outbound email dispatch, email template management, notification
 * preferences, and the email-to-claim linkage for the claim inbox.
 *
 * Location: apps/api/src/routes/email.routes.ts
 * Related: apps/api/src/controllers/email.controller.ts
 */
import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { emailController } from '../controllers/email.controller';

export const emailRouter = Router();

emailRouter.use(authenticate);

// --- Send email ---
emailRouter.post('/send', emailController.send);

// --- Email history for a claim ---
emailRouter.get('/claim/:claimId', emailController.getByClaimId);

// --- Notifications ---
emailRouter.get('/notifications', emailController.getNotifications);
emailRouter.get('/notifications/unread', emailController.getUnreadCount);
emailRouter.put('/notifications/:id/read', emailController.markAsRead);
emailRouter.put('/notifications/read-all', emailController.markAllAsRead);

// --- Email preferences ---
emailRouter.get('/preferences', emailController.getPreferences);
emailRouter.put('/preferences', emailController.updatePreferences);

// --- SQS email notification processing (internal) ---
emailRouter.post('/process-queue', emailController.processQueue);
