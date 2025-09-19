import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Project, Generation, Edit, SegmentationMask, BrushStroke, Asset, GridLayout, AspectRatio } from '../types';

interface AppState {
  // Current project
  currentProject: Project | null;
  
  // Canvas state
  canvasImages: Asset[]; // Multiple images in grid layout
  canvasGridLayout: GridLayout;
  canvasZoom: number;
  canvasPan: { x: number; y: number };
  
  // Brush strokes for painting masks
  brushStrokes: BrushStroke[];
  brushSize: number;
  showMasks: boolean;
  
  // Generation state
  isGenerating: boolean;
  currentPrompt: string;
  temperature: number;
  seed: number | null;
  selectedAspectRatio: AspectRatio;
  
  // History and variants
  selectedGenerationId: string | null;
  selectedEditId: string | null;
  showHistory: boolean;
  
  // Panel visibility
  showPromptPanel: boolean;
  historyPanelWidth: number;

  // UI state
  selectedTool: 'generate' | 'edit' | 'mask';

  // Current node details for display (separate from input prompt)
  currentNodeDetails: {
    prompt: string;
    nodeType: 'generation' | 'edit' | null;
    modelVersion?: string;
    temperature?: number;
    seed?: number | null;
    timestamp?: number;
    outputAssets?: Asset[];
  } | null;

  // Actions
  setCurrentProject: (project: Project | null) => void;
  setCanvasImages: (images: Asset[]) => void;
  setCanvasImagesWithAutoZoom: (images: Asset[]) => void;
  addCanvasImage: (image: Asset) => void;
  removeCanvasImage: (index: number) => void;
  reorderCanvasImages: (fromIndex: number, toIndex: number) => void;
  setCanvasGridLayout: (layout: GridLayout) => void;
  setCanvasZoom: (zoom: number) => void;
  setCanvasPan: (pan: { x: number; y: number }) => void;

  addBrushStroke: (stroke: BrushStroke) => void;
  clearBrushStrokes: () => void;
  setBrushSize: (size: number) => void;
  setShowMasks: (show: boolean) => void;
  
  setIsGenerating: (generating: boolean) => void;
  setCurrentPrompt: (prompt: string) => void;
  setTemperature: (temp: number) => void;
  setSeed: (seed: number | null) => void;
  setSelectedAspectRatio: (ratio: AspectRatio) => void;
  
  addGeneration: (generation: Generation) => void;
  addEdit: (edit: Edit) => void;
  updateNodeWithCanvasImages: (nodeId: string, canvasImages: Asset[]) => void;
  selectGeneration: (id: string | null) => void;
  selectEdit: (id: string | null) => void;
  clearSelection: () => void;
  setCurrentNodeDetails: (details: {
    prompt: string;
    nodeType: 'generation' | 'edit' | null;
    modelVersion?: string;
    temperature?: number;
    seed?: number | null;
    timestamp?: number;
    outputAssets?: Asset[];
  } | null) => void;
  setShowHistory: (show: boolean) => void;
  
  setShowPromptPanel: (show: boolean) => void;
  setHistoryPanelWidth: (width: number) => void;

  setSelectedTool: (tool: 'generate' | 'edit' | 'mask') => void;

  // Brush stroke management per canvas
  saveBrushStrokesToCurrentCanvas: () => void;
  loadBrushStrokesFromCanvas: (canvasId: string, canvasType: 'generation' | 'edit') => void;
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

      brushStrokes: [],
      brushSize: 20,
      showMasks: true,
      
      isGenerating: false,
      currentPrompt: '',
      temperature: 0.7,
      seed: null,
      selectedAspectRatio: { label: '1280×1280', width: 1280, height: 1280, ratio: 1 },
      
      selectedGenerationId: null,
      selectedEditId: null,
      showHistory: true,
      
      showPromptPanel: true,
      historyPanelWidth: 320,

