import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load or generate Master Key (Simulated KMS for Envelope Encryption)
const MASTER_KEY_PATH = path.join(__dirname, '../../.encryption_key');
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16;  // 128 bits
const AUTH_TAG_LENGTH = 16;

function getMasterKey() {
  let key;
  if (fs.existsSync(MASTER_KEY_PATH)) {
    key = fs.readFileSync(MASTER_KEY_PATH);
  } else {
    key = crypto.randomBytes(KEY_LENGTH);
    fs.writeFileSync(MASTER_KEY_PATH, key, { mode: 0o600 });
  }
  return key;
}

const MASTER_KEY = getMasterKey();

/**
 * Envelope Encryption: Encrypt a Data Key using the Master Key
 */
export function encryptDataKey(dataKeyBuffer) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, MASTER_KEY, iv);
  
  const encrypted = Buffer.concat([cipher.update(dataKeyBuffer), cipher.final()]);
  const authTag = cipher.getAuthTag();
  
  // Return format: iv:authTag:encryptedKey
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Envelope Encryption: Decrypt a Data Key using the Master Key
 */
export function decryptDataKey(encryptedPayloadStr) {
  const parts = encryptedPayloadStr.split(':');
  if (parts.length !== 3) throw new Error('Invalid encrypted Data Key format');
  
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = Buffer.from(parts[2], 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, MASTER_KEY, iv);
  decipher.setAuthTag(authTag);
  
  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}

/**
 * Encrypt a file using Envelope Encryption (AES-256-GCM) + SHA-256 Hash
 * V2: Writes PURE ciphertext to disk. Metadata (IV, AuthTag) is returned to store in DB.
 * @param {string} inputPath - Path to the file to encrypt
 * @param {string} outputPath - Path where encrypted file will be saved
 * @returns {Promise<Object>} - The encryptionMetadata needed by Document schema
 */
export function encryptFile(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    // 1. Generate unique Data Key for this specific file
    const dataKey = crypto.randomBytes(KEY_LENGTH);
    const encryptedDataKey = encryptDataKey(dataKey);

    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, dataKey, iv);
    
    // Hash stream for integrity check before encryption
    const hashStream = crypto.createHash('sha256');

    const input = fs.createReadStream(inputPath);
    const output = fs.createWriteStream(outputPath);

    // Compute hash simultaneously
    input.on('data', (chunk) => {
      hashStream.update(chunk);
    });

    // Pipe raw file -> Cipher -> Output File
    input.pipe(cipher).pipe(output);

    output.on('finish', () => {
      const authTag = cipher.getAuthTag();
      const fileHash = hashStream.digest('hex');

      resolve({
        dataKey: encryptedDataKey,
        iv: iv.toString('hex'),
        authTag: authTag.toString('hex'),
        fileHash: fileHash
      });
    });

    output.on('error', reject);
    input.on('error', reject);
    cipher.on('error', reject);
  });
}

/**
 * [V2] Secure Memory-only Decrypt Stream Pipeline
 * Returns an active decipher stream piped with the file read stream via piping.
 * No temporary files are created on disk.
 */
export function createDecryptStream(filePath, encryptionMetadata) {
  if (!encryptionMetadata || !encryptionMetadata.dataKey || !encryptionMetadata.iv || !encryptionMetadata.authTag) {
    throw new Error('Missing encryption metadata for stream decryption');
  }

  // 1. Unwrap Data Key
  const dataKey = decryptDataKey(encryptionMetadata.dataKey);
  const iv = Buffer.from(encryptionMetadata.iv, 'hex');
  const authTag = Buffer.from(encryptionMetadata.authTag, 'hex');

  // 2. Create Decipher
  const decipher = crypto.createDecipheriv(ALGORITHM, dataKey, iv);
  decipher.setAuthTag(authTag); // Set auth tag upfront!

  // 3. Create Read Stream and Pipe
  const readStream = fs.createReadStream(filePath);
  
  // NOTE: If the AuthTag fails (Integrity compromised), 'error' event will be emitted on decipher stream before 'end'.
  return readStream.pipe(decipher);
}

/**
 * Legacy support for DB Buffer Encryption (if you are encrypting small fields)
 */
export function encryptBuffer(data) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, MASTER_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, encrypted, authTag]);
}

export function decryptBuffer(encryptedData) {
  const iv = encryptedData.subarray(0, IV_LENGTH);
  const authTag = encryptedData.subarray(encryptedData.length - AUTH_TAG_LENGTH);
  const ciphertext = encryptedData.subarray(IV_LENGTH, encryptedData.length - AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, MASTER_KEY, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

export function getKeyFingerprint() {
  return crypto.createHash('sha256').update(MASTER_KEY).digest('hex').substring(0, 16);
}
