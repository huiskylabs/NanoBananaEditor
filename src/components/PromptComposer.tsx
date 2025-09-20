import React, { useState, useRef } from 'react';
import { Textarea } from './ui/Textarea';
import { Button } from './ui/Button';
import { useAppStore } from '../store/useAppStore';
import { useImageGeneration } from '../hooks/useImageGeneration';
import { Upload, Wand2, Edit3, MousePointer, HelpCircle, Menu, ChevronDown, ChevronRight, RotateCcw, ChevronLeft } from 'lucide-react';
import { blobToBase64, generateId } from '../utils/imageUtils';
import { PromptHints } from './PromptHints';
import { AspectRatioSlider } from './AspectRatioSlider';
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
    canvasImages,
    addCanvasImage,
    showPromptPanel,
    setShowPromptPanel,
    clearBrushStrokes,
    removeCanvasImage,
    currentProject,
    selectedGenerationId,
    selectedEditId,
    brushStrokes,
    selectedAspectRatio,
    setSelectedAspectRatio,
    saveBrushStrokesToCurrentCanvas,
  } = useAppStore();

  const { generate } = useImageGeneration();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showHintsModal, setShowHintsModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleGenerate = () => {
    // Save current brush strokes to the currently selected node before generating
    if (selectedGenerationId || selectedEditId) {
      saveBrushStrokesToCurrentCanvas();
    }

    // Allow empty prompts for random generation

    // Unified generation - let AI determine operation type from inputs
    const allImages = canvasImages.map(img => {
      const base64 = img.url.includes('base64,')
        ? img.url.split('base64,')[1]
        : img.url;
      return base64;
    });

    generate({
      prompt: currentPrompt,
      referenceImages: allImages.length > 0 ? allImages : undefined,
      temperature,
      seed: seed || undefined,
      brushStrokes: brushStrokes.length > 0 ? brushStrokes : undefined,
      aspectRatio: selectedAspectRatio
    });
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

          // Create a generation node for uploaded images automatically
          // This will trigger after all images are uploaded to group them properly
          setTimeout(() => {
            const { canvasImages: currentImages, currentProject, selectedGenerationId, selectedEditId } = useAppStore.getState();
            if (currentImages.length > 0 && !currentProject && !selectedGenerationId && !selectedEditId) {
              const uploadGeneration = {
                id: generateId(),
                prompt: '',
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
    clearBrushStrokes();
    // Canvas images are cleared via clearSelection in the store
    setSeed(null);
    setTemperature(0.7);
    setShowClearConfirm(false);
  };

  // Tool selection removed - masking is always available

  if (!showPromptPanel) {
    return (
      <div className="w-8 bg-zinc-950 border-r border-zinc-800 flex flex-col items-center justify-center">
        <button
          onClick={() => setShowPromptPanel(true)}
          className="w-6 h-10 bg-zinc-800 hover:bg-zinc-700 rounded-r-lg border border-l-0 border-zinc-700 flex items-center justify-center transition-colors"
          title="Show Prompt Panel"
        >
          <ChevronRight className="h-4 w-4 text-zinc-400 hover:text-zinc-300" />
        </button>
      </div>
    );
  }

  return (
    <>
    <div className="w-80 lg:w-72 xl:w-80 h-full bg-zinc-950 border-r border-zinc-800 p-6 flex flex-col space-y-6 overflow-y-auto">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-100">AI Image Editor</h3>
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
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      </div>


      {/* File Upload */}
      <div>
        <div>
          <label className="text-sm font-semibold text-zinc-200 mb-1 block">
            Add Images
          </label>
          <p className="text-xs text-zinc-400 mb-3">
            Upload or drag images to the canvas
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
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload
          </Button>

        </div>
      </div>

      {/* Prompt Input */}
      <div>
        <label className="text-sm font-semibold text-zinc-200 mb-3 block">
          Describe what you want
        </label>
        <Textarea
          value={currentPrompt}
          onChange={(e) => setCurrentPrompt(e.target.value)}
          placeholder="Describe what you want to create or edit... Leave empty and click Generate for a random image"
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
              currentPrompt.length < 50 ? 'bg-orange-500' : 'bg-green-500'
            )} />
          )}
          <span className="text-zinc-500 group-hover:text-zinc-400">
            {currentPrompt.length < 20 ? 'Add detail for better results' :
             currentPrompt.length < 50 ? 'Good detail level' : 'Excellent prompt detail'}
          </span>
        </button>
      </div>

      {/* Aspect Ratio Slider */}
      <AspectRatioSlider
        value={selectedAspectRatio}
        onChange={setSelectedAspectRatio}
      />

      {/* Generate Button */}
      <Button
        onClick={handleGenerate}
        disabled={isGenerating}
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
            Generate
          </>
        )}
      </Button>

      {/* Advanced Controls */}
      <div>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center text-sm text-zinc-400 hover:text-zinc-300 transition-colors duration-200"
        >
          {showAdvanced ? <ChevronDown className="h-4 w-4 mr-1" /> : <ChevronRight className="h-4 w-4 mr-1" />}
          {showAdvanced ? 'Hide' : 'Show'} Advanced Controls
        </button>
        
        <button
          onClick={() => setShowClearConfirm(!showClearConfirm)}
          className="flex items-center text-sm text-zinc-400 hover:text-red-400 transition-colors duration-200 mt-2"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Clear Session
        </button>
        
        {showClearConfirm && (
          <div className="mt-3 p-3 bg-zinc-800 rounded-lg border border-zinc-700">
            <p className="text-xs text-zinc-300 mb-3">
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
              <label className="text-xs font-medium text-zinc-300 mb-2 block">
                Creativity ({temperature})
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={temperature}
                onChange={(e) => setTemperature(parseFloat(e.target.value))}
                className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer slider"
              />
            </div>
            
            {/* Seed */}
            <div>
              <label className="text-xs font-medium text-zinc-300 mb-2 block">
                Seed (optional)
              </label>
              <input
                type="number"
                value={seed || ''}
                onChange={(e) => setSeed(e.target.value ? parseInt(e.target.value) : null)}
                placeholder="Random"
                className="w-full h-8 px-2 bg-zinc-900 border border-zinc-700 rounded text-xs text-zinc-100"
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