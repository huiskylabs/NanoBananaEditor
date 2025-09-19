import React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { Button } from './ui/Button';

interface ImagePreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  title: string;
  description?: string;
}

export const ImagePreviewModal: React.FC<ImagePreviewModalProps> = ({ 
  open, 
  onOpenChange, 
  imageUrl, 
  title, 
  description 
}) => {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/80 z-50" />
        <Dialog.Content className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-zinc-900 border border-zinc-700 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto z-50">
          <div className="flex items-center justify-between mb-4">
            <Dialog.Title className="text-lg font-semibold text-zinc-100">
              {title}
            </Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6">
                <X className="h-4 w-4" />
              </Button>
            </Dialog.Close>
          </div>
          
          <div className="space-y-4">
            {description && (
              <p className="text-sm text-zinc-400">{description}</p>
            )}
            
            <div className="bg-zinc-800 rounded-lg p-4">
              <img
                src={imageUrl}
                alt={title}
                className="w-full h-auto rounded-lg border border-zinc-700"
              />
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};