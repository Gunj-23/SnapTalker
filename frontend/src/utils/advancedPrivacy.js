/**
 * Advanced Privacy Features
 * - Self-destruct messages
 * - View-once media
 * - Message revocation
 * - Screenshot detection
 */

export class SelfDestructManager {
    constructor() {
        this.timers = new Map();
        this.destructedMessages = new Set();
    }

    /**
     * Schedule a message for self-destruction
     * @param {string} messageId - Unique message identifier
     * @param {number} seconds - Seconds until destruction
     * @param {function} onDestruct - Callback when message is destructed
     */
    scheduleDestruct(messageId, seconds, onDestruct) {
        // Clear existing timer if any
        this.cancelDestruct(messageId);

        const timerId = setTimeout(() => {
            this.destructMessage(messageId, onDestruct);
        }, seconds * 1000);

        this.timers.set(messageId, {
            timerId,
            scheduledAt: Date.now(),
            destructAt: Date.now() + (seconds * 1000)
        });
    }

    /**
     * Manually destruct a message immediately
     */
    destructMessage(messageId, onDestruct) {
        this.destructedMessages.add(messageId);

        if (this.timers.has(messageId)) {
            const { timerId } = this.timers.get(messageId);
            clearTimeout(timerId);
            this.timers.delete(messageId);
        }

        if (onDestruct) {
            onDestruct(messageId);
        }
    }

    /**
     * Cancel scheduled destruction
     */
    cancelDestruct(messageId) {
        if (this.timers.has(messageId)) {
            const { timerId } = this.timers.get(messageId);
            clearTimeout(timerId);
            this.timers.delete(messageId);
        }
    }

    /**
     * Check if a message has been destructed
     */
    isDestructed(messageId) {
        return this.destructedMessages.has(messageId);
    }

    /**
     * Get remaining time for a message
     */
    getRemainingTime(messageId) {
        if (!this.timers.has(messageId)) return null;

        const { destructAt } = this.timers.get(messageId);
        const remaining = Math.max(0, destructAt - Date.now());
        return Math.ceil(remaining / 1000);
    }

    /**
     * Clear all timers
     */
    clearAll() {
        this.timers.forEach(({ timerId }) => clearTimeout(timerId));
        this.timers.clear();
    }
}

export class ViewOnceManager {
    constructor() {
        this.viewedMedia = new Set();
        this.mediaBlobs = new Map();
    }

    /**
     * Mark media as viewed
     */
    markAsViewed(mediaId) {
        this.viewedMedia.add(mediaId);

        // Revoke blob URL to prevent access
        if (this.mediaBlobs.has(mediaId)) {
            URL.revokeObjectURL(this.mediaBlobs.get(mediaId));
            this.mediaBlobs.delete(mediaId);
        }
    }

    /**
     * Check if media has been viewed
     */
    isViewed(mediaId) {
        return this.viewedMedia.has(mediaId);
    }

    /**
     * Store media blob temporarily
     */
    storeBlobURL(mediaId, blobUrl) {
        this.mediaBlobs.set(mediaId, blobUrl);
    }

    /**
     * Get media blob URL if not viewed
     */
    getBlobURL(mediaId) {
        if (this.isViewed(mediaId)) return null;
        return this.mediaBlobs.get(mediaId);
    }

    /**
     * Clear all stored media
     */
    clearAll() {
        this.mediaBlobs.forEach(blobUrl => URL.revokeObjectURL(blobUrl));
        this.mediaBlobs.clear();
        this.viewedMedia.clear();
    }
}

export class MessageRevocationManager {
    constructor() {
        this.revokedMessages = new Set();
    }

    /**
     * Revoke a message
     * @param {string} messageId - Message to revoke
     * @param {number} sentTimestamp - When the message was sent
     * @param {number} windowMinutes - Time window for revocation (default 60 minutes)
     */
    revokeMessage(messageId, sentTimestamp, windowMinutes = 60) {
        const now = Date.now();
        const timeElapsed = now - sentTimestamp;
        const windowMs = windowMinutes * 60 * 1000;

        if (timeElapsed > windowMs) {
            throw new Error(`Message can only be revoked within ${windowMinutes} minutes of sending`);
        }

        this.revokedMessages.add(messageId);
        return true;
    }

