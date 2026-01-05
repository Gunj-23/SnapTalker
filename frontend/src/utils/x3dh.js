/**
 * X3DH (Extended Triple Diffie-Hellman) Key Agreement Protocol
 * Implementation for SnapTalker based on Signal Protocol specification
 */

import { CryptoUtils } from './encryption';

/**
 * X3DH Key Bundle
 * Contains all public keys needed for initiating a session
 */
export class X3DHKeyBundle {
    constructor(userId) {
        this.userId = userId;
        this.identityKey = null;        // Long-term identity key (IK)
        this.signedPreKey = null;       // Signed pre-key (SPK)
        this.signedPreKeySignature = null;
        this.oneTimePreKey = null;      // One-time pre-key (OPK) - optional
        this.timestamp = Date.now();
    }

    /**
     * Serialize bundle for transmission
     */
    serialize() {
        return {
            userId: this.userId,
            identityKey: this.identityKey,
            signedPreKey: this.signedPreKey,
            signedPreKeySignature: this.signedPreKeySignature,
            oneTimePreKey: this.oneTimePreKey,
            timestamp: this.timestamp
        };
    }

    /**
     * Deserialize bundle from received data
     */
    static deserialize(data) {
        const bundle = new X3DHKeyBundle(data.userId);
        bundle.identityKey = data.identityKey;
        bundle.signedPreKey = data.signedPreKey;
        bundle.signedPreKeySignature = data.signedPreKeySignature;
        bundle.oneTimePreKey = data.oneTimePreKey;
        bundle.timestamp = data.timestamp;
        return bundle;
    }

    /**
     * Verify the signed pre-key signature
     */
    async verify() {
        try {
            const identityKeyObj = await CryptoUtils.importPublicKey(this.identityKey);
            const signedPreKeyData = CryptoUtils.base64ToArrayBuffer(this.signedPreKey);
            const signature = CryptoUtils.base64ToArrayBuffer(this.signedPreKeySignature);

            // Verify signature using identity key
            const isValid = await window.crypto.subtle.verify(
                {
                    name: 'ECDSA',
                    hash: { name: 'SHA-256' }
                },
                identityKeyObj,
                signature,
                signedPreKeyData
            );

            return isValid;
        } catch (error) {
            console.error('Failed to verify signed pre-key:', error);
            return false;
        }
    }
}

/**
 * X3DH Protocol Implementation
 */
export class X3DHProtocol {
    /**
     * Generate key bundle for publishing to server
     */
    static async generateKeyBundle(identityKeyPair, oneTimePreKeysCount = 100) {
        try {
            // Generate signed pre-key
            const signedPreKey = await CryptoUtils.generateEphemeralKeyPair();
            const signedPreKeyPublic = await CryptoUtils.exportPublicKey(signedPreKey.publicKey);

            // Sign the pre-key with identity key
            const signedPreKeyData = CryptoUtils.base64ToArrayBuffer(signedPreKeyPublic);

            // For ECDH keys, we need to convert to ECDSA for signing
            // In production, use separate signing key or convert key usage
            // For now, we'll use a hash-based signature
            const signature = await window.crypto.subtle.digest('SHA-256', signedPreKeyData);
            const signatureBase64 = CryptoUtils.arrayBufferToBase64(signature);

            // Generate one-time pre-keys
            const oneTimePreKeys = await CryptoUtils.generatePreKeys(oneTimePreKeysCount);

            return {
                signedPreKey: {
                    id: 1,
                    publicKey: signedPreKeyPublic,
                    privateKey: await CryptoUtils.exportPrivateKey(signedPreKey.privateKey),
                    signature: signatureBase64,
                    timestamp: Date.now()
                },
                oneTimePreKeys: oneTimePreKeys.map(pk => ({
                    id: pk.id,
                    publicKey: pk.publicKey
                }))
            };
        } catch (error) {
            console.error('Failed to generate key bundle:', error);
            throw error;
        }
    }

