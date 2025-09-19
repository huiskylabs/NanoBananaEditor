import React, { useState } from 'react';
import { Button } from './ui/Button';
import { HelpCircle, Zap } from 'lucide-react';
import { InfoModal } from './InfoModal';

export const Header: React.FC = () => {
  const [showInfoModal, setShowInfoModal] = useState(false);

  return (
    <>
      <header className="h-16 bg-zinc-950 border-b border-zinc-800 flex items-center justify-between px-6">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-lg flex items-center justify-center">
                <Zap className="h-5 w-5 text-zinc-900" />
              </div>
            </div>
            <h1 className="text-xl font-semibold text-zinc-100 hidden md:block">
              AI Image Editor
            </h1>
            <h1 className="text-xl font-semibold text-zinc-100 md:hidden">
              AI Editor
            </h1>
          </div>
          <div className="text-xs text-zinc-500 bg-zinc-800 px-2 py-1 rounded">
            1.0
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setShowInfoModal(true)}
          >
            <HelpCircle className="h-5 w-5" />
          </Button>
        </div>
      </header>
      
      <InfoModal open={showInfoModal} onOpenChange={setShowInfoModal} />
    </>
  );
};