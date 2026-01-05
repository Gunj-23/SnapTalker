import React, { useState, useEffect, useRef } from 'react';
import { Bell, Heart, MessageCircle, UserPlus, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { hi } from 'date-fns/locale';

export default function NotificationsDropdown() {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loaded, setLoaded] = useState(false);
    const dropdownRef = useRef(null);

    // Mock notifications - replace with API call
    const mockNotifications = [
        {
            id: 1,
            type: 'like',
            user: { name: 'राज कुमार', avatar: null },
            message: 'ने आपकी पोस्ट को लाइक किया',
            time: new Date(Date.now() - 5 * 60 * 1000),
            read: false,
        },
        {
            id: 2,
            type: 'comment',
            user: { name: 'प्रिया शर्मा', avatar: null },
            message: 'ने आपकी पोस्ट पर कमेंट किया',
            time: new Date(Date.now() - 30 * 60 * 1000),
            read: false,
        },
        {
            id: 3,
            type: 'follow',
            user: { name: 'अमित वर्मा', avatar: null },
            message: 'ने आपको फॉलो किया',
            time: new Date(Date.now() - 2 * 60 * 60 * 1000),
            read: true,
        },
    ];

    useEffect(() => {
        // Load notifications only once - replace with API call
        if (!loaded) {
            setNotifications(mockNotifications);
            setUnreadCount(mockNotifications.filter(n => !n.read).length);
            setLoaded(true);
        }

        // Close dropdown when clicking outside
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [loaded]);

    const markAllAsRead = () => {
        const updatedNotifications = notifications.map(n => ({ ...n, read: true }));
        setNotifications(updatedNotifications);
        setUnreadCount(0);
        // TODO: Call API to mark all as read
    };

    const markAsRead = (notificationId) => {
        const updatedNotifications = notifications.map(n =>
            n.id === notificationId ? { ...n, read: true } : n
        );
        setNotifications(updatedNotifications);
        setUnreadCount(updatedNotifications.filter(n => !n.read).length);
        // TODO: Call API to mark specific notification as read
    };

    const getNotificationIcon = (type) => {
        switch (type) {
            case 'like':
                return <Heart className="w-4 h-4 text-red-500" fill="currentColor" />;
            case 'comment':
                return <MessageCircle className="w-4 h-4 text-blue-500" />;
            case 'follow':
                return <UserPlus className="w-4 h-4 text-green-500" />;
            default:
                return <Bell className="w-4 h-4 text-gray-500" />;
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative flex items-center gap-2 text-gray-700 hover:text-saffron transition-colors"
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
                <span className="hidden sm:block font-semibold">नोटिफिकेशन</span>
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-2xl border-2 border-gray-100 overflow-hidden z-50">
                    {/* Header */}
                    <div className="flex justify-between items-center p-4 border-b-2 border-gray-100 bg-gradient-to-r from-saffron/5 to-green-india/5">
                        <h3 className="font-bold text-lg text-gray-800">नोटिफिकेशन</h3>
                        <div className="flex items-center gap-2">
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllAsRead}
                                    className="text-xs text-saffron hover:text-orange-india font-semibold"
                                >
                                    सभी पढ़ें
                                </button>
                            )}
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Notifications List */}
                    <div className="max-h-96 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">
                                <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                <p>कोई नोटिफिकेशन नहीं</p>
                            </div>
                        ) : (
                            notifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    onClick={() => !notification.read && markAsRead(notification.id)}
                                    className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${!notification.read ? 'bg-blue-50/50' : ''
                                        }`}
                                >
                                    <div className="flex gap-3">
                                        {/* User Avatar */}
                                        <div className="w-10 h-10 bg-gradient-to-r from-saffron to-green-india rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                                            {notification.user.name.charAt(0)}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start gap-2">
                                                <div className="flex-1">
                                                    <p className="text-sm">
                                                        <span className="font-semibold text-gray-800">
                                                            {notification.user.name}
                                                        </span>{' '}
                                                        <span className="text-gray-600">
                                                            {notification.message}
                                                        </span>
                                                    </p>
                                                    <p className="text-xs text-gray-400 mt-1">
                                                        {formatDistanceToNow(notification.time, {
                                                            addSuffix: true,
                                                            locale: hi,
                                                        })}
                                                    </p>
                                                </div>
                                                {/* Notification Icon */}
                                                {getNotificationIcon(notification.type)}
                                            </div>
                                            {!notification.read && (
                                                <div className="mt-2">
                                                    <span className="inline-block w-2 h-2 bg-blue-500 rounded-full"></span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Footer */}
                    {notifications.length > 0 && (
                        <div className="p-3 bg-gray-50 text-center">
                            <button className="text-sm text-saffron hover:text-orange-india font-semibold">
                                सभी नोटिफिकेशन देखें
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
