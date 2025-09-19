export interface Asset {
  id: string;
  type: 'original' | 'mask' | 'output';
  url: string;
  mime: string;
  width: number;
  height: number;
  checksum: string;
}

export interface GridLayout {
  order: number[]; // Image display order [0,1,2...]
  columns: number; // Grid columns (auto-calculated)
}

export interface Generation {
  id: string;
  prompt: string;
  parameters: {
    seed?: number;
    temperature?: number;
  };
  sourceAssets: Asset[]; // Still used for initial uploads
  outputAssets: Asset[];
  modelVersion: string;
  timestamp: number;
  costEstimate?: number;
  gridLayout?: GridLayout; // How to arrange multiple outputs
  // Tree relationship tracking
  parentGenerationId?: string; // For sibling generations (iterations)
  type: 'root' | 'iteration'; // Root = first gen, iteration = sibling of existing gen
  // Mask state specific to this node
  brushStrokes?: BrushStroke[];
}

export interface Edit {
  id: string;
  parentGenerationId?: string; // Parent generation (for edits directly from generations)
  parentEditId?: string; // Parent edit (for nested edits)
  maskAssetId?: string;
  maskReferenceAsset?: Asset;
  instruction: string;
  outputAssets: Asset[];
  gridLayout?: GridLayout; // How to arrange multiple outputs
  timestamp: number;
  // Mask state specific to this node
  brushStrokes?: BrushStroke[];
}

export interface Project {
  id: string;
  title: string;
  generations: Generation[];
  edits: Edit[];
  createdAt: number;
  updatedAt: number;
}

export interface SegmentationMask {
  id: string;
  imageData: ImageData;
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  feather: number;
}

export interface BrushStroke {
  id: string;
  points: number[];
  brushSize: number;
  color: string;
}

export interface PromptHint {
  category: 'subject' | 'scene' | 'action' | 'style' | 'camera';
  text: string;
  example: string;
}