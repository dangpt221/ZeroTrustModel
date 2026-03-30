export const generateDeviceKeyPair = async (): Promise<CryptoKeyPair> => {
  return await window.crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey", "deriveBits"]
  );
};

export const exportPublicKey = async (publicKey: CryptoKey): Promise<string> => {
  const exported = await window.crypto.subtle.exportKey("spki", publicKey);
  const exportedAsString = String.fromCharCode.apply(null, Array.from(new Uint8Array(exported)));
  return window.btoa(exportedAsString);
};

export const exportPrivateKey = async (privateKey: CryptoKey): Promise<JsonWebKey> => {
  return await window.crypto.subtle.exportKey("jwk", privateKey);
};

export const importPublicKey = async (base64Key: string): Promise<CryptoKey> => {
  const binaryDer = window.atob(base64Key);
  const binaryDerBuffer = new Uint8Array(binaryDer.length);
  for (let i = 0; i < binaryDer.length; i++) {
    binaryDerBuffer[i] = binaryDer.charCodeAt(i);
  }
  return window.crypto.subtle.importKey(
    "spki",
    binaryDerBuffer,
    { name: "ECDH", namedCurve: "P-256" },
    true,
    []
  );
};

export const getPublicKeyFromPrivate = async (privateKey: CryptoKey): Promise<CryptoKey> => {
  const jwk = await window.crypto.subtle.exportKey("jwk", privateKey);
  // Re-import only the public parts (x, y)
  return await window.crypto.subtle.importKey(
    "jwk",
    { kty: jwk.kty, crv: jwk.crv, x: jwk.x, y: jwk.y, ext: true },
    { name: "ECDH", namedCurve: "P-256" },
    true,
    []
  );
};

export const importPrivateKey = async (jwkKey: JsonWebKey): Promise<CryptoKey> => {
  return await window.crypto.subtle.importKey(
    "jwk",
    jwkKey,
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey", "deriveBits"]
  );
};

export const deriveActiveAesKey = async (myPrivateKey: CryptoKey, theirPublicKey: CryptoKey): Promise<CryptoKey> => {
  return window.crypto.subtle.deriveKey(
    { name: "ECDH", public: theirPublicKey },
    myPrivateKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
};

export const encryptMessage = async (aesKey: CryptoKey, plaintext: string) => {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encodedText = new TextEncoder().encode(plaintext);

  const ciphertextBuffer = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    aesKey,
    encodedText
  );

  return {
    ciphertext: window.btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(ciphertextBuffer)))),
    iv: window.btoa(String.fromCharCode.apply(null, Array.from(iv)))
  };
};

export const decryptMessage = async (aesKey: CryptoKey, ciphertextBase64: string, ivBase64: string): Promise<string> => {
  const ciphertextBytes = window.atob(ciphertextBase64);
  const ciphertextBuffer = new Uint8Array(ciphertextBytes.length);
  for (let i = 0; i < ciphertextBytes.length; i++) ciphertextBuffer[i] = ciphertextBytes.charCodeAt(i);

  const ivBytes = window.atob(ivBase64);
  const ivBuffer = new Uint8Array(ivBytes.length);
  for (let i = 0; i < ivBytes.length; i++) ivBuffer[i] = ivBytes.charCodeAt(i);

  try {
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: ivBuffer },
      aesKey,
      ciphertextBuffer
    );
    return new TextDecoder().decode(decryptedBuffer);
  } catch (error) {
    console.warn("Decryption failed", error);
    return "[Nội dung bị mã hóa không thể giải mã trên thiết bị này]";
  }
};

// ==================== RECOVERY & BACKUP LOGIC (PBKDF2) ====================

// 1. Derive an AES-GCM key from a 6-digit PIN and a salt using PBKDF2
const deriveKeyFromPIN = async (pin: string, salt: Uint8Array): Promise<CryptoKey> => {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(pin),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"]
  );

  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: 100000,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
};

// 2. Encrypt the generated PrivateKey using the derived PIN key
export const encryptPrivateKeyWithPIN = async (pin: string, privateKey: CryptoKey) => {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  
  // Export PrivateKey to JWK format (JSON) string to encrypt it
  const jwk = await exportPrivateKey(privateKey);
  const jwkString = JSON.stringify(jwk);
  const encodedJwk = new TextEncoder().encode(jwkString);

  // Derive AES key
  const aesKey = await deriveKeyFromPIN(pin, salt);

  // Encrypt the JWK
  const ciphertextBuffer = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    aesKey,
    encodedJwk
  );

  return {
    encryptedMasterKey: window.btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(ciphertextBuffer)))),
    masterKeySalt: window.btoa(String.fromCharCode.apply(null, Array.from(salt))),
    masterKeyIv: window.btoa(String.fromCharCode.apply(null, Array.from(iv)))
  };
};

// 3. Decrypt the MasterKey back to a PrivateKey using the PIN
export const decryptPrivateKeyWithPIN = async (
  pin: string, 
  encryptedMasterKeyB64: string, 
  masterKeySaltB64: string, 
  masterKeyIvB64: string
): Promise<CryptoKey | null> => {
  try {
    // Decode Base64 to Buffers
    const saltBytes = window.atob(masterKeySaltB64);
    const saltBuffer = new Uint8Array(saltBytes.length);
    for (let i = 0; i < saltBytes.length; i++) saltBuffer[i] = saltBytes.charCodeAt(i);

    const ivBytes = window.atob(masterKeyIvB64);
    const ivBuffer = new Uint8Array(ivBytes.length);
    for (let i = 0; i < ivBytes.length; i++) ivBuffer[i] = ivBytes.charCodeAt(i);

    const cipherBytes = window.atob(encryptedMasterKeyB64);
    const cipherBuffer = new Uint8Array(cipherBytes.length);
    for (let i = 0; i < cipherBytes.length; i++) cipherBuffer[i] = cipherBytes.charCodeAt(i);

    // Derive the same AES key from PIN
    const aesKey = await deriveKeyFromPIN(pin, saltBuffer);

    // Decrypt the payload
    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: ivBuffer },
      aesKey,
      cipherBuffer
    );

    const jwkString = new TextDecoder().decode(decryptedBuffer);
    const jwk = JSON.parse(jwkString) as JsonWebKey;

    // Import back to CryptoKey
    return await importPrivateKey(jwk);
  } catch (error) {
    console.error("PIN Decryption failed", error);
    return null; // Signals incorrect PIN or corrupted data
  }
};
