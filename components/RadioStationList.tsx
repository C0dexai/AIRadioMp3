import React from 'react';
import { Track } from '../types';
import Icon from './Icon';

interface RadioStationListProps {
  stations: Track[];
  onSelectStation: (index: number) => void;
  onDeleteStation: (trackId: string | number) => void;
  currentTrackId?: number | string | null;
  isPlaying: boolean;
  searchQuery: string;
  totalTracks: number;
}

const RadioStationList: React.FC<RadioStationListProps> = ({ stations, onSelectStation, onDeleteStation, currentTrackId, isPlaying, searchQuery, totalTracks }) => {
  if (totalTracks === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500/80">
        <Icon name="radio" className="w-24 h-24 mb-4 text-green-400/30" style={{filter: `drop-shadow(0 0 10px var(--neon-green))`}}/>
        <h2 className="text-2xl font-semibold text-gray-400">No Radio Stations Loaded</h2>
        <p className="mt-2 text-gray-500">Add your own custom station to get started!</p>
      </div>
    );
  }

  if (stations.length === 0 && searchQuery) {
     return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500/80 min-h-[352px]">
        <h2 className="text-2xl font-semibold text-gray-400">No Results Found</h2>
        <p className="mt-2 text-gray-500">No stations match "{searchQuery}".</p>
      </div>
    );
  }


  return (
    <div className="space-y-2 min-h-[352px]">
      {stations.map((station, index) => (
        <div
          key={station.id}
          className={`group flex items-center p-3 rounded-lg cursor-pointer transition-all duration-300 ease-in-out border ${
            currentTrackId === station.id
              ? 'bg-green-400/10 animate-pulse-glow-green'
              : 'border-transparent hover:bg-gray-800/60 hover:border-gray-700'
          }`}
          onClick={() => onSelectStation(index)}
        >
          <div className="w-10 h-10 flex-shrink-0 bg-gray-800/80 rounded-md flex items-center justify-center mr-4 overflow-hidden">
            {station.coverArt ? (
              <img src={station.coverArt} alt={`${station.name} cover`} className="w-full h-full object-cover" />
            ) : currentTrackId === station.id && isPlaying ? (
              <div className="w-4 h-4 flex justify-between items-end">
                  <span className="w-1 h-full bg-green-400 rounded-full animate-[pulse_1s_ease-in-out_infinite]"/>
                  <span style={{animationDelay: '0.2s'}} className="w-1 h-1/2 bg-green-400 rounded-full animate-[pulse_1s_ease-in-out_infinite]"/>
                  <span style={{animationDelay: '0.4s'}} className="w-1 h-full bg-green-400 rounded-full animate-[pulse_1s_ease-in-out_infinite]"/>
              </div>
            ) : (
              <Icon name="radio" className="w-5 h-5 text-gray-400" />
            )}
          </div>

          <div className="flex-grow min-w-0">
            <p className={`font-semibold truncate ${currentTrackId === station.id ? 'text-green-400' : 'text-white'}`}>
              {station.name}
            </p>
            <p className="text-sm text-gray-400 truncate">{station.artist || 'Radio Stream'}</p>
          </div>
          {station.isCustom && (
              <button
                onClick={(e) => {
                    e.stopPropagation();
                    onDeleteStation(station.id);
                }}
                className="p-2 ml-2 rounded-full text-gray-500 hover:bg-red-500/20 hover:text-red-400 transition-colors duration-200 opacity-0 group-hover:opacity-100"
                aria-label={`Delete ${station.name}`}
              >
                  <Icon name="trash" className="w-5 h-5" />
              </button>
          )}
        </div>
      ))}
    </div>
  );
};

export default RadioStationList;