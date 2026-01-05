import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, User, UserPlus, Sparkles, Phone, Globe, CheckCircle } from 'lucide-react';
import { CryptoUtils } from '../utils/encryption';

export default function Register() {
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        phone: '',
        password: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { register, login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            let identityKey = 'placeholder-key'; // Default for non-secure contexts

            // Try to generate identity key if Web Crypto API is available
            if (window.crypto && window.crypto.subtle && window.isSecureContext) {
                // Generate identity key pair for Signal Protocol
                const identityKeyPair = await CryptoUtils.generateEphemeralKeyPair();
                identityKey = await CryptoUtils.exportPublicKey(identityKeyPair.publicKey);

                // Store private key in localStorage (in production, use secure storage)
                const privateKey = await CryptoUtils.exportPrivateKey(identityKeyPair.privateKey);
                localStorage.setItem('identityPrivateKey', privateKey);
            } else {
                // Warn user that encryption is not available
                console.warn('⚠️ Web Crypto API not available - E2E encryption disabled. Access via HTTPS for full security.');
                localStorage.setItem('encryptionDisabled', 'true');
            }

            // Add identityKey to registration data
            const registrationData = {
                ...formData,
                identityKey
            };

            const response = await register(registrationData);

            // Show success message with OTP (for development)
            if (response.otp) {
                alert(`Registration successful! OTP for verification: ${response.otp}\n(In production, this will be sent via SMS)`);
            }

            // For now, auto-login after registration
            // In production, redirect to OTP verification page
            await login({ phone: formData.phone, password: formData.password });
            navigate('/');
        } catch (err) {
            console.error('Registration error:', err);
            setError(err.response?.data?.error || 'रजिस्ट्रेशन विफल रहा। कृपया पुनः प्रयास करें।');
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
                        <UserPlus className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-5xl font-bold bg-gradient-to-r from-[#00a884] to-[#25d366] bg-clip-text text-transparent mb-2">
                        Join SnapTalker
                    </h1>
                    <p className="text-[#8696a0] flex items-center justify-center gap-2 text-lg">
                        Create your secure account
                        <CheckCircle className="w-5 h-5 text-[#00a884]" />
                    </p>
                </div>

                {/* Register Card */}
                <div className="bg-[#1f2c33] rounded-3xl shadow-2xl p-8 border border-[#2a3942]">
                    {!window.isSecureContext && (
                        <div className="bg-[#7c2d12]/20 border-l-4 border-[#f59e0b] p-4 mb-6 rounded-lg">
                            <p className="text-[#fcd34d] text-xs">
                                ⚠️ Non-secure connection. For full E2E encryption, use HTTPS.
                            </p>
                        </div>
                    )}

                    {error && (
                        <div className="bg-[#7c2d12]/20 border-l-4 border-[#ef4444] p-4 mb-6 rounded-lg">
                            <p className="text-[#fca5a5] text-sm">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-[#e9edef] mb-2">
                                Username
                            </label>
                            <div className="relative group">
                                <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#8696a0] w-5 h-5 transition-colors group-focus-within:text-[#00a884]" />
                                <input
                                    type="text"
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                    className="w-full pl-12 pr-4 py-3.5 bg-[#2a3942] text-[#e9edef] border-2 border-transparent rounded-xl focus:border-[#00a884] focus:bg-[#111b21] outline-none transition-all placeholder-[#8696a0]"
                                    placeholder="Choose a username"
                                    required
                                    minLength={3}
                                    autoComplete="username"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-[#e9edef] mb-2">
                                Phone Number
                            </label>
                            <div className="relative group">
                                <Phone className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#8696a0] w-5 h-5 transition-colors group-focus-within:text-[#00a884]" />
                                <input
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    className="w-full pl-12 pr-4 py-3.5 bg-[#2a3942] text-[#e9edef] border-2 border-transparent rounded-xl focus:border-[#00a884] focus:bg-[#111b21] outline-none transition-all placeholder-[#8696a0]"
                                    placeholder="+91 1234567890"
                                    required
                                    autoComplete="tel"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-[#e9edef] mb-2">
                                Email
                            </label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#8696a0] w-5 h-5 transition-colors group-focus-within:text-[#00a884]" />
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full pl-12 pr-4 py-3.5 bg-[#2a3942] text-[#e9edef] border-2 border-transparent rounded-xl focus:border-[#00a884] focus:bg-[#111b21] outline-none transition-all placeholder-[#8696a0]"
                                    placeholder="your.email@example.com"
                                    required
                                    autoComplete="email"
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
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className="w-full pl-12 pr-4 py-3.5 bg-[#2a3942] text-[#e9edef] border-2 border-transparent rounded-xl focus:border-[#00a884] focus:bg-[#111b21] outline-none transition-all placeholder-[#8696a0]"
                                    placeholder="Create a strong password"
                                    required
                                    minLength={8}
                                />
                            </div>
                            <p className="text-xs text-[#667781] mt-2">Must be at least 8 characters long</p>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-[#00a884] to-[#25d366] text-white font-semibold py-3.5 px-6 rounded-xl hover:shadow-xl hover:shadow-[#00a884]/20 transform hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 mt-6"
                        >
                            {loading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Creating account...
                                </>
                            ) : (
                                <>
                                    <UserPlus className="w-5 h-5" />
                                    Create Account
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-[#8696a0]">
                            Already have an account?{' '}
                            <Link to="/login" className="text-[#00a884] hover:text-[#06cf9c] font-semibold transition-colors">
                                Log in
                            </Link>
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-8 text-center">
                    <p className="text-xs text-[#667781] flex items-center justify-center gap-2">
                        <Lock className="w-3 h-3" />
                        Your data is encrypted end-to-end
                    </p>
                </div>
            </div>
        </div>
    );
}
