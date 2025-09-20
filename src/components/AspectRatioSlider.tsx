import React, { useState } from 'react';
import { AspectRatio } from '../types';
import { cn } from '../utils/cn';

const ASPECT_RATIOS: AspectRatio[] = [
  { label: '1600×832', width: 1600, height: 832, ratio: 1600/832 },
  { label: '1440×960', width: 1440, height: 960, ratio: 1440/960 },
  { label: '1360×1120', width: 1360, height: 1120, ratio: 1360/1120 },
  { label: '1280×1280', width: 1280, height: 1280, ratio: 1 },
  { label: '1120×1360', width: 1120, height: 1360, ratio: 1120/1360 },
  { label: '960×1440', width: 960, height: 1440, ratio: 960/1440 },
  { label: '832×1600', width: 832, height: 1600, ratio: 832/1600 },
];

interface AspectRatioSliderProps {
  value: AspectRatio;
  onChange: (ratio: AspectRatio) => void;
  disabled?: boolean;
  disabledReason?: string;
}

export const AspectRatioSlider: React.FC<AspectRatioSliderProps> = ({ value, onChange, disabled = false, disabledReason }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const currentIndex = ASPECT_RATIOS.findIndex(ratio => ratio.label === value.label);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const index = parseInt(e.target.value);
    onChange(ASPECT_RATIOS[index]);
  };

  const getPreviewSize = (ratio: AspectRatio) => {
    // Use actual ratio to scale down proportionally
    const scale = 0.05; // Scale factor to make it reasonable size
    return {
      width: ratio.width * scale,
      height: ratio.height * scale
    };
  };

  return (
    <div className={cn("space-y-3", disabled && "opacity-50 pointer-events-none")}>
      <div className="select-none opacity-50 text-xs flex items-center justify-between mb-3">
        <div className="flex items-center">
          <svg stroke="currentColor" fill="none" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" className="mr-2 text-sm" height="1em" width="1em" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
          </svg>
          <p>Dimensions</p>
        </div>
        {disabled && disabledReason && (
          <div
            className="text-xs text-zinc-400 cursor-help"
            title={disabledReason}
          >
            ⓘ
          </div>
        )}
      </div>

      <div className="relative">
        {/* Slider */}
        <div className="relative">
          <input
            type="range"
            min="0"
            max={ASPECT_RATIOS.length - 1}
            step="1"
            value={currentIndex}
            onChange={handleSliderChange}
            onMouseDown={() => setIsDragging(true)}
            onMouseUp={() => setIsDragging(false)}
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const percent = (e.clientX - rect.left) / rect.width;
              const index = Math.round(percent * (ASPECT_RATIOS.length - 1));
              setHoveredIndex(Math.max(0, Math.min(ASPECT_RATIOS.length - 1, index)));
            }}
            onMouseLeave={() => {
              if (!isDragging) {
                setHoveredIndex(null);
              }
            }}
            className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer slider"
            style={{
              background: `linear-gradient(to right,
                #6366f1 0%,
                #6366f1 ${(currentIndex / (ASPECT_RATIOS.length - 1)) * 100}%,
                #374151 ${(currentIndex / (ASPECT_RATIOS.length - 1)) * 100}%,
                #374151 100%)`
            }}
          />

          {/* Hover preview */}
          {hoveredIndex !== null && (
            <div
              className="absolute bottom-full mb-2 bg-zinc-900 border border-zinc-700 rounded-lg p-3 shadow-lg z-10"
              style={{
                left: `${(hoveredIndex / (ASPECT_RATIOS.length - 1)) * 100}%`,
                transform: 'translateX(-50%)'
              }}
            >
              <div className="flex flex-col items-center space-y-2">
                {/* Preview rectangle */}
                <div
                  className="bg-zinc-600 border border-zinc-500 rounded"
                  style={getPreviewSize(ASPECT_RATIOS[hoveredIndex])}
                />
                <span className="text-xs text-zinc-300 whitespace-nowrap">
                  {ASPECT_RATIOS[hoveredIndex].label}
                </span>
              </div>
              {/* Arrow */}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-zinc-700" />
            </div>
          )}
        </div>

        {/* Icons and Size Label on Same Row */}
        <div className="flex justify-between items-center mt-2">
          {/* Horizontal Icon (Left) */}
          <div className="text-zinc-500 opacity-40">
            <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 16 16" className="w-4 h-4" xmlns="http://www.w3.org/2000/svg">
              <path d="M6.002 5.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"></path>
              <path d="M1.5 2A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h13a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 14.5 2h-13zm13 1a.5.5 0 0 1 .5.5v6l-3.775-1.947a.5.5 0 0 0-.577.093l-3.71 3.71-2.66-1.772a.5.5 0 0 0-.63.062L1.002 12v.54A.505.505 0 0 1 1 12.5v-9a.5.5 0 0 1 .5-.5h13z"></path>
            </svg>
          </div>

          {/* Current selection label (Center) */}
          <span className="text-xs text-zinc-400 bg-zinc-800 px-2 py-1 rounded">
            {value.label}
          </span>

          {/* Vertical Icon (Right) */}
          <div className="text-zinc-500 opacity-40 transform rotate-90">
            <svg stroke="currentColor" fill="currentColor" strokeWidth="0" viewBox="0 0 16 16" className="w-4 h-4" xmlns="http://www.w3.org/2000/svg">
              <path d="M6.002 5.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"></path>
              <path d="M1.5 2A1.5 1.5 0 0 0 0 3.5v9A1.5 1.5 0 0 0 1.5 14h13a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 14.5 2h-13zm13 1a.5.5 0 0 1 .5.5v6l-3.775-1.947a.5.5 0 0 0-.577.093l-3.71 3.71-2.66-1.772a.5.5 0 0 0-.63.062L1.002 12v.54A.505.505 0 0 1 1 12.5v-9a.5.5 0 0 1 .5-.5h13z"></path>
            </svg>
          </div>
        </div>

        {/* Hover preview */}
        {hoveredIndex !== null && (
          <div
            className="absolute bottom-full mb-2 bg-zinc-900 border border-zinc-700 rounded-lg p-3 shadow-lg z-10"
            style={{
              left: `${(hoveredIndex / (ASPECT_RATIOS.length - 1)) * 100}%`,
              transform: 'translateX(-50%)'
            }}
          >
            <div className="flex flex-col items-center space-y-2">
              {/* Preview rectangle */}
              <div
                className="bg-zinc-600 border border-zinc-500 rounded"
                style={getPreviewSize(ASPECT_RATIOS[hoveredIndex])}
              />
              <span className="text-xs text-zinc-300 whitespace-nowrap">
                {ASPECT_RATIOS[hoveredIndex].label}
              </span>
            </div>
            {/* Arrow */}
            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-zinc-700" />
          </div>
        )}
      </div>
    </div>
  );
};