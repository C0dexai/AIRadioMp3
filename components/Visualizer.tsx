import React, { useEffect, useRef } from 'react';
import { Track } from '../types';
import Icon from './Icon';

interface VisualizerProps {
  isOpen: boolean;
  onClose: () => void;
  track: Track;
  analyserNode: AnalyserNode;
  isPlaying: boolean;
  onPlayPause: () => void;
  onNext: () => void;
  onPrevious: () => void;
}

const Visualizer: React.FC<VisualizerProps> = ({ isOpen, onClose, track, analyserNode, isPlaying, onPlayPause, onNext, onPrevious }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameId = useRef<number | undefined>(undefined);
  const lastBeatTime = useRef(0);
  const beatScale = useRef(1);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || !canvasRef.current || !analyserNode) {
      if(animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    let lastEnergy = 0;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    
    const draw = (timestamp: number) => {
      animationFrameId.current = requestAnimationFrame(draw);
      
      analyserNode.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const radius = Math.min(centerX, centerY) * 0.3;
      const barWidth = (2 * Math.PI * radius) / (bufferLength * 1.5);
      
      // Beat detection
      const bassEnergy = dataArray.slice(0, 8).reduce((sum, val) => sum + val, 0) / 8;
      if (bassEnergy > lastEnergy + 15 && timestamp - lastBeatTime.current > 200) {
        lastBeatTime.current = timestamp;
        beatScale.current = 1.15;
      }
      lastEnergy = bassEnergy;

      // Decay the beat scale
      beatScale.current = Math.max(1, beatScale.current * 0.99);

      const gradient = ctx.createLinearGradient(0, centerY - radius, 0, centerY + radius);
      gradient.addColorStop(0, 'rgba(0,255,255,0.8)'); // Neon Cyan
      gradient.addColorStop(0.5, 'rgba(255,16,240,0.7)'); // Neon Pink
      gradient.addColorStop(1, 'rgba(198,40,249,0.9)'); // Neon Purple
      ctx.strokeStyle = gradient;
      ctx.shadowBlur = 10;
      ctx.shadowColor = 'rgba(0, 255, 255, 0.5)';
      
      for (let i = 0; i < bufferLength; i++) {
        const barHeight = Math.pow(dataArray[i] / 255, 2) * (centerY * 0.6);
        
        const angle = (i / bufferLength) * 2 * Math.PI;
        
        const x1 = centerX + Math.cos(angle) * radius;
        const y1 = centerY + Math.sin(angle) * radius;
        const x2 = centerX + Math.cos(angle) * (radius + barHeight);
        const y2 = centerY + Math.sin(angle) * (radius + barHeight);

        ctx.lineWidth = barWidth;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    };

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();
    draw(0);

    return () => {
      if(animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      window.removeEventListener('resize', resizeCanvas);
    };

  }, [isOpen, analyserNode]);


  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-lg z-[100] flex flex-col items-center justify-center animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      
      <div className="absolute top-4 right-4 z-20">
        <button onClick={onClose} className="p-3 bg-white/10 rounded-full hover:bg-white/20 transition-colors" aria-label="Close Visualizer">
          <Icon name="close" className="w-6 h-6 text-white" />
        </button>
      </div>

      <div className="relative z-10 flex flex-col items-center text-center">
        {track.coverArt && (
          <div 
            className="w-48 h-48 sm:w-64 sm:h-64 rounded-full mb-8 shadow-2xl transition-transform duration-200 ease-out"
            style={{ 
              backgroundImage: `url(${track.coverArt})`, 
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              transform: `scale(${beatScale.current})`,
              boxShadow: '0 0 20px rgba(0,255,255,0.4), 0 0 40px rgba(255,16,240,0.3)'
            }}
          />
        )}
        <h2 className="text-3xl sm:text-4xl font-bold text-white drop-shadow-lg neon-text-glow-cyan" title={track.name}>{track.name}</h2>
        <p className="text-lg sm:text-xl text-gray-300 drop-shadow-md mt-2" title={track.artist}>{track.artist}</p>

        <div className="flex items-center gap-4 mt-12 bg-black/20 backdrop-blur-sm p-4 rounded-full">
            <button onClick={onPrevious} disabled={track.type !== 'file'} className="p-2 rounded-full text-gray-300 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                <Icon name="previous" className="w-8 h-8" />
            </button>
            <button onClick={onPlayPause} className="p-3 rounded-full bg-white text-black hover:scale-105 transition-transform">
                <Icon name={isPlaying ? 'pause' : 'play'} className="w-12 h-12" />
            </button>
            <button onClick={onNext} disabled={track.type !== 'file'} className="p-2 rounded-full text-gray-300 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                <Icon name="next" className="w-8 h-8" />
            </button>
        </div>
      </div>
      <style>{`
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in { animation: fade-in 0.5s ease-out forwards; }
      `}</style>
    </div>
  );
};

export default Visualizer;