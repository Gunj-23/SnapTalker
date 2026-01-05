import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Phone, Lock, UserPlus, Sparkles, Globe, LogIn } from 'lucide-react';

export default function Login() {
    const [credentials, setCredentials] = useState({ phone: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(credentials);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.error || 'लॉगिन विफल रहा। कृपया पुनः प्रयास करें।');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#0d1418] via-[#1a2730] to-[#0d1418]">
            <div className="max-w-md w-full">
                {/* Logo and Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-[#00a884] to-[#008069] rounded-3xl mb-4 shadow-2xl shadow-[#00a884]/30 animate-pulse">
                        <Sparkles className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-5xl font-bold bg-gradient-to-r from-[#00a884] to-[#25d366] bg-clip-text text-transparent mb-2">
                        SnapTalker
                    </h1>
                    <p className="text-[#8696a0] flex items-center justify-center gap-2 text-lg">
                        Secure. Fast. Private.
                        <Globe className="w-5 h-5 text-[#00a884]" />
                    </p>
                </div>

                {/* Login Card */}
                <div className="bg-[#1f2c33] rounded-3xl shadow-2xl p-8 border border-[#2a3942]">
                    {error && (
                        <div className="bg-[#7c2d12]/20 border-l-4 border-[#ef4444] p-4 mb-6 rounded-lg">
                            <p className="text-[#fca5a5] text-sm">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-[#e9edef] mb-2">
                                Phone Number
                            </label>
                            <div className="relative group">
                                <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#8696a0] w-5 h-5 transition-colors group-focus-within:text-[#00a884]" />
                                <input
                                    type="tel"
                                    value={credentials.phone}
                                    onChange={(e) => setCredentials({ ...credentials, phone: e.target.value })}
                                    className="w-full pl-12 pr-4 py-3.5 bg-[#2a3942] text-[#e9edef] border-2 border-transparent rounded-xl focus:border-[#00a884] focus:bg-[#111b21] outline-none transition-all placeholder-[#8696a0]"
                                    placeholder="+91 1234567890"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-[#e9edef] mb-2">
                                Password
                            </label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#8696a0] w-5 h-5 transition-colors group-focus-within:text-[#00a884]" />
                                <input
                                    type="password"
                                    value={credentials.password}
                                    onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                                    className="w-full pl-12 pr-4 py-3.5 bg-[#2a3942] text-[#e9edef] border-2 border-transparent rounded-xl focus:border-[#00a884] focus:bg-[#111b21] outline-none transition-all placeholder-[#8696a0]"
                                    placeholder="Enter your password"
                                    required
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-end">
                            <button
                                type="button"
                                onClick={() => navigate('/forgot-password')}
                                className="text-sm text-[#00a884] hover:text-[#06cf9c] font-medium transition-colors"
                            >
                                Forgot password?
                            </button>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-[#00a884] to-[#25d366] text-white font-semibold py-3.5 px-6 rounded-xl hover:shadow-xl hover:shadow-[#00a884]/20 transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Logging in...
                                </>
                            ) : (
                                <>
                                    <LogIn className="w-5 h-5" />
                                    Log In
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-[#8696a0]">
                            New to SnapTalker?{' '}
                            <Link to="/register" className="text-[#00a884] hover:text-[#06cf9c] font-semibold inline-flex items-center gap-1 transition-colors">
                                Create account
                                <UserPlus className="w-4 h-4" />
                            </Link>
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-8 text-center">
                    <p className="text-xs text-[#667781] flex items-center justify-center gap-2">
                        <Lock className="w-3 h-3" />
                        End-to-end encrypted
                    </p>
                </div>
            </div>
        </div>
    );
}