      selectedTool: 'generate',
      currentNodeDetails: null,
      
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
      setCanvasImagesWithAutoZoom: (images) => set((state) => {
        const order = images.map((_, index) => index);
        const columns = Math.ceil(Math.sqrt(images.length));

        // Auto-zoom logic for new generated content
        const isMobile = window.innerWidth < 768;
        const autoZoom = isMobile ? 0.5 : 1.0;

        return {
          canvasImages: images,
          canvasGridLayout: { order, columns },
          canvasZoom: autoZoom,
          canvasPan: { x: 0, y: 0 }
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
      setSelectedAspectRatio: (ratio) => set({ selectedAspectRatio: ratio }),
      
      addGeneration: (generation) => set((state) => {
        if (state.currentProject) {
          // Project exists, add generation to it
          return {
            currentProject: {
              ...state.currentProject,
              generations: [...state.currentProject.generations, generation],
              updatedAt: Date.now()
            }
          };
        } else {
          // No project exists, create one with this generation
          const newProject = {
            id: `project-${Date.now()}`,
            title: 'Untitled Project',
            generations: [generation],
            edits: [],
            createdAt: Date.now(),
            updatedAt: Date.now()
          };
          return { currentProject: newProject };
        }
      }),
      
      addEdit: (edit) => set((state) => {
        if (state.currentProject) {
          // Project exists, add edit to it
          return {
            currentProject: {
              ...state.currentProject,
              edits: [...state.currentProject.edits, edit],
              updatedAt: Date.now()
            }
          };
        } else {
          // No project exists, create one with this edit
          const newProject = {
            id: `project-${Date.now()}`,
            title: 'Untitled Project',
            generations: [],
            edits: [edit],
            createdAt: Date.now(),
            updatedAt: Date.now()
          };
          return { currentProject: newProject };
        }
      }),

      updateNodeWithCanvasImages: (nodeId, canvasImages) => set((state) => {
        if (!state.currentProject) return state;

        // Update generation if nodeId matches a generation
        const generationIndex = state.currentProject.generations.findIndex(g => g.id === nodeId);
        if (generationIndex !== -1) {
          const updatedGenerations = [...state.currentProject.generations];
          updatedGenerations[generationIndex] = {
            ...updatedGenerations[generationIndex],
            outputAssets: canvasImages,
            gridLayout: {
              order: canvasImages.map((_, i) => i),
              columns: Math.ceil(Math.sqrt(canvasImages.length))
            },
            updatedAt: Date.now()
          };

          return {
            currentProject: {
              ...state.currentProject,
              generations: updatedGenerations,
              updatedAt: Date.now()
            }
          };
        }

        // Update edit if nodeId matches an edit
        const editIndex = state.currentProject.edits.findIndex(e => e.id === nodeId);
        if (editIndex !== -1) {
          const updatedEdits = [...state.currentProject.edits];
          updatedEdits[editIndex] = {
            ...updatedEdits[editIndex],
            outputAssets: canvasImages,
            gridLayout: {
              order: canvasImages.map((_, i) => i),
              columns: Math.ceil(Math.sqrt(canvasImages.length))
            },
            updatedAt: Date.now()
          };

          return {
            currentProject: {
              ...state.currentProject,
              edits: updatedEdits,
              updatedAt: Date.now()
            }
          };
        }

        return state; // Node not found
      }),

      selectGeneration: (id) => set({ selectedGenerationId: id }),
      selectEdit: (id) => set({ selectedEditId: id }),
      clearSelection: () => set({
        selectedGenerationId: null,
        selectedEditId: null,
        canvasImages: [],
        canvasGridLayout: { order: [], columns: 1 },
        brushStrokes: [],
        currentPrompt: ''
      }),
      setShowHistory: (show) => set({ showHistory: show }),
      
      setShowPromptPanel: (show) => set({ showPromptPanel: show }),
      setHistoryPanelWidth: (width) => set({ historyPanelWidth: width }),

      setCurrentNodeDetails: (details) => set({ currentNodeDetails: details }),
      setSelectedTool: (tool) => set({ selectedTool: tool }),

      // Brush stroke management per canvas
      saveBrushStrokesToCurrentCanvas: () => {
        const state = get();
        if (!state.currentProject) return;

        const currentBrushStrokes = [...state.brushStrokes];

        if (state.selectedGenerationId) {
          // Save to the selected generation
          const generationIndex = state.currentProject.generations.findIndex(g => g.id === state.selectedGenerationId);
          if (generationIndex !== -1) {
            const updatedGenerations = [...state.currentProject.generations];
            updatedGenerations[generationIndex] = {
              ...updatedGenerations[generationIndex],
              brushStrokes: currentBrushStrokes
            };
            set({
              currentProject: {
                ...state.currentProject,
                generations: updatedGenerations,
                updatedAt: Date.now()
              }
            });
          }
        } else if (state.selectedEditId) {
          // Save to the selected edit
          const editIndex = state.currentProject.edits.findIndex(e => e.id === state.selectedEditId);
          if (editIndex !== -1) {
            const updatedEdits = [...state.currentProject.edits];
            updatedEdits[editIndex] = {
              ...updatedEdits[editIndex],
              brushStrokes: currentBrushStrokes
            };
            set({
              currentProject: {
                ...state.currentProject,
                edits: updatedEdits,
                updatedAt: Date.now()
              }
            });
          }
        }
      },

      loadBrushStrokesFromCanvas: (canvasId: string, canvasType: 'generation' | 'edit') => {
        const state = get();
        if (!state.currentProject) return;

        let canvasBrushStrokes: BrushStroke[] = [];

        if (canvasType === 'generation') {
          const generation = state.currentProject.generations.find(g => g.id === canvasId);
          canvasBrushStrokes = generation?.brushStrokes || [];
        } else {
          const edit = state.currentProject.edits.find(e => e.id === canvasId);
          canvasBrushStrokes = edit?.brushStrokes || [];
        }

        set({ brushStrokes: canvasBrushStrokes });
      },
    }),
    { name: 'nano-banana-store' }
  )
);