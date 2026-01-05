import React, { useState, useEffect, useRef } from 'react';
import { Search as SearchIcon, X, User, Hash, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function SearchBar() {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState({ users: [], posts: [], hashtags: [] });
    const [loading, setLoading] = useState(false);
    const searchRef = useRef(null);
    const navigate = useNavigate();

    // Mock search results - replace with API call
    const mockSearch = (searchQuery) => {
        if (!searchQuery) {
            return { users: [], posts: [], hashtags: [] };
        }

        return {
            users: [
                { id: 1, username: 'rajkumar', full_name: 'राज कुमार', avatar: null },
                { id: 2, username: 'priya_sharma', full_name: 'प्रिया शर्मा', avatar: null },
            ],
            hashtags: ['#india', '#snaptalker', '#trending'],
            posts: [],
        };
    };

    useEffect(() => {
        // Close search when clicking outside
        function handleClickOutside(event) {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (query.trim()) {
            setLoading(true);
            // Debounce search
            const timer = setTimeout(() => {
                const searchResults = mockSearch(query);
                setResults(searchResults);
                setLoading(false);
            }, 300);

            return () => clearTimeout(timer);
        } else {
            setResults({ users: [], posts: [], hashtags: [] });
        }
    }, [query]);

    const handleUserClick = (userId) => {
        navigate(`/user/${userId}`);
        setIsOpen(false);
        setQuery('');
    };

    const handleHashtagClick = (hashtag) => {
        navigate(`/explore?hashtag=${hashtag.replace('#', '')}`);
        setIsOpen(false);
        setQuery('');
    };

    return (
        <div className="relative flex-1 max-w-md" ref={searchRef}>
            <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => setIsOpen(true)}
                    placeholder="खोजें..."
                    className="w-full pl-10 pr-10 py-2 border-2 border-gray-200 rounded-full focus:border-saffron focus:ring-2 focus:ring-saffron/20 outline-none transition-all"
                />
                {query && (
                    <button
                        onClick={() => setQuery('')}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                        <X className="w-5 h-5" />
                    </button>
                )}
            </div>

            {/* Search Results Dropdown */}
            {isOpen && (query || results.users.length > 0) && (
                <div className="absolute top-full mt-2 w-full bg-white rounded-xl shadow-2xl border-2 border-gray-100 overflow-hidden z-50 max-h-96 overflow-y-auto">
                    {loading ? (
                        <div className="p-8 text-center text-gray-500">
                            <div className="animate-spin w-8 h-8 border-4 border-saffron border-t-transparent rounded-full mx-auto"></div>
                            <p className="mt-3">खोज रहे हैं...</p>
                        </div>
                    ) : (
                        <>
                            {/* Users */}
                            {results.users.length > 0 && (
                                <div className="p-2">
                                    <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                                        यूजर्स
                                    </div>
                                    {results.users.map((user) => (
                                        <button
                                            key={user.id}
                                            onClick={() => handleUserClick(user.id)}
                                            className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors"
                                        >
                                            <div className="w-10 h-10 bg-gradient-to-r from-saffron to-green-india rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                                                {user.full_name.charAt(0)}
                                            </div>
                                            <div className="text-left">
                                                <p className="font-semibold text-gray-800">{user.full_name}</p>
                                                <p className="text-sm text-gray-500">@{user.username}</p>
                                            </div>
                                            <User className="w-4 h-4 text-gray-400 ml-auto" />
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Hashtags */}
                            {results.hashtags.length > 0 && (
                                <div className="p-2 border-t border-gray-100">
                                    <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase">
                                        हैशटैग
                                    </div>
                                    {results.hashtags.map((hashtag, index) => (
                                        <button
                                            key={index}
                                            onClick={() => handleHashtagClick(hashtag)}
                                            className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors"
                                        >
                                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                                <Hash className="w-5 h-5 text-blue-500" />
                                            </div>
                                            <div className="text-left flex-1">
                                                <p className="font-semibold text-gray-800">{hashtag}</p>
                                                <p className="text-sm text-gray-500">ट्रेंडिंग</p>
                                            </div>
                                            <TrendingUp className="w-4 h-4 text-gray-400" />
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* No Results */}
                            {query && results.users.length === 0 && results.hashtags.length === 0 && !loading && (
                                <div className="p-8 text-center text-gray-500">
                                    <SearchIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                    <p>कोई परिणाम नहीं मिला</p>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
