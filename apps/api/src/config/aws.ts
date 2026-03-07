/**
 * AWS Configuration - SDK client factory
 *
 * Creates AWS SDK clients only when credentials are provided.
 * When running without AWS (e.g. on Render with local storage),
 * clients are null and callers must check before use.
 *
 * Location: apps/api/src/config/aws.ts
 * Related: apps/api/src/config/env.ts
 */
import { S3Client } from '@aws-sdk/client-s3';
import { SESClient } from '@aws-sdk/client-ses';
import { SQSClient } from '@aws-sdk/client-sqs';
import { SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { env } from './env';

const hasAwsCredentials = Boolean(env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY);

const awsConfig = hasAwsCredentials
  ? {
      region: env.AWS_REGION,
      credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
      },
    }
  : null;

/** S3 client for document storage — null when AWS credentials are not configured */
export const s3Client: S3Client | null = awsConfig ? new S3Client(awsConfig) : null;

/** SES client for transactional email delivery — null when AWS credentials are not configured */
export const sesClient: SESClient | null = awsConfig ? new SESClient(awsConfig) : null;

/** SQS client for async job queues — null when AWS credentials are not configured */
export const sqsClient: SQSClient | null = awsConfig ? new SQSClient(awsConfig) : null;

/** Secrets Manager client — null when AWS credentials are not configured */
export const secretsClient: SecretsManagerClient | null = awsConfig
  ? new SecretsManagerClient(awsConfig)
  : null;
