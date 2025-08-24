import React, { useEffect, useState, useRef } from 'react';
import Icon from './Icon';

interface StoryModalProps {
  isOpen: boolean;
  isLoading: boolean;
  story: string;
  trackName?: string | null;
  onClose: () => void;
  onSave: () => void;
  isSaved: boolean;
}

const StoryModal: React.FC<StoryModalProps> = ({ isOpen, isLoading, story, trackName, onClose, onSave, isSaved }) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const speechSynthesisRef = useRef(window.speechSynthesis);

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

  const handleToggleReadAloud = () => {
    if (isSpeaking) {
      speechSynthesisRef.current?.cancel();
      setIsSpeaking(false);
    } else {
      if (story && !isLoading) {
        speechSynthesisRef.current?.cancel(); // Clear any previous utterances
        const utterance = new SpeechSynthesisUtterance(story);
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = (e) => {
          console.error("Speech synthesis error:", e);
          setIsSpeaking(false);
        };
        speechSynthesisRef.current?.speak(utterance);
      }
    }
  };

  // Cleanup effect to stop speaking when the modal is closed or component unmounts
  useEffect(() => {
    return () => {
      if (speechSynthesisRef.current?.speaking) {
        speechSynthesisRef.current.cancel();
      }
    };
  }, []);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100] transition-opacity duration-300 animate-fade-in"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="bg-gray-900/80 border border-purple-500/50 shadow-[0_0_20px_var(--neon-purple)] rounded-xl p-6 m-4 max-w-lg w-full relative transform transition-all duration-300 scale-95 opacity-0 animate-fade-in-scale"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors z-10"
          aria-label="Close story"
        >
          <Icon name="close" className="w-6 h-6" />
        </button>
        
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center mr-4 min-w-0">
                <Icon name="book" className="w-8 h-8 mr-4 text-purple-400 flex-shrink-0" style={{filter: `drop-shadow(0 0 8px var(--neon-purple))`}}/>
                <div>
                    <h2 className="text-xl font-bold text-purple-300 truncate" style={{textShadow: '0 0 8px var(--neon-purple)'}}>AI Generated Story</h2>
                    {trackName && <p className="text-sm text-gray-400 truncate">Inspired by: {trackName}</p>}
                </div>
            </div>
        </div>

        <div className="text-gray-300 min-h-[150px] max-h-[60vh] overflow-y-auto pr-2">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="loader animate-spin rounded-full border-4 border-t-4 border-gray-600 border-t-purple-500 h-12 w-12"></div>
            </div>
          ) : (
            <p className="whitespace-pre-wrap">{story}</p>
          )}
        </div>
        
        {!isLoading && story && (
          <div className="mt-4 pt-4 border-t border-gray-700 flex justify-end gap-2">
            <button
              onClick={handleToggleReadAloud}
              className="p-2 rounded-full text-gray-400 hover:bg-cyan-500/20 transition-colors duration-200"
              aria-label={isSpeaking ? "Stop reading" : "Read story aloud"}
            >
              {isSpeaking ? (
                <Icon name="stop-circle" className="w-6 h-6 text-cyan-400" style={{filter: `drop-shadow(0 0 8px var(--neon-cyan))`}} />
              ) : (
                <Icon name="volume-high" className="w-6 h-6" />
              )}
            </button>
            <button
              onClick={onSave}
              disabled={isSaved}
              className="p-2 rounded-full text-gray-400 hover:bg-pink-500/20 transition-colors duration-200 disabled:opacity-70 disabled:cursor-not-allowed"
              aria-label={isSaved ? "Story saved" : "Save story"}
            >
              {isSaved ? (
                <Icon name="heart-filled" className="w-6 h-6 text-pink-500" style={{filter: `drop-shadow(0 0 8px var(--neon-pink))`}} />
              ) : (
                <Icon name="heart-outline" className="w-6 h-6" />
              )}
            </button>
          </div>
        )}
      </div>
      <style>{`
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fade-in-scale { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
        .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
        .animate-fade-in-scale { animation: fade-in-scale 0.3s ease-out forwards; }
       `}</style>
    </div>
  );
};

export default StoryModal;