/**
 * Business API for OTP and Notifications
 * Allows businesses to send OTP and transactional messages
 */

import axios from 'axios';

const BUSINESS_API_BASE = process.env.VITE_BUSINESS_API_URL || 'http://localhost:8080/api/business';

export class BusinessAPIClient {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.client = axios.create({
            baseURL: BUSINESS_API_BASE,
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            }
        });
    }

    /**
     * Send OTP message
     * @param {Object} params - OTP parameters
     * @param {string} params.phone - Recipient phone number
     * @param {string} params.otp - OTP code
     * @param {string} params.template - Template ID
     * @param {number} params.expiryMinutes - OTP expiry in minutes
     */
    async sendOTP({ phone, otp, template = 'default', expiryMinutes = 10 }) {
        try {
            const response = await this.client.post('/otp/send', {
                phone,
                otp,
                template,
                expiryMinutes
            });

            return {
                success: true,
                messageId: response.data.messageId,
                status: response.data.status,
                deliveredAt: response.data.deliveredAt
            };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.message || error.message
            };
        }
    }

    /**
     * Verify OTP
     * @param {Object} params - Verification parameters
     * @param {string} params.phone - Phone number
     * @param {string} params.otp - OTP to verify
     * @param {string} params.sessionId - Session ID from sendOTP
     */
    async verifyOTP({ phone, otp, sessionId }) {
        try {
            const response = await this.client.post('/otp/verify', {
                phone,
                otp,
                sessionId
            });

            return {
                success: true,
                verified: response.data.verified,
                attemptsRemaining: response.data.attemptsRemaining
            };
        } catch (error) {
            return {
                success: false,
                verified: false,
                error: error.response?.data?.message || error.message
            };
        }
    }

    /**
     * Send transactional notification
     * @param {Object} params - Notification parameters
     * @param {string} params.phone - Recipient phone number
     * @param {string} params.message - Message content
     * @param {string} params.type - Notification type (order, payment, alert, etc.)
     * @param {Object} params.metadata - Additional metadata
     */
    async sendNotification({ phone, message, type = 'transactional', metadata = {} }) {
        try {
            const response = await this.client.post('/notifications/send', {
                phone,
                message,
                type,
                metadata
            });

            return {
                success: true,
                messageId: response.data.messageId,
                status: response.data.status
            };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.message || error.message
            };
        }
    }

    /**
     * Send bulk notifications
     * @param {Array} messages - Array of message objects
     */
    async sendBulkNotifications(messages) {
        try {
            const response = await this.client.post('/notifications/bulk', {
                messages
            });

            return {
                success: true,
                totalSent: response.data.totalSent,
                failed: response.data.failed,
                results: response.data.results
            };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.message || error.message
            };
        }
    }

    /**
     * Get message delivery status
     * @param {string} messageId - Message ID
     */
    async getMessageStatus(messageId) {
        try {
            const response = await this.client.get(`/messages/${messageId}/status`);

            return {
                success: true,
                status: response.data.status,
                deliveredAt: response.data.deliveredAt,
                readAt: response.data.readAt,
                error: response.data.error
            };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.message || error.message
            };
        }
    }

    /**
     * Get API usage statistics
     */
    async getUsageStats() {
        try {
            const response = await this.client.get('/stats/usage');

            return {
                success: true,
                messagesSent: response.data.messagesSent,
                messagesDelivered: response.data.messagesDelivered,
                messagesFailed: response.data.messagesFailed,
                quota: response.data.quota,
                quotaUsed: response.data.quotaUsed
            };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.message || error.message
            };
        }
    }

    /**
     * Configure webhook for delivery callbacks
     * @param {string} webhookUrl - Webhook URL
     * @param {Array} events - Events to subscribe to
     */
    async configureWebhook(webhookUrl, events = ['delivered', 'read', 'failed']) {
        try {
            const response = await this.client.post('/webhooks/configure', {
                url: webhookUrl,
                events
            });

            return {
                success: true,
                webhookId: response.data.webhookId
            };
        } catch (error) {
            return {
                success: false,
                error: error.response?.data?.message || error.message
            };
        }
    }
}

