/**
 * SnapTalker Encryption Utilities
 * Signal Protocol inspired E2EE implementation
 * Uses Web Crypto API for browser-based encryption
 */

// Check if Web Crypto API is available
const isCryptoAvailable = () => {
    return window.crypto && window.crypto.subtle && window.isSecureContext;
};

// Key generation and management
export const CryptoUtils = {
    /**
     * Generate identity key pair (long-term keys)
     */
    async generateIdentityKeyPair() {
        if (!isCryptoAvailable()) {
            throw new Error('Web Crypto API is not available. Please use HTTPS or localhost.');
        }
        const keyPair = await window.crypto.subtle.generateKey(
            {
                name: 'ECDH',
                namedCurve: 'P-256'
            },
            true,
            ['deriveKey', 'deriveBits']
        );
        return keyPair;
    },

    /**
     * Generate ephemeral key pair (session keys)
     */
    async generateEphemeralKeyPair() {
        return await this.generateIdentityKeyPair();
    },

    /**
     * Generate pre-keys for asynchronous messaging
     */
    async generatePreKeys(count = 100) {
        const preKeys = [];
        for (let i = 0; i < count; i++) {
            const keyPair = await this.generateEphemeralKeyPair();
            preKeys.push({
                id: i,
                publicKey: await this.exportPublicKey(keyPair.publicKey),
                privateKey: keyPair.privateKey // Store securely
            });
        }
        return preKeys;
    },

    /**
     * Export public key to base64
     */
    async exportPublicKey(publicKey) {
        const exported = await window.crypto.subtle.exportKey('raw', publicKey);
        return this.arrayBufferToBase64(exported);
    },

    /**
     * Export private key (for secure storage)
     */
    async exportPrivateKey(privateKey) {
        const exported = await window.crypto.subtle.exportKey('pkcs8', privateKey);
        return this.arrayBufferToBase64(exported);
    },

    /**
     * Import public key from base64
     */
    async importPublicKey(base64Key) {
        const buffer = this.base64ToArrayBuffer(base64Key);
        return await window.crypto.subtle.importKey(
            'raw',
            buffer,
            {
                name: 'ECDH',
                namedCurve: 'P-256'
            },
            true,
            []
        );
    },

    /**
     * Import private key from base64
     */
    async importPrivateKey(base64Key) {
        const buffer = this.base64ToArrayBuffer(base64Key);
        return await window.crypto.subtle.importKey(
            'pkcs8',
            buffer,
            {
                name: 'ECDH',
                namedCurve: 'P-256'
            },
            true,
            ['deriveKey', 'deriveBits']
        );
    },

    /**
     * Derive shared secret using ECDH
     */
    async deriveSharedSecret(privateKey, publicKey) {
        return await window.crypto.subtle.deriveBits(
            {
                name: 'ECDH',
                public: publicKey
            },
            privateKey,
            256
        );
    },

    /**
     * Derive encryption key from shared secret using HKDF
     */
    async deriveMessageKey(sharedSecret, salt, info = 'SnapTalker-MessageKey') {
        // Import shared secret as key
        const baseKey = await window.crypto.subtle.importKey(
            'raw',
            sharedSecret,
            { name: 'HKDF' },
            false,
            ['deriveKey']
        );

        // Derive AES-GCM key
        return await window.crypto.subtle.deriveKey(
            {
                name: 'HKDF',
                hash: 'SHA-256',
                salt: salt,
                info: new TextEncoder().encode(info)
            },
            baseKey,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );
    },

    /**
     * Encrypt message with AES-GCM
     */
    async encryptMessage(messageKey, plaintext) {
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const encoded = new TextEncoder().encode(plaintext);

        const ciphertext = await window.crypto.subtle.encrypt(
            {
                name: 'AES-GCM',
                iv: iv
            },
            messageKey,
            encoded
        );

        return {
            ciphertext: this.arrayBufferToBase64(ciphertext),
            iv: this.arrayBufferToBase64(iv)
        };
    },

    /**
     * Decrypt message with AES-GCM
     */
    async decryptMessage(messageKey, ciphertext, iv) {
        const ciphertextBuffer = this.base64ToArrayBuffer(ciphertext);
        const ivBuffer = this.base64ToArrayBuffer(iv);

        const plaintext = await window.crypto.subtle.decrypt(
            {
                name: 'AES-GCM',
                iv: ivBuffer
            },
            messageKey,
            ciphertextBuffer
        );

        return new TextDecoder().decode(plaintext);
    },

    /**
     * Generate random salt
     */
    generateSalt() {
        const salt = window.crypto.getRandomValues(new Uint8Array(32));
        return this.arrayBufferToBase64(salt);
    },

    /**
     * Hash function (for fingerprints)
     */
    async hash(data) {
        const encoded = new TextEncoder().encode(data);
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', encoded);
        return this.arrayBufferToBase64(hashBuffer);
    },

    /**
     * Generate safety number (fingerprint) for key verification
     */
    async generateSafetyNumber(publicKey1, publicKey2) {
        const combined = publicKey1 + publicKey2;
        const hash = await this.hash(combined);
        // Convert to readable format (like Signal's 60-digit number)
        return hash.substring(0, 60).match(/.{1,5}/g).join(' ');
    },

    // Utility functions
    arrayBufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    },

    base64ToArrayBuffer(base64) {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
    },

    /**
     * Secure random string generator
     */
    generateRandomString(length = 32) {
        const array = new Uint8Array(length);
        window.crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }
};

/**
 * Session Management for Double Ratchet
 */
