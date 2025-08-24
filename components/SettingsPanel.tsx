import React, { useState, useEffect, useRef } from 'react';
import Icon from './Icon';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  systemInstruction: string;
  setSystemInstruction: (value: string) => void;
  promptTemplate: string;
  setPromptTemplate: (value: string) => void;
  onOpenResetConfirmation: () => void;
}

// Check for SpeechRecognition API
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
const isSpeechRecognitionSupported = !!SpeechRecognition;

const SettingsPanel: React.FC<SettingsPanelProps> = ({
  isOpen,
  onClose,
  systemInstruction,
  setSystemInstruction,
  promptTemplate,
  setPromptTemplate,
  onOpenResetConfirmation,
}) => {
  const [isListeningSystem, setIsListeningSystem] = useState(false);
  const [isListeningPrompt, setIsListeningPrompt] = useState(false);
  
  const recognitionRef = useRef<any>(null);

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListeningSystem(false);
    setIsListeningPrompt(false);
  };

  const handleToggleListening = (
    type: 'system' | 'prompt', 
    currentValue: string, 
    setter: (value: string) => void,
    isListening: boolean,
    setIsListening: (value: boolean) => void
  ) => {
    if (isListening) {
      stopListening();
      return;
    }

    if (!isSpeechRecognitionSupported) {
      alert("Speech recognition is not supported in your browser.");
      return;
    }

    // Stop any other listening instance
    stopListening();
    
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      stopListening();
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      setter(currentValue + finalTranscript + interimTranscript);
    };

    recognition.start();
  };
  
  useEffect(() => {
    // Cleanup on component unmount
    return () => {
      stopListening();
    };
  }, []);


  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/60 z-[70] transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-[#181818] shadow-2xl z-[80] transition-transform duration-300 ease-in-out transform ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        } border-l-2 border-purple-500/50 flex flex-col`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-panel-title"
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-700 flex-shrink-0">
          <h2 id="settings-panel-title" className="text-xl font-bold text-purple-300 neon-text-glow-purple">AI Custom Instructions</h2>
          <button onClick={onClose} className="p-2 text-gray-400 rounded-full hover:bg-gray-700 hover:text-white" aria-label="Close settings panel">
            <Icon name="close" className="w-6 h-6" />
          </button>
        </div>
        
        <div className="flex-grow p-6 overflow-y-auto space-y-6">
          <div>
            <div className="flex justify-between items-center mb-2">
              <label htmlFor="system-orchestrator" className="block text-sm font-medium text-gray-300">
                System Orchestrator (System Instruction)
              </label>
              {isSpeechRecognitionSupported && (
                <button
                    onClick={() => handleToggleListening('system', systemInstruction, setSystemInstruction, isListeningSystem, setIsListeningSystem)}
                    className={`p-1.5 rounded-full transition-colors ${isListeningSystem ? 'bg-red-500/80 animate-pulse' : 'bg-gray-600 hover:bg-gray-500'}`}
                    aria-label={isListeningSystem ? 'Stop dictating' : 'Dictate system instruction'}
                >
                    <Icon name="radio" className="w-4 h-4 text-white" />
                </button>
              )}
            </div>
            <textarea
              id="system-orchestrator"
              rows={8}
              className="w-full p-3 bg-black/50 border border-gray-600 rounded-lg text-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
              value={systemInstruction}
              onChange={(e) => setSystemInstruction(e.target.value)}
              placeholder="Define the AI's persona and core instructions..."
            />
            <p className="text-xs text-gray-500 mt-2">This sets the overall behavior and personality of the AI story generator.</p>
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-2">
                <label htmlFor="ai-supervisor" className="block text-sm font-medium text-gray-300">
                AI Supervisor (Prompt Template)
                </label>
                {isSpeechRecognitionSupported && (
                     <button
                        onClick={() => handleToggleListening('prompt', promptTemplate, setPromptTemplate, isListeningPrompt, setIsListeningPrompt)}
                        className={`p-1.5 rounded-full transition-colors ${isListeningPrompt ? 'bg-red-500/80 animate-pulse' : 'bg-gray-600 hover:bg-gray-500'}`}
                        aria-label={isListeningPrompt ? 'Stop dictating' : 'Dictate prompt template'}
                    >
                         <Icon name="radio" className="w-4 h-4 text-white" />
                    </button>
                )}
            </div>
            <textarea
              id="ai-supervisor"
              rows={6}
              className="w-full p-3 bg-black/50 border border-gray-600 rounded-lg text-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
              value={promptTemplate}
              onChange={(e) => setPromptTemplate(e.target.value)}
              placeholder="Define the prompt structure. Use {{TRACK_NAME}} and {{ARTIST_NAME}} as placeholders."
            />
            <p className="text-xs text-gray-500 mt-2">
              Use placeholders <code className="text-cyan-400 bg-black/50 px-1 rounded-sm">{'{{TRACK_NAME}}'}</code> and <code className="text-cyan-400 bg-black/50 px-1 rounded-sm">{'{{ARTIST_NAME}}'}</code> to insert track details.
            </p>
          </div>

          <div className="pt-6 border-t border-gray-700">
            <h3 className="text-lg font-semibold text-red-400">Danger Zone</h3>
            <p className="text-sm text-gray-500 mt-1 mb-4">These actions are irreversible. Please be certain.</p>
            <button
              onClick={onOpenResetConfirmation}
              className="w-full px-4 py-2 bg-red-600/80 text-white rounded-lg hover:bg-red-600 transition-all duration-300 border border-red-500 shadow-[0_0_10px_rgba(255,82,82,0.5)]"
            >
              Reset Application
            </button>
          </div>
        </div>
        <div className="p-4 border-t border-gray-700 flex-shrink-0">
            <p className="text-xs text-center text-gray-500">Instructions are saved automatically as you type.</p>
        </div>
      </div>
    </>
  );
};

export default SettingsPanel;