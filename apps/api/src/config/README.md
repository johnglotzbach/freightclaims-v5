# Config

Application configuration modules. Each file exports a typed config object built from environment variables with validation.

- `env.ts` - Environment variable loading and validation (Zod-based)
- `database.ts` - Prisma client initialization and connection pooling
- `aws.ts` - AWS SDK client configuration (S3, SES, SQS, Secrets Manager)
- `cors.ts` - CORS allowed origins configuration
