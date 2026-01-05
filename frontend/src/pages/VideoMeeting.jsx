import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Mic, MicOff, Video, VideoOff, Monitor, MonitorOff, PhoneOff,
    Users, Settings, MessageSquare, MoreVertical, Copy, Check,
    UserPlus, Lock, Grid3x3, Maximize2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function VideoMeeting() {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    // Meeting state
    const [participants, setParticipants] = useState([]);
    const [localStream, setLocalStream] = useState(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const [chatMessages, setChatMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');
    const [showChat, setShowChat] = useState(false);
    const [showParticipants, setShowParticipants] = useState(false);
    const [roomInfo, setRoomInfo] = useState(null);
    const [copySuccess, setCopySuccess] = useState(false);
    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'speaker'

    // WebRTC refs
    const localVideoRef = useRef(null);
    const screenShareRef = useRef(null);
    const peerConnections = useRef({});
    const wsRef = useRef(null);

    // WebRTC Configuration
    const rtcConfig = {
        iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' },
            { urls: 'stun:stun2.l.google.com:19302' }
        ]
    };

    useEffect(() => {
        initializeMeeting();
        return () => {
            cleanup();
        };
    }, [roomId]);

    const initializeMeeting = async () => {
        try {
            // Get room info
            setRoomInfo({
                id: roomId || generateRoomId(),
                name: `Meeting Room ${roomId || 'New'}`,
                createdAt: new Date(),
                participants: 1
            });

            // Initialize local media
            await initializeLocalMedia();

            // Connect to signaling server
            connectToSignalingServer();

        } catch (error) {
            console.error('Failed to initialize meeting:', error);
            alert('Failed to join meeting. Please check camera/microphone permissions.');
        }
    };

    const initializeLocalMedia = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                },
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });

            setLocalStream(stream);
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
            }

            // Add self as participant
            setParticipants(prev => [...prev, {
                id: user?.id || 'local',
                name: user?.username || 'You',
                stream: stream,
                isLocal: true,
                isMuted: false,
                isVideoOff: false
            }]);

        } catch (error) {
            console.error('Failed to get media:', error);
            throw error;
        }
    };

    const connectToSignalingServer = () => {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.hostname}:8080/api/v1/calls/signal`;

        wsRef.current = new WebSocket(wsUrl);

        wsRef.current.onopen = () => {
            console.log('Connected to signaling server');
            // Join room
            wsRef.current.send(JSON.stringify({
                type: 'join-room',
                roomId: roomInfo?.id,
                userId: user?.id,
                userName: user?.username
            }));
        };

        wsRef.current.onmessage = async (event) => {
            const message = JSON.parse(event.data);
            await handleSignalingMessage(message);
        };

        wsRef.current.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        wsRef.current.onclose = () => {
            console.log('Disconnected from signaling server');
        };
    };

    const handleSignalingMessage = async (message) => {
        switch (message.type) {
            case 'user-joined':
                await handleUserJoined(message);
                break;
            case 'user-left':
                handleUserLeft(message);
                break;
            case 'offer':
                await handleOffer(message);
                break;
            case 'answer':
                await handleAnswer(message);
                break;
            case 'ice-candidate':
                await handleIceCandidate(message);
                break;
            case 'chat-message':
                handleChatMessage(message);
                break;
            default:
                console.log('Unknown message type:', message.type);
        }
    };

    const handleUserJoined = async (message) => {
        const { userId, userName } = message;

        // Create peer connection for new user
        const peerConnection = new RTCPeerConnection(rtcConfig);
        peerConnections.current[userId] = peerConnection;

        // Add local stream to peer connection
        if (localStream) {
            localStream.getTracks().forEach(track => {
                peerConnection.addTrack(track, localStream);
            });
        }

        // Handle remote stream
        peerConnection.ontrack = (event) => {
            setParticipants(prev => {
                const existing = prev.find(p => p.id === userId);
                if (existing) {
                    return prev.map(p => p.id === userId ? { ...p, stream: event.streams[0] } : p);
                }
                return [...prev, {
                    id: userId,
                    name: userName,
                    stream: event.streams[0],
                    isLocal: false,
                    isMuted: false,
                    isVideoOff: false
                }];
            });
        };

        // Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
            if (event.candidate && wsRef.current) {
                wsRef.current.send(JSON.stringify({
                    type: 'ice-candidate',
                    candidate: event.candidate,
                    targetUserId: userId
                }));
            }
        };

        // Create and send offer
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);

        wsRef.current.send(JSON.stringify({
            type: 'offer',
            offer: offer,
            targetUserId: userId
        }));
    };

    const handleOffer = async (message) => {
        const { offer, userId, userName } = message;

        const peerConnection = new RTCPeerConnection(rtcConfig);
        peerConnections.current[userId] = peerConnection;

        // Add local stream
        if (localStream) {
            localStream.getTracks().forEach(track => {
                peerConnection.addTrack(track, localStream);
            });
        }

        // Handle remote stream
        peerConnection.ontrack = (event) => {
            setParticipants(prev => {
                const existing = prev.find(p => p.id === userId);
                if (existing) {
                    return prev.map(p => p.id === userId ? { ...p, stream: event.streams[0] } : p);
                }
                return [...prev, {
                    id: userId,
                    name: userName,
                    stream: event.streams[0],
                    isLocal: false
                }];
            });
        };

        // Handle ICE candidates
        peerConnection.onicecandidate = (event) => {
            if (event.candidate && wsRef.current) {
                wsRef.current.send(JSON.stringify({
                    type: 'ice-candidate',
                    candidate: event.candidate,
                    targetUserId: userId
                }));
            }
        };

        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        wsRef.current.send(JSON.stringify({
            type: 'answer',
            answer: answer,
            targetUserId: userId
        }));
    };

    const handleAnswer = async (message) => {
        const { answer, userId } = message;
        const peerConnection = peerConnections.current[userId];

        if (peerConnection) {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
        }
    };

    const handleIceCandidate = async (message) => {
        const { candidate, userId } = message;
        const peerConnection = peerConnections.current[userId];

        if (peerConnection) {
            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        }
    };

    const handleUserLeft = (message) => {
        const { userId } = message;

        // Close peer connection
        if (peerConnections.current[userId]) {
            peerConnections.current[userId].close();
            delete peerConnections.current[userId];
        }

        // Remove from participants
        setParticipants(prev => prev.filter(p => p.id !== userId));
    };

    const handleChatMessage = (message) => {
        setChatMessages(prev => [...prev, {
            id: Date.now(),
            userId: message.userId,
            userName: message.userName,
            message: message.message,
            timestamp: new Date()
        }]);
    };

    // Media controls
    const toggleMute = () => {
        if (localStream) {
            localStream.getAudioTracks().forEach(track => {
                track.enabled = !track.enabled;
            });
            setIsMuted(!isMuted);

            // Update participant state
            setParticipants(prev => prev.map(p =>
                p.isLocal ? { ...p, isMuted: !isMuted } : p
            ));
        }
    };

    const toggleVideo = () => {
        if (localStream) {
            localStream.getVideoTracks().forEach(track => {
                track.enabled = !track.enabled;
            });
            setIsVideoOff(!isVideoOff);

            // Update participant state
            setParticipants(prev => prev.map(p =>
                p.isLocal ? { ...p, isVideoOff: !isVideoOff } : p
            ));
        }
    };

    const toggleScreenShare = async () => {
        if (isScreenSharing) {
            // Stop screen sharing
            if (screenShareRef.current) {
                screenShareRef.current.getTracks().forEach(track => track.stop());
                screenShareRef.current = null;
            }
            setIsScreenSharing(false);

            // Re-add camera stream
            if (localStream) {
                Object.values(peerConnections.current).forEach(pc => {
                    const videoSender = pc.getSenders().find(s => s.track?.kind === 'video');
                    if (videoSender && localStream.getVideoTracks()[0]) {
                        videoSender.replaceTrack(localStream.getVideoTracks()[0]);
                    }
                });
            }
        } else {
            try {
                // Start screen sharing
                const screenStream = await navigator.mediaDevices.getDisplayMedia({
                    video: {
                        cursor: 'always'
                    },
                    audio: false
                });

                screenShareRef.current = screenStream;
                setIsScreenSharing(true);

                // Replace video track in all peer connections
                Object.values(peerConnections.current).forEach(pc => {
                    const videoSender = pc.getSenders().find(s => s.track?.kind === 'video');
                    if (videoSender && screenStream.getVideoTracks()[0]) {
                        videoSender.replaceTrack(screenStream.getVideoTracks()[0]);
                    }
                });

                // Handle screen share stop
                screenStream.getVideoTracks()[0].onended = () => {
                    toggleScreenShare();
                };

            } catch (error) {
                console.error('Failed to start screen sharing:', error);
            }
        }
    };

    const sendChatMessage = () => {
        if (chatInput.trim() && wsRef.current) {
            wsRef.current.send(JSON.stringify({
                type: 'chat-message',
                message: chatInput,
                userId: user?.id,
                userName: user?.username
            }));
            setChatInput('');
        }
    };

    const copyMeetingLink = () => {
        const link = `${window.location.origin}/meeting/${roomInfo?.id}`;
        navigator.clipboard.writeText(link);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
    };

    const leaveMeeting = () => {
        if (wsRef.current) {
            wsRef.current.send(JSON.stringify({
                type: 'leave-room',
                roomId: roomInfo?.id,
                userId: user?.id
            }));
        }
        cleanup();
        navigate('/calls');
    };

    const cleanup = () => {
        // Stop local media
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
        }
        if (screenShareRef.current) {
            screenShareRef.current.getTracks().forEach(track => track.stop());
        }

        // Close all peer connections
        Object.values(peerConnections.current).forEach(pc => pc.close());
        peerConnections.current = {};

        // Close WebSocket
        if (wsRef.current) {
            wsRef.current.close();
        }
    };

    const generateRoomId = () => {
        return Math.random().toString(36).substring(2, 10);
    };

    const VideoTile = ({ participant, isLarge = false }) => (
        <div className={`relative bg-gray-900 rounded-lg overflow-hidden ${isLarge ? 'col-span-2 row-span-2' : ''}`}>
            {participant.stream && !participant.isVideoOff ? (
                <video
                    autoPlay
                    playsInline
                    muted={participant.isLocal}
                    ref={participant.isLocal ? localVideoRef : null}
                    className="w-full h-full object-cover"
                    onLoadedMetadata={(e) => {
                        if (!participant.isLocal) {
                            e.target.srcObject = participant.stream;
                        }
                    }}
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-saffron to-green-india">
                    <div className="text-white text-4xl font-bold">
                        {participant.name?.charAt(0)?.toUpperCase()}
                    </div>
                </div>
            )}

            {/* Participant info overlay */}
            <div className="absolute bottom-2 left-2 bg-black/50 px-3 py-1 rounded-full flex items-center gap-2">
                <span className="text-white text-sm font-medium">{participant.name}</span>
                {participant.isMuted && <MicOff className="w-4 h-4 text-red-400" />}
            </div>

            {participant.isLocal && (
                <div className="absolute top-2 right-2 bg-blue-500 px-2 py-1 rounded text-white text-xs font-bold">
                    YOU
                </div>
            )}
        </div>
    );

    return (
        <div className="h-screen flex flex-col bg-gray-900">
            {/* Header */}
            <div className="bg-gray-800 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Lock className="w-5 h-5 text-green-500" />
                    <div>
                        <h1 className="text-white font-semibold">{roomInfo?.name}</h1>
                        <p className="text-gray-400 text-xs flex items-center gap-2">
                            <span>End-to-end encrypted</span>
                            <span>•</span>
                            <span>{participants.length} participants</span>
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setViewMode(viewMode === 'grid' ? 'speaker' : 'grid')}
                        className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition"
                        title={viewMode === 'grid' ? 'Speaker view' : 'Grid view'}
                    >
                        <Grid3x3 className="w-5 h-5" />
                    </button>
                    <button
                        onClick={copyMeetingLink}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
                    >
                        {copySuccess ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        <span>{copySuccess ? 'Copied!' : 'Copy link'}</span>
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Video Grid */}
                <div className="flex-1 p-4">
                    <div className={`grid gap-4 h-full ${participants.length === 1 ? 'grid-cols-1' :
                            participants.length === 2 ? 'grid-cols-2' :
                                participants.length <= 4 ? 'grid-cols-2 grid-rows-2' :
                                    participants.length <= 6 ? 'grid-cols-3 grid-rows-2' :
                                        'grid-cols-4 grid-rows-2'
                        }`}>
                        {participants.map(participant => (
                            <VideoTile key={participant.id} participant={participant} />
                        ))}
                    </div>
                </div>

                {/* Chat Sidebar */}
                {showChat && (
                    <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
                        <div className="p-4 border-b border-gray-700">
                            <h3 className="text-white font-semibold">Chat</h3>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {chatMessages.map(msg => (
                                <div key={msg.id} className="bg-gray-700 rounded-lg p-3">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-white font-medium text-sm">{msg.userName}</span>
                                        <span className="text-gray-400 text-xs">
                                            {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>
                                    <p className="text-gray-300 text-sm">{msg.message}</p>
                                </div>
                            ))}
                        </div>
                        <div className="p-4 border-t border-gray-700">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                                    placeholder="Type a message..."
                                    className="flex-1 px-3 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-saffron"
                                />
                                <button
                                    onClick={sendChatMessage}
                                    className="px-4 py-2 bg-saffron text-white rounded-lg hover:bg-orange-india transition"
                                >
                                    Send
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Participants Sidebar */}
                {showParticipants && (
                    <div className="w-64 bg-gray-800 border-l border-gray-700 flex flex-col">
                        <div className="p-4 border-b border-gray-700">
                            <h3 className="text-white font-semibold">Participants ({participants.length})</h3>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-2">
                            {participants.map(participant => (
                                <div key={participant.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-700">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-saffron to-green-india flex items-center justify-center text-white font-bold text-sm">
                                        {participant.name?.charAt(0)?.toUpperCase()}
                                    </div>
                                    <span className="text-white flex-1">{participant.name}</span>
                                    {participant.isMuted && <MicOff className="w-4 h-4 text-gray-400" />}
                                    {participant.isVideoOff && <VideoOff className="w-4 h-4 text-gray-400" />}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Controls */}
            <div className="bg-gray-800 border-t border-gray-700 px-6 py-4">
                <div className="flex items-center justify-between">
                    {/* Left controls */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={toggleMute}
                            className={`p-4 rounded-full transition ${isMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-700 hover:bg-gray-600'
                                }`}
                        >
                            {isMuted ? <MicOff className="w-6 h-6 text-white" /> : <Mic className="w-6 h-6 text-white" />}
                        </button>
                        <button
                            onClick={toggleVideo}
                            className={`p-4 rounded-full transition ${isVideoOff ? 'bg-red-500 hover:bg-red-600' : 'bg-gray-700 hover:bg-gray-600'
                                }`}
                        >
                            {isVideoOff ? <VideoOff className="w-6 h-6 text-white" /> : <Video className="w-6 h-6 text-white" />}
                        </button>
                        <button
                            onClick={toggleScreenShare}
                            className={`p-4 rounded-full transition ${isScreenSharing ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'
                                }`}
                        >
                            {isScreenSharing ? <MonitorOff className="w-6 h-6 text-white" /> : <Monitor className="w-6 h-6 text-white" />}
                        </button>
                    </div>

                    {/* Center - Leave button */}
                    <button
                        onClick={leaveMeeting}
                        className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-full font-semibold transition flex items-center gap-2"
                    >
                        <PhoneOff className="w-5 h-5" />
                        Leave Meeting
                    </button>

                    {/* Right controls */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowChat(!showChat)}
                            className={`p-4 rounded-full transition ${showChat ? 'bg-saffron hover:bg-orange-india' : 'bg-gray-700 hover:bg-gray-600'
                                }`}
                        >
                            <MessageSquare className="w-6 h-6 text-white" />
                        </button>
                        <button
                            onClick={() => setShowParticipants(!showParticipants)}
                            className={`p-4 rounded-full transition ${showParticipants ? 'bg-saffron hover:bg-orange-india' : 'bg-gray-700 hover:bg-gray-600'
                                }`}
                        >
                            <Users className="w-6 h-6 text-white" />
                        </button>
                        <button className="p-4 rounded-full bg-gray-700 hover:bg-gray-600 transition">
                            <MoreVertical className="w-6 h-6 text-white" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
