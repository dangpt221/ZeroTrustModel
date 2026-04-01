// 1. Sinh khoá chính cho Key Exchange (ECDH)
export const generateDeviceKeyPair = async (extractable = true): Promise<CryptoKeyPair> => {
  return await window.crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    extractable, // [SECURITY FIX] Cho phép đổi thành false để dùng với IndexedDB
    ["deriveKey", "deriveBits"]
  );
};

// 1.5. Sinh khoá phụ cho Digital Signature (ECDSA)
export const generateSignatureKeyPair = async (extractable = true): Promise<CryptoKeyPair> => {
  return await window.crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    extractable,
    ["sign", "verify"]
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

export const importPublicKey = async (base64Key: string, algo: "ECDH" | "ECDSA" = "ECDH"): Promise<CryptoKey> => {
  const binaryDer = window.atob(base64Key);
  const binaryDerBuffer = new Uint8Array(binaryDer.length);
  for (let i = 0; i < binaryDer.length; i++) {
    binaryDerBuffer[i] = binaryDer.charCodeAt(i);
  }
  return window.crypto.subtle.importKey(
    "spki",
    binaryDerBuffer,
    { name: algo, namedCurve: "P-256" },
    true,
    algo === "ECDH" ? [] : ["verify"]
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

export const importPrivateKey = async (jwkKey: JsonWebKey, algo: "ECDH" | "ECDSA" = "ECDH", extractable = true): Promise<CryptoKey> => {
  return await window.crypto.subtle.importKey(
    "jwk",
    jwkKey,
    { name: algo, namedCurve: "P-256" },
    extractable,
    algo === "ECDH" ? ["deriveKey", "deriveBits"] : ["sign"]
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

// ==================== DOUBLE RATCHET (SIMPLIFIED) ====================

export const generateEphemeralRatchet = async (receiverStaticPubKey: CryptoKey) => {
  const ephemeralPair = await generateDeviceKeyPair(false); // [FORWARD SECRECY] Xóa key ngay sau khi dùng xong
  const sharedSecret = await deriveActiveAesKey(ephemeralPair.privateKey, receiverStaticPubKey);
  const ephemeralPubKeyB64 = await exportPublicKey(ephemeralPair.publicKey);
  return { sharedSecret, ephemeralPubKeyB64 };
};

export const processEphemeralRatchet = async (myStaticPrivateKey: CryptoKey, senderEphemeralPubKeyB64: string) => {
  const senderPubKey = await importPublicKey(senderEphemeralPubKeyB64, "ECDH");
  return deriveActiveAesKey(myStaticPrivateKey, senderPubKey);
};

// ==================== SIGNATURE & INTEGRITY LOGIC ====================

export const signMessage = async (privateKeyECDSA: CryptoKey, dataStr: string): Promise<string> => {
  const dataBytes = new TextEncoder().encode(dataStr);
  const signatureBuffer = await window.crypto.subtle.sign(
    { name: "ECDSA", hash: { name: "SHA-256" } },
    privateKeyECDSA,
    dataBytes
  );
  return window.btoa(String.fromCharCode.apply(null, Array.from(new Uint8Array(signatureBuffer))));
};

export const verifySignature = async (publicKeyECDSA: CryptoKey, signatureB64: string, dataStr: string): Promise<boolean> => {
  try {
    const signatureBytes = window.atob(signatureB64);
    const signatureBuffer = new Uint8Array(signatureBytes.length);
    for (let i = 0; i < signatureBytes.length; i++) signatureBuffer[i] = signatureBytes.charCodeAt(i);

    const dataBytes = new TextEncoder().encode(dataStr);

    return await window.crypto.subtle.verify(
      { name: "ECDSA", hash: { name: "SHA-256" } },
      publicKeyECDSA,
      signatureBuffer,
      dataBytes
    );
  } catch (err) {
    return false;
  }
};

export const encryptMessage = async (aesKey: CryptoKey, plaintext: string) => {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  
  // [METADATA PADDING] Chèn byte rác để mọi tin nhắn đều dài bằng bội số của 256 bytes
  const plainBytes = new TextEncoder().encode(plaintext);
  const targetLength = Math.ceil((plainBytes.length + 1) / 256) * 256;
  const paddingLength = targetLength - plainBytes.length - 1;
  const paddingBytes = window.crypto.getRandomValues(new Uint8Array(paddingLength));
  
  const paddedBytes = new Uint8Array(targetLength);
  paddedBytes.set(plainBytes, 0);
  paddedBytes.set([0], plainBytes.length); // Null byte làm vách ngăn
  paddedBytes.set(paddingBytes, plainBytes.length + 1);

  const ciphertextBuffer = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    aesKey,
    paddedBytes
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
    
    // [METADATA PADDING] Loại bỏ byte rác sau vách ngăn Null
    const paddedArray = new Uint8Array(decryptedBuffer);
    const nullIdx = paddedArray.indexOf(0);
    const plainArray = nullIdx !== -1 ? paddedArray.slice(0, nullIdx) : paddedArray;
    
    return new TextDecoder().decode(plainArray);
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

// 2. Encrypt the generated PrivateKey using the derived PIN/Passphrase key
export const encryptPrivateKeyWithPIN = async (passphrase: string, privateKey: CryptoKey) => {
  if (passphrase.length < 12) {
    console.warn("Cảnh báo: Passphrase yếu. Đề nghị định dạng >= 12 ký tự để phòng chống Brute-force.");
  }
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  
  // Export PrivateKey to JWK format (JSON) string to encrypt it
  const jwk = await exportPrivateKey(privateKey);
  const jwkString = JSON.stringify(jwk);
  const encodedJwk = new TextEncoder().encode(jwkString);

  // Derive AES key
  const aesKey = await deriveKeyFromPIN(passphrase, salt);

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

// 3. Decrypt the MasterKey back to a PrivateKey using the Passphrase
export const decryptPrivateKeyWithPIN = async (
  passphrase: string, 
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

    // Derive the same AES key from Passphrase
    const aesKey = await deriveKeyFromPIN(passphrase, saltBuffer);

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
