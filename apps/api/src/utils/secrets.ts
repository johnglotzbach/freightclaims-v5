/**
 * Secrets Manager Utility - Runtime credential retrieval
 *
 * When AWS credentials are configured, fetches secrets from AWS Secrets Manager
 * with local caching (5 min TTL). When AWS isn't configured, falls back to
 * environment variables using the secret name as the env var key.
 *
 * Location: apps/api/src/utils/secrets.ts
 */
import { GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { secretsClient } from '../config/aws';
import { logger } from './logger';

const CACHE_TTL_MS = 5 * 60 * 1000;

const secretCache = new Map<string, { value: string; expiresAt: number }>();

export async function getSecret(secretName: string): Promise<string> {
  const cached = secretCache.get(secretName);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  if (!secretsClient) {
    const envValue = process.env[secretName] || '';
    if (envValue) {
      secretCache.set(secretName, { value: envValue, expiresAt: Date.now() + CACHE_TTL_MS });
    }
    return envValue;
  }

  try {
    const result = await secretsClient.send(
      new GetSecretValueCommand({ SecretId: secretName }),
    );
    const value = result.SecretString || '';
    secretCache.set(secretName, { value, expiresAt: Date.now() + CACHE_TTL_MS });
    logger.debug({ secretName }, 'Secret fetched from Secrets Manager');
    return value;
  } catch (err) {
    logger.error({ err, secretName }, 'Failed to fetch secret');
    throw new Error(`Could not retrieve secret: ${secretName}`);
  }
}

export async function getSecretJSON<T = Record<string, string>>(secretName: string): Promise<T> {
  const raw = await getSecret(secretName);
  return JSON.parse(raw) as T;
}

export function clearSecretCache(): void {
  secretCache.clear();
}
