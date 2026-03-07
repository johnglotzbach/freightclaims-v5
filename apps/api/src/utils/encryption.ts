/**
 * Encryption Utility - AES-256-GCM encryption and SHA-256 hashing
 *
 * Provides symmetric encryption/decryption for sensitive data at rest
 * and one-way hashing for lookup fields (e.g., SSN, account numbers).
 *
 * Encrypted format: base64(iv):base64(authTag):base64(ciphertext)
 *
 * Location: apps/api/src/utils/encryption.ts
 * Related: apps/api/src/config/env.ts (ENCRYPTION_KEY)
 */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { env } from '../config/env';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function getKey(): Buffer {
  const key = Buffer.from(env.ENCRYPTION_KEY, 'utf-8');
  if (key.length === 32) return key;
  return createHash('sha256').update(env.ENCRYPTION_KEY).digest();
}

/**
 * Encrypts plaintext using AES-256-GCM.
 * @returns base64(iv):base64(authTag):base64(ciphertext)
 */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf-8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
}

/**
 * Decrypts a string produced by `encrypt()`.
 * @param encrypted - format: base64(iv):base64(authTag):base64(ciphertext)
 */
export function decrypt(encrypted: string): string {
  const parts = encrypted.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted format — expected iv:authTag:ciphertext');
  }

  const [ivB64, authTagB64, ciphertextB64] = parts;
  const key = getKey();
  const iv = Buffer.from(ivB64, 'base64');
  const authTag = Buffer.from(authTagB64, 'base64');
  const ciphertext = Buffer.from(ciphertextB64, 'base64');

  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH });
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString('utf-8');
}

/** One-way SHA-256 hash for lookup fields (SSN, account numbers, etc.) */
export function hashSensitive(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
