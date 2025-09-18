import { useMutation } from '@tanstack/react-query';
import { geminiService, GenerationRequest, EditRequest } from '../services/geminiService';
import { useAppStore } from '../store/useAppStore';
import { generateId } from '../utils/imageUtils';
import { Generation, Edit, Asset } from '../types';

export const useImageGeneration = () => {
  const { addGeneration, setIsGenerating, setCanvasImages, setCurrentProject, currentProject, selectedGenerationId, selectedEditId } = useAppStore();

  const generateMutation = useMutation({
    mutationFn: async (request: GenerationRequest) => {
      const images = await geminiService.generateImage(request);
      return images;
    },
    onMutate: () => {
      setIsGenerating(true);
    },
    onSuccess: (images, request) => {
      if (images.length > 0) {
        const outputAssets: Asset[] = images.map((base64, index) => ({
          id: generateId(),
          type: 'output',
          url: `data:image/png;base64,${base64}`,
          mime: 'image/png',
          width: 1024, // Default Gemini output size
          height: 1024,
          checksum: base64.slice(0, 32) // Simple checksum
        }));

        // Determine the correct parent for the new generation
        let parentId: string | undefined = undefined;
        let isIteration = false;

        console.log('Generation logic:', { selectedGenerationId, selectedEditId });

        if (selectedGenerationId) {
          // If a generation is selected, new generation should be a child of that generation
          parentId = selectedGenerationId;
          isIteration = true;
          console.log('Using selectedGenerationId as parent:', parentId);
        } else if (selectedEditId) {
          // If an edit is selected, new generation should be sibling of that edit
          // (both children of the edit's parent generation)
          const selectedEdit = currentProject?.edits.find(e => e.id === selectedEditId);
          if (selectedEdit) {
            parentId = selectedEdit.parentGenerationId; // Parent generation of the edit
            isIteration = true;
            console.log('Using edit parent as parent:', parentId, 'for edit:', selectedEditId);
          }
        }

        // If no selection, it's a root
        if (!parentId) {
          isIteration = false;
          console.log('No parent, creating root generation');
        }

        const generation: Generation = {
          id: generateId(),
          prompt: request.prompt,
          parameters: {
            seed: request.seed,
            temperature: request.temperature
          },
          gridLayout: {
            order: [0], // Single image for now
            columns: 1
          },
          sourceAssets: request.referenceImage ? [{
            id: generateId(),
            type: 'original',
            url: `data:image/png;base64,${request.referenceImages[0]}`,
            mime: 'image/png',
            width: 1024,
            height: 1024,
            checksum: request.referenceImages[0].slice(0, 32)
          }] : request.referenceImages ? request.referenceImages.map((img, index) => ({
            id: generateId(),
            type: 'original' as const,
            url: `data:image/png;base64,${img}`,
            mime: 'image/png',
            width: 1024,
            height: 1024,
            checksum: img.slice(0, 32)
          })) : [],
          outputAssets,
          modelVersion: 'gemini-2.5-flash-image-preview',
          timestamp: Date.now(),
          // Tree relationship fields
          parentGenerationId: parentId,
          type: isIteration ? 'iteration' : 'root'
        };

        addGeneration(generation);
        setCanvasImages(outputAssets);

        // Auto-select the new generation and clear edit selection
        const { selectGeneration, selectEdit } = useAppStore.getState();
        selectGeneration(generation.id);
        selectEdit(null);
        
        // Create project if none exists
        if (!currentProject) {
          const newProject = {
            id: generateId(),
            title: 'Untitled Project',
            generations: [generation],
            edits: [],
            createdAt: Date.now(),
            updatedAt: Date.now()
          };
          setCurrentProject(newProject);
        }
      }
      setIsGenerating(false);
    },
    onError: (error) => {
      console.error('Generation failed:', error);
      setIsGenerating(false);
    }
  });

  return {
    generate: generateMutation.mutate,
    isGenerating: generateMutation.isPending,
    error: generateMutation.error
  };
};

