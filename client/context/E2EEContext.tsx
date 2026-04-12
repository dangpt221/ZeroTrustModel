import React, { createContext, useContext, useEffect, useState } from 'react';
import { generateDeviceKeyPair, generateSignatureKeyPair, exportPublicKey, exportPrivateKey, importPrivateKey, getPublicKeyFromPrivate, encryptPrivateKeyWithPIN, decryptPrivateKeyWithPIN } from '../utils/e2ee';
import { e2eeApi } from '../api';
import { useAuth } from './AuthContext';

interface E2EEContextType {
  isE2EEReady: boolean;
  requiresRecovery: boolean;
  hasDbBackup: boolean;
  deviceId: string | null;
  privateKey: CryptoKey | null;
  publicKeyStr: string | null;
  signaturePrivateKey: CryptoKey | null; // [PRO LEVEL]
  signaturePublicKeyStr: string | null; // [PRO LEVEL]
  myDeviceIds: string[];
  registerDevice: () => Promise<void>;
  getDevicePrivateKey: () => Promise<CryptoKey | null>;
  setupRecoveryBackup: (pin: string) => Promise<boolean>;
  recoverFromPIN: (pin: string) => Promise<boolean>;
}

const E2EEContext = createContext<E2EEContextType>({
  isE2EEReady: false,
  requiresRecovery: false,
  hasDbBackup: false,
  deviceId: null,
  privateKey: null,
  publicKeyStr: null,
  signaturePrivateKey: null,
  signaturePublicKeyStr: null,
  myDeviceIds: [],
  registerDevice: async () => {},
  getDevicePrivateKey: async () => null,
  setupRecoveryBackup: async () => false,
  recoverFromPIN: async () => false,
});

export const useE2EE = () => useContext(E2EEContext);

