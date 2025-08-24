import React, { useState, useEffect } from 'react';
import Icon from './Icon';

interface AddStationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, url:string) => void;
}

const AddStationModal: React.FC<AddStationModalProps> = ({ isOpen, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');

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


  const handleSave = () => {
    if (name.trim() && url.trim()) {
      onSave(name.trim(), url.trim());
      setName('');
      setUrl('');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[100] transition-opacity duration-300 animate-fade-in"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="bg-gray-900/80 border border-green-500/50 shadow-[0_0_20px_var(--neon-green)] rounded-xl p-6 m-4 max-w-md w-full relative transform transition-all duration-300 scale-95 opacity-0 animate-fade-in-scale"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
          aria-label="Close"
        >
          <Icon name="close" className="w-6 h-6" />
        </button>
        
        <div className="flex items-center mb-6">
            <Icon name="radio" className="w-8 h-8 mr-4 text-green-400" style={{filter: `drop-shadow(0 0 8px var(--neon-green))`}}/>
            <h2 className="text-2xl font-bold text-green-300" style={{textShadow: '0 0 8px var(--neon-green)'}}>Add Custom Station</h2>
        </div>
        
        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
          <div className="space-y-4">
            <div>
              <label htmlFor="station-name" className="block text-sm font-medium text-gray-300 mb-1">Station Name</label>
              <input
                id="station-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-2 bg-black/50 border border-gray-600 rounded-lg text-gray-200 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                placeholder="e.g., My Favorite Lofi Stream"
                required
              />
            </div>
            <div>
              <label htmlFor="station-url" className="block text-sm font-medium text-gray-300 mb-1">Stream URL</label>
              <input
                id="station-url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full p-2 bg-black/50 border border-gray-600 rounded-lg text-gray-200 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all"
                placeholder="https://..."
                required
              />
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-4">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 bg-green-600/80 text-white rounded-lg hover:bg-green-600 transition-all duration-300 shadow-[0_0_10px_var(--neon-green)]">
              Save Station
            </button>
          </div>
        </form>
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
export default AddStationModal;
