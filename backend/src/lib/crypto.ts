import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from 'node:crypto';
import { config } from '../config.js';

const PREFIX = 'v1';

/** AES-256-GCM. Output: v1:<iv>:<tag>:<ciphertext>, each base64. */
export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', config.encryptionKey, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [PREFIX, iv.toString('base64'), tag.toString('base64'), ciphertext.toString('base64')].join(':');
}

export function decryptSecret(stored: string): string {
  const [prefix, iv, tag, ciphertext] = stored.split(':');
  if (prefix !== PREFIX || !iv || !tag || ciphertext === undefined) {
    throw new Error('Stored secret has an unknown format');
  }
  const decipher = createDecipheriv('aes-256-gcm', config.encryptionKey, Buffer.from(iv, 'base64'));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext, 'base64')), decipher.final()]).toString('utf8');
}

export const sha256 = (value: string) => createHash('sha256').update(value).digest('hex');
export const md5 = (value: string) => createHash('md5').update(value).digest('hex');
export const hmacSha256 = (secret: string, value: string) => createHmac('sha256', secret).update(value).digest('hex');
export const randomToken = (bytes = 32) => randomBytes(bytes).toString('base64url');
