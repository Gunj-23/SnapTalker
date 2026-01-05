import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { usersAPI, postsAPI } from '../services/api';
import Navbar from '../components/Navbar';
import { Camera, MapPin, Calendar, Users, FileText } from 'lucide-react';
import { format } from 'date-fns';

export default function Profile() {
    const { user } = useAuth();
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [bio, setBio] = useState(user?.bio || '');
    const [bioLink, setBioLink] = useState(user?.bio_link || '');

    useEffect(() => {
        if (user) {
            fetchUserPosts();
        }
    }, [user]);

    const fetchUserPosts = async () => {
        try {
            const { data } = await usersAPI.getUserPosts(user.id);
            setPosts(data.posts || []);
        } catch (error) {
            console.error('Failed to fetch posts:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAvatarUpload = async (e) => {
        const file = e.target.files[0];
        if (file) {
            const formData = new FormData();
            formData.append('file', file);
            try {
                await usersAPI.uploadAvatar(formData);
                window.location.reload();
            } catch (error) {
                console.error('Failed to upload avatar:', error);
            }
        }
    };

    const handleUpdateBio = async () => {
        try {
            await usersAPI.updateProfile({ bio });
            setEditing(false);
        } catch (error) {
            console.error('Failed to update bio:', error);
        }
    };

    const handleUpdateBioLink = async (newLink) => {
        try {
            await usersAPI.updateProfile({ bio_link: newLink });
            setBioLink(newLink);
        } catch (error) {
            console.error('Failed to update bio link:', error);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-green-50">
            <Navbar />

            <div className="max-w-4xl mx-auto px-4 py-6">
                {/* Profile Header */}
                <div className="card-india p-8 mb-6">
                    <div className="flex flex-col md:flex-row gap-6 items-start">
                        <div className="relative">
                            <div className="w-32 h-32 bg-gradient-to-r from-saffron to-green-india rounded-full flex items-center justify-center text-white text-5xl font-bold">
                                {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                            </div>
                            <label className="absolute bottom-0 right-0 w-10 h-10 bg-saffron rounded-full flex items-center justify-center cursor-pointer hover:bg-orange-india transition-colors">
                                <Camera className="w-5 h-5 text-white" />
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleAvatarUpload}
                                    className="hidden"
                                />
                            </label>
                        </div>

                        <div className="flex-1">
                            <h1 className="text-3xl font-bold text-gray-900 mb-2">
                                {user?.full_name}
                            </h1>
                            <p className="text-gray-600 mb-4">@{user?.username}</p>

                            <div className="grid grid-cols-3 gap-4 mb-6">
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-saffron">{user?.posts_count || 0}</p>
                                    <p className="text-sm text-gray-600">पोस्ट</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-green-india">{user?.followers_count || 0}</p>
                                    <p className="text-sm text-gray-600">फॉलोअर्स</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-2xl font-bold text-orange-india">{user?.following_count || 0}</p>
                                    <p className="text-sm text-gray-600">फॉलोइंग</p>
                                </div>
                            </div>

                            {editing ? (
                                <div>
                                    <textarea
                                        value={bio}
                                        onChange={(e) => setBio(e.target.value)}
                                        className="w-full p-3 border-2 border-gray-200 rounded-xl mb-2"
                                        rows="3"
                                        placeholder="अपने बारे में बताएं..."
                                    />
                                    <div className="flex gap-2">
                                        <button
                                            onClick={handleUpdateBio}
                                            className="px-4 py-2 bg-saffron text-white rounded-lg hover:bg-orange-india"
                                        >
                                            सेव करें
                                        </button>
                                        <button
                                            onClick={() => setEditing(false)}
                                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                                        >
                                            कैंसल
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <p className="text-gray-700 mb-2">{user?.bio || 'कोई बायो नहीं'}</p>
                                    <button
                                        onClick={() => setEditing(true)}
                                        className="text-saffron hover:text-orange-india font-semibold"
                                    >
                                        एडिट करें
                                    </button>
                                </div>
                            )}

                            <div className="flex items-center gap-4 mt-4 text-sm text-gray-600">
                                <div className="flex items-center gap-1">
                                    <Calendar className="w-4 h-4" />
                                    <span>{user?.created_at ? format(new Date(user.created_at), 'MMMM yyyy') : ''} से मेंबर</span>
                                </div>
                            </div>

                            {/* Profile Tools - QR Code, Bio Link, Share */}
                            <ProfileTools
                                username={user?.username}
                                bioLink={bioLink}
                                onUpdateBioLink={handleUpdateBioLink}
                            />
                        </div>
                    </div>
                </div>

                {/* User Activity Summary */}
                <div className="card-india p-4 mt-4">
                    <p className="text-center text-gray-600">Profile statistics and activity will appear here</p>
                </div>
            </div>
        </div>
    );
}