/**
 * OTP Template Manager
 */
export const OTP_TEMPLATES = {
    default: {
        id: 'default',
        message: 'Your OTP is {otp}. Valid for {expiry} minutes. Do not share this with anyone.'
    },
    login: {
        id: 'login',
        message: 'Your SnapTalker login OTP is {otp}. Valid for {expiry} minutes.'
    },
    registration: {
        id: 'registration',
        message: 'Welcome to SnapTalker! Your verification code is {otp}. Valid for {expiry} minutes.'
    },
    transaction: {
        id: 'transaction',
        message: 'Your transaction verification code is {otp}. This code is valid for {expiry} minutes.'
    },
    reset_password: {
        id: 'reset_password',
        message: 'Your password reset code is {otp}. Valid for {expiry} minutes. If you did not request this, please ignore.'
    }
};

/**
 * Notification Types
 */
export const NOTIFICATION_TYPES = {
    ORDER_CONFIRMATION: 'order_confirmation',
    PAYMENT_SUCCESS: 'payment_success',
    PAYMENT_FAILED: 'payment_failed',
    DELIVERY_UPDATE: 'delivery_update',
    APPOINTMENT_REMINDER: 'appointment_reminder',
    ACCOUNT_ALERT: 'account_alert',
    VERIFICATION: 'verification',
    TRANSACTIONAL: 'transactional'
};

/**
 * Validate phone number format
 */
export function validatePhoneNumber(phone) {
    // Indian phone number validation
    const indianPattern = /^(\+91)?[6-9]\d{9}$/;
    return indianPattern.test(phone.replace(/\s/g, ''));
}

/**
 * Format phone number for API
 */
export function formatPhoneNumber(phone) {
    // Remove spaces and special characters
    let formatted = phone.replace(/[\s\-\(\)]/g, '');

    // Add +91 if not present
    if (!formatted.startsWith('+91') && !formatted.startsWith('91')) {
        formatted = '+91' + formatted;
    } else if (formatted.startsWith('91')) {
        formatted = '+' + formatted;
    }

    return formatted;
}

/**
 * Generate OTP
 */
export function generateOTP(length = 6) {
    const digits = '0123456789';
    let otp = '';

    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * digits.length);
        otp += digits[randomIndex];
    }

    return otp;
}

/**
 * Example usage for businesses
 */
export const BUSINESS_API_EXAMPLES = {
    sendOTP: `
// Initialize the client with your API key
const client = new BusinessAPIClient('your-api-key');

// Send OTP
const result = await client.sendOTP({
  phone: '+919876543210',
  otp: '123456',
  template: 'login',
  expiryMinutes: 10
});

console.log(result);
// { success: true, messageId: 'msg_123', status: 'sent' }
`,

    verifyOTP: `
// Verify OTP
const result = await client.verifyOTP({
  phone: '+919876543210',
  otp: '123456',
  sessionId: 'sess_123'
});

console.log(result);
// { success: true, verified: true, attemptsRemaining: 2 }
`,

    sendNotification: `
// Send transactional notification
const result = await client.sendNotification({
  phone: '+919876543210',
  message: 'Your order #12345 has been shipped!',
  type: 'order_confirmation',
  metadata: { orderId: '12345', trackingId: 'TRACK123' }
});

console.log(result);
// { success: true, messageId: 'msg_456', status: 'delivered' }
`,

    bulkNotifications: `
// Send bulk notifications
const result = await client.sendBulkNotifications([
  { phone: '+919876543210', message: 'Sale announcement', type: 'promotional' },
  { phone: '+919876543211', message: 'Sale announcement', type: 'promotional' }
]);

console.log(result);
// { success: true, totalSent: 2, failed: 0 }
`
};
