import React, { useRef, useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Button } from './ui/Button';
import { History, Download, Image as ImageIcon, Layers, ZoomIn, ZoomOut, RotateCcw, Info } from 'lucide-react';
import { cn } from '../utils/cn';
import { ImagePreviewModal } from './ImagePreviewModal';
import { Stage, Layer, Image as KonvaImage, Group, Rect, Text, Line, Path } from 'react-konva';
import { Generation, Edit } from '../types';

export const HistoryPanel: React.FC = () => {
  const {
    currentProject,
    canvasImage,
    selectedGenerationId,
    selectedEditId,
    selectGeneration,
    selectEdit,
    clearSelection,
    showHistory,
    setShowHistory,
    setCanvasImage,
    selectedTool,
    historyPanelWidth,
    setCurrentPrompt
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
    imageElement?: HTMLImageElement;
  }>>([]);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [treeZoom, setTreeZoom] = useState(0.8);
  const [treePan, setTreePan] = useState({ x: 0, y: 0 }); // Tree will be centered automatically
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    content: string;
    title: string;
  }>({
    visible: false,
    x: 0,
    y: 0,
    content: '',
    title: ''
  });

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

  // Build tree structure for infinite canvas
  useEffect(() => {
    if (!currentProject) {
      setNodes([]);
      return;
    }

    const nodeWidth = 80;
    const nodeHeight = 80;
    const verticalSpacing = 100;  // Enough space so children are below parent
    const horizontalSpacing = 20;  // Very compact horizontal spacing between siblings

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
        prompt: 'Start here',
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
      imageElement: undefined as HTMLImageElement | undefined
    }));

    setNodes(displayNodes);

    // Ensure proper highlighting after nodes are updated
    if (selectedGenerationId && displayNodes.find(n => n.id === selectedGenerationId)) {
      setActiveNodeId(selectedGenerationId);
    } else if (selectedEditId && displayNodes.find(n => n.id === selectedEditId)) {
      setActiveNodeId(selectedEditId);
    }

    // Load images for nodes asynchronously
    displayNodes.forEach(async (node) => {
      if (node.id === 'blank-root') return; // Skip blank root

      let imageUrl: string | undefined;

      if (node.type === 'generation') {
        const gen = node.data as Generation;
        imageUrl = gen.outputAssets[0]?.url;
      } else {
        const edit = node.data as Edit;
        imageUrl = edit.outputAssets[0]?.url;
      }

      if (imageUrl) {
        try {
          const imageElement = await loadImageForNode(imageUrl);
          setNodes(prevNodes =>
            prevNodes.map(n =>
              n.id === node.id
                ? { ...n, imageElement }
                : n
            )
          );
        } catch (error) {
          console.warn(`Failed to load image for node ${node.id}:`, error);
        }
      }
    });
  }, [currentProject, selectedGenerationId, selectedEditId]);

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


  // Handle tree node click
  const handleTreeNodeClick = (node: typeof nodes[0]) => {
    setActiveNodeId(node.id);

    if (node.id === 'blank-root') {
      // Click on blank root - clear selection and return to blank state
      clearSelection();
    } else if (node.type === 'generation') {
      selectGeneration(node.id);
      selectEdit(null);
      const gen = node.data as Generation;
      if (gen.outputAssets[0]) {
        setCanvasImage(gen.outputAssets[0].url);
      }
      // Restore the prompt that was used for this generation
      setCurrentPrompt(gen.prompt || '');
    } else {
      selectEdit(node.id);
      selectGeneration(null);
      const edit = node.data as Edit;
      if (edit.outputAssets[0]) {
        setCanvasImage(edit.outputAssets[0].url);
      }
      // Restore the instruction that was used for this edit
      setCurrentPrompt(edit.instruction || '');
    }
  };

  if (!showHistory) {
    return (
      <div className="w-8 bg-gray-950 border-l border-gray-800 flex flex-col items-center justify-center">
        <button
          onClick={() => setShowHistory(true)}
          className="w-6 h-16 bg-gray-800 hover:bg-gray-700 rounded-l-lg border border-r-0 border-gray-700 flex items-center justify-center transition-colors group"
          title="Show History Panel"
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
    <div
      className="bg-gray-950 border-l border-gray-800 p-6 flex flex-col h-full"
      style={{ width: `${historyPanelWidth}px` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <History className="h-5 w-5 text-gray-400" />
          <h3 className="text-sm font-medium text-gray-300">History & Variants</h3>
        </div>
        <div className="flex items-center space-x-1">
          <Button
            variant="outline"
            size="sm"
            onClick={clearSelection}
            className="h-6 px-2 text-xs"
            title="Start New - Return to blank canvas"
          >
            New
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowHistory(!showHistory)}
            className="h-6 w-6"
            title="Hide History Panel"
          >
            ×
          </Button>
        </div>
      </div>

      {/* Tree View */}
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-medium text-gray-400">Tree View</h4>
          <div className="flex items-center space-x-1">
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
                const maxX = Math.max(...nodes.map(n => n.x + 80)); // node width
                const minY = Math.min(...nodes.map(n => n.y));
                const maxY = Math.max(...nodes.map(n => n.y + 80)); // node height

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
              onClick={() => setTreeZoom(Math.min(2, treeZoom + 0.1))}
              className="h-5 w-5"
              title="Zoom In"
            >
              <ZoomIn className="h-3 w-3" />
            </Button>
          </div>
        </div>
        <div
          ref={containerRef}
          className="flex-1 bg-gray-900 rounded-lg border border-gray-700 overflow-hidden relative"
        >
          {nodes.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="text-2xl mb-2">🌳</div>
                <p className="text-xs text-gray-500">No generations yet</p>
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
                onDragEnd={(e) => {
                  setTreePan({ x: e.target.x(), y: e.target.y() });
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
                    const startX = parentNode.x + 40;
                    const startY = parentNode.y + 80;
                    const endX = node.x + 40;
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
                      width={80}
                      height={80}
                      fill={node.id === activeNodeId ? '#3b82f6' : '#374151'}
                      stroke={node.id === activeNodeId ? '#60a5fa' : '#6b7280'}
                      strokeWidth={node.id === activeNodeId ? 4 : 1}
                      cornerRadius={6}
                    />

                    {/* Image preview */}
                    {node.imageElement && (
                      <KonvaImage
                        image={node.imageElement}
                        width={76}
                        height={76}
                        x={2}
                        y={2}
                        cornerRadius={4}
                        crop={{
                          x: 0,
                          y: 0,
                          width: node.imageElement.width,
                          height: node.imageElement.height
                        }}
                      />
                    )}

                    {/* Overlay for blank root */}
                    {node.id === 'blank-root' && (
                      <>
                        <Rect
                          width={76}
                          height={76}
                          x={2}
                          y={2}
                          fill="#1f2937"
                          cornerRadius={4}
                        />
                        <Text
                          x={40}
                          y={40}
                          text="🎨"
                          fontSize={24}
                          align="center"
                          offsetX={12}
                          offsetY={12}
                        />
                      </>
                    )}

                    {/* Node type label */}
                    <Rect
                      x={2}
                      y={2}
                      width={node.type === 'generation' ? 20 : 16}
                      height={12}
                      fill={node.type === 'generation' ? '#10b981' : '#8b5cf6'}
                      cornerRadius={2}
                    />
                    <Text
                      x={node.type === 'generation' ? 10 : 8}
                      y={8}
                      text={node.type === 'generation' ? 'G' : 'E'}
                      fontSize={8}
                      fill="white"
                      align="center"
                    />

                    {/* Info icon for hover tooltip */}
                    {node.id !== 'blank-root' && (
                      <Group
                        onMouseEnter={(e) => {
                          const stage = e.target.getStage();
                          const pointerPos = stage.getPointerPosition();

                          let content = '';
                          let title = '';

                          if (node.type === 'generation') {
                            const gen = node.data as Generation;
                            title = 'Generation Details';
                            content = `Prompt: ${gen.prompt}\nModel: ${gen.modelVersion}`;
                            if (gen.parameters.seed) content += `\nSeed: ${gen.parameters.seed}`;
                            if (gen.parameters.temperature) content += `\nTemperature: ${gen.parameters.temperature}`;
                          } else {
                            const edit = node.data as Edit;
                            title = 'Edit Details';
                            content = `Instruction: ${edit.instruction}\nType: Image Edit`;
                          }

                          setTooltip({
                            visible: true,
                            x: pointerPos.x,
                            y: pointerPos.y,
                            content,
                            title
                          });
                        }}
                        onMouseLeave={() => {
                          setTooltip(prev => ({ ...prev, visible: false }));
                        }}
                      >
                        <Rect
                          x={66}
                          y={2}
                          width={12}
                          height={12}
                          fill="#374151"
                          stroke="#6b7280"
                          strokeWidth={1}
                          cornerRadius={2}
                        />
                        <Text
                          x={72}
                          y={8}
                          text="i"
                          fontSize={8}
                          fill="#9ca3af"
                          align="center"
                        />
                      </Group>
                    )}
                  </Group>
                ))}
              </Layer>
            </Stage>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="text-2xl mb-2">🌳</div>
                <p className="text-xs text-gray-500">Loading tree view...</p>
              </div>
            </div>
          )}

          {/* Tooltip overlay */}
          {tooltip.visible && (
            <div
              className="absolute z-50 bg-gray-800 border border-gray-600 rounded-lg p-3 text-xs text-gray-300 max-w-64 shadow-lg pointer-events-none"
              style={{
                left: Math.min(tooltip.x + 10, 250), // Keep within panel bounds
                top: Math.max(tooltip.y - 10, 10),
              }}
            >
              <div className="font-medium text-gray-200 mb-1">{tooltip.title}</div>
              <div className="whitespace-pre-line">{tooltip.content}</div>
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