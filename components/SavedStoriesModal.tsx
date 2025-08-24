import React, { useEffect } from 'react';
import { SavedStory } from '../types';
import Icon from './Icon';

interface SavedStoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  stories: SavedStory[];
  onDeleteStory: (storyId: string) => void;
}

const SavedStoriesModal: React.FC<SavedStoriesModalProps> = ({ isOpen, onClose, stories, onDeleteStory }) => {
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

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100] transition-opacity duration-300 animate-fade-in"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="bg-gray-900/80 border border-purple-500/50 shadow-[0_0_20px_var(--neon-purple)] rounded-xl p-6 m-4 max-w-2xl w-full relative transform transition-all duration-300 scale-95 opacity-0 animate-fade-in-scale flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors z-10"
          aria-label="Close"
        >
          <Icon name="close" className="w-6 h-6" />
        </button>
        
        <div className="flex items-center mb-6 flex-shrink-0">
            <Icon name="book" className="w-8 h-8 mr-4 text-purple-400" style={{filter: `drop-shadow(0 0 8px var(--neon-purple))`}}/>
            <h2 className="text-2xl font-bold text-purple-300" style={{textShadow: '0 0 8px var(--neon-purple)'}}>Saved Stories</h2>
        </div>

        <div className="flex-grow overflow-y-auto pr-2">
            {stories.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                    <Icon name="book" className="w-24 h-24 text-purple-400/20" />
                    <p className="mt-4 text-lg">You haven't saved any stories yet.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {stories.map((story) => (
                        <div key={story.id} className="group bg-black/30 p-4 rounded-lg border border-gray-700/50 transition-colors hover:border-purple-500/50">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-sm text-gray-400 mb-2">
                                        Inspired by: <span className="font-semibold text-gray-300">{story.trackName}</span>
                                        {story.artist && <span className="text-gray-500"> by {story.artist}</span>}
                                    </p>
                                    <p className="text-gray-300 whitespace-pre-wrap">{story.story}</p>
                                </div>
                                <button
                                    onClick={() => onDeleteStory(story.id)}
                                    className="p-2 ml-2 rounded-full text-gray-500 hover:bg-red-500/20 hover:text-red-400 transition-colors duration-200 opacity-0 group-hover:opacity-100 flex-shrink-0"
                                    aria-label="Delete story"
                                >
                                    <Icon name="trash" className="w-5 h-5" />
                                </button>
                            </div>
                            <p className="text-xs text-gray-600 text-right mt-2">{new Date(story.createdAt).toLocaleString()}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
        
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

export default SavedStoriesModal;
