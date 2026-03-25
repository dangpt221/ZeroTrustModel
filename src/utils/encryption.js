import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load or generate master key
const MASTER_KEY_PATH = path.join(__dirname, '../../.encryption_key');
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 16;  // 128 bits
const AUTH_TAG_LENGTH = 16;

// Load or generate master key
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
 * Encrypt a file using AES-256-GCM
 * @param {string} inputPath - Path to the file to encrypt
 * @param {string} outputPath - Path where encrypted file will be saved
 */
export function encryptFile(inputPath, outputPath) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, MASTER_KEY, iv);

  const input = fs.createReadStream(inputPath);
  const output = fs.createWriteStream(outputPath);

  // Write IV at the beginning of the file (for decryption)
  const ivBuffer = Buffer.alloc(IV_LENGTH);
  iv.copy(ivBuffer);
  output.write(ivBuffer);

  input.pipe(cipher);

  // Get auth tag and write it at the end
  return new Promise((resolve, reject) => {
    const chunks = [];
    cipher.on('data', (chunk) => chunks.push(chunk));
    cipher.on('end', () => {
      const encrypted = Buffer.concat(chunks);
      const authTag = cipher.getAuthTag();

      output.write(encrypted);
      output.write(authTag);
      output.end();

      output.on('finish', resolve);
      output.on('error', reject);
    });
    cipher.on('error', reject);
    input.on('error', reject);
  });
}

/**
 * Decrypt a file encrypted with AES-256-GCM
 * @param {string} inputPath - Path to the encrypted file
 * @param {string} outputPath - Path where decrypted file will be saved
 */
export function decryptFile(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    const fileBuffer = fs.readFileSync(inputPath);

    if (fileBuffer.length < IV_LENGTH + AUTH_TAG_LENGTH) {
      return reject(new Error('Invalid encrypted file: too small'));
    }

    const iv = fileBuffer.subarray(0, IV_LENGTH);
    const authTag = fileBuffer.subarray(fileBuffer.length - AUTH_TAG_LENGTH);
    const encryptedData = fileBuffer.subarray(IV_LENGTH, fileBuffer.length - AUTH_TAG_LENGTH);

    const decipher = crypto.createDecipheriv(ALGORITHM, MASTER_KEY, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encryptedData),
      decipher.final()
    ]);

    fs.writeFileSync(outputPath, decrypted);
    resolve();
  });
}

/**
 * Encrypt buffer data (for database storage of small files)
 * @param {Buffer} data - Data to encrypt
 * @returns {Buffer} - Encrypted data (iv + ciphertext + authTag)
 */
export function encryptBuffer(data) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, MASTER_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, encrypted, authTag]);
}

/**
 * Decrypt buffer data
 * @param {Buffer} encryptedData - Encrypted data (iv + ciphertext + authTag)
 * @returns {Buffer} - Decrypted data
 */
export function decryptBuffer(encryptedData) {
  const iv = encryptedData.subarray(0, IV_LENGTH);
  const authTag = encryptedData.subarray(encryptedData.length - AUTH_TAG_LENGTH);
  const ciphertext = encryptedData.subarray(IV_LENGTH, encryptedData.length - AUTH_TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, MASTER_KEY, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

/**
 * Get encryption key fingerprint (for audit)
 */
export function getKeyFingerprint() {
  return crypto.createHash('sha256').update(MASTER_KEY).digest('hex').substring(0, 16);
}
