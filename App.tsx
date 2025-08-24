import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Track, View, SavedStory } from './types';
import MusicLibrary from './components/MusicLibrary';
import FavoritesList from './components/FavoritesList';
import MusicPlayer from './components/MusicPlayer';
import Icon from './components/Icon';
import RadioStationList from './components/RadioStationList';
import { predefinedStations } from './data/stations';
import EqSettings from './components/EqSettings';
import Pagination from './components/Pagination';
import * as db from './db';
import { GoogleGenAI } from '@google/genai';
import StoryModal from './components/StoryModal';
import SettingsPanel from './components/SettingsPanel';
import AddStationModal from './components/AddStationModal';
import SavedStoriesModal from './components/SavedStoriesModal';
import Visualizer from './components/Visualizer';
import ConfirmationModal from './components/ConfirmationModal';

const EQ_FREQUENCIES = [60, 250, 1000, 4000, 16000];
const ITEMS_PER_PAGE_LIBRARY = 6;
const ITEMS_PER_PAGE_FAVORITES = 6;
const ITEMS_PER_PAGE_RADIO = 6;
const AUDIO_SETTINGS_KEY = 'RMP3_AUDIO_SETTINGS';

// Helper function to get initial audio settings from localStorage
const getInitialAudioSettings = () => {
    try {
        const savedSettings = localStorage.getItem(AUDIO_SETTINGS_KEY);
        if (savedSettings) {
            const parsed = JSON.parse(savedSettings);
            // Basic validation to prevent app crash on malformed data
            if (
                Array.isArray(parsed.eqBands) && parsed.eqBands.length === EQ_FREQUENCIES.length &&
                typeof parsed.isEqEnabled === 'boolean' &&
                typeof parsed.ampGain === 'number' &&
                typeof parsed.isAmpEnabled === 'boolean'
            ) {
                return parsed;
            }
        }
    } catch (e) {
        console.error("Could not load audio settings from localStorage", e);
    }
    // Default values if nothing is saved or data is corrupt
    return {
        eqBands: new Array(EQ_FREQUENCIES.length).fill(0),
        isEqEnabled: true,
        ampGain: 1,
        isAmpEnabled: false,
    };
};


// This function safely retrieves the API key from the environment in a way
// that is robust across different JavaScript environments and prevents ReferenceError crashes.
const safeGetApiKey = (): string | undefined => {
  try {
    // This is the safest way to check for an environment variable in a browser context
    // that might be executed in different sandboxed environments.
    if (typeof process !== 'undefined' && process.env && typeof process.env.API_KEY === 'string') {
        return process.env.API_KEY;
    }
    
    console.warn("API key could not be found via process.env. AI features will be disabled.");
    return undefined;
  } catch(e) {
    // This catch block is a fallback for unusual environments where accessing `process` might throw.
    console.error("An unexpected error occurred while trying to access the API key.", e);
    return undefined;
  }
};


