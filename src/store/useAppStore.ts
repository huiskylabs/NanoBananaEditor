import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Project, Generation, Edit, SegmentationMask, BrushStroke, Asset, GridLayout } from '../types';

interface AppState {
  // Current project
  currentProject: Project | null;
  
  // Canvas state
  canvasImages: Asset[]; // Multiple images in grid layout
  canvasGridLayout: GridLayout;
  canvasZoom: number;
  canvasPan: { x: number; y: number };
  
  // Upload state
  uploadedImages: string[];
  editReferenceImages: string[];
  
  // Brush strokes for painting masks
  brushStrokes: BrushStroke[];
  brushSize: number;
  showMasks: boolean;
  
  // Generation state
  isGenerating: boolean;
  currentPrompt: string;
  temperature: number;
  seed: number | null;
  
  // History and variants
  selectedGenerationId: string | null;
  selectedEditId: string | null;
  showHistory: boolean;
  
  // Panel visibility
  showPromptPanel: boolean;
  historyPanelWidth: number;

  // UI state
  selectedTool: 'generate' | 'edit' | 'mask';
  
  // Actions
  setCurrentProject: (project: Project | null) => void;
  setCanvasImages: (images: Asset[]) => void;
  addCanvasImage: (image: Asset) => void;
  removeCanvasImage: (index: number) => void;
  reorderCanvasImages: (fromIndex: number, toIndex: number) => void;
  setCanvasGridLayout: (layout: GridLayout) => void;
  setCanvasZoom: (zoom: number) => void;
  setCanvasPan: (pan: { x: number; y: number }) => void;
  
  addUploadedImage: (url: string) => void;
  removeUploadedImage: (index: number) => void;
  clearUploadedImages: () => void;
  
  addEditReferenceImage: (url: string) => void;
  removeEditReferenceImage: (index: number) => void;
  clearEditReferenceImages: () => void;
  
  addBrushStroke: (stroke: BrushStroke) => void;
  clearBrushStrokes: () => void;
  setBrushSize: (size: number) => void;
  setShowMasks: (show: boolean) => void;
  
  setIsGenerating: (generating: boolean) => void;
  setCurrentPrompt: (prompt: string) => void;
  setTemperature: (temp: number) => void;
  setSeed: (seed: number | null) => void;
  
  addGeneration: (generation: Generation) => void;
  addEdit: (edit: Edit) => void;
  selectGeneration: (id: string | null) => void;
  selectEdit: (id: string | null) => void;
  clearSelection: () => void;
  setShowHistory: (show: boolean) => void;
  
  setShowPromptPanel: (show: boolean) => void;
  setHistoryPanelWidth: (width: number) => void;

  setSelectedTool: (tool: 'generate' | 'edit' | 'mask') => void;
}

export const useAppStore = create<AppState>()(
  devtools(
    (set, get) => ({
      // Initial state
      currentProject: null,
      canvasImages: [],
      canvasGridLayout: { order: [], columns: 1 },
      canvasZoom: 1,
      canvasPan: { x: 0, y: 0 },
      
      uploadedImages: [],
      editReferenceImages: [],
      
      brushStrokes: [],
      brushSize: 20,
      showMasks: true,
      
      isGenerating: false,
      currentPrompt: '',
      temperature: 0.7,
      seed: null,
      
      selectedGenerationId: null,
      selectedEditId: null,
      showHistory: true,
      
      showPromptPanel: true,
      historyPanelWidth: 320,

      selectedTool: 'generate',
      
      // Actions
      setCurrentProject: (project) => set({ currentProject: project }),
      setCanvasImages: (images) => set((state) => {
        const order = images.map((_, index) => index);
        const columns = Math.ceil(Math.sqrt(images.length));
        return {
          canvasImages: images,
          canvasGridLayout: { order, columns }
        };
      }),
      addCanvasImage: (image) => set((state) => {
        const newImages = [...state.canvasImages, image];
        const order = newImages.map((_, index) => index);
        const columns = Math.ceil(Math.sqrt(newImages.length));
        return {
          canvasImages: newImages,
          canvasGridLayout: { order, columns }
        };
      }),
      removeCanvasImage: (index) => set((state) => {
        const newImages = state.canvasImages.filter((_, i) => i !== index);
        const order = newImages.map((_, index) => index);
        const columns = Math.ceil(Math.sqrt(newImages.length));
        return {
          canvasImages: newImages,
          canvasGridLayout: { order, columns }
        };
      }),
      reorderCanvasImages: (fromIndex, toIndex) => set((state) => {
        const newOrder = [...state.canvasGridLayout.order];
        const [moved] = newOrder.splice(fromIndex, 1);
        newOrder.splice(toIndex, 0, moved);
        return {
          canvasGridLayout: { ...state.canvasGridLayout, order: newOrder }
        };
      }),
      setCanvasGridLayout: (layout) => set({ canvasGridLayout: layout }),
      setCanvasZoom: (zoom) => set({ canvasZoom: zoom }),
      setCanvasPan: (pan) => set({ canvasPan: pan }),
      
      addUploadedImage: (url) => set((state) => ({ 
        uploadedImages: [...state.uploadedImages, url] 
      })),
      removeUploadedImage: (index) => set((state) => ({ 
        uploadedImages: state.uploadedImages.filter((_, i) => i !== index) 
      })),
      clearUploadedImages: () => set({ uploadedImages: [] }),
      
      addEditReferenceImage: (url) => set((state) => ({ 
        editReferenceImages: [...state.editReferenceImages, url] 
      })),
      removeEditReferenceImage: (index) => set((state) => ({ 
        editReferenceImages: state.editReferenceImages.filter((_, i) => i !== index) 
      })),
      clearEditReferenceImages: () => set({ editReferenceImages: [] }),
      
      addBrushStroke: (stroke) => set((state) => ({ 
        brushStrokes: [...state.brushStrokes, stroke] 
      })),
      clearBrushStrokes: () => set({ brushStrokes: [] }),
      setBrushSize: (size) => set({ brushSize: size }),
      setShowMasks: (show) => set({ showMasks: show }),
      
      setIsGenerating: (generating) => set({ isGenerating: generating }),
      setCurrentPrompt: (prompt) => set({ currentPrompt: prompt }),
      setTemperature: (temp) => set({ temperature: temp }),
      setSeed: (seed) => set({ seed: seed }),
      
      addGeneration: (generation) => set((state) => ({
        currentProject: state.currentProject ? {
          ...state.currentProject,
          generations: [...state.currentProject.generations, generation],
          updatedAt: Date.now()
        } : null
      })),
      
      addEdit: (edit) => set((state) => ({
        currentProject: state.currentProject ? {
          ...state.currentProject,
          edits: [...state.currentProject.edits, edit],
          updatedAt: Date.now()
        } : null
      })),
      
      selectGeneration: (id) => set({ selectedGenerationId: id }),
      selectEdit: (id) => set({ selectedEditId: id }),
      clearSelection: () => set({
        selectedGenerationId: null,
        selectedEditId: null,
        canvasImages: [],
        canvasGridLayout: { order: [], columns: 1 },
        brushStrokes: [],
        editReferenceImages: [],
        currentPrompt: ''
      }),
      setShowHistory: (show) => set({ showHistory: show }),
      
      setShowPromptPanel: (show) => set({ showPromptPanel: show }),
      setHistoryPanelWidth: (width) => set({ historyPanelWidth: width }),

      setSelectedTool: (tool) => set({ selectedTool: tool }),
    }),
    { name: 'nano-banana-store' }
  )
);