/**
 * Multi-Device Support
 * - QR code pairing
 * - Session synchronization
 * - Device management
 */

import QRCode from 'qrcode';
import { CryptoUtils } from './encryption';

export class MultiDeviceManager {
    constructor() {
        this.devices = new Map();
        this.currentDevice = this.loadCurrentDevice();
        this.syncQueue = [];
    }

    /**
     * Load current device info from storage
     */
    loadCurrentDevice() {
        const stored = localStorage.getItem('currentDevice');
        if (stored) {
            return JSON.parse(stored);
        }

        // Generate new device ID
        const deviceId = this.generateDeviceId();
        const device = {
            id: deviceId,
            name: this.getDeviceName(),
            platform: this.getPlatform(),
            createdAt: Date.now(),
            lastSeen: Date.now()
        };

        localStorage.setItem('currentDevice', JSON.stringify(device));
        return device;
    }

    /**
     * Generate unique device ID
     */
    generateDeviceId() {
        const array = new Uint8Array(16);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    /**
     * Get device name from user agent
     */
    getDeviceName() {
        const ua = navigator.userAgent;
        if (/iPhone/i.test(ua)) return 'iPhone';
        if (/iPad/i.test(ua)) return 'iPad';
        if (/Android/i.test(ua)) return 'Android Device';
        if (/Windows/i.test(ua)) return 'Windows PC';
        if (/Mac/i.test(ua)) return 'Mac';
        if (/Linux/i.test(ua)) return 'Linux PC';
        return 'Unknown Device';
    }

    /**
     * Get platform type
     */
    getPlatform() {
        const ua = navigator.userAgent;
        if (/iPhone|iPad/i.test(ua)) return 'ios';
        if (/Android/i.test(ua)) return 'android';
        if (/Windows/i.test(ua)) return 'windows';
        if (/Mac/i.test(ua)) return 'macos';
        if (/Linux/i.test(ua)) return 'linux';
        return 'web';
    }

    /**
     * Generate pairing QR code
     * @returns {Promise<{qrCode: string, pairingData: Object}>}
     */
    async generatePairingQRCode(identityKey) {
        // Generate temporary pairing key
        const pairingKey = await CryptoUtils.generateKeyPair();
        const pairingKeyPublic = await CryptoUtils.exportKey(pairingKey.publicKey);

        // Create pairing data
        const pairingData = {
            deviceId: this.currentDevice.id,
            deviceName: this.currentDevice.name,
            platform: this.currentDevice.platform,
            pairingKey: pairingKeyPublic,
            identityKey: await CryptoUtils.exportKey(identityKey),
            timestamp: Date.now(),
            expiresAt: Date.now() + (5 * 60 * 1000) // 5 minutes
        };

        // Store pairing session
        const sessionId = this.generateDeviceId();
        localStorage.setItem(`pairing_${sessionId}`, JSON.stringify({
            pairingKey,
            pairingData,
            expiresAt: pairingData.expiresAt
        }));

        // Generate QR code
        const qrData = JSON.stringify({
            version: 1,
            sessionId,
            data: pairingData
        });

        const qrCode = await QRCode.toDataURL(qrData, {
            errorCorrectionLevel: 'H',
            width: 300,
            margin: 2
        });

        return { qrCode, pairingData, sessionId };
    }

    /**
     * Scan and process pairing QR code
     * @param {string} qrData - Scanned QR code data
     * @returns {Promise<Object>}
     */
    async processPairingQRCode(qrData) {
        try {
            const { version, sessionId, data } = JSON.parse(qrData);

            if (version !== 1) {
                throw new Error('Unsupported pairing version');
            }

            // Check expiration
            if (data.expiresAt < Date.now()) {
                throw new Error('Pairing code has expired');
            }

            // Verify the pairing key
            const pairingKey = await CryptoUtils.importKey(data.pairingKey, 'public');
            const identityKey = await CryptoUtils.importKey(data.identityKey, 'public');

            return {
                sessionId,
                deviceId: data.deviceId,
                deviceName: data.deviceName,
                platform: data.platform,
                pairingKey,
                identityKey,
                timestamp: data.timestamp
            };
        } catch (error) {
            console.error('Failed to process pairing QR code:', error);
            throw new Error('Invalid pairing code');
        }
    }

    /**
     * Complete device pairing
     */
    async completePairing(pairingInfo, encryptionKeys) {
        const newDevice = {
            id: pairingInfo.deviceId,
            name: pairingInfo.deviceName,
            platform: pairingInfo.platform,
            pairedAt: Date.now(),
            lastSeen: Date.now(),
            identityKey: pairingInfo.identityKey,
            verified: true
        };

        this.devices.set(newDevice.id, newDevice);
        this.saveDevices();

        // Sync encryption keys to new device
        await this.syncKeysToDevice(newDevice.id, encryptionKeys);

        return newDevice;
    }

    /**
     * Sync encryption keys to a device
     */
    async syncKeysToDevice(deviceId, keys) {
        // Encrypt keys for the target device
        const device = this.devices.get(deviceId);
        if (!device) {
            throw new Error('Device not found');
        }

        // In production, this would encrypt keys with the device's public key
        // and send via backend
        const syncData = {
            identityKey: keys.identityKey,
            signedPreKey: keys.signedPreKey,
            oneTimePreKeys: keys.oneTimePreKeys,
            sessions: keys.sessions,
            timestamp: Date.now()
        };

        console.log('Syncing keys to device:', deviceId, syncData);
        return syncData;
    }

    /**
     * Get all paired devices
     */
    getDevices() {
        return Array.from(this.devices.values()).sort((a, b) => b.lastSeen - a.lastSeen);
    }

    /**
     * Remove a device
     */
    removeDevice(deviceId) {
        if (deviceId === this.currentDevice.id) {
            throw new Error('Cannot remove current device');
        }

        this.devices.delete(deviceId);
        this.saveDevices();
    }

    /**
     * Update device last seen timestamp
     */
    updateLastSeen(deviceId) {
        const device = this.devices.get(deviceId);
        if (device) {
            device.lastSeen = Date.now();
            this.saveDevices();
        }
    }

    /**
     * Save devices to storage
     */
    saveDevices() {
        const devicesArray = Array.from(this.devices.entries());
        localStorage.setItem('pairedDevices', JSON.stringify(devicesArray));
    }

    /**
     * Load devices from storage
     */
    loadDevices() {
        const stored = localStorage.getItem('pairedDevices');
        if (stored) {
            const devicesArray = JSON.parse(stored);
            this.devices = new Map(devicesArray);
        }
    }

    /**
     * Queue a sync operation
     */
    queueSync(operation) {
        this.syncQueue.push({
            ...operation,
            timestamp: Date.now(),
            deviceId: this.currentDevice.id
        });

        // In production, this would be sent to backend for distribution
        this.processSyncQueue();
    }

    /**
     * Process queued sync operations
     */
    async processSyncQueue() {
        if (this.syncQueue.length === 0) return;

        // In production, batch and send to backend
        console.log('Processing sync queue:', this.syncQueue);

        // Clear queue
        this.syncQueue = [];
    }

    /**
     * Rename a device
     */
    renameDevice(deviceId, newName) {
        const device = this.devices.get(deviceId);
        if (device) {
            device.name = newName;
            this.saveDevices();
        }

        if (deviceId === this.currentDevice.id) {
            this.currentDevice.name = newName;
            localStorage.setItem('currentDevice', JSON.stringify(this.currentDevice));
        }
    }

    /**
     * Get device info
     */
    getDevice(deviceId) {
        return this.devices.get(deviceId);
    }

    /**
     * Check if device is verified
     */
    isDeviceVerified(deviceId) {
        const device = this.devices.get(deviceId);
        return device?.verified === true;
    }

    /**
     * Mark device as verified
     */
    verifyDevice(deviceId) {
        const device = this.devices.get(deviceId);
        if (device) {
            device.verified = true;
            this.saveDevices();
        }
    }
}

/**
 * Device sync operations
 */
export const SYNC_OPERATIONS = {
    NEW_MESSAGE: 'new_message',
    MESSAGE_READ: 'message_read',
    MESSAGE_DELETED: 'message_deleted',
    CONTACT_ADDED: 'contact_added',
    CONTACT_BLOCKED: 'contact_blocked',
    SETTINGS_CHANGED: 'settings_changed',
    KEY_ROTATION: 'key_rotation'
};

/**
 * Create a sync operation
 */
export function createSyncOperation(type, data) {
    return {
        type,
        data,
        id: crypto.randomUUID(),
        timestamp: Date.now()
    };
}

// Singleton instance
export const multiDeviceManager = new MultiDeviceManager();
multiDeviceManager.loadDevices();