export class ChatSession {
    constructor(userId, contactId) {
        this.userId = userId;
        this.contactId = contactId;
        this.rootKey = null;
        this.chainKey = null;
        this.messageNumber = 0;
        this.previousChainLength = 0;
    }

    /**
     * Initialize session with shared secret
     */
    async initialize(sharedSecret) {
        const salt = CryptoUtils.generateSalt();
        this.rootKey = await CryptoUtils.deriveMessageKey(
            sharedSecret,
            CryptoUtils.base64ToArrayBuffer(salt),
            'RootKey'
        );
        await this.deriveChainKey();
    }

    /**
     * Derive new chain key (ratchet step)
     */
    async deriveChainKey() {
        const salt = CryptoUtils.generateSalt();
        this.chainKey = await CryptoUtils.deriveMessageKey(
            await window.crypto.subtle.exportKey('raw', this.rootKey),
            CryptoUtils.base64ToArrayBuffer(salt),
            'ChainKey'
        );
    }

    /**
     * Encrypt outgoing message
     */
    async encryptOutgoing(plaintext) {
        const messageKey = this.chainKey; // In real implementation, derive from chain key
        const encrypted = await CryptoUtils.encryptMessage(messageKey, plaintext);

        this.messageNumber++;
        await this.deriveChainKey(); // Ratchet forward

        return {
            ...encrypted,
            messageNumber: this.messageNumber,
            previousChainLength: this.previousChainLength
        };
    }

    /**
     * Decrypt incoming message
     */
    async decryptIncoming(encryptedData) {
        const messageKey = this.chainKey; // In real implementation, derive based on message number
        const plaintext = await CryptoUtils.decryptMessage(
            messageKey,
            encryptedData.ciphertext,
            encryptedData.iv
        );

        await this.deriveChainKey(); // Ratchet forward

        return plaintext;
    }

    /**
     * Save session to secure storage
     */
    async saveToStorage() {
        // In production, use IndexedDB with encryption
        const sessionData = {
            userId: this.userId,
            contactId: this.contactId,
            messageNumber: this.messageNumber,
            previousChainLength: this.previousChainLength
            // Keys would be stored in OS Keystore in native apps
        };
        localStorage.setItem(`session_${this.userId}_${this.contactId}`, JSON.stringify(sessionData));
    }

    /**
     * Load session from secure storage
     */
    static async loadFromStorage(userId, contactId) {
        const sessionData = localStorage.getItem(`session_${userId}_${contactId}`);
        if (!sessionData) return null;

        const data = JSON.parse(sessionData);
        const session = new ChatSession(userId, contactId);
        session.messageNumber = data.messageNumber;
        session.previousChainLength = data.previousChainLength;
        // Load keys from secure storage
        return session;
    }
}

/**
 * Encrypted Storage Manager
 */
export const SecureStorage = {
    /**
     * Store encrypted data
     */
    async setItem(key, value, password) {
        const salt = CryptoUtils.generateSalt();
        const keyMaterial = await this.deriveKeyFromPassword(password, salt);
        const encrypted = await CryptoUtils.encryptMessage(keyMaterial, JSON.stringify(value));

        localStorage.setItem(key, JSON.stringify({
            ...encrypted,
            salt
        }));
    },

    /**
     * Retrieve and decrypt data
     */
    async getItem(key, password) {
        const stored = localStorage.getItem(key);
        if (!stored) return null;

        const data = JSON.parse(stored);
        const keyMaterial = await this.deriveKeyFromPassword(password, data.salt);
        const decrypted = await CryptoUtils.decryptMessage(
            keyMaterial,
            data.ciphertext,
            data.iv
        );

        return JSON.parse(decrypted);
    },

    /**
     * Derive key from password
     */
    async deriveKeyFromPassword(password, salt) {
        const encoder = new TextEncoder();
        const keyMaterial = await window.crypto.subtle.importKey(
            'raw',
            encoder.encode(password),
            { name: 'PBKDF2' },
            false,
            ['deriveKey']
        );

        return await window.crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: CryptoUtils.base64ToArrayBuffer(salt),
                iterations: 100000,
                hash: 'SHA-256'
            },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );
    },

    /**
     * Clear all encrypted storage
     */
    clearAll() {
        localStorage.clear();
    }
};

/**
 * Message Queue for offline support
 */
export class OfflineMessageQueue {
    constructor() {
        this.queue = this.loadQueue();
    }

    /**
     * Add message to queue
     */
    async enqueue(message) {
        this.queue.push({
            ...message,
            timestamp: Date.now(),
            attempts: 0
        });
        this.saveQueue();
    }

    /**
     * Get pending messages
     */
    getPending() {
        return this.queue;
    }

    /**
     * Remove message from queue
     */
    dequeue(messageId) {
        this.queue = this.queue.filter(msg => msg.id !== messageId);
        this.saveQueue();
    }

    /**
     * Increment retry attempt
     */
    incrementAttempt(messageId) {
        const message = this.queue.find(msg => msg.id === messageId);
        if (message) {
            message.attempts++;
            this.saveQueue();
        }
    }

    loadQueue() {
        const stored = localStorage.getItem('offline_message_queue');
        return stored ? JSON.parse(stored) : [];
    }

    saveQueue() {
        localStorage.setItem('offline_message_queue', JSON.stringify(this.queue));
    }

    clearQueue() {
        this.queue = [];
        localStorage.removeItem('offline_message_queue');
    }
}

export default {
    CryptoUtils,
    ChatSession,
    SecureStorage,
    OfflineMessageQueue
};
