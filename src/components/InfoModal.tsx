import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { Button } from './ui/Button';

interface InfoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const InfoModal: React.FC<InfoModalProps> = ({ open, onOpenChange }) => {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-zinc-900 border border-zinc-700 rounded-lg p-6 w-full max-w-4xl z-50">
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-lg font-semibold text-zinc-100">
              About AI Image Editor
            </Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <X className="h-4 w-4" />
              </Button>
            </Dialog.Close>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-3 text-sm text-zinc-300">
              <p>
                A powerful AI-powered image editing interface designed for creative workflows.
              </p>

              <div className="p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
                <h4 className="text-sm font-semibold text-zinc-200 mb-2">
                  Features
                </h4>
                <ul className="text-sm text-zinc-300 space-y-1">
                  <li>• Interactive canvas with zoom and pan controls</li>
                  <li>• Brush-based masking and selection tools</li>
                  <li>• Generation history with branching workflow</li>
                  <li>• Expandable status bar with detailed canvas information</li>
                  <li>• Responsive design with collapsible sidebars</li>
                </ul>
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};