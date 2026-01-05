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
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="card-india max-w-md w-full p-8">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-saffron to-green-india rounded-full mb-4">
                        <Sparkles className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-4xl font-bold text-gradient-india mb-2">SnapTalker</h1>
                    <p className="text-gray-600 flex items-center justify-center gap-2">
                        अपना नया अकाउंट बनाएं
                        <Globe className="w-4 h-4 text-saffron" />
                    </p>
                </div>

                {!window.isSecureContext && (
                    <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-6 rounded">
                        <div className="flex items-start">
                            <div className="flex-shrink-0">
                                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="ml-3">
                                <p className="text-sm text-yellow-700">
                                    ⚠️ Non-secure connection detected. E2E encryption disabled. For full security, access via localhost or HTTPS.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded">
                        <p className="text-red-700">{error}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            यूजरनेम
                        </label>
                        <div className="relative">
                            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                type="text"
                                value={formData.username}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-saffron focus:ring-2 focus:ring-saffron/20 outline-none transition-all"
                                placeholder="अपना यूजरनेम दर्ज करें"
                                required
                                minLength={3}
                                autoComplete="username"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            फ़ोन नंबर
                        </label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-saffron focus:ring-2 focus:ring-saffron/20 outline-none transition-all"
                                placeholder="+91 1234567890"
                                required
                                autoComplete="tel"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            ईमेल
                        </label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-saffron focus:ring-2 focus:ring-saffron/20 outline-none transition-all"
                                placeholder="your.email@example.com"
                                required
                                autoComplete="email"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            पासवर्ड
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                type="password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-saffron focus:ring-2 focus:ring-saffron/20 outline-none transition-all"
                                placeholder="मजबूत पासवर्ड बनाएं"
                                required
                                minLength={8}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-saffron to-green-india text-white font-bold py-3 px-6 rounded-xl hover:shadow-lg transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'रजिस्टर हो रहा है...' : 'साइन अप करें'}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <p className="text-gray-600">
                        पहले से अकाउंट है?{' '}
                        <Link to="/login" className="text-saffron hover:text-orange-india font-semibold">
                            लॉग इन करें
                        </Link>
                    </p>
                </div>

                <div className="mt-8 pt-6 border-t border-gray-200">
                    <p className="text-xs text-center text-gray-500">
                        Made with love in India | भारत में बनाया गया
                    </p>
                </div>
            </div>
        </div>
    );
}