export const E2EEProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [isE2EEReady, setIsE2EEReady] = useState(false);
  const [requiresRecovery, setRequiresRecovery] = useState(false);
  const [hasDbBackup, setHasDbBackup] = useState(false);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [privateKey, setPrivateKey] = useState<CryptoKey | null>(null);
  const [publicKeyStr, setPublicKeyStr] = useState<string | null>(null);
  const [signaturePrivateKey, setSignaturePrivateKey] = useState<CryptoKey | null>(null);
  const [signaturePublicKeyStr, setSignaturePublicKeyStr] = useState<string | null>(null);
  const [myDeviceIds, setMyDeviceIds] = useState<string[]>([]);

  const initLocalKeys = async () => {
    try {
      const storedDeviceId = localStorage.getItem(`e2ee_device_id_${user?.id}`);
      const storedPrivKey = localStorage.getItem(`e2ee_private_key_jwk_${user?.id}`);
      const storedPubKey = localStorage.getItem(`e2ee_public_key_b64_${user?.id}`);
      const storedSignPrivKey = localStorage.getItem(`e2ee_sign_private_key_jwk_${user?.id}`);
      const storedSignPubKey = localStorage.getItem(`e2ee_sign_public_key_b64_${user?.id}`);

      let hasBackupOnServer = false;
      try {
        const backupRes = await e2eeApi.recoverBackup().catch(() => null);
        if (backupRes && backupRes.encryptedMasterKey) {
          hasBackupOnServer = true;
          setHasDbBackup(true);
        }
      } catch (e) {}

      let deviceIdToUse = storedDeviceId;
      let privKeyToUse: CryptoKey | null = null;
      let pubKeyStrToUse = storedPubKey;
      let signPrivKeyToUse: CryptoKey | null = null;
      let signPubKeyStrToUse = storedSignPubKey;
      let needsRegistration = false;

      if (!storedPrivKey || !storedDeviceId || !storedPubKey || !storedSignPrivKey || !storedSignPubKey) {
        if (hasBackupOnServer) {
           console.log('[E2EE] Missing local keys but server has backup. Require PIN recovery.');
           setRequiresRecovery(true);
           setIsE2EEReady(false);
           return;
        }

        // Generate new keys
        console.log('[E2EE] Generating new keys for device');
        const keyPair = await generateDeviceKeyPair(true);
        const signKeyPair = await generateSignatureKeyPair(true); // Cặp khóa chữ ký
        
        deviceIdToUse = crypto.randomUUID();
        const exportedPriv = await exportPrivateKey(keyPair.privateKey);
        const exportedSignPriv = await exportPrivateKey(signKeyPair.privateKey);
        
        pubKeyStrToUse = await exportPublicKey(keyPair.publicKey);
        signPubKeyStrToUse = await exportPublicKey(signKeyPair.publicKey);
        
        localStorage.setItem(`e2ee_device_id_${user?.id}`, deviceIdToUse);
        localStorage.setItem(`e2ee_private_key_jwk_${user?.id}`, JSON.stringify(exportedPriv));
        localStorage.setItem(`e2ee_public_key_b64_${user?.id}`, pubKeyStrToUse);
        localStorage.setItem(`e2ee_sign_private_key_jwk_${user?.id}`, JSON.stringify(exportedSignPriv));
        localStorage.setItem(`e2ee_sign_public_key_b64_${user?.id}`, signPubKeyStrToUse);
        
        privKeyToUse = keyPair.privateKey;
        signPrivKeyToUse = signKeyPair.privateKey;
        needsRegistration = true;
      } else {
        // Recover keys
        console.log('[E2EE] Recovering keys from local storage');
        privKeyToUse = await importPrivateKey(JSON.parse(storedPrivKey), "ECDH", true);
        signPrivKeyToUse = await importPrivateKey(JSON.parse(storedSignPrivKey), "ECDSA", true);
        needsRegistration = true; // For MVP, ensure Server DB is up to date on page load
      }

      setDeviceId(deviceIdToUse);
      setPrivateKey(privKeyToUse);
      setPublicKeyStr(pubKeyStrToUse);
      setSignaturePrivateKey(signPrivKeyToUse);
      setSignaturePublicKeyStr(signPubKeyStrToUse);

      if (needsRegistration && isAuthenticated && deviceIdToUse && pubKeyStrToUse) {
        await e2eeApi.registerDevice({
          deviceId: deviceIdToUse,
          deviceName: navigator.userAgent.slice(0, 50),
          publicKey: pubKeyStrToUse,
          signaturePublicKey: signPubKeyStrToUse
        });
        console.log('[E2EE] Device registered securely on server');
        setIsE2EEReady(true);
      } else if (isAuthenticated && storedPrivKey) {
        setIsE2EEReady(true);
      }

    } catch (err) {
      console.error('[E2EE] Setup failed', err);
    }
  };

  const fetchMyDevices = async () => {
    try {
      const res = await e2eeApi.getMyDevices();
      if (res && res.devices) {
        setMyDeviceIds(res.devices.map((d: any) => d.deviceId));
      }
    } catch (e) {}
  };

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      initLocalKeys();
      fetchMyDevices();
    } else {
      setIsE2EEReady(false);
      setMyDeviceIds([]);
    }
  }, [isAuthenticated, user?.id]);

  const registerDevice = async () => {
    await initLocalKeys();
  };

  const getDevicePrivateKey = async () => {
    return privateKey;
  };

  const setupRecoveryBackup = async (pin: string) => {
    if (!privateKey) return false;
    try {
      const backup = await encryptPrivateKeyWithPIN(pin, privateKey);
      await e2eeApi.setupBackup(backup);
      setHasDbBackup(true);
      return true;
    } catch (err) {
      console.error("Backup failed", err);
      return false;
    }
  };

  const recoverFromPIN = async (pin: string) => {
    try {
      const backupRes = await e2eeApi.recoverBackup();
      if (!backupRes || !backupRes.encryptedMasterKey) return false;

      const recoveredPrivKey = await decryptPrivateKeyWithPIN(
        pin,
        backupRes.encryptedMasterKey,
        backupRes.masterKeySalt,
        backupRes.masterKeyIv
      );

      if (!recoveredPrivKey) return false;

      const newDeviceId = crypto.randomUUID();
      const recoveredPubKey = await getPublicKeyFromPrivate(recoveredPrivKey);
      const pubKeyStr = await exportPublicKey(recoveredPubKey);
      const exportedPrivJw = await window.crypto.subtle.exportKey("jwk", recoveredPrivKey);

      // [PRO LEVEL] Sinh mới khoá Signature vì không cần Backup (Device Mới)
      const signKeyPair = await generateSignatureKeyPair(true);
      const signPubKeyStr = await exportPublicKey(signKeyPair.publicKey);
      const exportedSignPrivJw = await window.crypto.subtle.exportKey("jwk", signKeyPair.privateKey);

      localStorage.setItem(`e2ee_device_id_${user?.id}`, newDeviceId);
      localStorage.setItem(`e2ee_private_key_jwk_${user?.id}`, JSON.stringify(exportedPrivJw));
      localStorage.setItem(`e2ee_public_key_b64_${user?.id}`, pubKeyStr);
      localStorage.setItem(`e2ee_sign_private_key_jwk_${user?.id}`, JSON.stringify(exportedSignPrivJw));
      localStorage.setItem(`e2ee_sign_public_key_b64_${user?.id}`, signPubKeyStr);

      setDeviceId(newDeviceId);
      setPrivateKey(recoveredPrivKey);
      setPublicKeyStr(pubKeyStr);
      setSignaturePrivateKey(signKeyPair.privateKey);
      setSignaturePublicKeyStr(signPubKeyStr);
      setRequiresRecovery(false);

      await e2eeApi.registerDevice({
        deviceId: newDeviceId,
        deviceName: navigator.userAgent.slice(0, 50),
        publicKey: pubKeyStr,
        signaturePublicKey: signPubKeyStr
      });

      setIsE2EEReady(true);
      return true;
    } catch (err) {
      console.error("Recover failed", err);
      return false;
    }
  };

  return (
    <E2EEContext.Provider value={{
      isE2EEReady,
      requiresRecovery,
      hasDbBackup,
      deviceId,
      privateKey,
      publicKeyStr,
      signaturePrivateKey,
      signaturePublicKeyStr,
      myDeviceIds,
      registerDevice,
      getDevicePrivateKey,
      setupRecoveryBackup,
      recoverFromPIN
    }}>
      {children}
    </E2EEContext.Provider>
  );
};
