import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MessageCircle, User, LogOut, Settings, Lock, Phone, Users } from 'lucide-react';
import SearchBar from './SearchBar';

export default function Navbar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const profileMenuRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(event) {
            if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
                setShowProfileMenu(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    return (
        <nav className="bg-white border-b-4 border-saffron sticky top-0 z-50 shadow-lg">
            <div className="max-w-7xl mx-auto px-4">
                <div className="flex justify-between items-center gap-4 h-16">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-2 flex-shrink-0">
                        <div className="w-10 h-10 bg-gradient-to-r from-saffron to-green-india rounded-full flex items-center justify-center">
                            <Lock className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-2xl font-bold text-gradient-india hidden md:block">
                            SnapTalker
                        </span>
                    </Link>

                    {/* Search Bar */}
                    <SearchBar />

                    {/* Navigation Links */}
                    <div className="flex items-center gap-4 flex-shrink-0">
                        <Link
                            to="/messages"
                            className="flex items-center gap-2 text-gray-700 hover:text-saffron transition-colors"
                        >
                            <MessageCircle className="w-5 h-5" />
                            <span className="hidden lg:block font-semibold">चैट्स</span>
                        </Link>

                        <Link
                            to="/calls"
                            className="flex items-center gap-2 text-gray-700 hover:text-saffron transition-colors"
                        >
                            <Phone className="w-5 h-5" />
                            <span className="hidden lg:block font-semibold">कॉल्स</span>
                        </Link>

                        <Link
                            to="/groups"
                            className="flex items-center gap-2 text-gray-700 hover:text-saffron transition-colors"
                        >
                            <Users className="w-5 h-5" />
                            <span className="hidden lg:block font-semibold">ग्रुप्स</span>
                        </Link>

                        <div className="relative" ref={profileMenuRef}>
                            <button
                                onClick={() => setShowProfileMenu(!showProfileMenu)}
                                className="flex items-center gap-2 text-gray-700 hover:text-saffron transition-colors"
                            >
                                <User className="w-5 h-5" />
                                <span className="hidden lg:block font-semibold">प्रोफाइल</span>
                            </button>

                            {showProfileMenu && (
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-100 py-2 z-50">
                                    <Link
                                        to="/profile"
                                        onClick={() => setShowProfileMenu(false)}
                                        className="w-full flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                                    >
                                        <User className="w-4 h-4" />
                                        <span>माई प्रोफाइल</span>
                                    </Link>
                                    <Link
                                        to="/settings"
                                        onClick={() => setShowProfileMenu(false)}
                                        className="w-full flex items-center gap-3 px-4 py-2 text-gray-700 hover:bg-gray-50 transition-colors"
                                    >
                                        <Settings className="w-4 h-4" />
                                        <span>सेटिंग्स</span>
                                    </Link>
                                    <hr className="my-2 border-gray-100" />
                                    <button
                                        onClick={() => {
                                            handleLogout();
                                            setShowProfileMenu(false);
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-2 text-red-600 hover:bg-red-50 transition-colors"
                                    >
                                        <LogOut className="w-4 h-4" />
                                        <span>लॉगआउट</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
}