    /**
     * Check if a message has been revoked
     */
    isRevoked(messageId) {
        return this.revokedMessages.has(messageId);
    }

    /**
     * Check if a message can still be revoked
     */
    canRevoke(sentTimestamp, windowMinutes = 60) {
        const now = Date.now();
        const timeElapsed = now - sentTimestamp;
        const windowMs = windowMinutes * 60 * 1000;
        return timeElapsed <= windowMs;
    }

    /**
     * Get remaining revocation time
     */
    getRemainingRevocationTime(sentTimestamp, windowMinutes = 60) {
        const now = Date.now();
        const timeElapsed = now - sentTimestamp;
        const windowMs = windowMinutes * 60 * 1000;
        const remaining = Math.max(0, windowMs - timeElapsed);
        return Math.ceil(remaining / 60000); // Return minutes
    }
}

export class ScreenshotDetector {
    constructor(onScreenshotDetected) {
        this.onScreenshotDetected = onScreenshotDetected;
        this.isActive = false;
    }

    /**
     * Start monitoring for screenshots
     * Note: True screenshot detection is not possible in web browsers
     * This monitors for common screenshot behaviors
     */
    startMonitoring() {
        if (this.isActive) return;
        this.isActive = true;

        // Monitor for keyboard shortcuts
        this.keyboardHandler = (e) => {
            // Windows: Win+Shift+S, PrtScn
            // Mac: Cmd+Shift+4, Cmd+Shift+3
            const isScreenshotKey =
                e.key === 'PrintScreen' ||
                (e.key === 's' && e.shiftKey && (e.metaKey || e.ctrlKey)) ||
                (e.key === '3' && e.shiftKey && e.metaKey) ||
                (e.key === '4' && e.shiftKey && e.metaKey);

            if (isScreenshotKey) {
                this.handlePotentialScreenshot();
            }
        };

        // Monitor for visibility changes (screenshot tools may hide the page)
        this.visibilityHandler = () => {
            if (document.hidden) {
                this.handlePotentialScreenshot();
            }
        };

        document.addEventListener('keydown', this.keyboardHandler);
        document.addEventListener('visibilitychange', this.visibilityHandler);
    }

    /**
     * Stop monitoring
     */
    stopMonitoring() {
        if (!this.isActive) return;
        this.isActive = false;

        document.removeEventListener('keydown', this.keyboardHandler);
        document.removeEventListener('visibilitychange', this.visibilityHandler);
    }

    /**
     * Handle potential screenshot detection
     */
    handlePotentialScreenshot() {
        if (this.onScreenshotDetected) {
            this.onScreenshotDetected({
                timestamp: Date.now(),
                type: 'potential',
                note: 'Screenshot detection is limited in web browsers'
            });
        }
    }
}

/**
 * Timer presets for self-destruct messages
 */
export const DESTRUCT_TIMERS = {
    OFF: null,
    TEN_SECONDS: 10,
    ONE_MINUTE: 60,
    ONE_HOUR: 3600,
    ONE_DAY: 86400,
    ONE_WEEK: 604800
};

/**
 * Format timer duration for display
 */
export function formatTimerDuration(seconds) {
    if (!seconds) return 'Off';
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
    return `${Math.floor(seconds / 604800)}w`;
}

/**
 * Get timer label
 */
export function getTimerLabel(seconds) {
    switch (seconds) {
        case DESTRUCT_TIMERS.TEN_SECONDS:
            return '10 seconds';
        case DESTRUCT_TIMERS.ONE_MINUTE:
            return '1 minute';
        case DESTRUCT_TIMERS.ONE_HOUR:
            return '1 hour';
        case DESTRUCT_TIMERS.ONE_DAY:
            return '1 day';
        case DESTRUCT_TIMERS.ONE_WEEK:
            return '1 week';
        default:
            return 'Off';
    }
}

// Create singleton instances
export const selfDestructManager = new SelfDestructManager();
export const viewOnceManager = new ViewOnceManager();
export const messageRevocationManager = new MessageRevocationManager();
