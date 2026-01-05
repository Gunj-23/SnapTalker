import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useEncryption } from '../context/EncryptionContext';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft, User, Bell, Shield, Lock, Key, Eye, EyeOff,
    Globe, MessageSquare, Phone, Video, Check, ChevronRight,
    Camera, Download, Trash2, LogOut, Save, X
} from 'lucide-react';

export default function Settings() {
    const { user, logout } = useAuth();
    const { encryptionEnabled, toggleEncryption, resetKeys, exportBackup } = useEncryption();
    const navigate = useNavigate();
    const [activeSection, setActiveSection] = useState(null);
    const [message, setMessage] = useState('');

    // Account Settings
    const [fullName, setFullName] = useState(user?.username || '');
    const [about, setAbout] = useState('Hey there! I am using SnapTalker');

    // Privacy Settings
    const [lastSeenPrivacy, setLastSeenPrivacy] = useState('everyone');
    const [profilePhotoPrivacy, setProfilePhotoPrivacy] = useState('everyone');
    const [aboutPrivacy, setAboutPrivacy] = useState('everyone');
    const [readReceipts, setReadReceipts] = useState(true);

    // Security Settings
    const [twoStepCode, setTwoStepCode] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Notification Settings
    const [messageNotifications, setMessageNotifications] = useState(true);
    const [groupNotifications, setGroupNotifications] = useState(true);
    const [callNotifications, setCallNotifications] = useState(true);
    const [notificationSound, setNotificationSound] = useState(true);

    const handleExportBackup = async () => {
        try {
            const backup = await exportBackup('backup-password');
            const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `snaptalker_backup_${Date.now()}.json`;
            a.click();
            setMessage('Backup exported successfully!');
        } catch (error) {
            setMessage('Failed to export backup');
        }
    };

    const handleDeleteAccount = async () => {
        if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
            try {
                await logout();
                navigate('/login');
            } catch (error) {
                setMessage('Failed to delete account');
            }
        }
    };

    const SettingItem = ({ icon: Icon, title, subtitle, onClick, rightElement, danger }) => (
        <button
            onClick={onClick}
            className={`w-full flex items-center gap-4 px-6 py-4 hover:bg-[#182229] transition-colors ${danger ? 'text-[#ea4d60]' : 'text-[#e9edef]'
                }`}
        >
            {Icon && <Icon className={`w-5 h-5 ${danger ? 'text-[#ea4d60]' : 'text-[#8696a0]'}`} />}
            <div className="flex-1 text-left min-w-0">
                <p className={`font-medium ${danger ? 'text-[#ea4d60]' : 'text-[#e9edef]'}`}>{title}</p>
                {subtitle && <p className="text-sm text-[#8696a0] truncate">{subtitle}</p>}
            </div>
            {rightElement || <ChevronRight className="w-5 h-5 text-[#8696a0] flex-shrink-0" />}
        </button>
    );

    const ToggleItem = ({ icon: Icon, title, subtitle, enabled, onChange }) => (
        <div className="flex items-center gap-4 px-6 py-4">
            {Icon && <Icon className="w-5 h-5 text-[#8696a0]" />}
            <div className="flex-1 text-left min-w-0">
                <p className="font-medium text-[#e9edef]">{title}</p>
                {subtitle && <p className="text-sm text-[#8696a0]">{subtitle}</p>}
            </div>
            <button
                onClick={() => onChange(!enabled)}
                className={`relative w-12 h-6 rounded-full transition-colors ${enabled ? 'bg-[#00a884]' : 'bg-[#3b4a54]'
                    }`}
            >
                <div
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${enabled ? 'right-1' : 'left-1'
                        }`}
                />
            </button>
        </div>
    );

    if (!activeSection) {
        return (
            <div className="h-screen flex bg-[#0b141a] overflow-hidden">
                <div className="flex-1 flex flex-col bg-[#111b21]">
                    {/* Header */}
                    <div className="bg-[#202c33] px-4 py-5 flex items-center gap-6">
                        <button
                            onClick={() => navigate('/messages')}
                            className="p-2 text-[#aebac1] hover:bg-[#2a3942] rounded-full transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <h1 className="text-[19px] font-medium text-[#e9edef]">Settings</h1>
                    </div>

                    {/* Profile Section */}
                    <div className="bg-[#202c33] mt-3">
                        <button
                            onClick={() => setActiveSection('profile')}
                            className="w-full flex items-center gap-4 px-6 py-5 hover:bg-[#2a3942] transition-colors"
                        >
                            <div className="w-16 h-16 bg-[#374851] rounded-full flex items-center justify-center text-[#d1d7db] font-medium text-2xl">
                                {user?.username?.charAt(0)?.toUpperCase() || 'U'}
                            </div>
                            <div className="flex-1 text-left">
                                <p className="text-[#e9edef] font-medium text-[17px]">{user?.username || 'User'}</p>
                                <p className="text-[#8696a0] text-sm mt-0.5">{about}</p>
                            </div>
                            <ChevronRight className="w-5 h-5 text-[#8696a0]" />
                        </button>
                    </div>

                    {/* Settings Groups */}
                    <div className="flex-1 overflow-y-auto">
                        {/* General Settings */}
                        <div className="bg-[#202c33] mt-3">
                            <div className="px-6 py-3">
                                <p className="text-[#00a884] text-sm font-medium">General</p>
                            </div>
                            <SettingItem
                                icon={Key}
                                title="Account"
                                subtitle="Privacy, security, change number"
                                onClick={() => setActiveSection('account')}
                            />
                            <SettingItem
                                icon={MessageSquare}
                                title="Chats"
                                subtitle="Theme, wallpapers, chat history"
                                onClick={() => setActiveSection('chats')}
                            />
                            <SettingItem
                                icon={Bell}
                                title="Notifications"
                                subtitle="Message, group & call tones"
                                onClick={() => setActiveSection('notifications')}
                            />
                            <SettingItem
                                icon={Globe}
                                title="Storage and data"
                                subtitle="Network usage, auto-download"
                                onClick={() => setActiveSection('storage')}
                            />
                        </div>

                        {/* Security Settings */}
                        <div className="bg-[#202c33] mt-3">
                            <div className="px-6 py-3">
                                <p className="text-[#00a884] text-sm font-medium">Security</p>
                            </div>
                            <SettingItem
                                icon={Shield}
                                title="Privacy"
                                subtitle="Block contacts, disappearing messages"
                                onClick={() => setActiveSection('privacy')}
                            />
                            <SettingItem
                                icon={Lock}
                                title="Security"
                                subtitle="Two-step verification, encryption keys"
                                onClick={() => setActiveSection('security')}
                            />
                        </div>

                        {/* Help */}
                        <div className="bg-[#202c33] mt-3">
                            <div className="px-6 py-3">
                                <p className="text-[#00a884] text-sm font-medium">Help</p>
                            </div>
                            <SettingItem
                                title="Help"
                                subtitle="Help center, contact us, privacy policy"
                                onClick={() => { }}
                            />
                            <SettingItem
                                title="App info"
                                subtitle="Version 2.0.0"
                                onClick={() => { }}
                            />
                        </div>

                        {/* Danger Zone */}
                        <div className="bg-[#202c33] mt-3 mb-3">
                            <SettingItem
                                icon={LogOut}
                                title="Log out"
                                onClick={async () => {
                                    await logout();
                                    navigate('/login');
                                }}
                                danger
                            />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Profile Edit Screen
    if (activeSection === 'profile') {
        return (
            <div className="h-screen flex bg-[#0b141a] overflow-hidden">
                <div className="flex-1 flex flex-col bg-[#111b21]">
                    <div className="bg-[#202c33] px-4 py-5 flex items-center gap-6">
                        <button
                            onClick={() => setActiveSection(null)}
                            className="p-2 text-[#aebac1] hover:bg-[#2a3942] rounded-full transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <h1 className="text-[19px] font-medium text-[#e9edef]">Profile</h1>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6">
                        <div className="max-w-2xl mx-auto space-y-6">
                            {/* Avatar */}
                            <div className="flex flex-col items-center gap-4 py-6">
                                <div className="relative">
                                    <div className="w-40 h-40 bg-[#374851] rounded-full flex items-center justify-center text-[#d1d7db] font-medium text-6xl">
                                        {user?.username?.charAt(0)?.toUpperCase() || 'U'}
                                    </div>
                                    <button className="absolute bottom-0 right-0 p-3 bg-[#00a884] rounded-full hover:bg-[#06cf9c] transition-colors">
                                        <Camera className="w-5 h-5 text-[#111b21]" />
                                    </button>
                                </div>
                            </div>

                            {/* Name */}
                            <div>
                                <label className="block text-[#00a884] text-sm font-medium mb-2 ml-1">Your name</label>
                                <input
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="w-full px-4 py-3 bg-[#2a3942] text-[#e9edef] rounded-lg focus:outline-none border-2 border-transparent focus:border-[#00a884] transition-colors"
                                    placeholder="Enter your name"
                                />
                                <p className="text-[#8696a0] text-xs mt-2 ml-1">
                                    This is not your username. This name will be visible to your SnapTalker contacts.
                                </p>
                            </div>

                            {/* About */}
                            <div>
                                <label className="block text-[#00a884] text-sm font-medium mb-2 ml-1">About</label>
                                <input
                                    type="text"
                                    value={about}
                                    onChange={(e) => setAbout(e.target.value)}
                                    className="w-full px-4 py-3 bg-[#2a3942] text-[#e9edef] rounded-lg focus:outline-none border-2 border-transparent focus:border-[#00a884] transition-colors"
                                    placeholder="About"
                                />
                            </div>

                            {/* Phone */}
                            <div>
                                <label className="block text-[#00a884] text-sm font-medium mb-2 ml-1">Phone</label>
                                <div className="px-4 py-3 bg-[#2a3942] text-[#8696a0] rounded-lg">
                                    {user?.phone || '+91 9876543210'}
                                </div>
                                <p className="text-[#8696a0] text-xs mt-2 ml-1">
                                    Phone number cannot be changed here.
                                </p>
                            </div>

                            <button
                                onClick={() => {
                                    setMessage('Profile updated successfully!');
                                    setTimeout(() => setActiveSection(null), 1000);
                                }}
                                className="w-full py-3 bg-[#00a884] text-[#111b21] rounded-lg hover:bg-[#06cf9c] transition-colors font-medium"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Privacy Screen
    if (activeSection === 'privacy') {
        return (
            <div className="h-screen flex bg-[#0b141a] overflow-hidden">
                <div className="flex-1 flex flex-col bg-[#111b21]">
                    <div className="bg-[#202c33] px-4 py-5 flex items-center gap-6">
                        <button
                            onClick={() => setActiveSection(null)}
                            className="p-2 text-[#aebac1] hover:bg-[#2a3942] rounded-full transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <h1 className="text-[19px] font-medium text-[#e9edef]">Privacy</h1>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        <div className="bg-[#1f2c34] px-6 py-4 mt-3">
                            <p className="text-[#8696a0] text-sm leading-relaxed">
                                Who can see my personal info
                            </p>
                        </div>

                        <div className="bg-[#202c33]">
                            <SettingItem
                                title="Last seen and online"
                                subtitle={lastSeenPrivacy === 'everyone' ? 'Everyone' : lastSeenPrivacy === 'contacts' ? 'My contacts' : 'Nobody'}
                                onClick={() => { }}
                            />
                            <SettingItem
                                title="Profile photo"
                                subtitle={profilePhotoPrivacy === 'everyone' ? 'Everyone' : profilePhotoPrivacy === 'contacts' ? 'My contacts' : 'Nobody'}
                                onClick={() => { }}
                            />
                            <SettingItem
                                title="About"
                                subtitle={aboutPrivacy === 'everyone' ? 'Everyone' : aboutPrivacy === 'contacts' ? 'My contacts' : 'Nobody'}
                                onClick={() => { }}
                            />
                            <ToggleItem
                                title="Read receipts"
                                subtitle="If turned off, you won't send or receive Read receipts"
                                enabled={readReceipts}
                                onChange={setReadReceipts}
                            />
                        </div>

                        <div className="bg-[#1f2c34] px-6 py-4 mt-3">
                            <p className="text-[#8696a0] text-sm leading-relaxed">
                                Disappearing messages
                            </p>
                        </div>

                        <div className="bg-[#202c33]">
                            <SettingItem
                                title="Default message timer"
                                subtitle="Off"
                                onClick={() => { }}
                            />
                        </div>

                        <div className="bg-[#1f2c34] px-6 py-4 mt-3">
                            <p className="text-[#8696a0] text-sm leading-relaxed">
                                Blocked contacts: None
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Security Screen
    if (activeSection === 'security') {
        return (
            <div className="h-screen flex bg-[#0b141a] overflow-hidden">
                <div className="flex-1 flex flex-col bg-[#111b21]">
                    <div className="bg-[#202c33] px-4 py-5 flex items-center gap-6">
                        <button
                            onClick={() => setActiveSection(null)}
                            className="p-2 text-[#aebac1] hover:bg-[#2a3942] rounded-full transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <h1 className="text-[19px] font-medium text-[#e9edef]">Security</h1>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        <div className="bg-[#1f2c34] px-6 py-4 mt-3">
                            <p className="text-[#8696a0] text-sm leading-relaxed">
                                Additional security measures
                            </p>
                        </div>

                        <div className="bg-[#202c33]">
                            <ToggleItem
                                icon={Lock}
                                title="Two-step verification"
                                subtitle="Add extra security to your account"
                                enabled={false}
                                onChange={() => { }}
                            />
                            <ToggleItem
                                icon={Shield}
                                title="End-to-end encryption"
                                subtitle={encryptionEnabled ? 'Enabled' : 'Disabled'}
                                enabled={encryptionEnabled}
                                onChange={toggleEncryption}
                            />
                        </div>

                        <div className="bg-[#1f2c34] px-6 py-4 mt-3">
                            <p className="text-[#8696a0] text-sm leading-relaxed">
                                Encryption keys backup
                            </p>
                        </div>

                        <div className="bg-[#202c33]">
                            <SettingItem
                                icon={Download}
                                title="Export encryption keys"
                                subtitle="Backup your encryption keys securely"
                                onClick={handleExportBackup}
                            />
                            <SettingItem
                                icon={Key}
                                title="Reset encryption keys"
                                subtitle="Generate new encryption keys"
                                onClick={async () => {
                                    if (window.confirm('Are you sure? This will reset all encryption keys.')) {
                                        await resetKeys();
                                        setMessage('Encryption keys reset successfully!');
                                    }
                                }}
                            />
                        </div>

                        <div className="bg-[#1f2c34] px-6 py-4 mt-3">
                            <div className="flex items-start gap-2">
                                <Lock className="w-4 h-4 text-[#e4c48b] flex-shrink-0 mt-0.5" />
                                <p className="text-[#8696a0] text-xs leading-relaxed">
                                    Your personal messages are end-to-end encrypted. SnapTalker uses the Signal Protocol for secure messaging.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Notifications Screen
    if (activeSection === 'notifications') {
        return (
            <div className="h-screen flex bg-[#0b141a] overflow-hidden">
                <div className="flex-1 flex flex-col bg-[#111b21]">
                    <div className="bg-[#202c33] px-4 py-5 flex items-center gap-6">
                        <button
                            onClick={() => setActiveSection(null)}
                            className="p-2 text-[#aebac1] hover:bg-[#2a3942] rounded-full transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <h1 className="text-[19px] font-medium text-[#e9edef]">Notifications</h1>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        <div className="bg-[#1f2c34] px-6 py-4 mt-3">
                            <p className="text-[#8696a0] text-sm leading-relaxed">
                                Notification settings
                            </p>
                        </div>

                        <div className="bg-[#202c33]">
                            <ToggleItem
                                icon={MessageSquare}
                                title="Messages"
                                subtitle="Show notifications for new messages"
                                enabled={messageNotifications}
                                onChange={setMessageNotifications}
                            />
                            <ToggleItem
                                icon={Users}
                                title="Groups"
                                subtitle="Show notifications for group messages"
                                enabled={groupNotifications}
                                onChange={setGroupNotifications}
                            />
                            <ToggleItem
                                icon={Phone}
                                title="Calls"
                                subtitle="Show notifications for incoming calls"
                                enabled={callNotifications}
                                onChange={setCallNotifications}
                            />
                            <div className="h-px bg-[#2a3942] mx-6" />
                            <ToggleItem
                                title="Notification sound"
                                subtitle="Play sound for notifications"
                                enabled={notificationSound}
                                onChange={setNotificationSound}
                            />
                        </div>

                        <div className="bg-[#1f2c34] px-6 py-4 mt-3">
                            <p className="text-[#8696a0] text-xs leading-relaxed">
                                Turn off notifications to stop receiving alerts. You can still check messages manually.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Account Screen
    if (activeSection === 'account') {
        return (
            <div className="h-screen flex bg-[#0b141a] overflow-hidden">
                <div className="flex-1 flex flex-col bg-[#111b21]">
                    <div className="bg-[#202c33] px-4 py-5 flex items-center gap-6">
                        <button
                            onClick={() => setActiveSection(null)}
                            className="p-2 text-[#aebac1] hover:bg-[#2a3942] rounded-full transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <h1 className="text-[19px] font-medium text-[#e9edef]">Account</h1>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        <div className="bg-[#202c33] mt-3">
                            <SettingItem
                                title="Change number"
                                subtitle="Change your phone number"
                                onClick={() => { }}
                            />
                            <SettingItem
                                title="Request account info"
                                subtitle="Download your account information"
                                onClick={() => { }}
                            />
                        </div>

                        <div className="bg-[#202c33] mt-3">
                            <SettingItem
                                icon={Trash2}
                                title="Delete my account"
                                subtitle="Permanently delete your account"
                                onClick={handleDeleteAccount}
                                danger
                            />
                        </div>

                        <div className="bg-[#1f2c34] px-6 py-4 mt-3">
                            <p className="text-[#8696a0] text-xs leading-relaxed">
                                Deleting your account will remove all your messages, groups, and account data. This action cannot be undone.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Default fallback (chats, storage, etc.)
    return (
        <div className="h-screen flex bg-[#0b141a] overflow-hidden">
            <div className="flex-1 flex flex-col bg-[#111b21]">
                <div className="bg-[#202c33] px-4 py-5 flex items-center gap-6">
                    <button
                        onClick={() => setActiveSection(null)}
                        className="p-2 text-[#aebac1] hover:bg-[#2a3942] rounded-full transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h1 className="text-[19px] font-medium text-[#e9edef] capitalize">{activeSection}</h1>
                </div>

                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center text-[#8696a0]">
                        <p>This section is under development</p>
                        <button
                            onClick={() => setActiveSection(null)}
                            className="mt-4 px-6 py-2 bg-[#00a884] text-[#111b21] rounded-lg hover:bg-[#06cf9c] transition-colors"
                        >
                            Go Back
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
