import crypto from 'crypto';

let activeEncryptionKey: Buffer | null = null;

/**
 * Retrieves the 256-bit encryption key.
 * If ENCRYPTION_KEY is not defined in the environment,
 * automatically generates and maintains a secure 32-byte cryptographic key.
 */
export function getEncryptionKey(): Buffer {
  if (activeEncryptionKey) {
    return activeEncryptionKey;
  }

  const envKey = process.env.ENCRYPTION_KEY;
  if (envKey && envKey.trim().length >= 32) {
    if (/^[0-9a-fA-F]{64}$/.test(envKey.trim())) {
      activeEncryptionKey = Buffer.from(envKey.trim(), 'hex');
    } else {
      activeEncryptionKey = crypto.createHash('sha256').update(envKey.trim()).digest();
    }
    return activeEncryptionKey;
  }

  // Auto-generate a secure random 256-bit key for zero-config operation
  activeEncryptionKey = crypto.randomBytes(32);
  console.log('⚡ Auto-generated cryptographic encryption key initialized (AES-256).');
  return activeEncryptionKey;
}

/**
 * Encrypts sensitive strings (such as API keys or session payloads) using AES-256-GCM.
 */
export function encryptApiKey(plaintext: string): string {
  if (!plaintext) return '';
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12); // 96-bit IV for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Pack IV + AuthTag + Encrypted into a single base64 payload
  const combined = Buffer.concat([iv, authTag, encrypted]);
  return combined.toString('base64');
}

/**
 * Decrypts sensitive strings previously encrypted with AES-256-GCM.
 */
export function decryptApiKey(encryptedBase64: string): string {
  if (!encryptedBase64) return '';
  try {
    const key = getEncryptionKey();
    const combined = Buffer.from(encryptedBase64, 'base64');

    if (combined.length < 28) {
      // 12 bytes IV + 16 bytes tag = 28 bytes minimum
      return '';
    }

    const iv = combined.subarray(0, 12);
    const authTag = combined.subarray(12, 28);
    const ciphertext = combined.subarray(28);

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return decrypted.toString('utf8');
  } catch (err) {
    console.warn('Decryption failed, returning fallback or unencrypted payload.');
    return '';
  }
}
