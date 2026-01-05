import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Phone, PhoneOff, Video, VideoOff, Mic, MicOff, Monitor,
    ArrowLeft, PhoneIncoming, PhoneOutgoing, PhoneMissed,
    Search, MoreVertical, Plus, Link as LinkIcon, X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Calls() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [callHistory, setCallHistory] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [showLinkDialog, setShowLinkDialog] = useState(false);
    const [meetingLink, setMeetingLink] = useState('');

    const createMeeting = () => {
        const roomId = Math.random().toString(36).substring(2, 10);
        navigate(`/meeting/${roomId}`);
    };

    const createInstantMeeting = () => {
        const roomId = Math.random().toString(36).substring(2, 10);
        const link = `${window.location.origin}/meeting/${roomId}`;
        setMeetingLink(link);
        setShowLinkDialog(true);
    };

    const joinMeeting = () => {
        const roomId = prompt('Enter meeting ID:');
        if (roomId) {
            navigate(`/meeting/${roomId}`);
        }
    };

    const copyMeetingLink = () => {
        navigator.clipboard.writeText(meetingLink);
        alert('Meeting link copied!');
    };

    // Mock call history
    useEffect(() => {
        setCallHistory([
            {
                id: 1,
                contactName: 'Alice Johnson',
                type: 'incoming',
                callType: 'video',
                duration: '5:32',
                timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
                status: 'completed'
            },
            {
                id: 2,
                contactName: 'Bob Smith',
                type: 'outgoing',
                callType: 'audio',
                duration: '12:45',
                timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000),
                status: 'completed'
            },
            {
                id: 3,
                contactName: 'Charlie Brown',
                type: 'missed',
                callType: 'video',
                duration: '0:00',
                timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
                status: 'missed'
            },
            {
                id: 4,
                contactName: 'Diana Prince',
                type: 'incoming',
                callType: 'audio',
                duration: '3:15',
                timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
                status: 'completed'
            },
            {
                id: 5,
                contactName: 'Eve Adams',
                type: 'outgoing',
                callType: 'video',
                duration: '18:22',
                timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
                status: 'completed'
            }
        ]);
    }, []);

    const formatTimestamp = (date) => {
        const now = new Date();
        const callDate = new Date(date);
        const diffDays = Math.floor((now - callDate) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
            return callDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        } else if (diffDays === 1) {
            return 'Yesterday';
        } else if (diffDays < 7) {
            return callDate.toLocaleDateString('en-US', { weekday: 'short' });
        } else {
            return callDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
    };

    const getCallIcon = (call) => {
        if (call.status === 'missed') {
            return <PhoneMissed className="w-4 h-4 text-[#ea4d60]" />;
        } else if (call.type === 'incoming') {
            return <PhoneIncoming className="w-4 h-4 text-[#00a884]" />;
        } else {
            return <PhoneOutgoing className="w-4 h-4 text-[#8696a0]" />;
        }
    };

    const filteredCalls = callHistory.filter(call =>
        call.contactName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="h-screen flex bg-[#111b21] overflow-hidden">
            {/* Sidebar */}
            <div className="w-full md:w-[420px] bg-[#111b21] border-r border-[#2a3942] flex flex-col">
                {/* Header */}
                <div className="bg-[#202c33] px-4 py-3 flex items-center justify-between">
                    <button
                        onClick={() => navigate('/messages')}
                        className="p-2 text-[#aebac1] hover:bg-[#2a3942] rounded-full transition-colors md:hidden"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h1 className="text-[19px] font-medium text-[#e9edef]">Calls</h1>
                    <div className="flex items-center gap-1">
                        <button className="p-2.5 text-[#aebac1] hover:bg-[#2a3942] rounded-full transition-colors">
                            <Search className="w-5 h-5" />
                        </button>
                        <button className="p-2.5 text-[#aebac1] hover:bg-[#2a3942] rounded-full transition-colors">
                            <MoreVertical className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Create Meeting Button */}
                <div className="p-4">
                    <button
                        onClick={createInstantMeeting}
                        className="w-full flex items-center justify-center gap-3 bg-[#00a884] text-[#111b21] px-6 py-4 rounded-xl hover:bg-[#06cf9c] transition-all font-medium"
                    >
                        <LinkIcon className="w-5 h-5" />
                        <span>Create call link</span>
                    </button>
                </div>

                {/* Call History */}
                <div className="flex-1 overflow-y-auto">
                    <div className="px-6 py-3">
                        <h2 className="text-[15px] font-medium text-[#8696a0]">Recent</h2>
                    </div>
                    {filteredCalls.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 px-8 text-[#8696a0]">
                            <Phone className="w-16 h-16 mb-4 text-[#374851]" />
                            <p className="text-center">No calls yet</p>
                            <p className="text-sm text-center mt-1">Start calling your contacts</p>
                        </div>
                    ) : (
                        <div>
                            {filteredCalls.map((call) => (
                                <button
                                    key={call.id}
                                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#202c33] transition-colors"
                                >
                                    <div className="w-12 h-12 bg-[#374851] rounded-full flex items-center justify-center text-[#d1d7db] font-medium text-lg">
                                        {call.contactName.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 text-left min-w-0">
                                        <p className="font-medium text-[#e9edef] truncate text-[15px]">{call.contactName}</p>
                                        <div className="flex items-center gap-2 text-sm mt-0.5">
                                            {getCallIcon(call)}
                                            <span className={call.status === 'missed' ? 'text-[#ea4d60]' : 'text-[#8696a0]'}>
                                                {call.status === 'missed' ? 'Missed' : call.type === 'incoming' ? 'Incoming' : 'Outgoing'}
                                            </span>
                                            {call.duration !== '0:00' && (
                                                <>
                                                    <span className="text-[#8696a0]">·</span>
                                                    <span className="text-[#8696a0]">{call.duration}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <span className="text-xs text-[#8696a0]">
                                            {formatTimestamp(call.timestamp)}
                                        </span>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                // Start call logic here
                                            }}
                                            className="p-2 text-[#00a884] hover:bg-[#2a3942] rounded-full transition-colors"
                                        >
                                            {call.callType === 'video' ? (
                                                <Video className="w-5 h-5" />
                                            ) : (
                                                <Phone className="w-5 h-5" />
                                            )}
                                        </button>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex items-center justify-center bg-[#0b141a]" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.02'%3E%3Cpolygon points='50,0 100,50 50,100 0,50'/%3E%3C/g%3E%3C/svg%3E")`,
                backgroundSize: '200px 200px'
            }}>
                <div className="text-center px-8 max-w-lg">
                    <div className="w-64 h-64 mx-auto mb-10 relative">
                        <div className="absolute inset-0 bg-[#00a884] rounded-full opacity-10 animate-pulse"></div>
                        <div className="absolute inset-8 bg-[#00a884] rounded-full opacity-20 flex items-center justify-center">
                            <Phone className="w-32 h-32 text-[#00a884] opacity-50" />
                        </div>
                    </div>
                    <h2 className="text-[32px] font-light text-[#e9edef] mb-6">Make Calls on SnapTalker</h2>
                    <p className="text-[#8696a0] mb-8 text-sm leading-relaxed">
                        Make voice and video calls with end-to-end encryption.<br />
                        Create meeting links to invite multiple people.
                    </p>
                    <div className="flex flex-col gap-3 max-w-sm mx-auto">
                        <button
                            onClick={createMeeting}
                            className="px-8 py-3 bg-[#00a884] text-[#111b21] rounded-lg hover:bg-[#06cf9c] transition-colors font-medium"
                        >
                            Start New Meeting
                        </button>
                        <button
                            onClick={joinMeeting}
                            className="px-8 py-3 bg-[#2a3942] text-[#e9edef] rounded-lg hover:bg-[#374851] transition-colors font-medium"
                        >
                            Join with ID
                        </button>
                    </div>
                </div>
            </div>

            {/* Meeting Link Dialog */}
            {showLinkDialog && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-[#202c33] rounded-lg max-w-md w-full overflow-hidden">
                        <div className="px-6 py-4 border-b border-[#2a3942] flex items-center justify-between">
                            <h3 className="text-lg font-medium text-[#e9edef]">Meeting link created</h3>
                            <button
                                onClick={() => setShowLinkDialog(false)}
                                className="p-2 text-[#8696a0] hover:bg-[#2a3942] rounded-full transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="px-6 py-6">
                            <p className="text-sm text-[#8696a0] mb-4">
                                Share this link with others to join the meeting
                            </p>

                            <div className="bg-[#111b21] rounded-lg p-4 mb-4 break-all">
                                <p className="text-[#00a884] text-sm font-mono">{meetingLink}</p>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={copyMeetingLink}
                                    className="flex-1 px-4 py-3 bg-[#00a884] text-[#111b21] rounded-lg hover:bg-[#06cf9c] transition-colors font-medium text-sm"
                                >
                                    Copy Link
                                </button>
                                <button
                                    onClick={() => {
                                        navigate(meetingLink.split(window.location.origin)[1]);
                                        setShowLinkDialog(false);
                                    }}
                                    className="flex-1 px-4 py-3 bg-[#2a3942] text-[#e9edef] rounded-lg hover:bg-[#374851] transition-colors font-medium text-sm"
                                >
                                    Join Now
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
