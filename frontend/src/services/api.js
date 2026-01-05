import axios from 'axios';

// Production: Use environment variable or construct HTTPS URL based on current location
const getApiUrl = () => {
    // If environment variable is set, use it
    if (import.meta.env.VITE_API_URL) {
        return import.meta.env.VITE_API_URL;
    }

    // For production on Vercel, use HTTPS with same hostname
    if (window.location.hostname === 'snaptalker.vercel.app' || window.location.protocol === 'https:') {
        return `${window.location.protocol}//${window.location.hostname}/api/v1`;
    }

    // For local development
    return `http://${window.location.hostname}:8080/api/v1`;
};

const API_BASE_URL = getApiUrl();

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle token refresh
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;
            const refreshToken = localStorage.getItem('refreshToken');
            if (refreshToken) {
                try {
                    const { data } = await axios.post(`${API_BASE_URL}/auth/refresh`, {
                        refreshToken: refreshToken, // Changed to camelCase for Go backend
                    });
                    localStorage.setItem('accessToken', data.token); // Changed from access_token
                    api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
                    return api(originalRequest);
                } catch (err) {
                    localStorage.clear();
                    window.location.href = '/login';
                }
            }
        }
        return Promise.reject(error);
    }
);

export const authAPI = {
    register: (data) => api.post('/auth/register', data),
    login: (data) => api.post('/auth/login', data),
    logout: () => api.post('/auth/logout'),
    getCurrentUser: () => api.get('/users/me'),
};

export const postsAPI = {
    getFeed: (page = 1, limit = 20) => api.get(`/posts/feed/timeline?page=${page}&limit=${limit}`),
    createPost: (data) => api.post('/posts', data),
    uploadImage: (formData) => api.post('/posts/upload/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    }),
    getPost: (id) => api.get(`/posts/${id}`),
    likePost: (id) => api.post(`/posts/${id}/like`),
    unlikePost: (id) => api.delete(`/posts/${id}/like`),
    addComment: (id, content) => api.post(`/posts/${id}/comments`, { content }),
    getComments: (id) => api.get(`/posts/${id}/comments`),
    deletePost: (id) => api.delete(`/posts/${id}`),
};

export const usersAPI = {
    getProfile: (userId) => api.get(`/users/${userId}`),
    updateProfile: (data) => api.put('/users/me', data),
    uploadAvatar: (formData) => api.post('/users/me/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    }),
    follow: (userId) => api.post('/users/follow', { following_id: userId }),
    unfollow: (userId) => api.delete(`/users/follow/${userId}`),
    getUserPosts: (userId, page = 1) => api.get(`/posts/user/${userId}/posts?page=${page}`),
};

export const chatAPI = {
    sendMessage: (data) => api.post('/chat/messages', data),
    getConversation: (userId, page = 1) => api.get(`/chat/conversations/${userId}?page=${page}`),
    markAsRead: (messageId) => api.put(`/chat/messages/${messageId}/read`),
    getUnreadCount: () => api.get('/chat/unread-count'),
    blockUser: (userId) => api.post('/chat/block', { blocked_id: userId }),
    unblockUser: (userId) => api.delete(`/chat/block/${userId}`),
};

export default api;