    /**
     * Initiator: Perform X3DH key agreement (Alice initiating with Bob)
     * Returns the shared secret (SK) derived from 4 DH operations
     */
    static async initiateKeyAgreement(
        ourIdentityKeyPair,     // Alice's identity key (IK_A)
        ourEphemeralKeyPair,    // Alice's ephemeral key (EK_A)
        theirKeyBundle          // Bob's key bundle
    ) {
        try {
            // Import Bob's public keys
            const theirIdentityKey = await CryptoUtils.importPublicKey(theirKeyBundle.identityKey);
            const theirSignedPreKey = await CryptoUtils.importPublicKey(theirKeyBundle.signedPreKey);
            const theirOneTimePreKey = theirKeyBundle.oneTimePreKey
                ? await CryptoUtils.importPublicKey(theirKeyBundle.oneTimePreKey)
                : null;

            // Perform 4 Diffie-Hellman operations:

            // DH1 = DH(IK_A, SPK_B)
            const dh1 = await CryptoUtils.deriveSharedSecret(
                ourIdentityKeyPair.privateKey,
                theirSignedPreKey
            );

            // DH2 = DH(EK_A, IK_B)
            const dh2 = await CryptoUtils.deriveSharedSecret(
                ourEphemeralKeyPair.privateKey,
                theirIdentityKey
            );

            // DH3 = DH(EK_A, SPK_B)
            const dh3 = await CryptoUtils.deriveSharedSecret(
                ourEphemeralKeyPair.privateKey,
                theirSignedPreKey
            );

            // DH4 = DH(EK_A, OPK_B) - only if one-time pre-key exists
            let dh4 = null;
            if (theirOneTimePreKey) {
                dh4 = await CryptoUtils.deriveSharedSecret(
                    ourEphemeralKeyPair.privateKey,
                    theirOneTimePreKey
                );
            }

            // Combine all DH outputs: SK = KDF(DH1 || DH2 || DH3 || DH4)
            const dhOutputs = [dh1, dh2, dh3];
            if (dh4) dhOutputs.push(dh4);

            // Concatenate all DH outputs
            const combinedLength = dhOutputs.reduce((sum, dh) => sum + dh.byteLength, 0);
            const combined = new Uint8Array(combinedLength);
            let offset = 0;
            for (const dh of dhOutputs) {
                combined.set(new Uint8Array(dh), offset);
                offset += dh.byteLength;
            }

            // Derive final shared secret using HKDF
            const sharedSecret = await CryptoUtils.deriveMessageKey(
                combined,
                new Uint8Array(32), // salt
                new TextEncoder().encode('X3DH_Shared_Secret') // info
            );

            // Create associated data (AD) for authentication
            const associatedData = {
                ourIdentityKey: await CryptoUtils.exportPublicKey(ourIdentityKeyPair.publicKey),
                theirIdentityKey: theirKeyBundle.identityKey,
                ourEphemeralKey: await CryptoUtils.exportPublicKey(ourEphemeralKeyPair.publicKey),
                theirSignedPreKey: theirKeyBundle.signedPreKey,
                theirOneTimePreKeyId: theirKeyBundle.oneTimePreKey ? theirKeyBundle.oneTimePreKey.id : null
            };

            return {
                sharedSecret,
                associatedData,
                usedOneTimePreKeyId: theirKeyBundle.oneTimePreKey ? theirKeyBundle.oneTimePreKey.id : null
            };
        } catch (error) {
            console.error('X3DH key agreement failed:', error);
            throw error;
        }
    }

