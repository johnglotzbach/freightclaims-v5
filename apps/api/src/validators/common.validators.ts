import { z } from 'zod';

export const refreshTokenSchema = z.object({ body: z.object({ refreshToken: z.string().min(1) }) });
export const forgotPasswordSchema = z.object({ body: z.object({ email: z.string().email() }) });
export const resetPasswordSchema = z.object({ body: z.object({ token: z.string().min(1), newPassword: z.string().min(8) }) });
export const changePasswordSchema = z.object({ body: z.object({ currentPassword: z.string().min(1), newPassword: z.string().min(8) }) });
export const preferencesSchema = z.object({ body: z.object({}).passthrough() });
export const newsSubscribeSchema = z.object({ body: z.object({ email: z.string().email() }) });
export const chatbotMessageSchema = z.object({ body: z.object({ message: z.string().min(1).max(2000), sessionId: z.string().optional() }) });
export const documentUploadSchema = z.object({ body: z.object({ claimId: z.string().optional(), category: z.string().optional() }).passthrough() });
export const documentLinkSchema = z.object({ body: z.object({ claimId: z.string().uuid(), documentIds: z.array(z.string().uuid()).min(1) }) });
