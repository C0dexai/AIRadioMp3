import React from 'react';

interface EqControlsProps {
    bands: number[];
    onEqChange: (bandIndex: number, gain: number) => void;
    isEnabled: boolean;
}

const EQ_FREQUENCIES = ['60', '250', '1k', '4k', '16k'];
const EQ_FREQUENCY_LABELS = ['60 Hz', '250 Hz', '1 kHz', '4 kHz', '16 kHz'];


const EqControls: React.FC<EqControlsProps> = ({ bands, onEqChange, isEnabled }) => {
    return (
        <div className={`flex justify-around items-end h-48 transition-opacity duration-300 ${isEnabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`} role="group" aria-label="Equalizer Controls">
            {bands.map((gain, index) => (
                <div key={index} className="flex flex-col items-center">
                    <label htmlFor={`eq-slider-${index}`} className="sr-only">
                        {EQ_FREQUENCY_LABELS[index]} gain
                    </label>
                    <div className="relative h-40 flex items-center">
                        <input
                            id={`eq-slider-${index}`}
                            type="range" min="-20" max="20" step="1" value={gain}
                            onChange={(e) => onEqChange(index, Number(e.target.value))}
                            className="appearance-none w-2 h-40 bg-gray-700 rounded-full cursor-pointer eq-slider"
                            style={{ writingMode: 'vertical-lr', direction: 'rtl' }}
                            disabled={!isEnabled}
                            aria-orientation="vertical"
                            aria-valuenow={gain}
                            aria-valuemin={-20}
                            aria-valuemax={20}
                        />
                    </div>
                    <span className="text-sm text-gray-400 mt-3" aria-hidden="true">{EQ_FREQUENCIES[index]}</span>
                </div>
            ))}
        </div>
    );
};

export default EqControls;