import React, { createContext, useState, useContext, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('accessToken');
        if (token) {
            fetchCurrentUser();
        } else {
            setLoading(false);
        }
    }, []);

    const fetchCurrentUser = async () => {
        try {
            const { data } = await authAPI.getCurrentUser();
            setUser(data);
        } catch (error) {
            console.error('Failed to fetch user:', error);
            localStorage.clear();
        } finally {
            setLoading(false);
        }
    };

    const login = async (credentials) => {
        const { data } = await authAPI.login(credentials);
        localStorage.setItem('accessToken', data.token);
        localStorage.setItem('refreshToken', data.refreshToken);
        setUser(data.user);
        return data;
    };

    const register = async (userData) => {
        const { data } = await authAPI.register(userData);
        // Registration returns userId and message, need to login after
        return data;
    };

    const logout = async () => {
        try {
            await authAPI.logout();
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            localStorage.clear();
            setUser(null);
            window.location.href = '/login';
        }
    };

    const value = {
        user,
        login,
        register,
        logout,
        loading,
        isAuthenticated: !!user,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};
