import React, { useRef, useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Button } from './ui/Button';
import { History, Download, Image as ImageIcon, Layers, ZoomIn, ZoomOut, RotateCcw, Info, Copy, Target, GitBranch, ChevronRight } from 'lucide-react';
import { cn } from '../utils/cn';
import { ImagePreviewModal } from './ImagePreviewModal';
import { Stage, Layer, Image as KonvaImage, Group, Rect, Text, Line, Path } from 'react-konva';
import { Generation, Edit } from '../types';

export const HistoryPanel: React.FC = () => {
  const {
    currentProject,
    canvasImages,
    selectedGenerationId,
    selectedEditId,
    selectGeneration,
    selectEdit,
    clearSelection,
    showHistory,
    setShowHistory,
    setCanvasImages,
    selectedTool,
    historyPanelWidth,
    setCurrentNodeDetails,
    currentNodeDetails,
    setCurrentPrompt,
    saveBrushStrokesToCurrentCanvas,
    loadBrushStrokesFromCanvas
  } = useAppStore();


  const [previewModal, setPreviewModal] = React.useState<{
    open: boolean;
    imageUrl: string;
    title: string;
    description?: string;
  }>({
    open: false,
    imageUrl: '',
    title: '',
    description: ''
  });

  const generations = currentProject?.generations || [];
  const edits = currentProject?.edits || [];

  // Infinite Canvas Tree State
  const stageRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<Array<{
    id: string;
    x: number;
    y: number;
    type: 'generation' | 'edit';
    data: Generation | Edit;
    thumbnailElement?: HTMLImageElement;
  }>>([]);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [treeZoom, setTreeZoom] = useState(0.8);
  const [treePan, setTreePan] = useState({ x: 0, y: 0 }); // Tree will be centered automatically
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  // Measure container size for Stage
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setStageSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };

    updateSize();
    const resizeObserver = new ResizeObserver(updateSize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, []);

  // Load images for nodes
  const loadImageForNode = (imageUrl: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = imageUrl;
    });
  };

  // Create canvas thumbnail from multiple images with grid layout
  const createCanvasThumbnail = async (outputAssets: any[], gridLayout: any): Promise<HTMLImageElement> => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    // Set thumbnail size - higher resolution for better quality
    const thumbnailSize = 180;
    canvas.width = thumbnailSize;
    canvas.height = thumbnailSize;

    // Enable high-quality image rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Fill with dark background
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(0, 0, thumbnailSize, thumbnailSize);

    if (outputAssets.length === 0) return Promise.reject('No assets');

    // Calculate grid dimensions
    const columns = gridLayout?.columns || Math.ceil(Math.sqrt(outputAssets.length));
    const rows = Math.ceil(outputAssets.length / columns);

    // Calculate cell size with small gaps
    const gap = 2;
    const cellWidth = (thumbnailSize - (gap * (columns + 1))) / columns;
    const cellHeight = (thumbnailSize - (gap * (rows + 1))) / rows;

    // Load and draw images
    const imagePromises = outputAssets.map(asset => loadImageForNode(asset.url));
    const images = await Promise.all(imagePromises);

    images.forEach((img, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);

      const x = gap + col * (cellWidth + gap);
      const y = gap + row * (cellHeight + gap);

      // Draw image scaled to fit cell
      ctx.drawImage(img, x, y, cellWidth, cellHeight);
    });

    // Convert canvas to image element
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) return reject('Failed to create blob');

        const img = new window.Image();
        img.onload = () => {
          URL.revokeObjectURL(img.src);
          resolve(img);
        };
        img.onerror = reject;
        img.src = URL.createObjectURL(blob);
      });
    });
  };

  // Build tree structure for infinite canvas
  useEffect(() => {
    if (!currentProject) {
      setNodes([]);
      return;
    }

    const nodeWidth = 64;
    const nodeHeight = 64;
    const verticalSpacing = 80;  // Enough space so children are below parent
    const horizontalSpacing = 16;  // Very compact horizontal spacing between siblings

    // Build proper tree structure
    interface TreeNode {
      id: string;
      type: 'generation' | 'edit';
      data: Generation | Edit;
      children: TreeNode[];
      parent?: TreeNode;
      x: number;
      y: number;
    }

    // Create tree nodes map
    const treeNodes = new Map<string, TreeNode>();
    const rootNodes: TreeNode[] = [];

    // Always add a root blank node
    const blankRootNode: TreeNode = {
      id: 'blank-root',
      type: 'generation',
      data: {
        id: 'blank-root',
        prompt: 'New',
        parameters: {},
        sourceAssets: [],
        outputAssets: [],
        modelVersion: '',
        timestamp: 0,
        type: 'root'
      } as Generation,
      children: [],
      x: 0,
      y: 0
    };
    treeNodes.set('blank-root', blankRootNode);
    rootNodes.push(blankRootNode);

    // Add all generations to the tree
    currentProject.generations.forEach(generation => {
      const node: TreeNode = {
        id: generation.id,
        type: 'generation',
        data: generation,
        children: [],
        x: 0,
        y: 0
      };
      treeNodes.set(generation.id, node);

      if (generation.type === 'root') {
        // Root generations connect to blank root
        blankRootNode.children.push(node);
        node.parent = blankRootNode;
      }
    });

    // Add all edits to the tree
    currentProject.edits.forEach(edit => {
      const node: TreeNode = {
        id: edit.id,
        type: 'edit',
        data: edit,
        children: [],
        x: 0,
        y: 0
      };
      treeNodes.set(edit.id, node);
    });

    // Build parent-child relationships
    currentProject.generations.forEach(generation => {
      if (generation.parentGenerationId) {
        const parent = treeNodes.get(generation.parentGenerationId);
        const child = treeNodes.get(generation.id);
        if (parent && child) {
          parent.children.push(child);
          child.parent = parent;
        }
      }
    });

    // Build edit relationships
    currentProject.edits.forEach(edit => {
      const child = treeNodes.get(edit.id);
      if (!child) return;

      // Edit can have either a generation parent or edit parent
      let parent: TreeNode | undefined;
      if (edit.parentEditId) {
        parent = treeNodes.get(edit.parentEditId);
      } else if (edit.parentGenerationId) {
        parent = treeNodes.get(edit.parentGenerationId);
      }

      if (parent && child) {
        parent.children.push(child);
        child.parent = parent;
      }
    });

    // Position nodes using proper tree layout (no overlaps)
    function positionTree(node: TreeNode, x: number, y: number): number {
      // First pass: calculate subtree widths
      function calculateSubtreeWidth(n: TreeNode): number {
        if (n.children.length === 0) {
          return nodeWidth;
        }

        let totalChildWidth = 0;
        n.children.forEach(child => {
          totalChildWidth += calculateSubtreeWidth(child);
        });

        // Add spacing between children
        const spacingWidth = (n.children.length - 1) * horizontalSpacing;
        const childrenWidth = totalChildWidth + spacingWidth;

        // Return the larger of node width or children width
        return Math.max(nodeWidth, childrenWidth);
      }

      // Second pass: position nodes
      function positionSubtree(n: TreeNode, centerX: number, y: number): void {
        n.y = y;

        if (n.children.length === 0) {
          n.x = centerX - nodeWidth / 2;
          return;
        }

        // Calculate total width needed for all children
        const subtreeWidths = n.children.map(child => calculateSubtreeWidth(child));
        const totalChildWidth = subtreeWidths.reduce((sum, width) => sum + width, 0);
        const spacingWidth = (n.children.length - 1) * horizontalSpacing;
        const totalWidth = totalChildWidth + spacingWidth;

        // Position children from left to right
        let currentX = centerX - totalWidth / 2;
        n.children.forEach((child, index) => {
          const childWidth = subtreeWidths[index];
          const childCenterX = currentX + childWidth / 2;
          positionSubtree(child, childCenterX, y + verticalSpacing);
          currentX += childWidth + horizontalSpacing;
        });

        // Position parent centered over children
        n.x = centerX - nodeWidth / 2;
      }

      // Calculate this subtree's width and position it
      const subtreeWidth = calculateSubtreeWidth(node);
      positionSubtree(node, x + subtreeWidth / 2, y);

      return subtreeWidth;
    }

    // Calculate total width needed for all root trees
    const treeWidths = rootNodes.map(root => {
      // Pre-calculate width for each tree
      function calculateSubtreeWidth(n: TreeNode): number {
        if (n.children.length === 0) {
          return nodeWidth;
        }
        let totalChildWidth = 0;
        n.children.forEach(child => {
          totalChildWidth += calculateSubtreeWidth(child);
        });
        const spacingWidth = (n.children.length - 1) * horizontalSpacing;
        return Math.max(nodeWidth, totalChildWidth + spacingWidth);
      }
      return calculateSubtreeWidth(root);
    });

    const totalTreeWidth = treeWidths.reduce((sum, width) => sum + width, 0);
    const treeGaps = Math.max(0, (rootNodes.length - 1) * 100); // Gap between separate trees
    const totalWidth = totalTreeWidth + treeGaps;

    // Center the entire forest in the viewport
    // Use stageSize if available, otherwise use a reasonable default
    const viewportWidth = stageSize.width > 0 ? stageSize.width : historyPanelWidth;
    const startX = Math.max(50, (viewportWidth - totalWidth) / 2);

    // Position each root tree centered
    let currentX = startX;
    rootNodes.forEach((root, index) => {
      const treeWidth = positionTree(root, currentX, 50); // Start near top
      currentX += treeWidth + 100; // Gap between separate trees
    });

    // Convert tree nodes to display nodes and load images
    const displayNodes = Array.from(treeNodes.values()).map(treeNode => ({
      id: treeNode.id,
      x: treeNode.x,
      y: treeNode.y,
      type: treeNode.type,
      data: treeNode.data,
      thumbnailElement: undefined as HTMLImageElement | undefined
    }));

    setNodes(displayNodes);

    // Ensure proper highlighting after nodes are updated
    if (selectedGenerationId && displayNodes.find(n => n.id === selectedGenerationId)) {
      setActiveNodeId(selectedGenerationId);
    } else if (selectedEditId && displayNodes.find(n => n.id === selectedEditId)) {
      setActiveNodeId(selectedEditId);
    }

    // Create canvas thumbnails for nodes asynchronously
    displayNodes.forEach(async (node) => {
      if (node.id === 'blank-root') return; // Skip blank root

      let outputAssets: any[] = [];
      let gridLayout: any = {};

      if (node.type === 'generation') {
        const gen = node.data as Generation;
        outputAssets = gen.outputAssets;
        gridLayout = gen.gridLayout;
      } else {
        const edit = node.data as Edit;
        outputAssets = edit.outputAssets;
        gridLayout = edit.gridLayout;
      }

      if (outputAssets.length > 0) {
        try {
          const thumbnailElement = await createCanvasThumbnail(outputAssets, gridLayout);
          setNodes(prevNodes =>
            prevNodes.map(n =>
              n.id === node.id
                ? { ...n, thumbnailElement }
                : n
            )
          );
        } catch (error) {
          console.warn(`Failed to create thumbnail for node ${node.id}:`, error);
        }
      }
    });
  }, [currentProject, selectedGenerationId, selectedEditId]);

  // NOTE: Removed automatic thumbnail updates to prevent corruption
  // Thumbnails are now only created during initial node creation and explicit uploads
  // This prevents the canvas view from corrupting existing node thumbnails

  // Update active node based on selection
  useEffect(() => {
    if (selectedGenerationId) {
      setActiveNodeId(selectedGenerationId);
    } else if (selectedEditId) {
      setActiveNodeId(selectedEditId);
    } else {
      // Nothing selected, highlight blank root
      setActiveNodeId('blank-root');
    }
  }, [selectedGenerationId, selectedEditId]);

  // Update node details when active node changes
  useEffect(() => {
    if (activeNodeId === 'blank-root' || !activeNodeId) {
      setCurrentNodeDetails(null);
      return;
    }

    // Find the active node in our current nodes
    const activeNode = nodes.find(n => n.id === activeNodeId);
    if (!activeNode) return;

    if (activeNode.type === 'generation') {
      const gen = activeNode.data as Generation;
      setCurrentNodeDetails({
        prompt: gen.prompt || '',
        nodeType: 'generation',
        modelVersion: gen.modelVersion,
        temperature: gen.parameters.temperature,
        seed: gen.parameters.seed,
        timestamp: gen.timestamp,
        outputAssets: gen.outputAssets
      });
    } else if (activeNode.type === 'edit') {
      const edit = activeNode.data as Edit;
      setCurrentNodeDetails({
        prompt: edit.instruction || '',
        nodeType: 'edit',
        timestamp: edit.timestamp,
        outputAssets: edit.outputAssets
      });
    }
  }, [activeNodeId, nodes, setCurrentNodeDetails]);

  // Find the most recent child's prompt to pre-populate for easy iteration
  const findMostRecentChildPrompt = (parentId: string, parentType: 'generation' | 'edit'): string | null => {
    if (!currentProject) return null;

    let children: (Generation | Edit)[] = [];

    if (parentType === 'generation') {
      // Find generations and edits that have this generation as parent
      const childGenerations = currentProject.generations.filter(g => g.parentGenerationId === parentId);
      const childEdits = currentProject.edits.filter(e => e.parentGenerationId === parentId);
      children = [...childGenerations, ...childEdits];
    } else {
      // Find edits that have this edit as parent
      const childEdits = currentProject.edits.filter(e => e.parentEditId === parentId);
      children = childEdits;
    }

    if (children.length === 0) return null;

    // Sort by timestamp to get the most recent
    children.sort((a, b) => b.timestamp - a.timestamp);
    const mostRecentChild = children[0];

    // Return the prompt/instruction from the most recent child
    if ('prompt' in mostRecentChild) {
      return mostRecentChild.prompt || null;
    } else {
      return mostRecentChild.instruction || null;
    }
  };

  // Handle tree node click
  const handleTreeNodeClick = (node: typeof nodes[0]) => {
    // Save current canvas's brush strokes before switching
    if (selectedGenerationId || selectedEditId) {
      saveBrushStrokesToCurrentCanvas();
    }

    setActiveNodeId(node.id);

    if (node.id === 'blank-root') {
      // Click on blank root - clear selection and return to blank state
      clearSelection();
      setCurrentNodeDetails(null);
      setCurrentPrompt(''); // Clear prompt when going to blank state
    } else if (node.type === 'generation') {
      selectGeneration(node.id);
      selectEdit(null);
      const gen = node.data as Generation;
      if (gen.outputAssets.length > 0) {
        setCanvasImages(gen.outputAssets);
      }

      // Load brush strokes for this canvas
      loadBrushStrokesFromCanvas(node.id, 'generation');

      // Set current canvas details for display (don't overwrite user input)
      setCurrentNodeDetails({
        prompt: gen.prompt || '',
        nodeType: 'generation',
        modelVersion: gen.modelVersion,
        temperature: gen.parameters.temperature,
        seed: gen.parameters.seed,
        timestamp: gen.timestamp,
        outputAssets: gen.outputAssets
      });
      // Pre-populate prompt with the most recent child's prompt for easy iteration
      const childPrompt = findMostRecentChildPrompt(node.id, 'generation');
      setCurrentPrompt(childPrompt || gen.prompt || '');

    } else {
      selectEdit(node.id);
      selectGeneration(null);
      const edit = node.data as Edit;
      if (edit.outputAssets.length > 0) {
        setCanvasImages(edit.outputAssets);
      }

      // Load brush strokes for this canvas
      loadBrushStrokesFromCanvas(node.id, 'edit');

      // Set current canvas details for display (don't overwrite user input)
      setCurrentNodeDetails({
        prompt: edit.instruction || '',
        nodeType: 'edit',
        timestamp: edit.timestamp,
        outputAssets: edit.outputAssets
      });
      // Pre-populate prompt with the most recent child's prompt for easy iteration
      const childPrompt = findMostRecentChildPrompt(node.id, 'edit');
      setCurrentPrompt(childPrompt || edit.instruction || '');
    }
  };

  if (!showHistory) {
    return (
      <div className="w-8 bg-zinc-950 border-l border-zinc-800 flex flex-col items-center justify-center">
        <button
          onClick={() => setShowHistory(true)}
          className="w-6 h-16 bg-zinc-800 hover:bg-zinc-700 rounded-l-lg border border-r-0 border-zinc-700 flex items-center justify-center transition-colors group"
          title="Show History Panel"
        >
          <div className="flex flex-col space-y-1">
            <div className="w-1 h-1 bg-zinc-500 group-hover:bg-zinc-400 rounded-full"></div>
            <div className="w-1 h-1 bg-zinc-500 group-hover:bg-zinc-400 rounded-full"></div>
            <div className="w-1 h-1 bg-zinc-500 group-hover:bg-zinc-400 rounded-full"></div>
          </div>
        </button>
      </div>
    );
  }

  return (
    <div
      className="bg-zinc-950 border-l border-zinc-800 p-6 flex flex-col h-full"
      style={{ width: `${historyPanelWidth}px` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <History className="h-5 w-5 text-zinc-400" />
          <h3 className="text-sm font-medium text-zinc-300">Generations</h3>
        </div>
        <div className="flex items-center space-x-0.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTreeZoom(Math.max(0.1, treeZoom - 0.1))}
              className="h-5 w-5"
              title="Zoom Out"
            >
              <ZoomOut className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                // Calculate bounds of all nodes
                if (nodes.length === 0) {
                  setTreeZoom(1);
                  setTreePan({ x: 0, y: 0 });
                  return;
                }

                const minX = Math.min(...nodes.map(n => n.x));
                const maxX = Math.max(...nodes.map(n => n.x + 64)); // node width
                const minY = Math.min(...nodes.map(n => n.y));
                const maxY = Math.max(...nodes.map(n => n.y + 64)); // node height

                const treeWidth = maxX - minX;
                const treeHeight = maxY - minY;

                // Tree view container dimensions (visible viewport)
                const containerWidth = stageSize.width; // Actual container width
                const containerHeight = stageSize.height; // Actual container height

                // Calculate zoom to fit with some margin
                const zoomX = (containerWidth * 0.9) / treeWidth;
                const zoomY = (containerHeight * 0.9) / treeHeight;
                const fitZoom = Math.min(zoomX, zoomY, 1); // Don't zoom in past 100%

                // Calculate pan to center the tree
                const panX = (containerWidth - treeWidth * fitZoom) / 2 - minX * fitZoom;
                const panY = (containerHeight - treeHeight * fitZoom) / 2 - minY * fitZoom;

                setTreeZoom(fitZoom);
                setTreePan({ x: panX, y: panY });
              }}
              className="h-5 w-5 text-xs"
              title="Fit Tree to View"
            >
              Fit
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                if (!activeNodeId || activeNodeId === 'blank-root') return;

                const activeNode = nodes.find(n => n.id === activeNodeId);
                if (!activeNode) return;

                // Center on the active node
                const centerX = stageSize.width / 2 - (activeNode.x + 32) * treeZoom;
                const centerY = stageSize.height / 2 - (activeNode.y + 32) * treeZoom;

                setTreePan({ x: centerX, y: centerY });
              }}
              className="h-5 w-5"
              title="Center on Active Node"
              disabled={!activeNodeId || activeNodeId === 'blank-root'}
            >
              <Target className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTreeZoom(Math.min(2, treeZoom + 0.1))}
              className="h-5 w-5"
              title="Zoom In"
            >
              <ZoomIn className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowHistory(!showHistory)}
              className="h-6 w-6"
              title="Hide History Panel"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

      {/* Tree View */}
      <div className="flex-1 flex flex-col min-h-0">
        <div
          ref={containerRef}
          className="flex-1 bg-zinc-900 rounded-lg border border-zinc-700 overflow-hidden relative min-h-0"
        >
          {nodes.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-12 h-12 bg-zinc-800 rounded-lg border border-zinc-700 flex items-center justify-center mb-3 mx-auto">
                  <GitBranch className="h-6 w-6 text-zinc-400" />
                </div>
                <p className="text-xs text-zinc-500">No generations yet</p>
              </div>
            </div>
          ) : stageSize.width > 0 && stageSize.height > 0 ? (
            <div className="w-full h-full overflow-hidden">
              <Stage
                ref={stageRef}
                width={stageSize.width} // Responsive container width
                height={stageSize.height} // Responsive container height
                scaleX={treeZoom}
                scaleY={treeZoom}
                x={treePan.x}
                y={treePan.y}
                draggable
                onDragStart={() => setIsDragging(true)}
                onDragEnd={(e) => {
                  setTreePan({ x: e.target.x(), y: e.target.y() });
                  setIsDragging(false);
                }}
                style={{
                  cursor: isDragging ? 'grabbing' : 'default'
                }}
              >
              <Layer>
                {/* Connection lines */}
                {nodes.map(node => {
                  const lines = [];

                  // Find parent node for this node
                  let parentNode = null;

                  if (node.type === 'edit') {
                    const edit = node.data as Edit;
                    if (edit.parentEditId) {
                      // Edit has edit parent
                      parentNode = nodes.find(n => n.id === edit.parentEditId);
                    } else if (edit.parentGenerationId) {
                      // Edit has generation parent
                      parentNode = nodes.find(n => n.id === edit.parentGenerationId);
                    }
                  } else if (node.type === 'generation') {
                    const generation = node.data as Generation;
                    if (generation.parentGenerationId) {
                      // Generation has generation parent
                      parentNode = nodes.find(n => n.id === generation.parentGenerationId);
                    } else if (generation.type === 'root') {
                      // Root generation connects to blank root
                      parentNode = nodes.find(n => n.id === 'blank-root');
                    }
                  }

                  // Draw connection line to parent
                  if (parentNode && node.id !== 'blank-root') {
                    const startX = parentNode.x + 32;
                    const startY = parentNode.y + 64;
                    const endX = node.x + 32;
                    const endY = node.y;
                    const midY = startY + (endY - startY) / 2;

                    // Choose line color based on node type
                    let strokeColor = '#6b7280'; // Default gray
                    let dashPattern = undefined;

                    if (node.type === 'edit') {
                      strokeColor = '#8b5cf6'; // Purple for edits
                    } else if (node.type === 'generation') {
                      const generation = node.data as Generation;
                      if (generation.type === 'iteration') {
                        strokeColor = '#10b981'; // Green for iteration generations
                        dashPattern = [5, 5];
                      } else {
                        strokeColor = '#6b7280'; // Gray for root generations
                      }
                    }

                    lines.push(
                      <Path
                        key={`connection-line-${node.id}`}
                        data={`M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`}
                        stroke={strokeColor}
                        strokeWidth={2}
                        fill=""
                        dash={dashPattern}
                      />
                    );
                  }

                  return lines;
                })}


                {/* Tree nodes */}
                {nodes.map(node => (
                  <Group
                    key={node.id}
                    x={node.x}
                    y={node.y}
                    onClick={() => handleTreeNodeClick(node)}
                    onTap={() => handleTreeNodeClick(node)}
                  >
                    {/* Node background */}
                    <Rect
                      width={64}
                      height={64}
                      fill={node.id === activeNodeId ? '#3b82f6' : '#374151'}
                      stroke={node.id === activeNodeId ? '#60a5fa' : '#6b7280'}
                      strokeWidth={node.id === activeNodeId ? 4 : 1}
                      cornerRadius={6}
                    />

                    {/* Canvas thumbnail preview */}
                    {node.thumbnailElement && (
                      <KonvaImage
                        image={node.thumbnailElement}
                        width={60}
                        height={60}
                        x={2}
                        y={2}
                        cornerRadius={4}
                      />
                    )}


                    {/* Overlay for blank root */}
                    {node.id === 'blank-root' && (
                      <>
                        <Rect
                          width={60}
                          height={60}
                          x={2}
                          y={2}
                          fill="#1f2937"
                          cornerRadius={4}
                        />
                        <Text
                          x={32}
                          y={32}
                          text="+"
                          fontSize={24}
                          fill="#6b7280"
                          align="center"
                          offsetX={7}
                          offsetY={8}
                        />
                      </>
                    )}


                  </Group>
                ))}
              </Layer>
            </Stage>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="w-12 h-12 bg-zinc-800 rounded-lg border border-zinc-700 flex items-center justify-center mb-3 mx-auto">
                  <GitBranch className="h-6 w-6 text-zinc-400" />
                </div>
                <p className="text-xs text-zinc-500">Loading tree view...</p>
              </div>
            </div>
          )}

        </div>
      </div>


      {/* Image Preview Modal */}
      <ImagePreviewModal
        open={previewModal.open}
        onOpenChange={(open) => setPreviewModal(prev => ({ ...prev, open }))}
        imageUrl={previewModal.imageUrl}
        title={previewModal.title}
        description={previewModal.description}
      />
    </div>
  );
};