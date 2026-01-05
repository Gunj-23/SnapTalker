import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Pause, X, Send } from 'lucide-react';

const VoiceRecorder = ({ onSend, onCancel }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [audioBlob, setAudioBlob] = useState(null);
    const [audioURL, setAudioURL] = useState(null);
    const [duration, setDuration] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);

    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);
    const timerRef = useRef(null);
    const audioRef = useRef(null);

    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (audioURL) URL.revokeObjectURL(audioURL);
        };
    }, [audioURL]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm;codecs=opus'
            });

            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                const url = URL.createObjectURL(blob);
                setAudioBlob(blob);
                setAudioURL(url);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start(100); // Collect data every 100ms
            setIsRecording(true);

            // Start timer
            timerRef.current = setInterval(() => {
                setDuration(prev => prev + 1);
            }, 1000);
        } catch (error) {
            console.error('Error accessing microphone:', error);
            alert('Could not access microphone. Please check permissions.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }
    };

    const togglePlayback = () => {
        if (!audioRef.current) return;

        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
        } else {
            audioRef.current.play();
            setIsPlaying(true);
        }
    };

    const handleSend = () => {
        if (audioBlob) {
            onSend(audioBlob, duration);
        }
    };

    const handleCancel = () => {
        stopRecording();
        if (audioURL) URL.revokeObjectURL(audioURL);
        onCancel();
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Auto-start recording when component mounts
    useEffect(() => {
        startRecording();
    }, []);

    return (
        <div className="flex items-center gap-3 bg-[#202c33] px-4 py-3 rounded-lg">
            {audioBlob ? (
                // Playback controls
                <>
                    <button
                        onClick={togglePlayback}
                        className="p-2 bg-[#00a884] hover:bg-[#06cf9c] text-[#111b21] rounded-full transition-colors"
                    >
                        {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                    </button>

                    <audio
                        ref={audioRef}
                        src={audioURL}
                        onEnded={() => setIsPlaying(false)}
                        onTimeUpdate={(e) => {
                            const currentTime = Math.floor(e.target.currentTime);
                            if (currentTime !== duration) {
                                // Update duration during playback for visual feedback
                            }
                        }}
                    />

                    <div className="flex-1 flex items-center gap-2">
                        <div className="flex-1 h-8 bg-[#2a3942] rounded-lg overflow-hidden relative">
                            <div className="h-full bg-[#00a884] transition-all" style={{ width: '100%' }}></div>
                        </div>
                        <span className="text-[#8696a0] text-sm font-mono">{formatTime(duration)}</span>
                    </div>

                    <button
                        onClick={handleCancel}
                        className="p-2 text-[#8696a0] hover:text-[#e9edef] transition-colors"
                        title="Cancel"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <button
                        onClick={handleSend}
                        className="p-2 bg-[#00a884] hover:bg-[#06cf9c] text-[#111b21] rounded-full transition-colors"
                        title="Send"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </>
            ) : (
                // Recording controls
                <>
                    <div className="p-2 bg-[#ef4444] rounded-full animate-pulse">
                        <Mic className="w-5 h-5 text-white" />
                    </div>

                    <div className="flex-1 flex items-center gap-2">
                        <div className="flex gap-0.5">
                            {[...Array(20)].map((_, i) => (
                                <div
                                    key={i}
                                    className="w-1 bg-[#00a884] rounded-full animate-pulse"
                                    style={{
                                        height: `${Math.random() * 24 + 8}px`,
                                        animationDelay: `${i * 50}ms`
                                    }}
                                />
                            ))}
                        </div>
                        <span className="text-[#e9edef] text-sm font-mono">{formatTime(duration)}</span>
                    </div>

                    <button
                        onClick={handleCancel}
                        className="p-2 text-[#8696a0] hover:text-[#e9edef] transition-colors"
                        title="Cancel"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <button
                        onClick={stopRecording}
                        className="p-2 bg-[#00a884] hover:bg-[#06cf9c] text-[#111b21] rounded-full transition-colors"
                        title="Stop recording"
                    >
                        <Square className="w-4 h-4" />
                    </button>
                </>
            )}
        </div>
    );
};

export default VoiceRecorder;
