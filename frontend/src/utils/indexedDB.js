// IndexedDB wrapper for message persistence
const DB_NAME = 'SnapTalkerDB';
const DB_VERSION = 1;
const STORES = {
    MESSAGES: 'messages',
    CHATS: 'chats',
    KEYS: 'keys',
    SESSIONS: 'sessions',
    MEDIA: 'media'
};

class IndexedDBManager {
    constructor() {
        this.db = null;
    }

    // Initialize database
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Messages store
                if (!db.objectStoreNames.contains(STORES.MESSAGES)) {
                    const messagesStore = db.createObjectStore(STORES.MESSAGES, {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    messagesStore.createIndex('chatId', 'chatId', { unique: false });
                    messagesStore.createIndex('timestamp', 'timestamp', { unique: false });
                    messagesStore.createIndex('sender', 'senderId', { unique: false });
                }

                // Chats store
                if (!db.objectStoreNames.contains(STORES.CHATS)) {
                    const chatsStore = db.createObjectStore(STORES.CHATS, {
                        keyPath: 'id'
                    });
                    chatsStore.createIndex('lastMessage', 'lastMessageTime', { unique: false });
                }

                // Keys store (encrypted backup)
                if (!db.objectStoreNames.contains(STORES.KEYS)) {
                    db.createObjectStore(STORES.KEYS, { keyPath: 'userId' });
                }

                // Sessions store
                if (!db.objectStoreNames.contains(STORES.SESSIONS)) {
                    const sessionsStore = db.createObjectStore(STORES.SESSIONS, {
                        keyPath: 'contactId'
                    });
                    sessionsStore.createIndex('userId', 'userId', { unique: false });
                }

                // Media store (for offline access)
                if (!db.objectStoreNames.contains(STORES.MEDIA)) {
                    const mediaStore = db.createObjectStore(STORES.MEDIA, {
                        keyPath: 'id'
                    });
                    mediaStore.createIndex('messageId', 'messageId', { unique: false });
                }
            };
        });
    }

    // Save message
    async saveMessage(message) {
        const tx = this.db.transaction(STORES.MESSAGES, 'readwrite');
        const store = tx.objectStore(STORES.MESSAGES);

        const messageData = {
            ...message,
            timestamp: message.timestamp || Date.now(),
            synced: message.synced || false
        };

        return new Promise((resolve, reject) => {
            const request = store.put(messageData);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Get messages for a chat
    async getMessages(chatId, limit = 50, offset = 0) {
        const tx = this.db.transaction(STORES.MESSAGES, 'readonly');
        const store = tx.objectStore(STORES.MESSAGES);
        const index = store.index('chatId');

        return new Promise((resolve, reject) => {
            const messages = [];
            const request = index.openCursor(IDBKeyRange.only(chatId), 'prev');
            let count = 0;
            let skipped = 0;

            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor && count < limit) {
                    if (skipped < offset) {
                        skipped++;
                        cursor.continue();
                        return;
                    }
                    messages.push(cursor.value);
                    count++;
                    cursor.continue();
                } else {
                    resolve(messages);
                }
            };

            request.onerror = () => reject(request.error);
        });
    }

    // Get all unsynced messages
    async getUnsyncedMessages() {
        const tx = this.db.transaction(STORES.MESSAGES, 'readonly');
        const store = tx.objectStore(STORES.MESSAGES);

        return new Promise((resolve, reject) => {
            const messages = [];
            const request = store.openCursor();

            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    if (!cursor.value.synced) {
                        messages.push(cursor.value);
                    }
                    cursor.continue();
                } else {
                    resolve(messages);
                }
            };

            request.onerror = () => reject(request.error);
        });
    }

    // Mark message as synced
    async markMessageSynced(messageId) {
        const tx = this.db.transaction(STORES.MESSAGES, 'readwrite');
        const store = tx.objectStore(STORES.MESSAGES);

        return new Promise((resolve, reject) => {
            const request = store.get(messageId);

            request.onsuccess = () => {
                const message = request.result;
                if (message) {
                    message.synced = true;
                    const updateRequest = store.put(message);
                    updateRequest.onsuccess = () => resolve();
                    updateRequest.onerror = () => reject(updateRequest.error);
                } else {
                    resolve();
                }
            };

            request.onerror = () => reject(request.error);
        });
    }

    // Save chat
    async saveChat(chat) {
        const tx = this.db.transaction(STORES.CHATS, 'readwrite');
        const store = tx.objectStore(STORES.CHATS);

        return new Promise((resolve, reject) => {
            const request = store.put(chat);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Get all chats
    async getAllChats() {
        const tx = this.db.transaction(STORES.CHATS, 'readonly');
        const store = tx.objectStore(STORES.CHATS);
        const index = store.index('lastMessage');

        return new Promise((resolve, reject) => {
            const chats = [];
            const request = index.openCursor(null, 'prev');

            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    chats.push(cursor.value);
                    cursor.continue();
                } else {
                    resolve(chats);
                }
            };

            request.onerror = () => reject(request.error);
        });
    }

    // Save session
    async saveSession(contactId, sessionData) {
        const tx = this.db.transaction(STORES.SESSIONS, 'readwrite');
        const store = tx.objectStore(STORES.SESSIONS);

        const session = {
            contactId,
            ...sessionData,
            lastUpdated: Date.now()
        };

        return new Promise((resolve, reject) => {
            const request = store.put(session);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Get session
    async getSession(contactId) {
        const tx = this.db.transaction(STORES.SESSIONS, 'readonly');
        const store = tx.objectStore(STORES.SESSIONS);

        return new Promise((resolve, reject) => {
            const request = store.get(contactId);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Save media (for offline viewing)
    async saveMedia(mediaId, messageId, blob, type) {
        const tx = this.db.transaction(STORES.MEDIA, 'readwrite');
        const store = tx.objectStore(STORES.MEDIA);

        const media = {
            id: mediaId,
            messageId,
            blob,
            type,
            timestamp: Date.now()
        };

        return new Promise((resolve, reject) => {
            const request = store.put(media);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Get media
    async getMedia(mediaId) {
        const tx = this.db.transaction(STORES.MEDIA, 'readonly');
        const store = tx.objectStore(STORES.MEDIA);

        return new Promise((resolve, reject) => {
            const request = store.get(mediaId);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Delete message (for disappearing messages)
    async deleteMessage(messageId) {
        const tx = this.db.transaction(STORES.MESSAGES, 'readwrite');
        const store = tx.objectStore(STORES.MESSAGES);

        return new Promise((resolve, reject) => {
            const request = store.delete(messageId);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // Delete messages older than timestamp (for cleanup)
    async deleteOldMessages(timestamp) {
        const tx = this.db.transaction(STORES.MESSAGES, 'readwrite');
        const store = tx.objectStore(STORES.MESSAGES);
        const index = store.index('timestamp');

        return new Promise((resolve, reject) => {
            const range = IDBKeyRange.upperBound(timestamp);
            const request = index.openCursor(range);
            const deleted = [];

            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    deleted.push(cursor.value.id);
                    cursor.delete();
                    cursor.continue();
                } else {
                    resolve(deleted);
                }
            };

            request.onerror = () => reject(request.error);
        });
    }

    // Clear all data (for logout)
    async clearAll() {
        const stores = Object.values(STORES);
        const promises = stores.map(storeName => {
            return new Promise((resolve, reject) => {
                const tx = this.db.transaction(storeName, 'readwrite');
                const store = tx.objectStore(storeName);
                const request = store.clear();
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        });

        return Promise.all(promises);
    }

    // Search messages
    async searchMessages(query, chatId = null) {
        const tx = this.db.transaction(STORES.MESSAGES, 'readonly');
        const store = tx.objectStore(STORES.MESSAGES);

        return new Promise((resolve, reject) => {
            const messages = [];
            const request = store.openCursor();
            const lowerQuery = query.toLowerCase();

            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    const message = cursor.value;
                    const content = (message.content || '').toLowerCase();

                    if (content.includes(lowerQuery)) {
                        if (!chatId || message.chatId === chatId) {
                            messages.push(message);
                        }
                    }
                    cursor.continue();
                } else {
                    resolve(messages);
                }
            };

            request.onerror = () => reject(request.error);
        });
    }

    // Get database stats
    async getStats() {
        const stores = Object.values(STORES);
        const stats = {};

        for (const storeName of stores) {
            const tx = this.db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const count = await new Promise((resolve, reject) => {
                const request = store.count();
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            });
            stats[storeName] = count;
        }

        return stats;
    }
}

// Export singleton instance
const dbManager = new IndexedDBManager();

// Auto-initialize
if (typeof window !== 'undefined') {
    dbManager.init().catch(err => console.error('Failed to initialize IndexedDB:', err));
}

export default dbManager;
