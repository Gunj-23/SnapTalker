import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';

const AudioPlayer = ({ audioUrl, duration }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [audioDuration, setAudioDuration] = useState(duration || 0);
    const audioRef = useRef(null);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const updateTime = () => setCurrentTime(audio.currentTime);
        const updateDuration = () => setAudioDuration(audio.duration);
        const handleEnded = () => {
            setIsPlaying(false);
            setCurrentTime(0);
        };

        audio.addEventListener('timeupdate', updateTime);
        audio.addEventListener('loadedmetadata', updateDuration);
        audio.addEventListener('ended', handleEnded);

        return () => {
            audio.removeEventListener('timeupdate', updateTime);
            audio.removeEventListener('loadedmetadata', updateDuration);
            audio.removeEventListener('ended', handleEnded);
        };
    }, []);

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

    const handleSeek = (e) => {
        if (!audioRef.current) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = x / rect.width;
        audioRef.current.currentTime = percentage * audioDuration;
    };

    const formatTime = (seconds) => {
        if (!seconds || isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const progress = audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0;

    return (
        <div className="flex items-center gap-2 min-w-[200px]">
            <button
                onClick={togglePlayback}
                className="flex-shrink-0 p-1.5 bg-[#00a884] hover:bg-[#06cf9c] text-[#111b21] rounded-full transition-colors"
            >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>

            <audio ref={audioRef} src={audioUrl} preload="metadata" />

            <div className="flex-1 flex items-center gap-2">
                <div 
                    className="flex-1 h-6 bg-[#2a3942] rounded-lg overflow-hidden relative cursor-pointer group"
                    onClick={handleSeek}
                >
                    {/* Waveform visualization (simplified) */}
                    <div className="absolute inset-0 flex items-center justify-around px-1">
                        {[...Array(30)].map((_, i) => (
                            <div
                                key={i}
                                className={`w-0.5 rounded-full ${i / 30 < progress / 100 ? 'bg-[#00a884]' : 'bg-[#546971]'}`}
                                style={{ height: `${Math.random() * 60 + 20}%` }}
                            />
                        ))}
                    </div>
                    <div 
                        className="absolute top-0 left-0 bottom-0 bg-[#00a884] bg-opacity-10 transition-all"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                <span className="text-[11px] text-[#8696a0] font-mono flex-shrink-0">
                    {isPlaying ? formatTime(currentTime) : formatTime(audioDuration)}
                </span>
            </div>
        </div>
    );
};

export default AudioPlayer;
