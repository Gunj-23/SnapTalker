/**
 * SnapTalker Encryption Context
 * Manages E2EE keys, sessions, and encryption state
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { CryptoUtils, ChatSession, SecureStorage, OfflineMessageQueue } from '../utils/encryption';
import { X3DHProtocol, KeyBundleManager } from '../utils/x3dh';
import { useAuth } from './AuthContext';

const EncryptionContext = createContext();

export const useEncryption = () => {
    const context = useContext(EncryptionContext);
    if (!context) {
        throw new Error('useEncryption must be used within EncryptionProvider');
    }
    return context;
};

export const EncryptionProvider = ({ children }) => {
    const { user } = useAuth();
    const [identityKey, setIdentityKey] = useState(null);
    const [preKeys, setPreKeys] = useState([]);
    const [signedPreKey, setSignedPreKey] = useState(null);
    const [sessions, setSessions] = useState({});
    const [messageQueue] = useState(new OfflineMessageQueue());
    const [keyBundleManager] = useState(new KeyBundleManager());
    const [isInitialized, setIsInitialized] = useState(false);
    const [encryptionEnabled, setEncryptionEnabled] = useState(true);
    const [sessionEstablishing, setSessionEstablishing] = useState({});

    /**
     * Initialize encryption for user
     */
    useEffect(() => {
        if (user && !isInitialized) {
            initializeEncryption();
        }
    }, [user]);

    const initializeEncryption = async () => {
        try {
            // Check if Web Crypto API is available
            if (!window.crypto || !window.crypto.subtle || !window.isSecureContext) {
                console.warn('⚠️ Web Crypto API not available - E2E encryption disabled');
                setEncryptionEnabled(false);
                setIsInitialized(true);
                return;
            }

            // Check if keys exist in storage
            let storedIdentityKey = localStorage.getItem(`identity_key_${user.id}`);

            if (!storedIdentityKey) {
                // Generate new identity key pair
                const keyPair = await CryptoUtils.generateIdentityKeyPair();
                const publicKeyExported = await CryptoUtils.exportPublicKey(keyPair.publicKey);
                const privateKeyExported = await CryptoUtils.exportPrivateKey(keyPair.privateKey);

                // Store keys (in production, private key in OS Keystore)
                localStorage.setItem(`identity_key_${user.id}`, JSON.stringify({
                    publicKey: publicKeyExported,
                    privateKey: privateKeyExported
                }));

                setIdentityKey({ publicKey: keyPair.publicKey, privateKey: keyPair.privateKey });

                // Generate X3DH key bundle (signed pre-key + one-time pre-keys)
                const keyBundle = await X3DHProtocol.generateKeyBundle(keyPair, 100);

                // Store signed pre-key
                setSignedPreKey(keyBundle.signedPreKey);
                localStorage.setItem(`signed_pre_key_${user.id}`, JSON.stringify(keyBundle.signedPreKey));

                // Store one-time pre-keys
                setPreKeys(keyBundle.oneTimePreKeys);
                localStorage.setItem(`pre_keys_${user.id}`, JSON.stringify(keyBundle.oneTimePreKeys));

                // Upload public keys to server
                await uploadPublicKeys(publicKeyExported, keyBundle);
            } else {
                // Load existing keys
                const keys = JSON.parse(storedIdentityKey);
                const publicKey = await CryptoUtils.importPublicKey(keys.publicKey);
                const privateKey = await CryptoUtils.importPrivateKey(keys.privateKey);
                setIdentityKey({ publicKey, privateKey });

                // Load signed pre-key
                const storedSignedPreKey = localStorage.getItem(`signed_pre_key_${user.id}`);
                if (storedSignedPreKey) {
                    setSignedPreKey(JSON.parse(storedSignedPreKey));
                }

                // Load one-time pre-keys
                const storedPreKeys = localStorage.getItem(`pre_keys_${user.id}`);
                if (storedPreKeys) {
                    setPreKeys(JSON.parse(storedPreKeys));
                }
            }

            // Load key bundle manager
            keyBundleManager.load();

            setIsInitialized(true);
        } catch (error) {
            console.error('Failed to initialize encryption:', error);
        }
    };

    /**
     * Upload public keys to server
     */
    const uploadPublicKeys = async (identityPublicKey, keyBundle) => {
        try {
            // TODO: Implement API call to upload public keys
            console.log('Uploading X3DH key bundle to server');
            // await axios.post('/api/v1/keys/upload', {
            //     identityKey: identityPublicKey,
            //     signedPreKey: keyBundle.signedPreKey,
            //     oneTimePreKeys: keyBundle.oneTimePreKeys
            // });
        } catch (error) {
            console.error('Failed to upload public keys:', error);
        }
    };

    /**
     * Get or create chat session with contact
     */
    const getSession = async (contactId) => {
        // Check if session exists
        if (sessions[contactId]) {
            return sessions[contactId];
        }

        // Try to load from storage
        const storedSession = await ChatSession.loadFromStorage(user.id, contactId);
        if (storedSession) {
            setSessions(prev => ({ ...prev, [contactId]: storedSession }));
            return storedSession;
        }

        // Create new session
        return await createSession(contactId);
    };

    /**
     * Create new session with contact using X3DH
     */
    const createSession = async (contactId) => {
        // Mark as establishing to show UI indicator
        setSessionEstablishing(prev => ({ ...prev, [contactId]: true }));

        try {
            // Fetch contact's X3DH key bundle from server
            // TODO: Implement API call
            console.log('Fetching contact X3DH key bundle for:', contactId);
            // const { data } = await axios.get(`/api/v1/keys/bundle/${contactId}`);

            // For now, generate mock bundle
            const mockContactKeys = await CryptoUtils.generateIdentityKeyPair();
            const mockContactPublicKey = await CryptoUtils.exportPublicKey(mockContactKeys.publicKey);
            const mockSignedPreKey = await CryptoUtils.generateEphemeralKeyPair();
            const mockSignedPreKeyPublic = await CryptoUtils.exportPublicKey(mockSignedPreKey.publicKey);
            const mockOneTimePreKey = await CryptoUtils.generateEphemeralKeyPair();
            const mockOneTimePreKeyPublic = await CryptoUtils.exportPublicKey(mockOneTimePreKey.publicKey);

            const contactKeyBundle = {
                userId: contactId,
                identityKey: mockContactPublicKey,
                signedPreKey: mockSignedPreKeyPublic,
                signedPreKeySignature: 'mock_signature',
                oneTimePreKey: mockOneTimePreKeyPublic
            };

            // Store the bundle
            keyBundleManager.storeBundle(contactId, contactKeyBundle);
            keyBundleManager.save();

            // Generate ephemeral key for this session
            const ephemeralKeyPair = await CryptoUtils.generateEphemeralKeyPair();

            // Perform X3DH key agreement
            const { sharedSecret, associatedData, usedOneTimePreKeyId } =
                await X3DHProtocol.initiateKeyAgreement(
                    identityKey,
                    ephemeralKeyPair,
                    contactKeyBundle
                );

            // Mark one-time pre-key as used
            if (usedOneTimePreKeyId) {
                keyBundleManager.markOneTimePreKeyUsed(usedOneTimePreKeyId);
                keyBundleManager.save();
            }

            // Create Double Ratchet session with X3DH shared secret
            const session = new ChatSession(user.id, contactId);
            await session.initialize(sharedSecret);
            await session.saveToStorage();

            // Store session and associated data
            setSessions(prev => ({ ...prev, [contactId]: session }));
            localStorage.setItem(`x3dh_ad_${user.id}_${contactId}`, JSON.stringify(associatedData));

            console.log('✅ X3DH session established with', contactId);
            return session;
        } catch (error) {
            console.error('Failed to create X3DH session:', error);
            throw error;
        } finally {
            setSessionEstablishing(prev => ({ ...prev, [contactId]: false }));
        }
    };

    /**
     * Encrypt message for contact
     */
    const encryptMessage = async (contactId, plaintext) => {
        if (!encryptionEnabled) {
            return { plaintext, encrypted: false };
        }

        try {
            const session = await getSession(contactId);
            const encrypted = await session.encryptOutgoing(plaintext);
            return { ...encrypted, encrypted: true };
        } catch (error) {
            console.error('Failed to encrypt message:', error);
            throw error;
        }
    };

    /**
     * Decrypt message from contact
     */
    const decryptMessage = async (contactId, encryptedData) => {
        if (!encryptedData.encrypted) {
            return encryptedData.plaintext || encryptedData.content;
        }

        try {
            const session = await getSession(contactId);
            const plaintext = await session.decryptIncoming(encryptedData);
            return plaintext;
        } catch (error) {
            console.error('Failed to decrypt message:', error);
            return '[Decryption failed]';
        }
    };

    /**
     * Generate safety number for contact
     */
    const getSafetyNumber = async (contactId) => {
        try {
            // Fetch contact's public key
            // const { data } = await axios.get(`/api/v1/keys/${contactId}`);

            const ourPublicKey = await CryptoUtils.exportPublicKey(identityKey.publicKey);
            const contactPublicKey = 'mock_contact_public_key'; // TODO: Fetch from server

            return await CryptoUtils.generateSafetyNumber(ourPublicKey, contactPublicKey);
        } catch (error) {
            console.error('Failed to generate safety number:', error);
            return null;
        }
    };

    /**
     * Queue message for offline sending
     */
    const queueMessage = async (message) => {
        await messageQueue.enqueue(message);
    };

    /**
     * Process offline message queue
     */
    const processQueue = async () => {
        const pending = messageQueue.getPending();
        for (const message of pending) {
            try {
                // TODO: Attempt to send message
                console.log('Sending queued message:', message);
                messageQueue.dequeue(message.id);
            } catch (error) {
                messageQueue.incrementAttempt(message.id);
                if (message.attempts >= 5) {
                    console.error('Message failed after 5 attempts:', message);
                    messageQueue.dequeue(message.id);
                }
            }
        }
    };

    /**
     * Toggle encryption on/off
     */
    const toggleEncryption = (enabled) => {
        setEncryptionEnabled(enabled);
        localStorage.setItem('encryption_enabled', enabled.toString());
    };

    /**
     * Reset all encryption keys (for account recovery)
     */
    const resetKeys = async () => {
        // Clear all sessions
        Object.keys(sessions).forEach(contactId => {
            localStorage.removeItem(`session_${user.id}_${contactId}`);
        });
        setSessions({});

        // Clear identity keys
        localStorage.removeItem(`identity_key_${user.id}`);
        localStorage.removeItem(`pre_keys_${user.id}`);

        // Reinitialize
        setIsInitialized(false);
        await initializeEncryption();
    };

    /**
     * Export backup (encrypted)
     */
    const exportBackup = async (password) => {
        try {
            const backup = {
                identityKey: localStorage.getItem(`identity_key_${user.id}`),
                preKeys: localStorage.getItem(`pre_keys_${user.id}`),
                sessions: Object.keys(sessions).map(contactId => ({
                    contactId,
                    data: localStorage.getItem(`session_${user.id}_${contactId}`)
                })),
                timestamp: Date.now()
            };

            const salt = CryptoUtils.generateSalt();
            const keyMaterial = await SecureStorage.deriveKeyFromPassword(password, salt);
            const encrypted = await CryptoUtils.encryptMessage(keyMaterial, JSON.stringify(backup));

            return {
                ...encrypted,
                salt,
                version: '1.0'
            };
        } catch (error) {
            console.error('Failed to export backup:', error);
            throw error;
        }
    };

    /**
     * Import backup (encrypted)
     */
    const importBackup = async (encryptedBackup, password) => {
        try {
            const keyMaterial = await SecureStorage.deriveKeyFromPassword(password, encryptedBackup.salt);
            const decrypted = await CryptoUtils.decryptMessage(
                keyMaterial,
                encryptedBackup.ciphertext,
                encryptedBackup.iv
            );

            const backup = JSON.parse(decrypted);

            // Restore keys
            localStorage.setItem(`identity_key_${user.id}`, backup.identityKey);
            localStorage.setItem(`pre_keys_${user.id}`, backup.preKeys);

            // Restore sessions
            backup.sessions.forEach(session => {
                localStorage.setItem(`session_${user.id}_${session.contactId}`, session.data);
            });

            // Reinitialize
            setIsInitialized(false);
            await initializeEncryption();

            return true;
        } catch (error) {
            console.error('Failed to import backup:', error);
            return false;
        }
    };

    const value = {
        isInitialized,
        identityKey,
        preKeys,
        signedPreKey,
        encryptionEnabled,
        sessionEstablishing,
        encryptMessage,
        decryptMessage,
        getSafetyNumber,
        queueMessage,
        processQueue,
        toggleEncryption,
        resetKeys,
        exportBackup,
        importBackup,
        getSession,
        createSession
    };

    return (
        <EncryptionContext.Provider value={value}>
            {children}
        </EncryptionContext.Provider>
    );
};

export default EncryptionContext;
