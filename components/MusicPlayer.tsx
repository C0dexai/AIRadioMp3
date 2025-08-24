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
    <footer className="fixed bottom-0 left-0 right-0 bg-gray-900/70 backdrop-blur-xl border-t-2 border-cyan-400/50 shadow-[0_-5px_20px_-5px_rgba(0,255,255,0.3)] z-50">
      <div className="container mx-auto px-4 sm:px-6 py-3">
        {track.type === 'file' && (
          <div className="flex items-center gap-3 mb-2">
              <span className="text-xs text-gray-400 w-10 text-right">{formatTime(currentTime)}</span>
              <input
                  type="range"
                  min="0"
                  max={duration || 0}
                  value={currentTime}
                  onChange={onSeek}
                  className="w-full h-1.5 rounded-lg appearance-none cursor-pointer seek-slider"
              />
              <span className="text-xs text-gray-400 w-10 text-left">{formatTime(duration)}</span>
          </div>
        )}
        <div className="flex items-center justify-between">
            {/* Left Section: Track Info & Analyzer */}
            <div className="flex items-center gap-4 w-1/3 min-w-0">
                <div className="w-14 h-14 bg-black rounded-md flex-shrink-0 overflow-hidden relative flex items-center justify-center">
                    {isGeneratingArt ? (
                        <div className="w-full h-full border-2 border-purple-500/50 rounded-md flex items-center justify-center">
                            <div className="w-6 h-6 border-2 border-dashed border-purple-400 rounded-full animate-spin"></div>
                        </div>
                    ) : track.coverArt ? (
                        <img src={track.coverArt} alt={`${track.name} cover art`} className="w-full h-full object-cover" />
                    ) : analyserNode ? (
                        <SpectrumAnalyzer analyserNode={analyserNode} isMuted={isMuted || !isPlaying} />
                    ) : (
                        <div className="w-14 h-14 bg-gray-800 rounded-md flex-shrink-0 flex items-center justify-center">
                            <Icon name={track.type === 'stream' ? 'radio' : 'music-note'} className="w-8 h-8 text-gray-500"/>
                        </div>
                    )}
                </div>
                <div className="overflow-hidden">
                    <p className="font-bold text-white truncate" title={track.name}>{track.name}</p>
                    <p className="text-sm text-gray-400 truncate" title={track.artist}>{track.artist}</p>
                </div>
            </div>

            {/* Center Section: Player Controls */}
            <div className="flex items-center gap-2 w-1/3 justify-center">
                <button onClick={onPrevious} disabled={track.type !== 'file'} className="p-2 rounded-full text-gray-300 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    <Icon name="previous" className="w-7 h-7" />
                </button>
                <button onClick={onPlayPause} className="p-2 rounded-full bg-cyan-400 text-black shadow-[0_0_10px_var(--neon-cyan)] hover:scale-105 transition-transform">
                    <Icon name={isPlaying ? 'pause' : 'play'} className="w-10 h-10" />
                </button>
                <button onClick={onNext} disabled={track.type !== 'file'} className="p-2 rounded-full text-gray-300 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    <Icon name="next" className="w-7 h-7" />
                </button>
            </div>

            {/* Right Section: Volume & Extras */}
            <div className="flex items-center gap-3 w-1/3 justify-end">
                {isVolumeDucked && (
                  <div className={`px-2 py-1 text-xs font-bold text-black rounded-md animate-pulse ${
                      isAiDjSpeaking 
                      ? 'bg-purple-400 shadow-[0_0_8px_var(--neon-purple)]' 
                      : 'bg-green-400 shadow-[0_0_8px_var(--neon-green)]'
                  }`}>
                      {isAiDjSpeaking ? 'AI DJ' : 'DUCKING'}
                  </div>
                )}
                <div className="flex items-center gap-2">
                    <button onClick={() => onToggleEq(!isEqEnabled)} className={`px-2 py-1 text-xs rounded-md border transition-all ${isEqEnabled ? 'bg-cyan-500/80 border-cyan-400 text-black font-bold shadow-[0_0_5px_var(--neon-cyan)]' : 'border-gray-600 text-gray-400 hover:border-cyan-400/50 hover:text-white'}`} title="Toggle EQ">EQ</button>
                    <button onClick={() => onToggleAmp(!isAmpEnabled)} className={`px-2 py-1 text-xs rounded-md border transition-all ${isAmpEnabled ? 'bg-purple-500/80 border-purple-400 text-black font-bold shadow-[0_0_5px_var(--neon-purple)]' : 'border-gray-600 text-gray-400 hover:border-purple-500/50 hover:text-white'}`} title="Toggle Amp">AMP</button>
                </div>

                {track.type === 'stream' && (
                    <button onClick={handleShare} className="p-2 rounded-full hover:bg-white/10 transition-colors text-gray-300 hover:text-white relative" title="Copy Stream URL">
                        <Icon name="share" className="w-5 h-5" />
                        {shareStatus === 'copied' && <span className="absolute -top-7 right-0 text-xs bg-green-500 text-white px-2 py-1 rounded">Copied!</span>}
                    </button>
                )}
                 <button 
                  onClick={onGenerateCoverArt} 
                  className="p-2 rounded-full hover:bg-white/10 transition-colors text-gray-300 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed" 
                  title="Generate Cover Art"
                  disabled={!!track.coverArt || isGeneratingArt}
                >
                    <Icon name="image" className="w-5 h-5" />
                </button>
                 <button
                    onClick={onGenerateAiDj}
                    className="p-2 rounded-full hover:bg-white/10 transition-colors text-gray-300 hover:text-white relative flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
                    title="Trigger AI DJ"
                    disabled={isAiDjThinking}
                  >
                    {isAiDjThinking ? (
                        <div className="w-5 h-5 border-2 border-dashed border-purple-400 rounded-full animate-spin"></div>
                    ) : (
                        <Icon name="robot" className={`w-5 h-5 transition-colors ${isAiDjSpeaking ? 'text-purple-400 animate-pulse' : ''}`} style={{filter: isAiDjSpeaking ? 'drop-shadow(0 0 5px var(--neon-purple))' : 'none'}}/>
                    )}
                </button>
                <button onClick={onGenerateStory} className="p-2 rounded-full hover:bg-white/10 transition-colors text-gray-300 hover:text-white" title="Generate Story">
                    <Icon name="book" className="w-5 h-5" />
                </button>
                
                <button onClick={onToggleVisualizer} className="p-2 rounded-full hover:bg-white/10 transition-colors text-gray-300 hover:text-white" title="Open Visualizer">
                    <Icon name="expand" className="w-5 h-5" />
                </button>

                <button onClick={onEqAmpSettings} className="p-2 rounded-full hover:bg-white/10 transition-colors text-gray-300 hover:text-white" title="EQ/Amp Settings">
                    <Icon name="settings" className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-2">
                    <button onClick={onMuteToggle} className="p-1 rounded-full text-gray-300 hover:text-white">
                        <Icon name={isMuted || volume === 0 ? 'volume-off' : 'volume-high'} className="w-6 h-6" />
                    </button>
                    <div className="w-24">
                        <input
                            type="range"
                            min={linearToDb(0.001)}
                            max={MAX_DB}
                            step="0.1"
                            value={isMuted ? linearToDb(0) : linearToDb(volume)}
                            onChange={handleVolumeChangeFromSlider}
                            className="w-full h-1 rounded-lg appearance-none cursor-pointer volume-slider"
                        />
                    </div>
                </div>
            </div>
        </div>
      </div>
    </footer>
    <style>{`
        .seek-slider { background-image: linear-gradient(to right, var(--neon-cyan) ${((currentTime/duration)*100) || 0}%, #4b5563 ${((currentTime/duration)*100) || 0}%); }
        .seek-slider::-webkit-slider-thumb {
            -webkit-appearance: none; appearance: none; width: 16px; height: 16px;
            background: #fff; cursor: pointer; border-radius: 50%;
            box-shadow: 0 0 4px #fff, var(--glow-cyan);
            margin-top: -7px;
        }
        .seek-slider::-moz-range-thumb {
            width: 16px; height: 16px; background: #fff; cursor: pointer;
            border-radius: 50%; border: none;
            box-shadow: 0 0 4px #fff, var(--glow-cyan);
        }

        .volume-slider { background-image: linear-gradient(to right, #fff ${isMuted ? 0 : volume*100}%, #4b5563 ${isMuted ? 0 : volume*100}%); }
        .volume-slider::-webkit-slider-thumb {
            -webkit-appearance: none; appearance: none; width: 14px; height: 14px;
            background: #fff; cursor: pointer; border-radius: 50%;
            box-shadow: 0 0 5px #fff; margin-top: -6px;
        }
        .volume-slider::-moz-range-thumb {
            width: 14px; height: 14px; background: #fff; cursor: pointer;
            border-radius: 50%; border: none; box-shadow: 0 0 5px #fff;
        }

        .seek-slider, .volume-slider {
            -webkit-appearance: none; appearance: none;
            width: 100%; height: 2px;
            outline: none;
            transition: background-image 0.1s;
        }
    `}</style>
    </>
  );
};

export default MusicPlayer;