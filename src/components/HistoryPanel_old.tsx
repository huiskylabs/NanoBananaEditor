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
    selectedTool
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
  const [nodes, setNodes] = useState<Array<{
    id: string;
    x: number;
    y: number;
    type: 'generation' | 'edit';
    data: Generation | Edit;
    imageElement?: HTMLImageElement;
  }>>([]);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [treeZoom, setTreeZoom] = useState(0.6);
  const [treePan, setTreePan] = useState({ x: 0, y: 0 });
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

  // Get current image dimensions
  const [imageDimensions, setImageDimensions] = React.useState<{ width: number; height: number } | null>(null);
  
  React.useEffect(() => {
    if (canvasImage) {
      const img = new Image();
      img.onload = () => {
        setImageDimensions({ width: img.width, height: img.height });
      };
      img.src = canvasImage;
    } else {
      setImageDimensions(null);
    }
  }, [canvasImage]);

  // Build tree structure for infinite canvas
  useEffect(() => {
    if (!currentProject) {
      setNodes([]);
      return;
    }

    const nodeWidth = 80;
    const nodeHeight = 80;
    const horizontalSpacing = 120;
    const verticalSpacing = 100;

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

    // Position nodes using tree layout
    function positionTree(node: TreeNode, x: number, y: number): number {
      node.x = x;
      node.y = y;

      if (node.children.length === 0) {
        return nodeWidth;
      }

      // Position children horizontally (siblings on same row)
      let currentX = x;
      const childY = y + verticalSpacing;

      node.children.forEach((child) => {
        const childWidth = positionTree(child, currentX, childY);
        currentX += childWidth + horizontalSpacing;
      });

      // Center the parent over its children
      const firstChild = node.children[0];
      const lastChild = node.children[node.children.length - 1];
      const childrenSpan = lastChild.x - firstChild.x;
      const parentCenterX = firstChild.x + childrenSpan / 2;
      node.x = parentCenterX;

      // Return the total width used by this subtree
      return Math.max(nodeWidth, currentX - x - horizontalSpacing);
    }

    // Position each root tree
    let currentX = 0;
    rootNodes.forEach(root => {
      const treeWidth = positionTree(root, currentX, 0);
      currentX += treeWidth + 200; // Gap between separate trees
    });

    // Convert tree nodes to display nodes
    const newNodes: typeof nodes = [];
    treeNodes.forEach(treeNode => {
      newNodes.push({
        id: treeNode.id,
        x: treeNode.x,
        y: treeNode.y,
        type: treeNode.type,
        data: treeNode.data
      });
    });

    setNodes(newNodes);

    // Load images for nodes
    newNodes.forEach(node => {
      if (node.type === 'generation') {
        const gen = node.data as Generation;
        if (gen.outputAssets[0]) {
          loadImageForNode(node.id, gen.outputAssets[0].url);
        }
      } else {
        const edit = node.data as Edit;
        if (edit.outputAssets[0]) {
          loadImageForNode(node.id, edit.outputAssets[0].url);
        }
      }
    });
  }, [currentProject]);

  // Load image for tree node
  const loadImageForNode = (nodeId: string, imageUrl: string) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setNodes(prevNodes =>
        prevNodes.map(node =>
          node.id === nodeId
            ? { ...node, imageElement: img }
            : node
        )
      );
    };

    if (imageUrl.startsWith('data:')) {
      img.src = imageUrl;
    } else {
      img.src = `data:image/jpeg;base64,${imageUrl}`;
    }
  };

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
    } else {
      selectEdit(node.id);
      selectGeneration(null);
      const edit = node.data as Edit;
      if (edit.outputAssets[0]) {
        setCanvasImage(edit.outputAssets[0].url);
      }
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
    <div className="w-80 bg-gray-950 border-l border-gray-800 p-6 flex flex-col h-full">
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

      {/* Infinite Canvas Tree */}
      <div className="mb-4 flex-shrink-0">
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

                // Tree view container is 192px height (h-48), with some padding
                const containerWidth = 280; // approximate width of tree container
                const containerHeight = 180; // 192px - padding

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
        <div className="h-80 bg-gray-900 rounded-lg border border-gray-700 overflow-hidden relative">
          {nodes.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <div className="text-2xl mb-2">🌳</div>
                <p className="text-xs text-gray-500">No tree yet</p>
              </div>
            </div>
          ) : (
            <Stage
              ref={stageRef}
              width={320}
              height={192}
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

                  // Edit to parent generation lines
                  if (node.type === 'edit') {
                    const parentGen = nodes.find(n =>
                      n.type === 'generation' &&
                      (n.data as Generation).id === (node.data as Edit).parentGenerationId
                    );
                    if (parentGen) {
                      // Create curved path from parent to child
                      const startX = parentGen.x + 40;
                      const startY = parentGen.y + 80;
                      const endX = node.x + 40;
                      const endY = node.y;
                      const midY = startY + (endY - startY) / 2;

                      lines.push(
                        <Path
                          key={`edit-line-${node.id}`}
                          data={`M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`}
                          stroke="#8b5cf6"
                          strokeWidth={2}
                          fill=""
                        />
                      );
                    }
                  }

                  // Sibling generation lines (iterations)
                  if (node.type === 'generation') {
                    const generation = node.data as Generation;
                    if (generation.type === 'iteration' && generation.parentGenerationId) {
                      const parentGen = nodes.find(n =>
                        n.type === 'generation' &&
                        (n.data as Generation).id === generation.parentGenerationId
                      );
                      if (parentGen) {
                        // Create curved path for sibling connections
                        const startX = parentGen.x + 80;
                        const startY = parentGen.y + 40;
                        const endX = node.x;
                        const endY = node.y + 40;
                        const midX = startX + (endX - startX) / 2;

                        lines.push(
                          <Path
                            key={`sibling-line-${node.id}`}
                            data={`M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`}
                            stroke="#10b981"
                            strokeWidth={2}
                            fill=""
                            dash={[5, 5]}
                          />
                        );
                      }
                    }
                  }

                  return lines;
                })}

                {/* Blank root to children lines */}
                {(() => {
                  const blankRootNode = nodes.find(n => n.id === 'blank-root');
                  if (!blankRootNode) return null;

                  const blankRootLines = [];
                  nodes.forEach(node => {
                    // Check if this node is a direct child of blank root
                    if (node.type === 'generation' && node.id !== 'blank-root') {
                      const generation = node.data as Generation;
                      if (generation.type === 'root') {
                        // Create curved path from blank root to root generation
                        const startX = blankRootNode.x + 40;
                        const startY = blankRootNode.y + 80;
                        const endX = node.x + 40;
                        const endY = node.y;
                        const midY = startY + (endY - startY) / 2;

                        blankRootLines.push(
                          <Path
                            key={`blank-root-line-${node.id}`}
                            data={`M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`}
                            stroke="#6b7280"
                            strokeWidth={2}
                            fill=""
                          />
                        );
                      }
                    }
                  });
                  return blankRootLines;
                })()}

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

                    {/* Image */}
                    {node.imageElement && (
                      <KonvaImage
                        image={node.imageElement}
                        width={80}
                        height={80}
                        cornerRadius={6}
                      />
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


        {(() => {
          const gen = generations.find(g => g.id === selectedGenerationId);
          const selectedEdit = edits.find(e => e.id === selectedEditId);
          
          if (gen) {
            return (
              <div className="space-y-3">
                <div className="space-y-2 text-xs text-gray-500">
                  <div>
                    <span className="text-gray-400">Prompt:</span>
                    <p className="text-gray-300 mt-1">{gen.prompt}</p>
                  </div>
                  <div className="flex justify-between">
                    <span>Model:</span>
                    <span>{gen.modelVersion}</span>
                  </div>
                  {gen.parameters.seed && (
                    <div className="flex justify-between">
                      <span>Seed:</span>
                      <span>{gen.parameters.seed}</span>
                    </div>
                  )}
                  {imageDimensions && (
                    <div className="flex justify-between">
                      <span>Dimensions:</span>
                      <span className="text-gray-300">{imageDimensions.width} × {imageDimensions.height}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Mode:</span>
                    <span className="text-gray-300 capitalize">{selectedTool}</span>
                  </div>
                </div>
                
                {/* Reference Images */}
                {gen.sourceAssets.length > 0 && (
                  <div>
                    <h5 className="text-xs font-medium text-gray-400 mb-2">Reference Images</h5>
                    <div className="grid grid-cols-2 gap-2">
                      {gen.sourceAssets.map((asset, index) => (
                        <button
                          key={asset.id}
                          onClick={() => setPreviewModal({
                            open: true,
                            imageUrl: asset.url,
                            title: `Reference Image ${index + 1}`,
                            description: 'This reference image was used to guide the generation'
                          })}
                          className="relative aspect-square rounded border border-gray-700 hover:border-gray-600 transition-colors overflow-hidden group"
                        >
                          <img
                            src={asset.url}
                            alt={`Reference ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                            <ImageIcon className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <div className="absolute bottom-1 left-1 bg-gray-900/80 text-xs px-1 py-0.5 rounded text-gray-300">
                            Ref {index + 1}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          } else if (selectedEdit) {
            const parentGen = generations.find(g => g.id === selectedEdit.parentGenerationId);
            return (
              <div className="space-y-3">
                <div className="space-y-2 text-xs text-gray-500">
                  <div>
                    <span className="text-gray-400">Edit Instruction:</span>
                    <p className="text-gray-300 mt-1">{selectedEdit.instruction}</p>
                  </div>
                  <div className="flex justify-between">
                    <span>Type:</span>
                    <span>Image Edit</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Created:</span>
                    <span>{new Date(selectedEdit.timestamp).toLocaleTimeString()}</span>
                  </div>
                  {selectedEdit.maskAssetId && (
                    <div className="flex justify-between">
                      <span>Mask:</span>
                      <span className="text-purple-400">Applied</span>
                    </div>
                  )}
                  {imageDimensions && (
                    <div className="flex justify-between">
                      <span>Dimensions:</span>
                      <span className="text-gray-300">{imageDimensions.width} × {imageDimensions.height}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Mode:</span>
                    <span className="text-gray-300 capitalize">{selectedTool}</span>
                  </div>
                </div>
                
                {/* Parent Generation Reference */}
                {parentGen && (
                  <div>
                    <h5 className="text-xs font-medium text-gray-400 mb-2">Original Image</h5>
                    <button
                      onClick={() => setPreviewModal({
                        open: true,
                        imageUrl: parentGen.outputAssets[0]?.url || '',
                        title: 'Original Image',
                        description: 'The base image that was edited'
                      })}
                      className="relative aspect-square w-16 rounded border border-gray-700 hover:border-gray-600 transition-colors overflow-hidden group"
                    >
                      <img
                        src={parentGen.outputAssets[0]?.url}
                        alt="Original"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <ImageIcon className="h-3 w-3 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </button>
                  </div>
                )}
                
                {/* Mask Visualization */}
                {selectedEdit.maskReferenceAsset && (
                  <div>
                    <h5 className="text-xs font-medium text-gray-400 mb-2">Masked Reference</h5>
                    <button
                      onClick={() => setPreviewModal({
                        open: true,
                        imageUrl: selectedEdit.maskReferenceAsset!.url,
                        title: 'Masked Reference Image',
                        description: 'This image with mask overlay was sent to the AI model to guide the edit'
                      })}
                      className="relative aspect-square w-16 rounded border border-gray-700 hover:border-gray-600 transition-colors overflow-hidden group"
                    >
                      <img
                        src={selectedEdit.maskReferenceAsset.url}
                        alt="Masked reference"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                        <ImageIcon className="h-3 w-3 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="absolute bottom-1 left-1 bg-purple-900/80 text-xs px-1 py-0.5 rounded text-purple-300">
                        Mask
                      </div>
                    </button>
                  </div>
                )}
              </div>
            );
          } else {
            return (
              <div className="space-y-2 text-xs text-gray-500">
                <p className="text-gray-400 mb-3">Select a generation or edit to view details</p>
                {(canvasImage || imageDimensions) && (
                  <div className="space-y-2 pt-2 border-t border-gray-800">
                    <p className="text-gray-400 text-xs">Current Image:</p>
                    {imageDimensions && (
                      <div className="flex justify-between">
                        <span>Dimensions:</span>
                        <span className="text-gray-300">{imageDimensions.width} × {imageDimensions.height}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span>Mode:</span>
                      <span className="text-gray-300 capitalize">{selectedTool}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          }
        })()}
      </div>

      {/* Actions */}
      <div className="space-y-3 flex-shrink-0">
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full"
          onClick={() => {
            // Find the currently displayed image (either generation or edit)
            let imageUrl: string | null = null;
            
            if (selectedGenerationId) {
              const gen = generations.find(g => g.id === selectedGenerationId);
              imageUrl = gen?.outputAssets[0]?.url || null;
            } else {
              // If no generation selected, try to get the current canvas image
              const { canvasImage } = useAppStore.getState();
              imageUrl = canvasImage;
            }
            
            if (imageUrl) {
              // Handle both data URLs and regular URLs
              if (imageUrl.startsWith('data:')) {
                const link = document.createElement('a');
                link.href = imageUrl;
                link.download = `nano-banana-${Date.now()}.png`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              } else {
                // For external URLs, we need to fetch and convert to blob
                fetch(imageUrl)
                  .then(response => response.blob())
                  .then(blob => {
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `nano-banana-${Date.now()}.png`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                  });
              }
            }
          }}
          disabled={!selectedGenerationId && !useAppStore.getState().canvasImage}
        >
          <Download className="h-4 w-4 mr-2" />
          Download
        </Button>
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