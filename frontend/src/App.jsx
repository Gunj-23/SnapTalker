import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Messages from './pages/Messages';
import Calls from './pages/Calls';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import VideoMeeting from './pages/VideoMeeting';
import { Loader2 } from 'lucide-react';

function PrivateRoute({ children }) {
    const { isAuthenticated, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-12 h-12 animate-spin text-saffron" />
            </div>
        );
    }

    return isAuthenticated ? children : <Navigate to="/login" />;
}

function PublicRoute({ children }) {
    const { isAuthenticated, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-12 h-12 animate-spin text-saffron" />
            </div>
        );
    }

    return !isAuthenticated ? children : <Navigate to="/" />;
}

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route
                    path="/login"
                    element={
                        <PublicRoute>
                            <Login />
                        </PublicRoute>
                    }
                />
                <Route
                    path="/register"
                    element={
                        <PublicRoute>
                            <Register />
                        </PublicRoute>
                    }
                />
                <Route
                    path="/forgot-password"
                    element={
                        <PublicRoute>
                            <ForgotPassword />
                        </PublicRoute>
                    }
                />
                <Route
                    path="/"
                    element={
                        <PrivateRoute>
                            <Messages />
                        </PrivateRoute>
                    }
                />
                <Route
                    path="/messages"
                    element={
                        <PrivateRoute>
                            <Messages />
                        </PrivateRoute>
                    }
                />
                <Route
                    path="/profile"
                    element={
                        <PrivateRoute>
                            <Profile />
                        </PrivateRoute>
                    }
                />
                <Route
                    path="/settings"
                    element={
                        <PrivateRoute>
                            <Settings />
                        </PrivateRoute>
                    }
                />
                <Route
                    path="/calls"
                    element={
                        <PrivateRoute>
                            <Calls />
                        </PrivateRoute>
                    }
                />
                <Route
                    path="/meeting/:roomId"
                    element={
                        <PrivateRoute>
                            <VideoMeeting />
                        </PrivateRoute>
                    }
                />
                <Route
                    path="/meeting"
                    element={
                        <PrivateRoute>
                            <VideoMeeting />
                        </PrivateRoute>
                    }
                />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
