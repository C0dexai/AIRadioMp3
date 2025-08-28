import React, { useState } from 'react';
import { Track } from '../types';
import Icon from './Icon';
import SpectrumAnalyzer from './SpectrumAnalyzer';


interface MusicPlayerProps {
  track: Track;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  onPlayPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
  onSeek: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onVolumeChange: (volume: number) => void;
  onMuteToggle: () => void;
  onEqAmpSettings: () => void;
  isEqEnabled: boolean;
  onToggleEq: (enabled: boolean) => void;
  isAmpEnabled: boolean;
  onToggleAmp: (enabled: boolean) => void;
  analyserNode: AnalyserNode | null;
  onGenerateStory: () => void;
  isVolumeDucked: boolean;
  isAiDjSpeaking: boolean;
  onGenerateAiDj: () => void;
  isAiDjThinking: boolean;
  onGenerateCoverArt: () => void;
  isGeneratingArt: boolean;
  onToggleVisualizer: () => void;
}

const formatTime = (time: number) => {
    if (!isFinite(time)) return '...'; 
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

const MIN_DB = -60;
const MAX_DB = 0;
const dbToLinear = (db: number) => Math.pow(10, db / 20);
const linearToDb = (linear: number) => {
    if (linear === 0) return MIN_DB;
    const db = 20 * Math.log10(linear);
    return isFinite(db) ? db : MIN_DB;
};


const MusicPlayer: React.FC<MusicPlayerProps> = ({ 
  track, isPlaying, onPlayPause, onNext, onPrevious, 
  currentTime, duration, onSeek, 
  volume, isMuted, onVolumeChange, onMuteToggle,
  onEqAmpSettings, isEqEnabled, onToggleEq, isAmpEnabled, onToggleAmp,
  analyserNode, onGenerateStory, isVolumeDucked, isAiDjSpeaking, onGenerateAiDj,
  isAiDjThinking, onGenerateCoverArt, isGeneratingArt, onToggleVisualizer
}) => {
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied'>('idle');

  const handleShare = async () => {
    if (track.type !== 'stream' || !track.url) return;
    try {
      await navigator.clipboard.writeText(track.url);
      setShareStatus('copied');
      setTimeout(() => setShareStatus('idle'), 2000);
    } catch (err) {
      console.error('Failed to copy stream URL: ', err);
    }
  };

  const handleVolumeChangeFromSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const dbValue = Number(e.target.value);
    const linearValue = dbToLinear(dbValue);
    onVolumeChange(linearValue);
  };


  return (
    <>
    <footer className="fixed bottom-0 left-0 right-0 bg-gray-900/70 backdrop-blur-md z-50 border-t border-cyan-400/20 shadow-[0_-10px_30px_-10px_rgba(0,255,255,0.2)] animate-slide-in-up">
      <div className="container mx-auto px-4 py-3 relative">
        <div className="absolute -top-1 left-0 right-0 h-1">
          {analyserNode && (
            <SpectrumAnalyzer analyserNode={analyserNode} isMuted={isMuted} />
          )}
        </div>
        
        {/* Status Indicators */}
        <div className="absolute top-2 right-2 flex gap-2">
          {isVolumeDucked && !isAiDjSpeaking && (
            <span className="text-xs font-bold bg-green-500/80 text-black px-2 py-0.5 rounded-full shadow-[0_0_8px_var(--neon-green)] animate-pulse">DUCKING</span>
          )}
          {isAiDjSpeaking && (
            <span className="text-xs font-bold bg-purple-500/80 text-black px-2 py-0.5 rounded-full shadow-[0_0_8px_var(--neon-purple)] animate-pulse">AI DJ</span>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex-shrink-0 w-16 h-16 bg-gray-800 rounded-md overflow-hidden shadow-lg border-2 border-gray-700 relative group">
            {track.coverArt ? (
              <img src={track.coverArt} alt={`${track.name} cover`} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-black/30">
                <Icon name={track.type === 'stream' ? 'radio' : 'music-note'} className="w-8 h-8 text-gray-500" />
              </div>
            )}
            <button 
              onClick={onGenerateCoverArt}
              disabled={isGeneratingArt || !!track.coverArt}
              className="absolute inset-0 bg-black/60 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              title={track.coverArt ? "Cover art exists" : (isGeneratingArt ? "Generating..." : "Generate Cover Art")}
            >
              <Icon name="image" className={`w-6 h-6 ${isGeneratingArt ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="flex-grow min-w-0">
            <h3 className="text-lg font-bold truncate text-cyan-300 neon-text-glow-cyan" title={track.name}>{track.name}</h3>
            <p className="text-sm text-gray-400 truncate" title={track.artist}>{track.artist || (track.type === 'stream' ? 'Radio Stream' : 'Local File')}</p>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={onPrevious} disabled={track.type !== 'file'} className="p-2 rounded-full text-gray-300 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              <Icon name="previous" className="w-6 h-6" />
            </button>
            <button onClick={onPlayPause} className="p-2 rounded-full text-white bg-cyan-500/80 hover:bg-cyan-500 shadow-[0_0_12px_var(--neon-cyan)] transform hover:scale-105 transition-all">
              <Icon name={isPlaying ? 'pause' : 'play'} className="w-10 h-10" />
            </button>
            <button onClick={onNext} disabled={track.type !== 'file'} className="p-2 rounded-full text-gray-300 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              <Icon name="next" className="w-6 h-6" />
            </button>
          </div>
          
          <div className="flex-grow flex items-center gap-4">
            <span className="text-xs font-mono text-gray-400">{formatTime(currentTime)}</span>
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={onSeek}
              disabled={track.type === 'stream'}
              className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer player-slider"
            />
            <span className="text-xs font-mono text-gray-400">{track.type === 'stream' ? 'STREAM' : formatTime(duration)}</span>
          </div>

          <div className="flex items-center gap-3">
             <button
              onClick={onToggleVisualizer}
              className="p-2 rounded-full text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/20 transition-colors"
              title="Open Visualizer"
            >
              <Icon name="expand" className="w-5 h-5" />
            </button>
            <button
              onClick={onGenerateStory}
              className="p-2 rounded-full text-gray-400 hover:text-purple-400 hover:bg-purple-500/20 transition-colors"
              title="Generate AI Story"
            >
              <Icon name="book" className="w-5 h-5" />
            </button>
            <button
              onClick={onGenerateAiDj}
              disabled={isAiDjThinking || isAiDjSpeaking}
              className={`p-2 rounded-full transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                isAiDjThinking
                  ? 'text-purple-400 animate-pulse'
                  : isAiDjSpeaking
                  ? 'text-purple-400'
                  : 'text-gray-400 hover:text-purple-400 hover:bg-purple-500/20'
              }`}
              title="Trigger AI DJ Announcement"
            >
              <Icon name="robot" className={`w-5 h-5 ${isAiDjSpeaking ? 'shadow-[0_0_8px_var(--neon-purple)]' : ''}`} />
            </button>
            {track.type === 'stream' && (
              <button
                onClick={handleShare}
                className="p-2 rounded-full text-gray-400 hover:text-green-400 hover:bg-green-500/20 transition-colors relative"
                title="Copy Stream URL"
              >
                <Icon name="share" className="w-5 h-5" />
                 {shareStatus === 'copied' && <span className="absolute -top-7 right-0 text-xs bg-green-500 text-black px-2 py-0.5 rounded">Copied!</span>}
              </button>
            )}
          </div>
          
          <div className="flex items-center w-48 gap-2">
            <button onClick={onMuteToggle} className="p-2 rounded-full text-gray-400 hover:text-white">
              <Icon name={isMuted || volume === 0 ? 'volume-off' : 'volume-high'} className="w-5 h-5" />
            </button>
            <input
              type="range"
              min={MIN_DB}
              max={MAX_DB}
              step="1"
              value={isMuted ? MIN_DB : linearToDb(volume)}
              onChange={handleVolumeChangeFromSlider}
              className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer volume-slider"
              aria-label="Volume"
            />
          </div>
        </div>
      </div>
    </footer>
    <style>{`
      .player-slider { background: linear-gradient(to right, var(--neon-cyan) ${((currentTime / duration) * 100) || 0}%, #4a5568 ${((currentTime / duration) * 100) || 0}%); }
      .player-slider:disabled { background: #4a5568; }
      .player-slider::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 14px; height: 14px; background: white; cursor: pointer; border-radius: 50%; box-shadow: var(--glow-cyan); }
      .player-slider::-moz-range-thumb { width: 14px; height: 14px; background: white; cursor: pointer; border-radius: 50%; box-shadow: var(--glow-cyan); }

      .volume-slider { background: linear-gradient(to right, #a855f7 ${((linearToDb(volume) - MIN_DB) / (MAX_DB - MIN_DB)) * 100}%, #4a5568 ${((linearToDb(volume) - MIN_DB) / (MAX_DB - MIN_DB)) * 100}%); }
      .volume-slider::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 14px; height: 14px; background: white; cursor: pointer; border-radius: 50%; box-shadow: var(--glow-purple); }
      .volume-slider::-moz-range-thumb { width: 14px; height: 14px; background: white; cursor: pointer; border-radius: 50%; box-shadow: var(--glow-purple); }
    `}</style>
    </>
  );
};

export default MusicPlayer;