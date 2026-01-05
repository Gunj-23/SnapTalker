import React, { useState, useEffect, useRef } from 'react';
import {
    MessageCircle, Send, Search, MoreVertical, Phone, Video,
    Image as ImageIcon, Lock, Check, CheckCheck, Shield,
    AlertTriangle, Clock, Menu, Settings, User, LogOut, Smile,
    Paperclip, Mic, X, ChevronDown, Archive, Volume2, UserPlus, Share2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useEncryption } from '../context/EncryptionContext';
import { useNavigate } from 'react-router-dom';
import { chatAPI } from '../services/api';
import api from '../services/api';

export default function Messages() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const {
        isInitialized,
        encryptMessage,
        decryptMessage,
        getSafetyNumber,
        encryptionEnabled,
        sessionEstablishing
    } = useEncryption();

    const [conversations, setConversations] = useState([]);
    const [selectedChat, setSelectedChat] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [showSafetyNumber, setShowSafetyNumber] = useState(false);
    const [safetyNumber, setSafetyNumber] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showSearchResults, setShowSearchResults] = useState(false);
    const messagesEndRef = useRef(null);
    const menuRef = useRef(null);
    const searchTimeoutRef = useRef(null);

    // Load conversations on component mount
    useEffect(() => {
        loadConversations();

        // Refresh conversations every 5 seconds
        const conversationsInterval = setInterval(loadConversations, 5000);

        // Send heartbeat every 15 seconds to maintain online status
        const heartbeatInterval = setInterval(sendHeartbeat, 15000);

        // Send initial heartbeat
        sendHeartbeat();

        return () => {
            clearInterval(conversationsInterval);
            clearInterval(heartbeatInterval);
        };
    }, []);

    const sendHeartbeat = async () => {
        try {
            await api.post('/users/heartbeat');
        } catch (error) {
            console.warn('Heartbeat failed:', error);
        }
    };

    // Poll online status for conversations
    useEffect(() => {
        if (conversations.length === 0) return;

        const updateOnlineStatus = async () => {
            try {
                const userIds = conversations.map(c => c.user.id);
                const params = new URLSearchParams();
                userIds.forEach(id => params.append('userIds', id));
                const resp = await api.get(`/users/online-status?${params.toString()}`);
                const data = resp.data;
                setConversations(prev => prev.map(conv => ({
                    ...conv,
                    user: {
                        ...conv.user,
                        online: data.statuses[conv.user.id] || false
                    }
                })));
            } catch (error) {
                console.warn('Failed to update online status:', error);
            }
        };

        updateOnlineStatus();
        const statusInterval = setInterval(updateOnlineStatus, 10000);

        return () => clearInterval(statusInterval);
    }, [conversations.length]);

    const loadConversations = async () => {
        try {
            const resp = await api.get('/messages/conversations');
            const data = resp.data;
            if (data) {
                const convs = (data.conversations || []).map(conv => ({
                    id: conv.userId,
                    user: {
                        id: conv.userId,
                        name: conv.username,
                        username: conv.username,
                        online: false
                    },
                    lastMessage: conv.lastMessage,
                    time: conv.timestamp,
                    unread: conv.unreadCount,
                    sender_id: null
                }));
                setConversations(convs);

                // Cache conversations for offline access
                try {
                    localStorage.setItem('cached_conversations', JSON.stringify(convs));
                    localStorage.setItem('conversations_updated', new Date().toISOString());
                } catch (e) {
                    console.warn('Failed to cache conversations:', e);
                }
            } else if (response.status === 401) {
                console.error('Unauthorized - token may have expired');
                // Try to load from cache
                loadCachedConversations();
            }
        } catch (error) {
            console.error('Failed to load conversations:', error);
            // Load from cache if network fails
            loadCachedConversations();
        }
    };

    const loadCachedConversations = () => {
        try {
            const cached = localStorage.getItem('cached_conversations');
            if (cached) {
                const convs = JSON.parse(cached);
                setConversations(convs);
                console.log('Loaded conversations from cache');
            }
        } catch (e) {
            console.warn('Failed to load cached conversations:', e);
        }
    };

    // Search users by username or phone
    useEffect(() => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        if (searchQuery.trim().length > 0) {
            setShowSearchResults(true);
            setIsSearching(true);

            searchTimeoutRef.current = setTimeout(async () => {
                try {
                    const resp = await api.get(`/users/search?q=${encodeURIComponent(searchQuery)}`);
                    setSearchResults(resp.data.users || []);
                } catch (error) {
                    console.error('Search error:', error);
                    setSearchResults([]);
                } finally {
                    setIsSearching(false);
                }
            }, 300);
        } else {
            setShowSearchResults(false);
            setSearchResults([]);
            setIsSearching(false);
        }

        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, [searchQuery]);

    useEffect(() => {
        // Click outside menu handler
        function handleClickOutside(event) {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setShowMenu(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (selectedChat) {
            loadMessages();

            // Poll for new messages every 2 seconds
            const pollInterval = setInterval(loadMessages, 2000);
            return () => clearInterval(pollInterval);
        }
    }, [selectedChat]);

    const loadMessages = async () => {
        if (!selectedChat) return;

        try {
            const resp = await api.get(`/messages/${selectedChat.user.id}`);
            const data = resp.data;
            // Transform backend format to frontend format
            const transformedMessages = (data.messages || []).map(msg => ({
                id: msg.id,
                sender_id: msg.senderId,
                recipient_id: msg.recipientId,
                content: msg.encryptedContent, // Display encrypted content as plain for now
                created_at: msg.timestamp,
                encrypted: false,
                status: msg.status
            })).reverse(); // Reverse to show oldest first

            setMessages(transformedMessages);

            // Mark unread messages as delivered
            const unreadMessages = transformedMessages.filter(
                msg => msg.sender_id === selectedChat.user.id && msg.status === 'sent'
            );

            for (const msg of unreadMessages) {
                updateMessageStatus(msg.id, 'delivered');
            }

            // Cache messages in localStorage
            try {
                const cacheKey = `messages_${selectedChat.user.id}`;
                localStorage.setItem(cacheKey, JSON.stringify(transformedMessages));
            } catch (e) {
                console.warn('Failed to cache messages:', e);
            }
        } catch (error) {
            console.error('Failed to load messages:', error);
            // Try to load from cache
            try {
                const cacheKey = `messages_${selectedChat.user.id}`;
                const cached = localStorage.getItem(cacheKey);
                if (cached) {
                    setMessages(JSON.parse(cached));
                }
            } catch (e) {
                console.warn('Failed to load cached messages:', e);
            }
        }
    };

    const updateMessageStatus = async (messageId, status) => {
        try {
            await api.put(`/messages/${messageId}/status`, { status });
        } catch (error) {
            console.warn('Failed to update message status:', error);
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedChat) return;

        const messageContent = newMessage;
        setNewMessage('');

        try {
            // Prepare message data
            const messageData = {
                recipientId: selectedChat.user.id,
                encryptedContent: messageContent, // TODO: Encrypt if encryption enabled
                iv: 'placeholder-iv',
                messageNumber: messages.length + 1
            };

            // Add optimistic message to UI
            const optimisticMessage = {
                id: Date.now(),
                sender_id: user?.id,
                content: messageContent,
                created_at: new Date(),
                encrypted: false,
                status: 'sending'
            };
            setMessages([...messages, optimisticMessage]);

            // Send to backend API
            const resp = await api.post('/messages/send', messageData);
            const message = resp.data;

            // Update message with server response
            setMessages(prev => prev.map(msg =>
                msg.id === optimisticMessage.id
                    ? {
                        ...msg,
                        id: message.id,
                        content: message.encryptedContent,
                        status: 'sent'
                    }
                    : msg
            ));

            // Reload conversations to get updated lastMessage from server
            loadConversations();
        } catch (error) {
            console.error('Failed to send message:', error);

            // Mark message as failed
            setMessages(prev => prev.map(msg =>
                msg.id === optimisticMessage.id
                    ? { ...msg, status: 'failed' }
                    : msg
            ));

            // Show user-friendly error
            if (error.response?.status === 401) {
                alert('Session expired. Please login again.');
            } else if (error.response?.status >= 500) {
                alert('Server error. Message will be retried.');
            } else {
                alert('Failed to send message. Please try again.');
            }
        }
    };

    const retryFailedMessage = async (failedMessage) => {
        // Remove failed message
        setMessages(prev => prev.filter(msg => msg.id !== failedMessage.id));

        // Resend with new ID
        const messageData = {
            recipientId: selectedChat.user.id,
            encryptedContent: failedMessage.content,
            iv: 'placeholder-iv',
            messageNumber: messages.length + 1
        };

        const optimisticMessage = {
            id: Date.now(),
            sender_id: user?.id,
            content: failedMessage.content,
            created_at: new Date(),
            encrypted: false,
            status: 'sending'
        };
        setMessages(prev => [...prev, optimisticMessage]);

        try {
            const resp = await api.post('/messages/send', messageData);
            const message = resp.data;

            setMessages(prev => prev.map(msg =>
                msg.id === optimisticMessage.id
                    ? {
                        ...msg,
                        id: message.id,
                        content: message.encryptedContent,
                        status: 'sent'
                    }
                    : msg
            ));
            loadConversations();
        } catch (error) {
            console.error('Retry failed:', error);
            setMessages(prev => prev.map(msg =>
                msg.id === optimisticMessage.id
                    ? { ...msg, status: 'failed' }
                    : msg
            ));
        }
    };

    const handleSelectChat = async (conv) => {
        setSelectedChat(conv);

        // Mark messages as read when opening chat
        if (conv.unread > 0) {
            setConversations(conversations.map(c =>
                c.id === conv.id ? { ...c, unread: 0 } : c
            ));
        }

        // Load safety number
        if (encryptionEnabled && isInitialized) {
            const number = await getSafetyNumber(conv.user.id);
            setSafetyNumber(number || '');
        }
    };

    // Mark messages as read when user views them
    useEffect(() => {
        if (selectedChat && messages.length > 0) {
            // Find unread messages from the other user
            const unreadMessages = messages.filter(
                msg => msg.sender_id === selectedChat.user.id && (msg.status === 'delivered' || msg.status === 'sent')
            );

            // Mark them as read
            for (const msg of unreadMessages) {
                updateMessageStatus(msg.id, 'read');
            }
        }
    }, [selectedChat, messages]);

    const handleViewSafetyNumber = () => {
        setShowSafetyNumber(true);
    };

    const formatSafetyNumber = (number) => {
        if (!number) return '';
        return number.match(/.{1,5}/g)?.join(' ') || number;
    };

    const formatTime = (date) => {
        const now = new Date();
        const msgDate = new Date(date);
        const diffSeconds = Math.floor((now - msgDate) / 1000);
        const diffMinutes = Math.floor(diffSeconds / 60);
        const diffHours = Math.floor(diffMinutes / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffSeconds < 60) {
            return 'Just now';
        } else if (diffMinutes < 60) {
            return `${diffMinutes}m ago`;
        } else if (diffHours < 24) {
            return msgDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        } else if (diffDays === 1) {
            return 'Yesterday';
        } else if (diffDays < 7) {
            return msgDate.toLocaleDateString('en-US', { weekday: 'short' });
        } else {
            return msgDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
    };

    const formatMessageTime = (date) => {
        const msgDate = new Date(date);
        return msgDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    };

    const filteredConversations = conversations.filter(conv =>
        conv.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.user.username.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const handleStartChat = (searchUser) => {
        // Check if conversation already exists
        const existingConv = conversations.find(c => c.user.id === searchUser.id);

        if (existingConv) {
            handleSelectChat(existingConv);
        } else {
            // Create new conversation locally (will be saved when first message is sent)
            const newConv = {
                id: searchUser.id,
                user: {
                    id: searchUser.id,
                    name: searchUser.username,
                    username: searchUser.username,
                    online: false
                },
                lastMessage: '',
                time: new Date().toISOString(),
                unread: 0,
                sender_id: null
            };

            setConversations([newConv, ...conversations]);
            handleSelectChat(newConv);
        }

        setSearchQuery('');
        setShowSearchResults(false);
    };

    const emojis = ['😀', '😂', '❤️', '😍', '👍', '🎉', '🔥', '😊', '🙏', '💯', '😎', '🤔', '👏', '🌟', '💪'];

    return (
        <div className="h-screen flex bg-[#111b21] overflow-hidden">
            {/* Sidebar - Conversations List */}
            <div className="w-full md:w-[420px] bg-[#111b21] border-r border-[#2a3942] flex flex-col">
                {/* Header */}
                <div className="bg-[#202c33] px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button className="w-10 h-10 bg-[#374851] rounded-full flex items-center justify-center text-[#d1d7db] font-medium hover:bg-[#3b4a54] transition-colors">
                            {user?.username?.charAt(0)?.toUpperCase() || 'U'}
                        </button>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            className="p-2.5 text-[#aebac1] hover:bg-[#2a3942] rounded-full transition-colors"
                            title="Status"
                        >
                            <MessageCircle className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => navigate('/calls')}
                            className="p-2.5 text-[#aebac1] hover:bg-[#2a3942] rounded-full transition-colors"
                            title="New call"
                        >
                            <Phone className="w-5 h-5" />
                        </button>
                        <div className="relative" ref={menuRef}>
                            <button
                                onClick={() => setShowMenu(!showMenu)}
                                className="p-2.5 text-[#aebac1] hover:bg-[#2a3942] rounded-full transition-colors"
                            >
                                <MoreVertical className="w-5 h-5" />
                            </button>

                            {showMenu && (
                                <div className="absolute right-0 mt-2 w-56 bg-[#233138] rounded-md shadow-2xl py-2 z-50">
                                    <button
                                        onClick={() => {
                                            navigate('/profile');
                                            setShowMenu(false);
                                        }}
                                        className="w-full flex items-center gap-3 px-6 py-3 text-[#e9edef] hover:bg-[#182229] transition-colors text-sm"
                                    >
                                        <User className="w-4 h-4" />
                                        <span>Profile</span>
                                    </button>
                                    <button
                                        onClick={() => {
                                            navigate('/settings');
                                            setShowMenu(false);
                                        }}
                                        className="w-full flex items-center gap-3 px-6 py-3 text-[#e9edef] hover:bg-[#182229] transition-colors text-sm"
                                    >
                                        <Settings className="w-4 h-4" />
                                        <span>Settings</span>
                                    </button>
                                    <div className="my-2 border-t border-[#2a3942]"></div>
                                    <button
                                        onClick={handleLogout}
                                        className="w-full flex items-center gap-3 px-6 py-3 text-[#ea4d60] hover:bg-[#182229] transition-colors text-sm"
                                    >
                                        <LogOut className="w-4 h-4" />
                                        <span>Log out</span>
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Search */}
                <div className="px-3 py-2 bg-[#111b21]">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-[#8696a0]" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search or start new chat"
                            className="w-full pl-12 pr-4 py-2 bg-[#202c33] text-[#e9edef] placeholder-[#8696a0] rounded-lg focus:outline-none focus:bg-[#2a3942] transition-colors text-sm"
                        />
                    </div>
                </div>

                {/* Search Results */}
                {showSearchResults && (
                    <div className="flex-1 overflow-y-auto">
                        {isSearching ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00a884]"></div>
                            </div>
                        ) : searchResults.length > 0 ? (
                            <div>
                                <div className="px-4 py-2 text-xs text-[#8696a0] uppercase tracking-wide">
                                    Search Results
                                </div>
                                {searchResults.map((result) => (
                                    <button
                                        key={result.id}
                                        onClick={() => handleStartChat(result)}
                                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#202c33] transition-colors"
                                    >
                                        <div className="w-12 h-12 bg-[#374851] rounded-full flex items-center justify-center text-[#d1d7db] font-medium text-lg">
                                            {result.username.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="flex-1 text-left">
                                            <p className="font-medium text-[#e9edef] text-[15px]">{result.username}</p>
                                            <p className="text-sm text-[#8696a0]">{result.phone || result.email}</p>
                                        </div>
                                        <div className="flex items-center gap-2 text-[#00a884] text-sm font-medium">
                                            <MessageCircle className="w-4 h-4" />
                                            <span>Chat</span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="px-4 py-8">
                                <div className="text-center mb-6">
                                    <div className="w-20 h-20 bg-[#202c33] rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Search className="w-10 h-10 text-[#8696a0]" />
                                    </div>
                                    <p className="text-[#e9edef] text-lg mb-2">No users found</p>
                                    <p className="text-[#8696a0] text-sm">Try searching with a different username or phone number</p>
                                </div>

                                <div className="bg-[#202c33] rounded-lg p-4">
                                    <div className="flex items-center gap-3 mb-3">
                                        <div className="w-10 h-10 bg-[#00a884] rounded-full flex items-center justify-center">
                                            <UserPlus className="w-5 h-5 text-white" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-[#e9edef] font-medium">Invite to SnapTalker</p>
                                            <p className="text-[#8696a0] text-sm">Help your friends join</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => {
                                            const inviteText = `Hey! Join me on SnapTalker - a secure messaging app. Download at ${window.location.origin}`;
                                            const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(inviteText)}`;
                                            window.open(whatsappUrl, '_blank');
                                        }}
                                        className="w-full flex items-center justify-center gap-2 bg-[#00a884] hover:bg-[#06cf9c] text-white py-2.5 rounded-lg transition-colors font-medium"
                                    >
                                        <Share2 className="w-4 h-4" />
                                        <span>Share Invite Link</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Conversations */}
                {!showSearchResults && (
                    <div className="flex-1 overflow-y-auto">
                        {filteredConversations.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 px-8 text-[#8696a0]">
                                <MessageCircle className="w-16 h-16 mb-4 text-[#374851]" />
                                <p className="text-center">No chats yet</p>
                                <p className="text-sm text-center mt-1">Start a conversation</p>
                            </div>
                        ) : (
                            filteredConversations.map((conv) => (
                                <button
                                    key={conv.id}
                                    onClick={() => handleSelectChat(conv)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${selectedChat?.id === conv.id
                                        ? 'bg-[#2a3942]'
                                        : 'hover:bg-[#202c33]'
                                        }`}
                                >
                                    <div className="relative flex-shrink-0">
                                        <div className="w-12 h-12 bg-[#374851] rounded-full flex items-center justify-center text-[#d1d7db] font-medium text-lg">
                                            {conv.user.name.charAt(0).toUpperCase()}
                                        </div>
                                        {conv.user.online && (
                                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#00a884] border-2 border-[#111b21] rounded-full"></div>
                                        )}
                                    </div>
                                    <div className="flex-1 text-left min-w-0 py-1">
                                        <div className="flex items-center justify-between mb-0.5">
                                            <p className="font-medium text-[#e9edef] truncate text-[15px]">{conv.user.name}</p>
                                            <p className="text-xs text-[#8696a0] flex-shrink-0 ml-2">
                                                {formatTime(conv.time)}
                                            </p>
                                        </div>
                                        <div className="flex items-center justify-between gap-2">
                                            <p className="text-sm text-[#8696a0] truncate flex items-center gap-1">
                                                {conv.sender_id === user?.id && <CheckCheck className="w-3.5 h-3.5 flex-shrink-0 text-[#53bdeb]" />}
                                                {conv.lastMessage}
                                            </p>
                                            {conv.unread > 0 && (
                                                <span className="bg-[#00a884] text-[#111b21] text-xs font-semibold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5 flex-shrink-0">
                                                    {conv.unread}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* Chat Window */}
            <div className="flex-1 flex flex-col bg-[#0b141a]">
                {selectedChat ? (
                    <>
                        {/* Chat Header */}
                        <div className="flex items-center justify-between px-4 py-2.5 bg-[#202c33]">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                <button
                                    className="md:hidden p-2 text-[#aebac1] hover:bg-[#2a3942] rounded-full transition-colors"
                                    onClick={() => setSelectedChat(null)}
                                >
                                    <X className="w-5 h-5" />
                                </button>
                                <div className="relative flex-shrink-0">
                                    <div className="w-10 h-10 bg-[#374851] rounded-full flex items-center justify-center text-[#d1d7db] font-medium">
                                        {selectedChat.user.name.charAt(0).toUpperCase()}
                                    </div>
                                    {selectedChat.user.online && (
                                        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#00a884] border-2 border-[#202c33] rounded-full"></div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-[#e9edef] truncate text-[15px]">{selectedChat.user.name}</p>
                                    <p className="text-xs text-[#8696a0] truncate">
                                        {isTyping ? 'typing...' : selectedChat.user.online ? 'online' : selectedChat.time ? `last seen ${formatTime(selectedChat.time)}` : 'offline'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    className="p-2.5 text-[#aebac1] hover:bg-[#2a3942] rounded-full transition-colors"
                                    title="Voice call"
                                    onClick={() => navigate('/calls')}
                                >
                                    <Phone className="w-5 h-5" />
                                </button>
                                <button
                                    className="p-2.5 text-[#aebac1] hover:bg-[#2a3942] rounded-full transition-colors"
                                    title="Video call"
                                    onClick={() => navigate('/calls')}
                                >
                                    <Video className="w-5 h-5" />
                                </button>
                                <button
                                    className="p-2.5 text-[#aebac1] hover:bg-[#2a3942] rounded-full transition-colors"
                                    title="Search"
                                >
                                    <Search className="w-5 h-5" />
                                </button>
                                <button className="p-2.5 text-[#aebac1] hover:bg-[#2a3942] rounded-full transition-colors">
                                    <MoreVertical className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Encryption Banner */}
                        {encryptionEnabled && isInitialized && (
                            <div className="px-4 py-2 bg-[#182229] flex items-center justify-center gap-2 text-xs text-[#d1d5d8]">
                                <Lock className="w-3.5 h-3.5 text-[#e4c48b]" />
                                <span>Messages are end-to-end encrypted. No one outside of this chat can read them.</span>
                                <button onClick={handleViewSafetyNumber} className="text-[#00a884] hover:underline">
                                    Tap to learn more
                                </button>
                            </div>
                        )}

                        {/* Messages */}
                        <div
                            className="flex-1 overflow-y-auto px-4 md:px-16 py-6 space-y-2"
                            style={{
                                backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Cpolygon points='50,0 100,50 50,100 0,50'/%3E%3C/g%3E%3C/svg%3E")`,
                                backgroundSize: '200px 200px'
                            }}
                        >
                            {messages.length === 0 && (
                                <div className="flex items-center justify-center h-full">
                                    <div className="text-center text-[#8696a0] bg-[#1f2c34] px-8 py-6 rounded-xl max-w-md">
                                        <Lock className="w-12 h-12 mx-auto mb-4 text-[#e4c48b]" />
                                        <p className="font-medium text-[#d1d7db] mb-2">Messages are end-to-end encrypted</p>
                                        <p className="text-sm">No one outside of this chat, not even SnapTalker, can read or listen to them.</p>
                                    </div>
                                </div>
                            )}
                            {messages.map((message) => {
                                const isOwn = message.sender_id === user?.id;
                                const isFailed = message.status === 'failed';
                                return (
                                    <div
                                        key={message.id}
                                        className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div
                                            className={`max-w-[65%] md:max-w-md px-3 py-2 rounded-lg shadow-sm ${isFailed
                                                ? 'bg-[#7c2d12] text-[#e9edef]'
                                                : isOwn
                                                    ? 'bg-[#005c4b] text-[#e9edef]'
                                                    : 'bg-[#202c33] text-[#e9edef]'
                                                }`}
                                        >
                                            <p className="break-words text-[14.2px] leading-[19px]">{message.content}</p>
                                            <div className="flex items-center justify-end gap-1 mt-1">
                                                <span className="text-[11px] text-[#8696a0]">
                                                    {formatMessageTime(message.created_at)}
                                                </span>
                                                {isOwn && (
                                                    <div className="flex items-center ml-1">
                                                        {message.status === 'sending' && <Clock className="w-3.5 h-3.5 text-[#8696a0]" />}
                                                        {message.status === 'sent' && <Check className="w-3.5 h-3.5 text-[#8696a0]" />}
                                                        {message.status === 'delivered' && <CheckCheck className="w-3.5 h-3.5 text-[#8696a0]" />}
                                                        {message.status === 'read' && <CheckCheck className="w-3.5 h-3.5 text-[#53bdeb]" />}
                                                        {message.status === 'failed' && (
                                                            <button
                                                                onClick={() => retryFailedMessage(message)}
                                                                className="text-[#ef4444] hover:text-[#dc2626] flex items-center gap-1"
                                                                title="Retry sending"
                                                            >
                                                                <AlertTriangle className="w-3.5 h-3.5" />
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Message Input */}
                        <div className="px-4 py-2.5 bg-[#202c33]">
                            <form onSubmit={handleSendMessage} className="flex items-end gap-2">
                                <div className="flex items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                                        className="p-2 text-[#8696a0] hover:bg-[#2a3942] rounded-full transition-colors"
                                    >
                                        <Smile className="w-6 h-6" />
                                    </button>
                                    <button
                                        type="button"
                                        className="p-2 text-[#8696a0] hover:bg-[#2a3942] rounded-full transition-colors"
                                    >
                                        <Paperclip className="w-6 h-6" />
                                    </button>
                                </div>
                                <div className="flex-1 relative">
                                    {showEmojiPicker && (
                                        <div className="absolute bottom-full mb-2 left-0 bg-[#233138] rounded-xl p-3 shadow-2xl">
                                            <div className="grid grid-cols-8 gap-2">
                                                {emojis.map((emoji, idx) => (
                                                    <button
                                                        key={idx}
                                                        type="button"
                                                        onClick={() => {
                                                            setNewMessage(newMessage + emoji);
                                                            setShowEmojiPicker(false);
                                                        }}
                                                        className="text-2xl hover:bg-[#2a3942] rounded p-1 transition-colors"
                                                    >
                                                        {emoji}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    <input
                                        type="text"
                                        value={newMessage}
                                        onChange={(e) => setNewMessage(e.target.value)}
                                        placeholder="Type a message"
                                        className="w-full px-4 py-2.5 bg-[#2a3942] text-[#e9edef] placeholder-[#8696a0] rounded-lg focus:outline-none text-[15px]"
                                    />
                                </div>
                                {newMessage.trim() ? (
                                    <button
                                        type="submit"
                                        className="p-3 bg-[#00a884] text-[#111b21] rounded-full hover:bg-[#06cf9c] transition-all"
                                    >
                                        <Send className="w-5 h-5" />
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        className="p-3 text-[#8696a0] hover:bg-[#2a3942] rounded-full transition-colors"
                                    >
                                        <Mic className="w-5 h-5" />
                                    </button>
                                )}
                            </form>
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex items-center justify-center bg-[#0b141a]" style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.02'%3E%3Cpolygon points='50,0 100,50 50,100 0,50'/%3E%3C/g%3E%3C/svg%3E")`,
                        backgroundSize: '200px 200px'
                    }}>
                        <div className="text-center px-8 max-w-md">
                            <div className="w-80 h-80 mx-auto mb-10 opacity-10">
                                <svg viewBox="0 0 303 172" className="w-full h-full">
                                    <path fill="#525252" d="M149.5,0l147,85.4v85.4l-147,85.4L2.5,170.8V85.4L149.5,0z M149.5,25.1l-122,70.7v70.7l122,70.7l122-70.7V95.8 L149.5,25.1z" />
                                </svg>
                            </div>
                            <h2 className="text-[32px] font-light text-[#e9edef] mb-6">SnapTalker Web</h2>
                            <p className="text-[#8696a0] mb-8 text-sm leading-relaxed">
                                Send and receive messages without keeping your phone online.<br />
                                Use SnapTalker on up to 4 linked devices and 1 phone at the same time.
                            </p>
                            <div className="flex items-center justify-center gap-1 text-xs text-[#8696a0]">
                                <Lock className="w-3.5 h-3.5" />
                                <span>End-to-end encrypted</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Safety Number Modal */}
            {showSafetyNumber && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-[#202c33] rounded-lg max-w-md w-full overflow-hidden">
                        <div className="px-6 py-4 border-b border-[#2a3942] flex items-center justify-between">
                            <h3 className="text-lg font-medium text-[#e9edef]">Encryption</h3>
                            <button
                                onClick={() => setShowSafetyNumber(false)}
                                className="p-2 text-[#8696a0] hover:bg-[#2a3942] rounded-full transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="px-6 py-6">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 bg-[#374851] rounded-full flex items-center justify-center text-[#d1d7db] font-medium text-lg">
                                    {user?.username?.charAt(0)?.toUpperCase() || 'U'}
                                </div>
                                <Lock className="w-5 h-5 text-[#8696a0]" />
                                <div className="w-12 h-12 bg-[#374851] rounded-full flex items-center justify-center text-[#d1d7db] font-medium text-lg">
                                    {selectedChat?.user.name.charAt(0).toUpperCase()}
                                </div>
                            </div>

                            {safetyNumber ? (
                                <div className="bg-[#111b21] rounded-lg p-4 mb-4">
                                    <p className="text-[28px] font-mono text-center text-[#e9edef] leading-relaxed tracking-wider">
                                        {formatSafetyNumber(safetyNumber)}
                                    </p>
                                </div>
                            ) : (
                                <div className="bg-[#111b21] rounded-lg p-6 text-center text-[#8696a0]">
                                    Generating safety number...
                                </div>
                            )}

                            <p className="text-sm text-[#8696a0] leading-relaxed mb-4">
                                Your security code with <span className="text-[#e9edef]">{selectedChat?.user.name}</span>. You can use this to verify that your messages and calls with this contact are end-to-end encrypted.
                            </p>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(safetyNumber);
                                    }}
                                    className="flex-1 px-4 py-3 bg-[#00a884] text-[#111b21] rounded-lg hover:bg-[#06cf9c] transition-colors font-medium text-sm"
                                >
                                    Copy
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
