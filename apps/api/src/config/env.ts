/**
 * Environment Configuration - Validates and exports all env vars
 *
 * Uses Zod to parse process.env at startup. If any required variable is missing
 * or malformed, the app crashes immediately with a clear error message rather
 * than failing silently later.
 *
 * Location: apps/api/src/config/env.ts
 * Related: env.example (root)
 */
import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  // General
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),

  // Database (Render PostgreSQL or any Postgres connection string)
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DATABASE_POOL_MIN: z.coerce.number().default(2),
  DATABASE_POOL_MAX: z.coerce.number().default(10),

  // Auth
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('24h'),
  REFRESH_TOKEN_EXPIRES_IN: z.string().default('7d'),

  // Encryption
  ENCRYPTION_KEY: z.string().min(32, 'ENCRYPTION_KEY must be at least 32 characters'),

  // AWS (optional — only needed if using S3 for file storage)
  AWS_REGION: z.string().default('us-east-2'),
  AWS_ACCESS_KEY_ID: z.string().default(''),
  AWS_SECRET_ACCESS_KEY: z.string().default(''),
  S3_DOCUMENTS_BUCKET: z.string().default('freightclaims-documents'),
  S3_PROMPTS_BUCKET: z.string().default('freightclaims-aibot'),

  // Storage mode: 's3' requires AWS credentials, 'local' stores files on disk
  STORAGE_MODE: z.enum(['s3', 'local']).default('local'),
  LOCAL_UPLOAD_DIR: z.string().default('./uploads'),

  // Email (SMTP — works with any provider: SendGrid, Mailgun, SES, etc.)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  EMAIL_FROM: z.string().default('noreply@freightclaims.com'),

  // AI / LLM (Google Gemini)
  GEMINI_API_KEY: z.string().default(''),
  AI_MODEL: z.string().default('gemini-2.0-flash'),

  // ConvertAPI (document conversion — PDF, Word, images, etc.)
  CONVERT_API_SECRET: z.string().default(''),

  // External APIs
  GOOGLE_MAPS_API_KEY: z.string().optional(),
  SMARTY_KEY: z.string().optional(),
  AMPLITUDE_API_KEY: z.string().optional(),

  // URLs
  NEXT_PUBLIC_APP_URL: z.string().default('http://localhost:3000'),

  // Redis (Render Redis or any Redis URL)
  REDIS_URL: z.string().optional(),

  // Database mode (readonly for dev servers connected to production)
  DB_MODE: z.enum(['readwrite', 'readonly']).default('readwrite'),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_FORMAT: z.enum(['json', 'pretty']).default('json'),
});

/**
 * Parsed and validated environment configuration.
 * Accessing a missing or invalid variable here crashes at startup,
 * not at runtime when you actually need the value.
 */
const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = z.infer<typeof envSchema>;
