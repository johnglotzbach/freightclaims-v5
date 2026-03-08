/**
 * Users Routes - Authentication, user management, roles, and permissions
 *
 * Handles login/register flows, JWT token refresh, user CRUD, role assignment,
 * permission management, and user preferences (notifications, email, defaults).
 *
 * Location: apps/api/src/routes/users.routes.ts
 * Related: apps/api/src/controllers/users.controller.ts
 */
import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { authLimiter } from '../middleware/rate-limiter.middleware';
import { validate } from '../middleware/validate.middleware';
import { usersController } from '../controllers/users.controller';
import { loginSchema, registerSchema, updateUserSchema } from '../validators/users.validators';

export const usersRouter: Router = Router();

// --- Public auth routes (rate-limited) ---
usersRouter.post('/login', authLimiter, validate(loginSchema), usersController.login);
usersRouter.post('/register', authLimiter, validate(registerSchema), usersController.register);
usersRouter.post('/refresh-token', usersController.refreshToken);
usersRouter.post('/forgot-password', authLimiter, usersController.forgotPassword);
usersRouter.post('/reset-password', authLimiter, usersController.resetPassword);

// --- Protected routes ---
usersRouter.use(authenticate);

// Current user (must be before /:id)
usersRouter.get('/me', usersController.getCurrentUser);
usersRouter.put('/me', validate(updateUserSchema), usersController.updateCurrentUser);
usersRouter.put('/me/password', usersController.changePassword);
usersRouter.get('/me/preferences', usersController.getPreferences);
usersRouter.put('/me/preferences', usersController.updatePreferences);

// Roles (must be before /:id)
usersRouter.get('/roles/all', authorize(['admin']), usersController.getRoles);
usersRouter.post('/roles', authorize(['admin']), usersController.createRole);
usersRouter.put('/roles/:id', authorize(['admin']), usersController.updateRole);
usersRouter.delete('/roles/:id', authorize(['admin']), usersController.deleteRole);

// Permissions (must be before /:id)
usersRouter.get('/permissions/all', authorize(['admin']), usersController.getPermissions);
usersRouter.put('/permissions/:id', authorize(['admin']), usersController.updatePermission);

// Email & letter templates (must be before /:id)
usersRouter.get('/templates/email', usersController.getEmailTemplates);
usersRouter.post('/templates/email', authorize(['admin']), usersController.createEmailTemplate);
usersRouter.put('/templates/email/:id', authorize(['admin']), usersController.updateEmailTemplate);
usersRouter.delete('/templates/email/:id', authorize(['admin']), usersController.deleteEmailTemplate);
usersRouter.get('/templates/letter', usersController.getLetterTemplates);
usersRouter.post('/templates/letter', authorize(['admin']), usersController.createLetterTemplate);
usersRouter.put('/templates/letter/:id', authorize(['admin']), usersController.updateLetterTemplate);
usersRouter.delete('/templates/letter/:id', authorize(['admin']), usersController.deleteLetterTemplate);

// API keys & webhook config (must be before /:id)
usersRouter.get('/api-keys', usersController.getApiKeys);
usersRouter.post('/api-keys', authorize(['admin']), usersController.createApiKey);
usersRouter.delete('/api-keys/:id', authorize(['admin']), usersController.deleteApiKey);
usersRouter.put('/webhook-config', authorize(['admin']), usersController.saveWebhookConfig);

// Onboarding (must be before /:id)
usersRouter.post('/onboarding', usersController.onboarding);

// User management (admin only) - parameterized routes LAST
usersRouter.get('/', authorize(['admin']), usersController.list);
usersRouter.post('/', authorize(['admin']), validate(registerSchema), usersController.create);
usersRouter.get('/:id', authorize(['admin']), usersController.getById);
usersRouter.put('/:id', authorize(['admin']), validate(updateUserSchema), usersController.update);
usersRouter.delete('/:id', authorize(['admin']), usersController.delete);

// Admin: reset password for a specific user
usersRouter.post('/:id/reset-password', authorize(['admin']), usersController.adminResetPassword);