// FloatingNav component defined in App.tsx to avoid creating new files.
const FloatingNav: React.FC<{
  changeView: (view: View) => void;
  onOpenSettings: () => void;
  onOpenSavedStories: () => void;
  isVisible: boolean;
}> = ({ changeView, onOpenSettings, onOpenSavedStories, isVisible }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 32, left: 32 });
  const [isDragging, setIsDragging] = useState(false);
  const hasDraggedRef = useRef(false);
  const dragStartPos = useRef({ x: 0, y: 0, top: 0, left: 0 });
  const fabRef = useRef<HTMLDivElement>(null);

  const colors = {
    cyan: 'bg-cyan-500 hover:bg-cyan-400 shadow-[0_0_15px_var(--neon-cyan)]',
    pink: 'bg-pink-500 hover:bg-pink-400 shadow-[0_0_15px_var(--neon-pink)]',
    green: 'bg-green-500 hover:bg-green-400 shadow-[0_0_15px_var(--neon-green)]',
    purple: 'bg-purple-500 hover:bg-purple-400 shadow-[0_0_15px_var(--neon-purple)]',
    orange: 'bg-orange-500 hover:bg-orange-400 shadow-[0_0_15px_var(--neon-orange)]',
    yellow: 'bg-yellow-400 hover:bg-yellow-300 shadow-[0_0_15px_var(--neon-yellow)]',
  };

  type NavItem = {
    id: string;
    onClick: () => void;
    icon: React.ComponentProps<typeof Icon>['name'];
    color: keyof typeof colors;
    label: string;
  };

  const navItems: NavItem[] = [
    { id: 'library', onClick: () => changeView(View.Library), icon: 'music-note', color: 'cyan', label: 'Library' },
    { id: 'favorites', onClick: () => changeView(View.Favorites), icon: 'heart-filled', color: 'pink', label: 'Favorites' },
    { id: 'radio', onClick: () => changeView(View.Radio), icon: 'radio', color: 'green', label: 'Radio' },
    { id: 'eq', onClick: () => changeView(View.EQ), icon: 'eq', color: 'purple', label: 'Audio Settings' },
    { id: 'stories', onClick: onOpenSavedStories, icon: 'book', color: 'yellow', label: 'Saved Stories' },
    { id: 'settings', onClick: onOpenSettings, icon: 'settings', color: 'orange', label: 'AI Settings' },
  ];

  const handleMouseMove = useCallback((e: MouseEvent) => {
    e.preventDefault();
    const dx = e.clientX - dragStartPos.current.x;
    const dy = e.clientY - dragStartPos.current.y;

    if (!hasDraggedRef.current && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
      hasDraggedRef.current = true;
    }

    const fabSize = 80;
    const newLeft = dragStartPos.current.left + dx;
    const newTop = dragStartPos.current.top + dy;
    
    const expandedWidth = fabSize + (navItems.length * (56 + 16)); // 56=w-14, 16=gap-4
    const currentWidth = isOpen ? expandedWidth : fabSize;

    const constrainedLeft = Math.max(16, Math.min(newLeft, window.innerWidth - currentWidth - 16));
    const constrainedTop = Math.max(16, Math.min(newTop, window.innerHeight - fabSize - 16));

    setPosition({ top: constrainedTop, left: constrainedLeft });
  }, [isOpen, navItems.length]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    document.body.style.userSelect = '';
    document.body.style.cursor = 'default';
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove]);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only allow dragging by the main button
    if (!(e.target as HTMLElement).closest('button[aria-expanded]')) return;
    
    e.preventDefault();
    setIsDragging(true);
    hasDraggedRef.current = false;
    dragStartPos.current = { x: e.clientX, y: e.clientY, top: position.top, left: position.left };
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'grabbing';
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  useEffect(() => {
    // Safety cleanup
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);


  if (!isVisible) return null;

  return (
    <div 
        ref={fabRef}
        className="fixed z-[60]"
        style={{ top: `${position.top}px`, left: `${position.left}px` }}
        onMouseDown={handleMouseDown}
    >
      <div className="relative flex items-center gap-4">
        <button
          onClick={() => {
            if (hasDraggedRef.current) {
                hasDraggedRef.current = false; // Reset after drag
                return;
            }
            setIsOpen(!isOpen);
          }}
          className={`w-20 h-20 rounded-full flex items-center justify-center text-white bg-gradient-to-br from-purple-600 to-pink-600 transition-all duration-300 ease-in-out transform hover:scale-110 focus:outline-none ${isDragging ? 'cursor-grabbing scale-110' : 'cursor-pointer'}`}
          style={{ boxShadow: '0 0 8px var(--neon-pink), 0 0 16px var(--neon-purple), inset 0 0 5px rgba(255,255,255,0.4)' }}
          aria-expanded={isOpen}
          aria-label="Toggle navigation menu"
        >
          <div className="absolute inset-0 bg-black/20 rounded-full"></div>
          <Icon name={isOpen ? 'close' : 'music-note'} className={`w-10 h-10 transition-transform duration-300`} />
        </button>
        {navItems.map((item, index) => (
          <button
            key={item.id}
            onClick={() => {
                if (hasDraggedRef.current) return;
                item.onClick();
                setIsOpen(false);
            }}
            className={`w-14 h-14 rounded-full flex items-center justify-center text-black font-semibold transition-all duration-300 transform ${colors[item.color]} ${isOpen ? 'scale-100 opacity-100' : 'scale-0 opacity-0 -translate-x-4'}`}
            style={{ transitionDelay: `${isOpen ? index * 50 : (navItems.length - index - 1) * 30}ms`}}
            aria-label={item.label}
          >
            <Icon name={item.icon} className="w-7 h-7" />
          </button>
        ))}
      </div>
    </div>
  );
};

const useDragToScroll = () => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startPos = useRef({ top: 0, left: 0, x: 0, y: 0 });
  const hasDragged = useRef(false);

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging.current || !scrollRef.current) return;
    e.preventDefault(); // Prevent text selection
    const dx = e.clientX - startPos.current.x;
    const dy = e.clientY - startPos.current.y;
    if (!hasDragged.current && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
      hasDragged.current = true;
    }
    scrollRef.current.scrollTop = startPos.current.top - dy;
    scrollRef.current.scrollLeft = startPos.current.left - dx;
  }, []);

  const onMouseUp = useCallback(() => {
    isDragging.current = false;
    if (scrollRef.current) {
      scrollRef.current.style.cursor = 'grab';
      scrollRef.current.style.userSelect = 'auto';
    }
    // Clean up the global event listeners
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
  }, [onMouseMove]);

  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only drag with primary mouse button, and not on interactive elements.
    if (e.button !== 0 || (e.target as HTMLElement).closest('button, input, a, [role="button"]')) {
      return;
    }
    if (!scrollRef.current) return;
    
    e.preventDefault(); // Prevent default actions like text selection
    isDragging.current = true;
    hasDragged.current = false; // Reset drag status
    startPos.current = {
      left: scrollRef.current.scrollLeft,
      top: scrollRef.current.scrollTop,
      x: e.clientX,
      y: e.clientY,
    };
    scrollRef.current.style.cursor = 'grabbing';
    scrollRef.current.style.userSelect = 'none';
    
    // Add listeners to the document to capture mouse moves anywhere on the page
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };
  
  const onClickCapture = (e: React.MouseEvent<HTMLDivElement>) => {
    if (hasDragged.current) {
      e.stopPropagation();
      hasDragged.current = false; // Reset after preventing the click
    }
  };
  
  // Set initial cursor style and add a safety cleanup
  useEffect(() => {
    const element = scrollRef.current;
    if (element) {
        element.style.cursor = 'grab';
    }

    // This cleanup is a fail-safe in case the component unmounts while dragging
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, [onMouseMove, onMouseUp]);

  return { scrollRef, onMouseDown, onClickCapture };
};