export const useImageEditing = () => {
  const {
    addEdit,
    setIsGenerating,
    setCanvasImages,
    canvasImages,
    editReferenceImages,
    brushStrokes,
    selectedGenerationId,
    selectedEditId,
    currentProject,
    seed,
    temperature
  } = useAppStore();

  const editMutation = useMutation({
    mutationFn: async (instruction: string) => {
      // Use first canvas image as primary target
      if (canvasImages.length === 0) throw new Error('No images to edit');
      const sourceImage = canvasImages[0].url;
      
      // Convert canvas image to base64
      const base64Image = sourceImage.includes('base64,') 
        ? sourceImage.split('base64,')[1] 
        : sourceImage;
      
      // Get reference images for style guidance
      let referenceImages = editReferenceImages
        .filter(img => img.includes('base64,'))
        .map(img => img.split('base64,')[1]);
      
      let maskImage: string | undefined;
      let maskedReferenceImage: string | undefined;
      
      // Create mask from brush strokes if any exist
      if (brushStrokes.length > 0) {
        // Create a temporary image to get actual dimensions
        const tempImg = new Image();
        tempImg.src = sourceImage;
        await new Promise<void>((resolve) => {
          tempImg.onload = () => resolve();
        });
        
        // Create mask canvas with exact image dimensions
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        canvas.width = tempImg.width;
        canvas.height = tempImg.height;
        
        // Fill with black (unmasked areas)
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw white strokes (masked areas)
        ctx.strokeStyle = 'white';
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        brushStrokes.forEach(stroke => {
          if (stroke.points.length >= 4) {
            ctx.lineWidth = stroke.brushSize;
            ctx.beginPath();
            ctx.moveTo(stroke.points[0], stroke.points[1]);
            
            for (let i = 2; i < stroke.points.length; i += 2) {
              ctx.lineTo(stroke.points[i], stroke.points[i + 1]);
            }
            ctx.stroke();
          }
        });
        
        // Convert mask to base64
        const maskDataUrl = canvas.toDataURL('image/png');
        maskImage = maskDataUrl.split('base64,')[1];
        
        // Create masked reference image (original image with mask overlay)
        const maskedCanvas = document.createElement('canvas');
        const maskedCtx = maskedCanvas.getContext('2d')!;
        maskedCanvas.width = tempImg.width;
        maskedCanvas.height = tempImg.height;
        
        // Draw original image
        maskedCtx.drawImage(tempImg, 0, 0);
        
        // Draw mask overlay with transparency
        maskedCtx.globalCompositeOperation = 'source-over';
        maskedCtx.globalAlpha = 0.4;
       maskedCtx.fillStyle = '#A855F7';
        
        brushStrokes.forEach(stroke => {
          if (stroke.points.length >= 4) {
            maskedCtx.lineWidth = stroke.brushSize;
           maskedCtx.strokeStyle = '#A855F7';
            maskedCtx.lineCap = 'round';
            maskedCtx.lineJoin = 'round';
            maskedCtx.beginPath();
            maskedCtx.moveTo(stroke.points[0], stroke.points[1]);
            
            for (let i = 2; i < stroke.points.length; i += 2) {
              maskedCtx.lineTo(stroke.points[i], stroke.points[i + 1]);
            }
            maskedCtx.stroke();
          }
        });
        
        maskedCtx.globalAlpha = 1;
        maskedCtx.globalCompositeOperation = 'source-over';
        
        const maskedDataUrl = maskedCanvas.toDataURL('image/png');
        maskedReferenceImage = maskedDataUrl.split('base64,')[1];
        
        // Add the masked image as a reference for the model
        referenceImages = [maskedReferenceImage, ...referenceImages];
      }
      
      const request: EditRequest = {
        instruction,
        originalImage: base64Image,
        referenceImages: referenceImages.length > 0 ? referenceImages : undefined,
        maskImage,
        temperature,
        seed
      };
      
      const images = await geminiService.editImage(request);
      return { images, maskedReferenceImage };
    },
    onMutate: () => {
      setIsGenerating(true);
    },
    onSuccess: ({ images, maskedReferenceImage }, instruction) => {
      if (images.length > 0) {
        const outputAssets: Asset[] = images.map((base64, index) => ({
          id: generateId(),
          type: 'output',
          url: `data:image/png;base64,${base64}`,
          mime: 'image/png',
          width: 1024,
          height: 1024,
          checksum: base64.slice(0, 32)
        }));

        // Create mask reference asset if we have one
        const maskReferenceAsset: Asset | undefined = maskedReferenceImage ? {
          id: generateId(),
          type: 'mask',
          url: `data:image/png;base64,${maskedReferenceImage}`,
          mime: 'image/png',
          width: 1024,
          height: 1024,
          checksum: maskedReferenceImage.slice(0, 32)
        } : undefined;

        // Determine the correct parent for the new edit
        let parentGenerationId: string | undefined;
        let parentEditId: string | undefined;

        if (selectedEditId) {
          // If an edit is selected, the new edit should be a child of that edit
          parentEditId = selectedEditId;
        } else if (selectedGenerationId) {
          // If a generation is selected, new edit should be child of that generation
          parentGenerationId = selectedGenerationId;
        } else {
          // Fallback to most recent generation
          parentGenerationId = currentProject?.generations[currentProject.generations.length - 1]?.id || '';
        }

        console.log('Edit logic:', { selectedGenerationId, selectedEditId, parentGenerationId, parentEditId });

        const edit: Edit = {
          id: generateId(),
          parentGenerationId,
          parentEditId,
          maskAssetId: brushStrokes.length > 0 ? generateId() : undefined,
          maskReferenceAsset,
          instruction,
          outputAssets,
          gridLayout: {
            order: outputAssets.map((_, i) => i),
            columns: Math.ceil(Math.sqrt(outputAssets.length))
          },
          timestamp: Date.now()
        };

        addEdit(edit);

        // Automatically load the edited images in the canvas and select the new edit
        const { selectEdit, selectGeneration } = useAppStore.getState();
        setCanvasImages(outputAssets);
        selectEdit(edit.id);
        selectGeneration(null); // Clear generation selection to highlight the edit
      }
      setIsGenerating(false);
    },
    onError: (error) => {
      console.error('Edit failed:', error);
      setIsGenerating(false);
    }
  });

  return {
    edit: editMutation.mutate,
    isEditing: editMutation.isPending,
    error: editMutation.error
  };
};