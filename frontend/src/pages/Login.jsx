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
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="card-india max-w-md w-full p-8">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-saffron to-green-india rounded-full mb-4">
                        <Sparkles className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-4xl font-bold text-gradient-india mb-2">SnapTalker</h1>
                    <p className="text-gray-600 flex items-center justify-center gap-2">
                        भारत के साथ जुड़ें
                        <Globe className="w-4 h-4 text-saffron" />
                    </p>
                </div>

                {error && (
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded">
                        <p className="text-red-700">{error}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            फ़ोन नंबर
                        </label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                type="tel"
                                value={credentials.phone}
                                onChange={(e) => setCredentials({ ...credentials, phone: e.target.value })}
                                className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-saffron focus:ring-2 focus:ring-saffron/20 outline-none transition-all"
                                placeholder="+91 1234567890"
                                required
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
                                value={credentials.password}
                                onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                                className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-saffron focus:ring-2 focus:ring-saffron/20 outline-none transition-all"
                                placeholder="अपना पासवर्ड दर्ज करें"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-saffron to-green-india text-white font-bold py-3 px-6 rounded-xl hover:shadow-lg transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'लॉग इन हो रहा है...' : 'लॉग इन करें'}
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <p className="text-gray-600">
                        नया यूजर है?{' '}
                        <Link to="/register" className="text-saffron hover:text-orange-india font-semibold">
                            साइन अप करें <UserPlus className="inline w-4 h-4" />
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