const App: React.FC = () => {
  const [apiKey] = useState<string | undefined>(safeGetApiKey());
  const [tracks, setTracks] = useState<Track[]>([]);
  const [stationTracks, setStationTracks] = useState<Track[]>(predefinedStations);
  const [allTracks, setAllTracks] = useState<Track[]>([]);

  const [favorites, setFavorites] = useState<(number | string)[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [view, setView] = useState<View>(View.Library);
  const [previousView, setPreviousView] = useState<View>(View.Library);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  
  const initialSettings = useRef(getInitialAudioSettings()).current;
  const [eqBands, setEqBands] = useState<number[]>(initialSettings.eqBands);
  const [isEqEnabled, setIsEqEnabled] = useState(initialSettings.isEqEnabled);
  const [ampGain, setAmpGain] = useState(initialSettings.ampGain);
  const [isAmpEnabled, setIsAmpEnabled] = useState(initialSettings.isAmpEnabled);
  
  // Smart Features State
  const [isDuckingEnabled, setIsDuckingEnabled] = useState(false);
  const [isDuckingActive, setIsDuckingActive] = useState(false);
  const [isAiDjEnabled, setIsAiDjEnabled] = useState(false);
  const [isAiDjSpeaking, setIsAiDjSpeaking] = useState(false);
  const [isAiDjThinking, setIsAiDjThinking] = useState(false);
  const [aiDjAnnouncement, setAiDjAnnouncement] = useState('');
  
  const [story, setStory] = useState('');
  const [isStoryLoading, setIsStoryLoading] = useState(false);
  const [isGeneratingArt, setIsGeneratingArt] = useState(false);
  const [isStoryModalOpen, setIsStoryModalOpen] = useState(false);
  const [isSettingsPanelOpen, setIsSettingsPanelOpen] = useState(false);
  const [isAddStationModalOpen, setIsAddStationModalOpen] = useState(false);
  const [isSavedStoriesModalOpen, setIsSavedStoriesModalOpen] = useState(false);
  const [isVisualizerOpen, setIsVisualizerOpen] = useState(false);
  const [isAudioContextReady, setIsAudioContextReady] = useState(false);
  const [isResetConfirmationOpen, setIsResetConfirmationOpen] = useState(false);

  const [savedStories, setSavedStories] = useState<SavedStory[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const [systemInstruction, setSystemInstruction] = useState(
    "You are a creative and whimsical storyteller, a bard of the digital age. Your purpose is to weave short, evocative tales inspired by music. Your stories should be concise, under 150 words, and capture the essence of a song's title and artist. The tone should be imaginative, slightly mysterious, and suitable for a general audience. Avoid clichés and aim for unique interpretations."
  );
  const [promptTemplate, setPromptTemplate] = useState(
    "Based on the song '{{TRACK_NAME}}' by '{{ARTIST_NAME}}', write a short, imaginative story. Capture a potential mood or narrative inspired by the title and artist."
  );

  const [currentPages, setCurrentPages] = useState({
    [View.Library]: 1,
    [View.Favorites]: 1,
    [View.Radio]: 1,
  });

  const { scrollRef, onMouseDown, onClickCapture } = useDragToScroll();

  const audioRef = useRef<HTMLAudioElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const eqNodesRef = useRef<BiquadFilterNode[]>([]);
  const gainNodeRef = useRef<GainNode | null>(null);
  const preampGainNodeRef = useRef<GainNode | null>(null);
  const duckingGainNodeRef = useRef<GainNode | null>(null);
  const analyserNodeRef = useRef<AnalyserNode | null>(null);
  const duckingAnalysisRef = useRef({ consecutiveFrames: 0, animationFrameId: 0 });
  const speechSynthesisRef = useRef(window.speechSynthesis);
  const dataLoadedRef = useRef(false);

  // Effect to save audio settings to localStorage
  useEffect(() => {
    try {
        const settingsToSave = {
            eqBands,
            isEqEnabled,
            ampGain,
            isAmpEnabled,
        };
        localStorage.setItem(AUDIO_SETTINGS_KEY, JSON.stringify(settingsToSave));
    } catch (e) {
        console.error("Could not save audio settings to localStorage", e);
    }
  }, [eqBands, isEqEnabled, ampGain, isAmpEnabled]);


  useEffect(() => {
    if (dataLoadedRef.current) return;
    dataLoadedRef.current = true;

    const loadPersistedData = async () => {
      try {
        await db.openDB();
        const [persistedTracks, persistedFavorites, persistedStories] = await Promise.all([
          db.getTracks(),
          db.getFavorites(),
          db.getStories(),
        ]);
        
        const fileTracks = persistedTracks.filter(t => t.type === 'file');
        const customStations = persistedTracks.filter(t => t.type === 'stream');

        if (fileTracks.length > 0) setTracks(fileTracks);
        if (customStations.length > 0) setStationTracks(prev => [...prev, ...customStations]);
        if (persistedFavorites.length > 0) setFavorites(persistedFavorites);
        if (persistedStories.length > 0) setSavedStories(persistedStories);

      } catch (error) {
        console.error("Could not load data from IndexedDB:", error);
      }
    };
    
    loadPersistedData();
  }, []);

  useEffect(() => {
    setAllTracks([...stationTracks, ...tracks]);
  }, [tracks, stationTracks]);

  const currentTrack = currentTrackIndex !== null ? allTracks[currentTrackIndex] : null;

  const changeView = (newView: View) => {
    if (newView !== View.EQ && view !== newView) {
      setPreviousView(view);
    }
    setView(newView);
  };
  
  // Reset search and pagination when view changes
  useEffect(() => {
    setSearchQuery('');
    setCurrentPages(prev => ({ ...prev, [View.Library]: 1, [View.Favorites]: 1, [View.Radio]: 1 }));
  }, [view]);


  const handlePageChange = (viewType: View.Library | View.Favorites | View.Radio) => (page: number) => {
    setCurrentPages(prev => ({ ...prev, [viewType]: page }));
  };


  const setupAudioContext = useCallback(() => {
    if (audioContextRef.current || !audioRef.current) return;

    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const sourceNode = audioContext.createMediaElementSource(audioRef.current);
      const preampGainNode = audioContext.createGain();
      const duckingGainNode = audioContext.createGain();
      const masterGainNode = audioContext.createGain();
      const analyserNode = audioContext.createAnalyser();
      analyserNode.fftSize = 256;

      const eqNodes = EQ_FREQUENCIES.map((frequency) => {
        const eqNode = audioContext.createBiquadFilter();
        eqNode.type = 'peaking';
        eqNode.frequency.value = frequency;
        eqNode.Q.value = 1;
        return eqNode;
      });
      
      audioContextRef.current = audioContext;
      sourceNodeRef.current = sourceNode;
      preampGainNodeRef.current = preampGainNode;
      duckingGainNodeRef.current = duckingGainNode;
      gainNodeRef.current = masterGainNode;
      eqNodesRef.current = eqNodes;
      analyserNodeRef.current = analyserNode;
      setIsAudioContextReady(true);
    } catch(e) {
      console.error("Web Audio API is not supported by this browser.", e);
    }
  }, []);

  const isVolumeDucked = isDuckingActive || isAiDjSpeaking;

  useEffect(() => {
    if (!isAudioContextReady) return;

    const ctx = audioContextRef.current;
    if (!ctx || !sourceNodeRef.current || !preampGainNodeRef.current || !duckingGainNodeRef.current || !gainNodeRef.current || !analyserNodeRef.current) return;
    
    const source = sourceNodeRef.current;
    const preamp = preampGainNodeRef.current;
    const duckingGain = duckingGainNodeRef.current;
    const masterGain = gainNodeRef.current;
    const analyser = analyserNodeRef.current;
    const eqNodes = eqNodesRef.current;

    source.disconnect();
    preamp.disconnect();
    eqNodes.forEach(node => node.disconnect());
    duckingGain.disconnect();
    analyser.disconnect();

    preamp.gain.value = isAmpEnabled ? ampGain : 1;
    masterGain.gain.value = isMuted ? 0 : volume;
    duckingGain.gain.setValueAtTime(isVolumeDucked ? 1/3 : 1, ctx.currentTime);
    eqNodes.forEach((node, i) => {
      node.gain.value = eqBands[i];
    });
    
    source.connect(preamp);
    let lastNode: AudioNode = preamp;
    if (isEqEnabled && eqNodes.length > 0) {
      eqNodes.forEach(eqNode => {
        lastNode.connect(eqNode);
        lastNode = eqNode;
      });
    }
    
    lastNode.connect(duckingGain);
    duckingGain.connect(analyser);
    analyser.connect(masterGain);
    masterGain.connect(ctx.destination);

  }, [isEqEnabled, isAmpEnabled, ampGain, volume, isMuted, eqBands, isVolumeDucked, isAudioContextReady]);


  useEffect(() => {
    if (!isPlaying || !isDuckingEnabled || !isAudioContextReady) {
        cancelAnimationFrame(duckingAnalysisRef.current.animationFrameId);
        if(isDuckingActive) setIsDuckingActive(false);
        return;
    }

    const analyser = analyserNodeRef.current!;
    const audioCtx = audioContextRef.current!;
    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    
    const voiceRangeStart = 300; // Hz
    const voiceRangeEnd = 3400; // Hz

    const analyze = () => {
        analyser.getByteFrequencyData(dataArray);

        let voiceEnergy = 0;
        let totalEnergy = 0;

        for(let i = 0; i < analyser.frequencyBinCount; i++) {
            const freq = i * audioCtx.sampleRate / analyser.fftSize;
            const energy = dataArray[i] * dataArray[i];
            totalEnergy += energy;
            if (freq >= voiceRangeStart && freq <= voiceRangeEnd) {
                voiceEnergy += energy;
            }
        }
        
        const voiceRatio = totalEnergy > 0 ? voiceEnergy / totalEnergy : 0;
        
        if (voiceRatio > 0.35) { // Threshold for detecting voice-like frequencies
            duckingAnalysisRef.current.consecutiveFrames = Math.min(duckingAnalysisRef.current.consecutiveFrames + 1, 20);
        } else {
            duckingAnalysisRef.current.consecutiveFrames = Math.max(duckingAnalysisRef.current.consecutiveFrames - 1, 0);
        }
        
        if (duckingAnalysisRef.current.consecutiveFrames > 10 && !isDuckingActive) {
            setIsDuckingActive(true);
        } else if (duckingAnalysisRef.current.consecutiveFrames < 5 && isDuckingActive) {
            setIsDuckingActive(false);
        }
        
        duckingAnalysisRef.current.animationFrameId = requestAnimationFrame(analyze);
    };

    analyze();

    return () => {
        cancelAnimationFrame(duckingAnalysisRef.current.animationFrameId);
    };

}, [isPlaying, isDuckingEnabled, isAudioContextReady, isDuckingActive]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const setAudioData = () => {
      setDuration(audio.duration);
      setCurrentTime(audio.currentTime);
    };
    const setAudioTime = () => setCurrentTime(audio.currentTime);
    const handleCanPlay = () => {
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
    };
    
    audio.addEventListener('loadeddata', setAudioData);
    audio.addEventListener('timeupdate', setAudioTime);
    audio.addEventListener('canplay', handleCanPlay);

    return () => {
      audio.removeEventListener('loadeddata', setAudioData);
      audio.removeEventListener('timeupdate', setAudioTime);
      audio.removeEventListener('canplay', handleCanPlay);
    };
  }, []);
  
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const newTracks: Track[] = Array.from(files)
        .filter(file => file.type === 'audio/mpeg' || file.name.endsWith('.pls'))
        .flatMap((file, index) => {
          if (file.name.endsWith('.pls')) {
            console.log("PLS file upload detected. Parsing is not yet implemented.", file.name);
            return [];
          }
          return [{
            id: Date.now() + index,
            name: file.name.replace('.mp3', ''),
            url: URL.createObjectURL(file),
            file: file,
            type: 'file',
            artist: 'Local File',
          }];
        });

      for (const track of newTracks) {
        try {
          await db.addTrack(track);
        } catch (error) {
          console.error(`Failed to save track ${track.name} to DB`, error);
        }
      }

      setTracks(prevTracks => [...prevTracks, ...newTracks]);
      setCurrentPages(p => ({...p, [View.Library]: 1}));
    }
  };

  const handleAddStation = async (name: string, url: string) => {
    const newStation: Track = {
        id: `station-custom-${Date.now()}`,
        name,
        url,
        artist: 'Custom Station',
        type: 'stream',
        isCustom: true,
    };
    try {
        await db.addTrack(newStation);
        setStationTracks(prev => [...prev, newStation]);
        setIsAddStationModalOpen(false);
    } catch (error) {
        console.error("Failed to save custom station to DB", error);
    }
  };

  const handleDeleteStation = async (trackId: number | string) => {
    try {
        await db.deleteTrack(trackId);
        setStationTracks(prev => prev.filter(s => s.id !== trackId));
    } catch(error) {
        console.error("Failed to delete custom station from DB", error);
    }
  };

  const handleGenerateAiDjAnnouncement = useCallback(async (track: Track) => {
    if (!apiKey || isAiDjSpeaking || isAiDjThinking) return;
    if (speechSynthesisRef.current?.speaking) return;

    setIsAiDjThinking(true);
    try {
        const ai = new GoogleGenAI({apiKey: apiKey});
        let prompt: string;
        if (track.type === 'stream') {
            prompt = `You are a retro-futuristic radio DJ. The station is called "${track.name}". Briefly introduce the station and its vibe in a cool, concise manner (around 20-30 words).`;
        } else {
            prompt = `You are a retro-futuristic radio DJ. Briefly introduce the song "${track.name}" by "${track.artist || 'an unknown artist'}" with a fun fact or an interesting tidbit about the song or artist (around 20-30 words).`;
        }
        
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        setAiDjAnnouncement(response.text);

    } catch (error) {
        console.error("Error generating AI DJ announcement:", error);
    } finally {
        setIsAiDjThinking(false);
    }
  }, [apiKey, isAiDjSpeaking, isAiDjThinking]);

  useEffect(() => {
    if (!aiDjAnnouncement) return;

    const utterance = new SpeechSynthesisUtterance(aiDjAnnouncement);
    utterance.onstart = () => setIsAiDjSpeaking(true);
    utterance.onend = () => {
        setIsAiDjSpeaking(false);
        setAiDjAnnouncement(''); // Clear announcement after speaking
    };
    utterance.onerror = (e) => {
        console.error("Speech synthesis error:", e);
        setIsAiDjSpeaking(false);
    };
    
    speechSynthesisRef.current?.cancel(); // Cancel any previous speech
    speechSynthesisRef.current?.speak(utterance);

    return () => {
        utterance.onend = null;
        utterance.onstart = null;
        speechSynthesisRef.current?.cancel();
    }
  }, [aiDjAnnouncement]);


  const playTrack = useCallback((index: number) => {
    if (index >= 0 && index < allTracks.length) {
      const trackToPlay = allTracks[index];
      setCurrentTrackIndex(index);
      setIsPlaying(true);
      if(!audioContextRef.current) {
        setupAudioContext();
      }
      if (isAiDjEnabled) {
        handleGenerateAiDjAnnouncement(trackToPlay);
      }
    }
  }, [allTracks, setupAudioContext, isAiDjEnabled, handleGenerateAiDjAnnouncement]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying && currentTrack) {
        if(audio.src !== currentTrack.url) {
            audio.src = currentTrack.url;
        }
        audio.play().catch(error => console.error("Error playing audio:", error));
    } else if (!isPlaying) {
        audio.pause();
    }
  }, [isPlaying, currentTrack]);

  const handlePlayPause = () => {
    if (currentTrack) {
      setIsPlaying(!isPlaying);
    } else if (allTracks.length > 0) {
      playTrack(0);
    }
  };

  const handleNext = () => {
    if (currentTrackIndex === null || currentTrack?.type !== 'file') return;
    
    const fileTracks = allTracks.map((t, i) => ({...t, originalIndex: i})).filter(t => t.type === 'file');
    const currentFileIndex = fileTracks.findIndex(t => t.id === currentTrack.id);

    if (currentFileIndex !== -1) {
        const nextFileIndex = (currentFileIndex + 1) % fileTracks.length;
        playTrack(fileTracks[nextFileIndex].originalIndex);
    }
  };

  const handlePrevious = () => {
    if (currentTrackIndex === null || currentTrack?.type !== 'file') return;

    const fileTracks = allTracks.map((t, i) => ({...t, originalIndex: i})).filter(t => t.type === 'file');
    const currentFileIndex = fileTracks.findIndex(t => t.id === currentTrack.id);

     if (currentFileIndex !== -1) {
        const prevFileIndex = (currentFileIndex - 1 + fileTracks.length) % fileTracks.length;
        playTrack(fileTracks[prevFileIndex].originalIndex);
    }
  };
  
  const handleToggleFavorite = async (trackId: number | string) => {
    const currentFavorites = favorites;
    const newFavorites = currentFavorites.includes(trackId)
      ? currentFavorites.filter(id => id !== trackId)
      : [...currentFavorites, trackId];
    
    setFavorites(newFavorites); // Optimistic UI update

    try {
      await db.saveFavorites(newFavorites);
    } catch(e) {
      console.error("Failed to save favorites to DB", e);
      setFavorites(currentFavorites); // Revert on failure
    }
  };
  
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
      if(audioRef.current){
          audioRef.current.currentTime = Number(e.target.value);
          setCurrentTime(audioRef.current.currentTime);
      }
  };
  
  const handleEnded = () => {
      if (currentTrack?.type === 'file') {
          handleNext();
      }
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    if (newVolume > 0 && isMuted) {
      setIsMuted(false);
    }
  };

  const handleMuteToggle = () => {
    setIsMuted(!isMuted);
  };

  const handleEqChange = (bandIndex: number, gain: number) => {
    setEqBands(prevBands => {
      const newBands = [...prevBands];
      newBands[bandIndex] = gain;
      return newBands;
    });
  };

  const handleAmpGainChange = (gain: number) => {
    setAmpGain(gain);
  };
  
  const handleGenerateStory = useCallback(async () => {
    if (!currentTrack) return;
    if (!apiKey) {
        setStory("API Key is not available. This feature is disabled.");
        setIsStoryModalOpen(true);
        return;
    };

    setIsStoryModalOpen(true);
    setIsStoryLoading(true);
    setStory(''); // Clear previous story

    try {
        const ai = new GoogleGenAI({apiKey});
        
        const finalPrompt = promptTemplate
          .replace('{{TRACK_NAME}}', currentTrack.name)
          .replace('{{ARTIST_NAME}}', currentTrack.artist || 'Unknown Artist');

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: finalPrompt,
            config: {
              systemInstruction: systemInstruction
            }
        });

        setStory(response.text);

    } catch (error) {
        console.error("Error generating story:", error);
        setStory("Sorry, I couldn't come up with a story right now. Please try again later.");
    } finally {
        setIsStoryLoading(false);
    }
  }, [apiKey, currentTrack, promptTemplate, systemInstruction]);

  const handleGenerateCoverArt = useCallback(async () => {
    if (!currentTrack || !apiKey || isGeneratingArt || currentTrack.coverArt) return;

    setIsGeneratingArt(true);
    try {
        const ai = new GoogleGenAI({ apiKey });
        const prompt = `Album cover art for a ${currentTrack.type === 'stream' ? 'radio station' : 'song'} called "${currentTrack.name}"${currentTrack.artist ? ` by "${currentTrack.artist}"` : ''}. Style: retro-futuristic, neon, digital, vibrant, abstract.`;

        const response = await ai.models.generateImages({
            model: 'imagen-3.0-generate-002',
            prompt: prompt,
            config: {
                numberOfImages: 1,
                outputMimeType: 'image/jpeg',
                aspectRatio: '1:1',
            },
        });

        if (response.generatedImages && response.generatedImages.length > 0) {
            const base64ImageBytes = response.generatedImages[0].image.imageBytes;
            const imageUrl = `data:image/jpeg;base64,${base64ImageBytes}`;
            
            const updatedTrack = { ...currentTrack, coverArt: imageUrl };

            // Persist to DB
            await db.addTrack(updatedTrack);

            // Update state
            const updateTrackInState = (trackToUpdate: Track) => {
              setAllTracks(prev => prev.map(t => t.id === trackToUpdate.id ? trackToUpdate : t));
              if (trackToUpdate.type === 'file') {
                  setTracks(prev => prev.map(t => t.id === trackToUpdate.id ? trackToUpdate : t));
              } else {
                  setStationTracks(prev => prev.map(t => t.id === trackToUpdate.id ? trackToUpdate : t));
              }
            }
            updateTrackInState(updatedTrack);
        }

    } catch (error) {
        console.error("Error generating cover art:", error);
    } finally {
        setIsGeneratingArt(false);
    }
  }, [apiKey, currentTrack, isGeneratingArt]);

  const handleSaveStory = async () => {
    if (!story || !currentTrack) return;
    const newSavedStory: SavedStory = {
        id: `story-${Date.now()}`,
        story: story,
        trackId: currentTrack.id,
        trackName: currentTrack.name,
        artist: currentTrack.artist,
        createdAt: Date.now(),
    };
    try {
        await db.addStory(newSavedStory);
        setSavedStories(prev => [newSavedStory, ...prev]);
    } catch (error) {
        console.error("Failed to save story:", error);
    }
  };

  const handleDeleteStory = async (storyId: string) => {
    try {
        await db.deleteStory(storyId);
        setSavedStories(prev => prev.filter(s => s.id !== storyId));
    } catch (error) {
        console.error("Failed to delete story:", error);
    }
  };

  const openSavedStories = async () => {
    try {
        const stories = await db.getStories();
        setSavedStories(stories);
        setIsSavedStoriesModalOpen(true);
    } catch(e) {
        console.error("Could not load saved stories", e);
    }
  };

  const handleResetApplication = async () => {
    console.log("Resetting application...");
    try {
        await db.clearAllData();
        localStorage.removeItem(AUDIO_SETTINGS_KEY);
        console.log("All data cleared.");
        window.location.reload();
    } catch (error) {
        console.error("Failed to reset application:", error);
        alert("There was an error while resetting the application. Please try again.");
    }
  };

  const userFileTracks = allTracks.filter(t => t.type === 'file');
  const favoriteTracks = allTracks.filter(t => favorites.includes(t.id));

  // --- Search & Filter Logic ---
    const filterTracks = (tracks: Track[], query: string) => {
        if (!query) return tracks;
        const lowercasedQuery = query.toLowerCase();
        return tracks.filter(
            t => t.name.toLowerCase().includes(lowercasedQuery) ||
                 (t.artist || '').toLowerCase().includes(lowercasedQuery)
        );
    };

  const filteredLibrary = filterTracks(userFileTracks, searchQuery);
  const filteredFavorites = filterTracks(favoriteTracks, searchQuery);
  const filteredRadio = filterTracks(stationTracks, searchQuery);

  const paginatedLibrary = filteredLibrary.slice(
      (currentPages[View.Library] - 1) * ITEMS_PER_PAGE_LIBRARY,
      currentPages[View.Library] * ITEMS_PER_PAGE_LIBRARY
  );
  const totalLibraryPages = Math.ceil(filteredLibrary.length / ITEMS_PER_PAGE_LIBRARY);

  const paginatedFavorites = filteredFavorites.slice(
      (currentPages[View.Favorites] - 1) * ITEMS_PER_PAGE_FAVORITES,
      currentPages[View.Favorites] * ITEMS_PER_PAGE_FAVORITES
  );
  const totalFavoritesPages = Math.ceil(filteredFavorites.length / ITEMS_PER_PAGE_FAVORITES);

  const paginatedRadio = filteredRadio.slice(
      (currentPages[View.Radio] - 1) * ITEMS_PER_PAGE_RADIO,
      currentPages[View.Radio] * ITEMS_PER_PAGE_RADIO
  );
  const totalRadioPages = Math.ceil(filteredRadio.length / ITEMS_PER_PAGE_RADIO);

  // --- Dynamic styles for search bar ---
    const viewStyles: { [key in Exclude<View, View.EQ>]: { placeholder: string, focusRing: string } } = {
        [View.Library]: { placeholder: 'Search Library...', focusRing: 'focus:ring-cyan-500 focus:border-cyan-500' },
        [View.Favorites]: { placeholder: 'Search Favorites...', focusRing: 'focus:ring-pink-500 focus:border-pink-500' },
        [View.Radio]: { placeholder: 'Search Radio...', focusRing: 'focus:ring-green-500 focus:border-green-500' },
    };
    const currentViewStyle = viewStyles[view as Exclude<View, View.EQ>];


  return (
    <div className="min-h-screen bg-[#121212] text-gray-200 flex flex-col font-sans">
      <audio ref={audioRef} onEnded={handleEnded} crossOrigin="anonymous" />
      <main className="flex-grow p-4 sm:p-6 md:p-8 flex flex-col mb-28">
        
        <div className="bg-black/30 backdrop-blur-md rounded-xl p-4 sm:p-6 shadow-2xl flex-grow flex flex-col border border-cyan-400/20 shadow-[0_0_25px_rgba(0,255,255,0.2)] mt-24">
          {view !== View.EQ && (
            <div className="flex items-center justify-between mb-6 gap-4">
              <div className="flex bg-black/30 border border-gray-700 rounded-lg p-1 flex-shrink-0">
                <button onClick={() => changeView(View.Library)} className={`px-4 py-2 text-sm rounded-md transition-all duration-300 ${view === View.Library ? 'bg-cyan-400 shadow-[0_0_10px_var(--neon-cyan)] font-on-neon' : 'text-gray-300 hover:bg-cyan-400/20 hover:text-cyan-300'}`}>
                  Library
                </button>
                <button onClick={() => changeView(View.Favorites)} className={`px-4 py-2 text-sm rounded-md transition-all duration-300 ${view === View.Favorites ? 'bg-pink-500 shadow-[0_0_10px_var(--neon-pink)] font-on-neon' : 'text-gray-300 hover:bg-pink-500/20 hover:text-pink-400'}`}>
                  Favorites
                </button>
                <button onClick={() => changeView(View.Radio)} className={`px-4 py-2 text-sm rounded-md transition-all duration-300 ${view === View.Radio ? 'bg-green-500 shadow-[0_0_10px_var(--neon-green)] font-on-neon' : 'text-gray-300 hover:bg-green-500/20 hover:text-green-400'}`}>
                  Radio
                </button>
              </div>
               <div className="relative w-full max-w-xs">
                    <input 
                        type="text"
                        placeholder={currentViewStyle?.placeholder || "Search..."}
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className={`w-full bg-black/40 border border-gray-600 rounded-lg pl-4 pr-10 py-2 text-white focus:outline-none focus:ring-2 transition-all ${currentViewStyle?.focusRing}`}
                        aria-label="Search"
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-white" aria-label="Clear search">
                            <Icon name="close" className="w-5 h-5" />
                        </button>
                    )}
                </div>
               <div className="flex items-center gap-4">
                 {view === View.Radio && (
                    <button onClick={() => setIsAddStationModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-green-600/80 text-white rounded-lg cursor-pointer hover:bg-green-600 transition-all duration-300 shadow-[0_0_10px_var(--neon-green)] flex-shrink-0">
                      <Icon name="plus" />
                      <span>Add</span>
                    </button>
                )}
                {view !== View.Radio && (
                    <label className="flex items-center gap-2 px-4 py-2 bg-pink-600/80 text-white rounded-lg cursor-pointer hover:bg-pink-600 transition-all duration-300 shadow-[0_0_10px_var(--neon-pink)] flex-shrink-0">
                        <Icon name="upload" />
                        <span>Upload</span>
                        <input type="file" multiple accept=".mp3" onChange={handleFileUpload} className="hidden" />
                    </label>
                )}
               </div>
            </div>
          )}

          <div ref={scrollRef} onMouseDown={onMouseDown} onClickCapture={onClickCapture} className="flex-grow overflow-y-auto no-scrollbar pr-2">
            {view === View.Library && (
              <>
                <MusicLibrary 
                  tracks={paginatedLibrary}
                  favorites={favorites}
                  onSelectTrack={(index) => {
                      const track = paginatedLibrary[index];
                      const originalIndex = allTracks.findIndex(t => t.id === track.id);
                      if(originalIndex !== -1) playTrack(originalIndex);
                  }}
                  onToggleFavorite={handleToggleFavorite}
                  currentTrackId={currentTrack?.id}
                  isPlaying={isPlaying}
                  searchQuery={searchQuery}
                  totalTracks={userFileTracks.length}
                />
                <Pagination currentPage={currentPages[View.Library]} totalPages={totalLibraryPages} onPageChange={handlePageChange(View.Library)} />
              </>
            )}
            {view === View.Favorites && (
              <>
                <FavoritesList 
                  tracks={paginatedFavorites}
                  favorites={favorites}
                  onSelectTrack={(trackId) => {
                      const originalIndex = allTracks.findIndex(t => t.id === trackId);
                      if(originalIndex !== -1) playTrack(originalIndex);
                  }}
                  onToggleFavorite={handleToggleFavorite}
                  currentTrackId={currentTrack?.id}
                  isPlaying={isPlaying}
                  searchQuery={searchQuery}
                  totalTracks={favoriteTracks.length}
                />
                <Pagination currentPage={currentPages[View.Favorites]} totalPages={totalFavoritesPages} onPageChange={handlePageChange(View.Favorites)} />
              </>
            )}
            {view === View.Radio && (
              <>
                <RadioStationList 
                    stations={paginatedRadio}
                    onSelectStation={(index) => {
                        const station = paginatedRadio[index];
                        const originalIndex = allTracks.findIndex(t => t.id === station.id);
                        if(originalIndex !== -1) playTrack(originalIndex);
                    }}
                    currentTrackId={currentTrack?.id}
                    isPlaying={isPlaying}
                    onDeleteStation={handleDeleteStation}
                    searchQuery={searchQuery}
                    totalTracks={stationTracks.length}
                />
                <Pagination currentPage={currentPages[View.Radio]} totalPages={totalRadioPages} onPageChange={handlePageChange(View.Radio)} />
              </>
            )}
             {view === View.EQ && (
              <EqSettings
                bands={eqBands}
                onEqChange={handleEqChange}
                isEqEnabled={isEqEnabled}
                onToggleEq={setIsEqEnabled}
                ampGain={ampGain}
                onAmpGainChange={handleAmpGainChange}
                isAmpEnabled={isAmpEnabled}
                onToggleAmp={setIsAmpEnabled}
                isDuckingEnabled={isDuckingEnabled}
                onToggleDucking={setIsDuckingEnabled}
                isAiDjEnabled={isAiDjEnabled}
                onToggleAiDj={setIsAiDjEnabled}
                onBack={() => setView(previousView)}
                analyserNode={isAudioContextReady ? analyserNodeRef.current : null}
              />
            )}
          </div>
        </div>
      </main>

      <FloatingNav
        changeView={changeView}
        onOpenSettings={() => setIsSettingsPanelOpen(true)}
        onOpenSavedStories={openSavedStories}
        isVisible={view !== View.EQ}
      />

      <AddStationModal
        isOpen={isAddStationModalOpen}
        onClose={() => setIsAddStationModalOpen(false)}
        onSave={handleAddStation}
      />

      <SavedStoriesModal
        isOpen={isSavedStoriesModalOpen}
        onClose={() => setIsSavedStoriesModalOpen(false)}
        stories={savedStories}
        onDeleteStory={handleDeleteStory}
      />

      <SettingsPanel
        isOpen={isSettingsPanelOpen}
        onClose={() => setIsSettingsPanelOpen(false)}
        systemInstruction={systemInstruction}
        setSystemInstruction={setSystemInstruction}
        promptTemplate={promptTemplate}
        setPromptTemplate={setPromptTemplate}
        onOpenResetConfirmation={() => setIsResetConfirmationOpen(true)}
      />

      <ConfirmationModal
        isOpen={isResetConfirmationOpen}
        onClose={() => setIsResetConfirmationOpen(false)}
        onConfirm={handleResetApplication}
        title="Reset Application?"
      >
        <p>Are you sure you want to proceed? This will permanently delete all your uploaded music, custom radio stations, favorites, saved stories, and audio settings.</p>
        <p className="mt-2 font-semibold">This action cannot be undone.</p>
      </ConfirmationModal>

      <StoryModal
        isOpen={isStoryModalOpen}
        isLoading={isStoryLoading}
        story={story}
        trackName={currentTrack?.name}
        onClose={() => setIsStoryModalOpen(false)}
        onSave={handleSaveStory}
        isSaved={savedStories.some(s => s.story === story && s.trackId === currentTrack?.id)}
      />

      <Visualizer
        isOpen={isVisualizerOpen && !!currentTrack && isAudioContextReady}
        onClose={() => setIsVisualizerOpen(false)}
        track={currentTrack!}
        analyserNode={analyserNodeRef.current!}
        isPlaying={isPlaying}
        onPlayPause={handlePlayPause}
        onNext={handleNext}
        onPrevious={handlePrevious}
      />

      {currentTrack && (
        <MusicPlayer 
          track={currentTrack}
          isPlaying={isPlaying}
          onPlayPause={handlePlayPause}
          onNext={handleNext}
          onPrevious={handlePrevious}
          currentTime={currentTime}
          duration={duration}
          onSeek={handleSeek}
          volume={volume}
          isMuted={isMuted}
          onVolumeChange={handleVolumeChange}
          onMuteToggle={handleMuteToggle}
          onEqAmpSettings={() => changeView(View.EQ)}
          isEqEnabled={isEqEnabled}
          onToggleEq={setIsEqEnabled}
          isAmpEnabled={isAmpEnabled}
          onToggleAmp={setIsAmpEnabled}
          analyserNode={isAudioContextReady ? analyserNodeRef.current : null}
          onGenerateStory={handleGenerateStory}
          isVolumeDucked={isVolumeDucked}
          isAiDjSpeaking={isAiDjSpeaking}
          onGenerateAiDj={() => handleGenerateAiDjAnnouncement(currentTrack)}
          isAiDjThinking={isAiDjThinking}
          onGenerateCoverArt={handleGenerateCoverArt}
          isGeneratingArt={isGeneratingArt}
          onToggleVisualizer={() => setIsVisualizerOpen(true)}
        />
      )}
    </div>
  );
};

export default App;