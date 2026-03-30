import React, { createContext, useContext, useEffect, useState } from 'react';
import { generateDeviceKeyPair, exportPublicKey, exportPrivateKey, importPrivateKey, getPublicKeyFromPrivate, encryptPrivateKeyWithPIN, decryptPrivateKeyWithPIN } from '../utils/e2ee';
import { e2eeApi } from '../api';
import { useAuth } from './AuthContext';

interface E2EEContextType {
  isE2EEReady: boolean;
  requiresRecovery: boolean;
  hasDbBackup: boolean;
  deviceId: string | null;
  privateKey: CryptoKey | null;
  publicKeyStr: string | null;
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

  const initLocalKeys = async () => {
    try {
      const storedDeviceId = localStorage.getItem(`e2ee_device_id_${user?.id}`);
      const storedPrivKey = localStorage.getItem(`e2ee_private_key_jwk_${user?.id}`);
      const storedPubKey = localStorage.getItem(`e2ee_public_key_b64_${user?.id}`);

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
      let needsRegistration = false;

      if (!storedPrivKey || !storedDeviceId || !storedPubKey) {
        if (hasBackupOnServer) {
           console.log('[E2EE] Missing local keys but server has backup. Require PIN recovery.');
           setRequiresRecovery(true);
           setIsE2EEReady(false);
           return;
        }

        // Generate new keys
        console.log('[E2EE] Generating new keys for device');
        const keyPair = await generateDeviceKeyPair();
        
        deviceIdToUse = crypto.randomUUID();
        const exportedPriv = await exportPrivateKey(keyPair.privateKey);
        pubKeyStrToUse = await exportPublicKey(keyPair.publicKey);
        
        localStorage.setItem(`e2ee_device_id_${user?.id}`, deviceIdToUse);
        localStorage.setItem(`e2ee_private_key_jwk_${user?.id}`, JSON.stringify(exportedPriv));
        localStorage.setItem(`e2ee_public_key_b64_${user?.id}`, pubKeyStrToUse);
        
        privKeyToUse = keyPair.privateKey;
        needsRegistration = true;
      } else {
        // Recover keys
        console.log('[E2EE] Recovering keys from local storage');
        privKeyToUse = await importPrivateKey(JSON.parse(storedPrivKey));
        needsRegistration = true; // For MVP, ensure Server DB is up to date on page load
      }

      setDeviceId(deviceIdToUse);
      setPrivateKey(privKeyToUse);
      setPublicKeyStr(pubKeyStrToUse);

      if (needsRegistration && isAuthenticated && deviceIdToUse && pubKeyStrToUse) {
        await e2eeApi.registerDevice({
          deviceId: deviceIdToUse,
          deviceName: navigator.userAgent.slice(0, 50),
          publicKey: pubKeyStrToUse
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

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      initLocalKeys();
    } else {
      setIsE2EEReady(false);
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

      localStorage.setItem(`e2ee_device_id_${user?.id}`, newDeviceId);
      localStorage.setItem(`e2ee_private_key_jwk_${user?.id}`, JSON.stringify(exportedPrivJw));
      localStorage.setItem(`e2ee_public_key_b64_${user?.id}`, pubKeyStr);

      setDeviceId(newDeviceId);
      setPrivateKey(recoveredPrivKey);
      setPublicKeyStr(pubKeyStr);
      setRequiresRecovery(false);

      await e2eeApi.registerDevice({
        deviceId: newDeviceId,
        deviceName: navigator.userAgent.slice(0, 50),
        publicKey: pubKeyStr
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
      registerDevice,
      getDevicePrivateKey,
      setupRecoveryBackup,
      recoverFromPIN
    }}>
      {children}
    </E2EEContext.Provider>
  );
};
