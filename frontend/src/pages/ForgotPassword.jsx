import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Phone, ArrowLeft, Key, Sparkles, Globe } from 'lucide-react';
import api from '../services/api';

export default function ForgotPassword() {
    const [step, setStep] = useState(1); // 1: phone, 2: token+password
    const [phone, setPhone] = useState('');
    const [resetToken, setResetToken] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleRequestToken = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            const response = await api.post('/auth/forgot-password', { phone });
            if (response.data.email) {
                setSuccess(`रीसेट OTP आपके ईमेल पर भेजा गया: ${response.data.email}`);
                setStep(2);
            } else {
                // Security response - don't reveal if user exists
                setSuccess(response.data.message || 'यदि फोन नंबर पंजीकृत है, तो रीसेट OTP आपके ईमेल पर भेजा जाएगा');
            }
        } catch (err) {
            setError(err.response?.data?.error || 'OTP भेजने में विफल');
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (newPassword !== confirmPassword) {
            setError('पासवर्ड मेल नहीं खाते');
            return;
        }

        if (newPassword.length < 8) {
            setError('पासवर्ड कम से कम 8 अक्षरों का होना चाहिए');
            return;
        }

        setLoading(true);

        try {
            await api.post('/auth/reset-password', {
                phone,
                resetToken,
                newPassword
            });
            setSuccess('पासवर्ड सफलतापूर्वक रीसेट हो गया! लॉगिन पर रीडायरेक्ट कर रहे हैं...');
            setTimeout(() => navigate('/login'), 2000);
        } catch (err) {
            setError(err.response?.data?.error || 'पासवर्ड रीसेट विफल');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="card-india max-w-md w-full p-8">
                <button
                    onClick={() => navigate('/login')}
                    className="flex items-center gap-2 text-gray-600 hover:text-saffron mb-6 transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                    वापस लॉगिन पर जाएं
                </button>

                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-saffron to-green-india rounded-full mb-4">
                        <Key className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-gradient-india mb-2">
                        पासवर्ड रीसेट करें
                    </h1>
                    <p className="text-gray-600">
                        {step === 1 ? 'अपना फ़ोन नंबर दर्ज करें' : 'नया पासवर्ड सेट करें'}
                    </p>
                </div>

                {error && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded">
                        <p className="text-red-700">{error}</p>
                    </div>
                )}

                {success && (
                    <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6 rounded">
                        <p className="text-green-700">{success}</p>
                    </div>
                )}

                {step === 1 ? (
                    <form onSubmit={handleRequestToken} className="space-y-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                फ़ोन नंबर
                            </label>
                            <div className="relative">
                                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-saffron focus:ring-2 focus:ring-saffron/20 outline-none transition-all"
                                    placeholder="+91 1234567890"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-saffron to-green-india text-white font-bold py-3 px-6 rounded-xl hover:shadow-lg transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'भेजा जा रहा है...' : 'रीसेट टोकन भेजें'}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleResetPassword} className="space-y-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                रीसेट टोकन (6 अंक)
                            </label>
                            <input
                                type="text"
                                value={resetToken}
                                onChange={(e) => setResetToken(e.target.value)}
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-saffron focus:ring-2 focus:ring-saffron/20 outline-none transition-all text-center text-2xl tracking-widest"
                                placeholder="000000"
                                maxLength={6}
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                नया पासवर्ड
                            </label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-saffron focus:ring-2 focus:ring-saffron/20 outline-none transition-all"
                                placeholder="कम से कम 8 अक्षर"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                पासवर्ड कन्फर्म करें
                            </label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-saffron focus:ring-2 focus:ring-saffron/20 outline-none transition-all"
                                placeholder="पासवर्ड दोबारा दर्ज करें"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-saffron to-green-india text-white font-bold py-3 px-6 rounded-xl hover:shadow-lg transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'रीसेट हो रहा है...' : 'पासवर्ड रीसेट करें'}
                        </button>
                    </form>
                )}

                <div className="mt-8 pt-6 border-t border-gray-200">
                    <p className="text-xs text-center text-gray-500">
                        Made with love in India | भारत में बनाया गया
                    </p>
                </div>
            </div>
        </div>
    );
}
