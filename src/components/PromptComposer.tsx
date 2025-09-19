import React, { useState, useRef } from 'react';
import { Textarea } from './ui/Textarea';
import { Button } from './ui/Button';
import { useAppStore } from '../store/useAppStore';
import { useImageGeneration, useImageEditing } from '../hooks/useImageGeneration';
import { Upload, Wand2, Edit3, MousePointer, HelpCircle, Menu, ChevronDown, ChevronRight, RotateCcw } from 'lucide-react';
import { blobToBase64, generateId } from '../utils/imageUtils';
import { PromptHints } from './PromptHints';
import { cn } from '../utils/cn';

export const PromptComposer: React.FC = () => {
  const {
    currentPrompt,
    setCurrentPrompt,
    temperature,
    setTemperature,
    seed,
    setSeed,
    isGenerating,
    uploadedImages,
    addUploadedImage,
    removeUploadedImage,
    clearUploadedImages,
    editReferenceImages,
    addEditReferenceImage,
    removeEditReferenceImage,
    clearEditReferenceImages,
    canvasImages,
    addCanvasImage,
    showPromptPanel,
    setShowPromptPanel,
    clearBrushStrokes,
    currentProject,
    selectedGenerationId,
    selectedEditId,
  } = useAppStore();

  const { generate } = useImageGeneration();
  const { edit } = useImageEditing();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showHintsModal, setShowHintsModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleGenerate = () => {
    if (!currentPrompt.trim()) return;

    // If there are canvas images, it's an edit operation
    if (canvasImages.length > 0) {
      edit(currentPrompt);
    } else {
      // Otherwise, it's a generation
      const referenceImages = uploadedImages
        .filter(img => img.includes('base64,'))
        .map(img => img.split('base64,')[1]);

      generate({
        prompt: currentPrompt,
        referenceImages: referenceImages.length > 0 ? referenceImages : undefined,
        temperature,
        seed: seed || undefined
      });
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      try {
        const base64 = await blobToBase64(file);
        const dataUrl = `data:${file.type};base64,${base64}`;

        if (canvasImages.length > 0) {
          // If there are already canvas images, add to canvas to expand the existing node
          const asset = {
            id: generateId(),
            type: 'original' as const,
            url: dataUrl,
            mime: file.type,
            width: 1024,
            height: 1024,
            checksum: base64.slice(0, 32)
          };
          addCanvasImage(asset);
          addUploadedImage(dataUrl);

          // Update existing node with expanded canvas
          setTimeout(() => {
            const { canvasImages: updatedImages, selectedGenerationId, selectedEditId, updateNodeWithCanvasImages } = useAppStore.getState();
            if (selectedGenerationId) {
              updateNodeWithCanvasImages(selectedGenerationId, updatedImages);
            } else if (selectedEditId) {
              updateNodeWithCanvasImages(selectedEditId, updatedImages);
            }
          }, 100);
        } else {
          // If no canvas images, add to canvas grid and create an upload node
          const asset = {
            id: generateId(),
            type: 'original' as const,
            url: dataUrl,
            mime: file.type,
            width: 1024,
            height: 1024,
            checksum: base64.slice(0, 32)
          };
          addCanvasImage(asset);
          addUploadedImage(dataUrl);

          // Create a generation node for uploaded images automatically
          // This will trigger after all images are uploaded to group them properly
          setTimeout(() => {
            const { canvasImages: currentImages, currentProject, selectedGenerationId, selectedEditId } = useAppStore.getState();
            if (currentImages.length > 0 && !currentProject && !selectedGenerationId && !selectedEditId) {
              const uploadGeneration = {
                id: generateId(),
                prompt: 'Uploaded images',
                parameters: { seed: undefined, temperature: 0.7 },
                gridLayout: {
                  order: currentImages.map((_, i) => i),
                  columns: Math.ceil(Math.sqrt(currentImages.length))
                },
                sourceAssets: [],
                outputAssets: currentImages,
                modelVersion: 'uploaded',
                timestamp: Date.now(),
                parentGenerationId: undefined,
                type: 'root' as const
              };

              const { addGeneration, selectGeneration, selectEdit } = useAppStore.getState();
              addGeneration(uploadGeneration);
              selectGeneration(uploadGeneration.id);
              selectEdit(null);
            }
          }, 100); // Small delay to allow multiple uploads to complete
        }
      } catch (error) {
        console.error('Failed to upload image:', error);
      }
    }
  };

  const handleClearSession = () => {
    setCurrentPrompt('');
    clearUploadedImages();
    clearEditReferenceImages();
    clearBrushStrokes();
    // Canvas images are cleared via clearSelection in the store
    setSeed(null);
    setTemperature(0.7);
    setShowClearConfirm(false);
  };

  // Tool selection removed - masking is always available

  if (!showPromptPanel) {
    return (
      <div className="w-8 bg-gray-950 border-r border-gray-800 flex flex-col items-center justify-center">
        <button
          onClick={() => setShowPromptPanel(true)}
          className="w-6 h-16 bg-gray-800 hover:bg-gray-700 rounded-r-lg border border-l-0 border-gray-700 flex items-center justify-center transition-colors group"
          title="Show Prompt Panel"
        >
          <div className="flex flex-col space-y-1">
            <div className="w-1 h-1 bg-gray-500 group-hover:bg-gray-400 rounded-full"></div>
            <div className="w-1 h-1 bg-gray-500 group-hover:bg-gray-400 rounded-full"></div>
            <div className="w-1 h-1 bg-gray-500 group-hover:bg-gray-400 rounded-full"></div>
          </div>
        </button>
      </div>
    );
  }

  return (
    <>
    <div className="w-80 lg:w-72 xl:w-80 h-full bg-gray-950 border-r border-gray-800 p-6 flex flex-col space-y-6 overflow-y-auto">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-300">AI Image Editor</h3>
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowHintsModal(true)}
            className="h-6 w-6"
          >
            <HelpCircle className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowPromptPanel(false)}
            className="h-6 w-6"
            title="Hide Prompt Panel"
          >
            ×
          </Button>
        </div>
      </div>

      {/* File Upload */}
      <div>
        <div>
          <label className="text-sm font-medium text-gray-300 mb-1 block">
            {canvasImages.length > 0 ? 'Style References' : 'Upload Images'}
          </label>
          <p className="text-xs text-gray-500 mb-3">
            {canvasImages.length > 0 ? 'Optional style references for editing (up to 2)' : 'Upload images to edit or add reference images'}
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
          />
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            className="w-full"
            disabled={canvasImages.length > 0 && editReferenceImages.length >= 2}
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload
          </Button>

          {/* Show uploaded images preview */}
          {((uploadedImages.length > 0) || (editReferenceImages.length > 0)) && (
            <div className="mt-3 space-y-2">
              {/* Show main uploaded images */}
              {uploadedImages.map((image, index) => (
                <div key={`upload-${index}`} className="relative">
                  <img
                    src={image}
                    alt={`Image ${index + 1}`}
                    className="w-full h-20 object-cover rounded-lg border border-gray-700"
                  />
                  <button
                    onClick={() => removeUploadedImage(index)}
                    className="absolute top-1 right-1 bg-gray-900/80 text-gray-400 hover:text-gray-200 rounded-full p-1 transition-colors"
                  >
                    ×
                  </button>
                  <div className="absolute bottom-1 left-1 bg-gray-900/80 text-xs px-2 py-1 rounded text-gray-300">
                    Main
                  </div>
                </div>
              ))}
              {/* Show edit reference images */}
              {editReferenceImages.map((image, index) => (
                <div key={`ref-${index}`} className="relative">
                  <img
                    src={image}
                    alt={`Reference ${index + 1}`}
                    className="w-full h-20 object-cover rounded-lg border border-gray-700"
                  />
                  <button
                    onClick={() => removeEditReferenceImage(index)}
                    className="absolute top-1 right-1 bg-gray-900/80 text-gray-400 hover:text-gray-200 rounded-full p-1 transition-colors"
                  >
                    ×
                  </button>
                  <div className="absolute bottom-1 left-1 bg-gray-900/80 text-xs px-2 py-1 rounded text-gray-300">
                    Ref {index + 1}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Prompt Input */}
      <div>
        <label className="text-sm font-medium text-gray-300 mb-3 block">
          {canvasImages.length > 0 ? 'Describe your changes' : 'Describe what you want to create'}
        </label>
        <Textarea
          value={currentPrompt}
          onChange={(e) => setCurrentPrompt(e.target.value)}
          placeholder={
            canvasImages.length > 0
              ? 'Make the sky more dramatic, add storm clouds...'
              : 'A serene mountain landscape at sunset with a lake reflecting the golden sky...'
          }
          className="min-h-[120px] resize-none"
        />
        
        {/* Prompt Quality Indicator */}
        <button 
          onClick={() => setShowHintsModal(true)}
          className="mt-2 flex items-center text-xs hover:text-gray-400 transition-colors group"
        >
          {currentPrompt.length < 20 ? (
            <HelpCircle className="h-3 w-3 mr-2 text-red-500 group-hover:text-red-400" />
          ) : (
            <div className={cn(
              'h-2 w-2 rounded-full mr-2',
              currentPrompt.length < 50 ? 'bg-yellow-500' : 'bg-green-500'
            )} />
          )}
          <span className="text-gray-500 group-hover:text-gray-400">
            {currentPrompt.length < 20 ? 'Add detail for better results' :
             currentPrompt.length < 50 ? 'Good detail level' : 'Excellent prompt detail'}
          </span>
        </button>
      </div>


      {/* Generate Button */}
      <Button
        onClick={handleGenerate}
        disabled={isGenerating || !currentPrompt.trim()}
        className="w-full h-14 text-base font-medium"
      >
        {isGenerating ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 mr-2" />
            Generating...
          </>
        ) : (
          <>
            <Wand2 className="h-4 w-4 mr-2" />
            {canvasImages.length > 0 ? 'Apply Edit' : 'Generate'}
          </>
        )}
      </Button>

      {/* Advanced Controls */}
      <div>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center text-sm text-gray-400 hover:text-gray-300 transition-colors duration-200"
        >
          {showAdvanced ? <ChevronDown className="h-4 w-4 mr-1" /> : <ChevronRight className="h-4 w-4 mr-1" />}
          {showAdvanced ? 'Hide' : 'Show'} Advanced Controls
        </button>
        
        <button
          onClick={() => setShowClearConfirm(!showClearConfirm)}
          className="flex items-center text-sm text-gray-400 hover:text-red-400 transition-colors duration-200 mt-2"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Clear Session
        </button>
        
        {showClearConfirm && (
          <div className="mt-3 p-3 bg-gray-800 rounded-lg border border-gray-700">
            <p className="text-xs text-gray-300 mb-3">
              Are you sure you want to clear this session? This will remove all uploads, prompts, and canvas content.
            </p>
            <div className="flex space-x-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={handleClearSession}
                className="flex-1"
              >
                Yes, Clear
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowClearConfirm(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
        
        {showAdvanced && (
          <div className="mt-4 space-y-4">
            {/* Temperature */}
            <div>
              <label className="text-xs text-gray-400 mb-2 block">
                Creativity ({temperature})
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer slider"
              />
            </div>
            
            {/* Seed */}
            <div>
              <label className="text-xs text-gray-400 mb-2 block">
                Seed (optional)
              </label>
              <input
                type="number"
                value={seed || ''}
                onChange={(e) => setSeed(e.target.value ? parseInt(e.target.value) : null)}
                placeholder="Random"
                className="w-full h-8 px-2 bg-gray-900 border border-gray-700 rounded text-xs text-gray-100"
              />
            </div>
          </div>
        )}
      </div>

    </div>
    {/* Prompt Hints Modal */}
    <PromptHints open={showHintsModal} onOpenChange={setShowHintsModal} />
    </>
  );
};