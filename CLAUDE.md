# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Nano Banana AI Image Editor is a React + TypeScript application for AI-powered image generation and editing using Google's Gemini 2.5 Flash Image model. It features text-to-image generation, conversational editing with region-aware masking, and comprehensive project management with generation history.

## Essential Commands

```bash
# Development
npm run dev      # Start development server on http://localhost:5173
npm run build    # Build for production
npm run preview  # Preview production build locally
npm run lint     # Run ESLint for code quality checks

# Setup
npm install      # Install dependencies
cp .env.example .env  # Create env file and add VITE_GEMINI_API_KEY
```

## Architecture Overview

### Core Technologies
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **State Management**: Zustand (global state in `src/store/useAppStore.ts`)
- **Canvas**: Konva.js for interactive image display and mask painting
- **AI Integration**: Google Generative AI SDK (Gemini 2.5 Flash Image)
- **Styling**: Tailwind CSS with Radix UI components
- **Storage**: IndexedDB via idb-keyval for offline caching

### Key Architectural Patterns

1. **Service Layer** (`src/services/`)
   - `geminiService.ts`: Handles all Gemini API interactions for image generation, editing, and segmentation
   - `cacheService.ts`: Manages IndexedDB caching for offline asset storage
   - `imageProcessing.ts`: Utilities for image manipulation and conversion

2. **State Management** (`src/store/useAppStore.ts`)
   - Single Zustand store manages all application state
   - Includes canvas state, generation history, UI preferences, and tool selection
   - Uses devtools middleware for debugging

3. **Component Architecture**
   - UI components in `src/components/ui/` follow shadcn/ui patterns
   - Main feature components handle specific workflows (PromptComposer, ImageCanvas, HistoryPanel)
   - Custom hooks in `src/hooks/` for complex logic (useImageGeneration, useKeyboardShortcuts)

4. **Type Safety**
   - Core types defined in `src/types/index.ts`
   - Strict TypeScript configuration with composite projects

### Critical Implementation Details

1. **API Key Configuration**
   - Development: API key loaded from `VITE_GEMINI_API_KEY` environment variable
   - Production consideration: Should use backend proxy for security

2. **Image Processing Flow**
   - Images are converted to base64 for Gemini API calls
   - Canvas masks are rendered using Konva.js and converted to PNG for region-aware editing
   - All generated images include SynthID watermarks

3. **State Flow**
   - User interactions update Zustand store
   - Components subscribe to specific store slices
   - React Query handles server state and caching
   - IndexedDB provides persistent offline storage

### Key Files to Understand

- `src/App.tsx`: Main application layout and routing
- `src/store/useAppStore.ts`: Central state management
- `src/services/geminiService.ts`: AI model integration
- `src/components/ImageCanvas.tsx`: Interactive canvas implementation
- `src/hooks/useImageGeneration.ts`: Core generation and editing logic

## Important Considerations

- No test framework is currently configured
- API calls are client-side (needs backend proxy for production)
- Image output is optimized for 1024×1024 dimensions
- Requires modern browsers with Canvas and WebGL support