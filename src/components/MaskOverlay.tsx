import React from 'react';
import { useAppStore } from '../store/useAppStore';

export const MaskOverlay: React.FC = () => {
  const { selectedMask, showMasks } = useAppStore();

  if (!showMasks || !selectedMask) return null;

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Marching ants effect */}
      <div 
        className="absolute border-2 border-orange-500 animate-pulse"
        style={{
          left: selectedMask.bounds.x,
          top: selectedMask.bounds.y,
          width: selectedMask.bounds.width,
          height: selectedMask.bounds.height,
          borderStyle: 'dashed',
          animationDuration: '1s'
        }}
      />
      
      {/* Mask overlay */}
      <div
        className="absolute bg-orange-500/20"
        style={{
          left: selectedMask.bounds.x,
          top: selectedMask.bounds.y,
          width: selectedMask.bounds.width,
          height: selectedMask.bounds.height,
        }}
      />
    </div>
  );
};