    /**
     * Responder: Complete X3DH key agreement (Bob receiving from Alice)
     * Returns the same shared secret as initiator
     */
    static async respondToKeyAgreement(
        ourIdentityKeyPair,          // Bob's identity key (IK_B)
        ourSignedPreKeyPair,         // Bob's signed pre-key (SPK_B)
        ourOneTimePreKeyPair,        // Bob's one-time pre-key (OPK_B) - optional
        theirIdentityKey,            // Alice's identity key (IK_A)
        theirEphemeralKey            // Alice's ephemeral key (EK_A)
    ) {
        try {
            // Import Alice's public keys
            const theirIdentityKeyObj = await CryptoUtils.importPublicKey(theirIdentityKey);
            const theirEphemeralKeyObj = await CryptoUtils.importPublicKey(theirEphemeralKey);

            // Perform the same 4 DH operations (in reverse order):

            // DH1 = DH(SPK_B, IK_A)
            const dh1 = await CryptoUtils.deriveSharedSecret(
                ourSignedPreKeyPair.privateKey,
                theirIdentityKeyObj
            );

            // DH2 = DH(IK_B, EK_A)
            const dh2 = await CryptoUtils.deriveSharedSecret(
                ourIdentityKeyPair.privateKey,
                theirEphemeralKeyObj
            );

            // DH3 = DH(SPK_B, EK_A)
            const dh3 = await CryptoUtils.deriveSharedSecret(
                ourSignedPreKeyPair.privateKey,
                theirEphemeralKeyObj
            );

            // DH4 = DH(OPK_B, EK_A) - only if one-time pre-key was used
            let dh4 = null;
            if (ourOneTimePreKeyPair) {
                dh4 = await CryptoUtils.deriveSharedSecret(
                    ourOneTimePreKeyPair.privateKey,
                    theirEphemeralKeyObj
                );
            }

            // Combine all DH outputs in the same way
            const dhOutputs = [dh1, dh2, dh3];
            if (dh4) dhOutputs.push(dh4);

            const combinedLength = dhOutputs.reduce((sum, dh) => sum + dh.byteLength, 0);
            const combined = new Uint8Array(combinedLength);
            let offset = 0;
            for (const dh of dhOutputs) {
                combined.set(new Uint8Array(dh), offset);
                offset += dh.byteLength;
            }

            // Derive the same shared secret
            const sharedSecret = await CryptoUtils.deriveMessageKey(
                combined,
                new Uint8Array(32), // same salt
                new TextEncoder().encode('X3DH_Shared_Secret') // same info
            );

            return {
                sharedSecret
            };
        } catch (error) {
            console.error('X3DH respond to key agreement failed:', error);
            throw error;
        }
    }

    /**
     * Generate initial message with X3DH handshake
     */
    static async generateInitialMessage(sharedSecret, associatedData, plaintext) {
        try {
            // Encrypt the initial message with the shared secret
            const encrypted = await CryptoUtils.encryptMessage(sharedSecret, plaintext);

            return {
                type: 'X3DH_INIT',
                associatedData,
                ciphertext: encrypted.ciphertext,
                iv: encrypted.iv,
                timestamp: Date.now()
            };
        } catch (error) {
            console.error('Failed to generate initial message:', error);
            throw error;
        }
    }

    /**
     * Decrypt initial message and establish session
     */
    static async decryptInitialMessage(sharedSecret, encryptedMessage) {
        try {
            const plaintext = await CryptoUtils.decryptMessage(
                sharedSecret,
                encryptedMessage.ciphertext,
                encryptedMessage.iv
            );

            return plaintext;
        } catch (error) {
            console.error('Failed to decrypt initial message:', error);
            throw error;
        }
    }
}

/**
 * Key Bundle Manager
 * Manages key bundles for contacts
 */
export class KeyBundleManager {
    constructor() {
        this.bundles = new Map(); // userId -> KeyBundle
        this.usedOneTimePreKeys = new Set(); // Track used one-time keys
    }

    /**
     * Store a contact's key bundle
     */
    storeBundle(userId, bundle) {
        this.bundles.set(userId, X3DHKeyBundle.deserialize(bundle));
    }

    /**
     * Get a contact's key bundle
     */
    getBundle(userId) {
        return this.bundles.get(userId);
    }

    /**
     * Mark a one-time pre-key as used
     */
    markOneTimePreKeyUsed(oneTimePreKeyId) {
        this.usedOneTimePreKeys.add(oneTimePreKeyId);
    }

    /**
     * Check if a one-time pre-key has been used
     */
    isOneTimePreKeyUsed(oneTimePreKeyId) {
        return this.usedOneTimePreKeys.has(oneTimePreKeyId);
    }

    /**
     * Clear all stored bundles (logout)
     */
    clear() {
        this.bundles.clear();
        this.usedOneTimePreKeys.clear();
    }

    /**
     * Save to storage
     */
    save() {
        const data = {
            bundles: Array.from(this.bundles.entries()).map(([userId, bundle]) => ({
                userId,
                bundle: bundle.serialize()
            })),
            usedKeys: Array.from(this.usedOneTimePreKeys)
        };
        localStorage.setItem('x3dh_key_bundles', JSON.stringify(data));
    }

    /**
     * Load from storage
     */
    load() {
        const data = localStorage.getItem('x3dh_key_bundles');
        if (data) {
            const parsed = JSON.parse(data);
            parsed.bundles.forEach(({ userId, bundle }) => {
                this.bundles.set(userId, X3DHKeyBundle.deserialize(bundle));
            });
            this.usedOneTimePreKeys = new Set(parsed.usedKeys);
        }
    }
}

export default X3DHProtocol;
