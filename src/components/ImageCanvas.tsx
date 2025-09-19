import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Stage, Layer, Image as KonvaImage, Line } from 'react-konva';
import { useAppStore } from '../store/useAppStore';
import { Button } from './ui/Button';
import { ZoomIn, ZoomOut, RotateCcw, Download, Eye, EyeOff, Eraser, Brush } from 'lucide-react';
import { cn } from '../utils/cn';
import { blobToBase64 } from '../utils/imageUtils';
import { generateId } from '../utils/imageUtils';
import { createBrushCursorCached } from '../utils/brushCursor';

export const ImageCanvas: React.FC = () => {
  const {
    canvasImages,
    canvasGridLayout,
    canvasZoom,
    setCanvasZoom,
    canvasPan,
    setCanvasPan,
    brushStrokes,
    addBrushStroke,
    clearBrushStrokes,
    showMasks,
    setShowMasks,
    selectedTool,
    setSelectedTool,
    isGenerating,
    brushSize,
    setBrushSize,
    addCanvasImage,
    reorderCanvasImages
  } = useAppStore();

  const stageRef = useRef<any>(null);
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<number[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);

  // Create custom brush cursor with accurate size
  const brushCursor = useMemo(() => {
    if (selectedTool !== 'mask') return 'default';
    return createBrushCursorCached(brushSize, canvasZoom);
  }, [selectedTool, brushSize, canvasZoom]);

  // Load images and auto-fit when canvasImages changes
  const [gridImages, setGridImages] = useState<(HTMLImageElement | null)[]>([]);

  useEffect(() => {
    if (canvasImages.length > 0) {
      const loadImages = async () => {
        try {
          const images = await Promise.all(
            canvasImages.map(async (asset) => {
              const img = new window.Image();
              return new Promise<HTMLImageElement>((resolve, reject) => {
                img.onload = () => resolve(img);
                img.onerror = reject;
                img.src = asset.url;
              });
            })
          );
          // Only update images when all are successfully loaded
          setGridImages(images);

          // Auto-fit grid if this is new content
          if (canvasZoom === 1 && canvasPan.x === 0 && canvasPan.y === 0) {
            const isMobile = window.innerWidth < 768;
            setCanvasZoom(isMobile ? 0.5 : 1.0);
            setCanvasPan({ x: 0, y: 0 });
          }
        } catch (error) {
          console.error('Failed to load images:', error);
          // Don't clear existing images on load error to prevent blank canvas
        }
      };
      loadImages();
    } else {
      // Only clear images if we're definitely switching to empty state
      // Don't clear during node transitions
      setGridImages([]);
    }
  }, [canvasImages]);

  // Handle stage resize
  useEffect(() => {
    const updateSize = () => {
      const container = document.getElementById('canvas-container');
      if (container) {
        setStageSize({
          width: container.offsetWidth,
          height: container.offsetHeight
        });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const handleMouseDown = (e: any) => {
    if (selectedTool !== 'mask' || gridImages.length === 0) return;

    setIsDrawing(true);
    const stage = e.target.getStage();
    const relativePos = stage.getRelativePointerPosition();

    // Calculate grid bounds for first image
    const { columns } = canvasGridLayout;
    // Dynamic grid size based on number of images and screen size
    const baseSize = Math.min(stageSize.width, stageSize.height) * 0.8;
    const rows = Math.ceil(gridImages.length / canvasGridLayout.columns);
    const maxDimension = Math.max(canvasGridLayout.columns, rows);
    const calculatedSize = gridImages.length > 0 ? baseSize / maxDimension : 600;
    const gridSize = Math.max(300, Math.min(600, calculatedSize));
    const spacing = 20;
    const totalWidth = columns * gridSize + (columns - 1) * spacing;
    const totalHeight = Math.ceil(gridImages.length / columns) * gridSize +
                      (Math.ceil(gridImages.length / columns) - 1) * spacing;

    const startX = (stageSize.width / canvasZoom - totalWidth) / 2;
    const startY = (stageSize.height / canvasZoom - totalHeight) / 2;

    // Convert to grid-relative coordinates
    const relativeX = relativePos.x - startX;
    const relativeY = relativePos.y - startY;

    // Check if click is within grid bounds
    if (relativeX >= 0 && relativeX <= totalWidth && relativeY >= 0 && relativeY <= totalHeight) {
      setCurrentStroke([relativeX, relativeY]);
    }
  };

  const handleMouseMove = (e: any) => {
    if (!isDrawing || selectedTool !== 'mask' || gridImages.length === 0) return;

    const stage = e.target.getStage();
    const relativePos = stage.getRelativePointerPosition();

    // Calculate grid bounds
    const { columns } = canvasGridLayout;
    // Dynamic grid size based on number of images and screen size
    const baseSize = Math.min(stageSize.width, stageSize.height) * 0.8;
    const rows = Math.ceil(gridImages.length / canvasGridLayout.columns);
    const maxDimension = Math.max(canvasGridLayout.columns, rows);
    const calculatedSize = gridImages.length > 0 ? baseSize / maxDimension : 600;
    const gridSize = Math.max(300, Math.min(600, calculatedSize));
    const spacing = 20;
    const totalWidth = columns * gridSize + (columns - 1) * spacing;
    const totalHeight = Math.ceil(gridImages.length / columns) * gridSize +
                      (Math.ceil(gridImages.length / columns) - 1) * spacing;

    const startX = (stageSize.width / canvasZoom - totalWidth) / 2;
    const startY = (stageSize.height / canvasZoom - totalHeight) / 2;

    // Convert to grid-relative coordinates
    const relativeX = relativePos.x - startX;
    const relativeY = relativePos.y - startY;

    // Check if within grid bounds
    if (relativeX >= 0 && relativeX <= totalWidth && relativeY >= 0 && relativeY <= totalHeight) {
      setCurrentStroke([...currentStroke, relativeX, relativeY]);
    }
  };

  const handleMouseUp = () => {
    if (!isDrawing || currentStroke.length < 4) {
      setIsDrawing(false);
      setCurrentStroke([]);
      return;
    }
    
    setIsDrawing(false);
    addBrushStroke({
      id: `stroke-${Date.now()}`,
      points: currentStroke,
      brushSize,
    });
    setCurrentStroke([]);
  };

  const handleZoom = (delta: number) => {
    const newZoom = Math.max(0.1, Math.min(3, canvasZoom + delta));
    setCanvasZoom(newZoom);
  };

  const handleReset = () => {
    if (gridImages.length > 0) {
      const isMobile = window.innerWidth < 768;
      setCanvasZoom(isMobile ? 0.5 : 1.0);
      setCanvasPan({ x: 0, y: 0 });
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));

    const isFirstUpload = canvasImages.length === 0;

    for (const file of imageFiles) {
      try {
        const base64 = await blobToBase64(file);
        const asset = {
          id: generateId(),
          type: 'original' as const,
          url: `data:${file.type};base64,${base64}`,
          mime: file.type,
          width: 1024, // Will be updated when image loads
          height: 1024,
          checksum: base64.slice(0, 32)
        };
        addCanvasImage(asset);
      } catch (error) {
        console.error('Failed to process dropped image:', error);
      }
    }

    // Handle node creation or update after upload
    if (imageFiles.length > 0) {
      setTimeout(() => {
        const { canvasImages, addGeneration, selectGeneration, selectEdit, currentProject, selectedGenerationId, selectedEditId, updateNodeWithCanvasImages } = useAppStore.getState();

        if (isFirstUpload) {
          // First upload - only create a new node if there's no current project or selection
          if (canvasImages.length > 0 && !currentProject && !selectedGenerationId && !selectedEditId) {
            const uploadGeneration = {
              id: generateId(),
              prompt: 'Uploaded images',
              parameters: { seed: undefined, temperature: 0.7 },
              gridLayout: {
                order: canvasImages.map((_, i) => i),
                columns: Math.ceil(Math.sqrt(canvasImages.length))
              },
              sourceAssets: [],
              outputAssets: canvasImages,
              modelVersion: 'uploaded',
              timestamp: Date.now(),
              parentGenerationId: undefined,
              type: 'root' as const
            };

            addGeneration(uploadGeneration);
            selectGeneration(uploadGeneration.id);
            selectEdit(null);
          }
        } else {
          // Adding images to existing node - update the selected node with new canvas images
          if (selectedGenerationId) {
            updateNodeWithCanvasImages(selectedGenerationId, canvasImages);
          } else if (selectedEditId) {
            updateNodeWithCanvasImages(selectedEditId, canvasImages);
          }
        }
      }, 100);
    }
  };

  const handleDownload = () => {
    if (canvasImages.length > 0) {
      // Download first image for now - could be enhanced to download all or composite
      const firstImage = canvasImages[0];
      if (firstImage.url.startsWith('data:')) {
        const link = document.createElement('a');
        link.href = firstImage.url;
        link.download = `nano-banana-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="p-3 border-b border-gray-800 bg-gray-950">
        <div className="flex items-center justify-between">
          {/* Left side - Zoom controls */}
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={() => handleZoom(-0.1)}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-sm text-gray-400 min-w-[60px] text-center">
              {Math.round(canvasZoom * 100)}%
            </span>
            <Button variant="outline" size="sm" onClick={() => handleZoom(0.1)}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>

          {/* Right side - Tools and actions */}
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedTool(selectedTool === 'mask' ? 'generate' : 'mask')}
              className={cn(selectedTool === 'mask' && 'bg-purple-400/10 border-purple-400/50')}
            >
              <Brush className="h-4 w-4" />
            </Button>

            <div className="flex items-center space-x-2 mr-2">
              <span className="text-xs text-gray-400">Size:</span>
              <input
                type="range"
                min="5"
                max="50"
                value={brushSize}
                onChange={(e) => setBrushSize(parseInt(e.target.value))}
                className="w-16 h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer slider"
              />
              <span className="text-xs text-gray-400 w-6">{brushSize}</span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={clearBrushStrokes}
              disabled={brushStrokes.length === 0}
            >
              <Eraser className="h-4 w-4" />
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowMasks(!showMasks)}
              className={cn(showMasks && 'bg-yellow-400/10 border-yellow-400/50')}
            >
              {showMasks ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              <span className="hidden sm:inline ml-2">Masks</span>
            </Button>
            
            {canvasImages.length > 0 && (
              <Button variant="secondary" size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Download</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Canvas Area */}
      <div
        id="canvas-container"
        className={cn(
          "flex-1 relative overflow-hidden bg-gray-800",
          isDragOver && "bg-gray-700 border-2 border-dashed border-blue-400"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {canvasImages.length === 0 && !isGenerating && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4">🍌</div>
              <h2 className="text-xl font-medium text-gray-300 mb-2">
                Welcome to Nano Banana Framework
              </h2>
              <p className="text-gray-500 max-w-md">
                {selectedTool === 'generate'
                  ? 'Start by describing what you want to create in the prompt box, or drag & drop images here'
                  : 'Upload an image to begin editing, or drag & drop images here'
                }
              </p>
            </div>
          </div>
        )}

        {isGenerating && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mb-4" />
              <p className="text-gray-300">Creating your image...</p>
            </div>
          </div>
        )}

        <Stage
          ref={stageRef}
          width={stageSize.width}
          height={stageSize.height}
          scaleX={canvasZoom}
          scaleY={canvasZoom}
          x={canvasPan.x * canvasZoom}
          y={canvasPan.y * canvasZoom}
          draggable={selectedTool !== 'mask'}
          onDragEnd={(e) => {
            setCanvasPan({
              x: e.target.x() / canvasZoom,
              y: e.target.y() / canvasZoom
            });
          }}
          onMouseDown={handleMouseDown}
          onMousemove={handleMouseMove}
          onMouseup={handleMouseUp}
          style={{
            cursor: brushCursor
          }}
        >
          <Layer>
            {/* Grid Images */}
            {gridImages.map((img, index) => {
              if (!img) return null;

              const { order, columns } = canvasGridLayout;
              const displayIndex = order.indexOf(index);
              if (displayIndex === -1) return null;

              const row = Math.floor(displayIndex / columns);
              const col = displayIndex % columns;
              // Dynamic grid size based on number of images and screen size
    const baseSize = Math.min(stageSize.width, stageSize.height) * 0.8;
    const rows = Math.ceil(gridImages.length / canvasGridLayout.columns);
    const maxDimension = Math.max(canvasGridLayout.columns, rows);
    const calculatedSize = gridImages.length > 0 ? baseSize / maxDimension : 600;
    const gridSize = Math.max(300, Math.min(600, calculatedSize)); // Size of each grid cell
              const spacing = 20;

              const totalWidth = columns * gridSize + (columns - 1) * spacing;
              const totalHeight = Math.ceil(gridImages.length / columns) * gridSize +
                                (Math.ceil(gridImages.length / columns) - 1) * spacing;

              const startX = (stageSize.width / canvasZoom - totalWidth) / 2;
              const startY = (stageSize.height / canvasZoom - totalHeight) / 2;

              const x = startX + col * (gridSize + spacing);
              const y = startY + row * (gridSize + spacing);

              return (
                <KonvaImage
                  key={`grid-${index}`}
                  image={img}
                  x={x}
                  y={y}
                  width={gridSize}
                  height={gridSize}
                  cornerRadius={8}
                  crop={{
                    x: 0,
                    y: 0,
                    width: img.width,
                    height: img.height
                  }}
                />
              );
            })}
            
            {/* Brush Strokes - Only on first image for now */}
            {showMasks && brushStrokes.map((stroke) => {
              if (gridImages.length === 0) return null;

              const { columns } = canvasGridLayout;
              // Dynamic grid size based on number of images and screen size
    const baseSize = Math.min(stageSize.width, stageSize.height) * 0.8;
    const rows = Math.ceil(gridImages.length / canvasGridLayout.columns);
    const maxDimension = Math.max(canvasGridLayout.columns, rows);
    const calculatedSize = gridImages.length > 0 ? baseSize / maxDimension : 600;
    const gridSize = Math.max(300, Math.min(600, calculatedSize));
              const spacing = 20;
              const totalWidth = columns * gridSize + (columns - 1) * spacing;
              const totalHeight = Math.ceil(gridImages.length / columns) * gridSize +
                                (Math.ceil(gridImages.length / columns) - 1) * spacing;

              const startX = (stageSize.width / canvasZoom - totalWidth) / 2;
              const startY = (stageSize.height / canvasZoom - totalHeight) / 2;

              return (
                <Line
                  key={stroke.id}
                  points={stroke.points}
                  stroke="#A855F7"
                  strokeWidth={stroke.brushSize}
                  tension={0.5}
                  lineCap="round"
                  lineJoin="round"
                  globalCompositeOperation="source-over"
                  opacity={0.6}
                  x={startX}
                  y={startY}
                />
              );
            })}
            
            {/* Current stroke being drawn */}
            {isDrawing && currentStroke.length > 2 && gridImages.length > 0 && (() => {
              const { columns } = canvasGridLayout;
              // Dynamic grid size based on number of images and screen size
              const baseSize = Math.min(stageSize.width, stageSize.height) * 0.8;
              const rows = Math.ceil(gridImages.length / canvasGridLayout.columns);
              const maxDimension = Math.max(canvasGridLayout.columns, rows);
              const calculatedSize = gridImages.length > 0 ? baseSize / maxDimension : 600;
              const gridSize = Math.max(300, Math.min(600, calculatedSize));
              const spacing = 20;
              const totalWidth = columns * gridSize + (columns - 1) * spacing;
              const totalHeight = Math.ceil(gridImages.length / columns) * gridSize +
                                (Math.ceil(gridImages.length / columns) - 1) * spacing;

              const startX = (stageSize.width / canvasZoom - totalWidth) / 2;
              const startY = (stageSize.height / canvasZoom - totalHeight) / 2;

              return (
                <Line
                  points={currentStroke}
                  stroke="#A855F7"
                  strokeWidth={brushSize}
                  tension={0.5}
                  lineCap="round"
                  lineJoin="round"
                  globalCompositeOperation="source-over"
                  opacity={0.6}
                  x={startX}
                  y={startY}
                />
              );
            })()}
          </Layer>
        </Stage>
      </div>

      {/* Status Bar */}
      <div className="p-3 border-t border-gray-800 bg-gray-950">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-4">
            {canvasImages.length > 0 && (
              <span className="text-green-400">{canvasImages.length} image{canvasImages.length !== 1 ? 's' : ''}</span>
            )}
            {brushStrokes.length > 0 && (
              <span className="text-yellow-400">{brushStrokes.length} brush stroke{brushStrokes.length !== 1 ? 's' : ''}</span>
            )}
          </div>
          
        </div>
      </div>
    </div>
  );
};