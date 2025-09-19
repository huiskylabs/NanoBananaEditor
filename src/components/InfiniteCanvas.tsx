import React, { useRef, useState, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import { Stage, Layer, Image as KonvaImage, Group, Rect, Text } from 'react-konva';
import { cn } from '../utils/cn';
import { Generation, Edit } from '../types';

interface CanvasNode {
  id: string;
  x: number;
  y: number;
  type: 'generation' | 'edit';
  data: Generation | Edit;
  imageElement?: HTMLImageElement;
}

export const InfiniteCanvas: React.FC = () => {
  const {
    currentProject,
    canvasZoom,
    canvasPan,
    setCanvasZoom,
    setCanvasPan,
    selectedGenerationId,
    selectedEditId,
    selectGeneration,
    selectEdit,
    setCanvasImages
  } = useAppStore();

  const stageRef = useRef<any>(null);
  const [nodes, setNodes] = useState<CanvasNode[]>([]);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [lastPointerPosition, setLastPointerPosition] = useState({ x: 0, y: 0 });

  // Convert generations and edits to canvas nodes with spatial positioning
  useEffect(() => {
    if (!currentProject) return;

    const newNodes: CanvasNode[] = [];
    const nodeSpacing = 800; // Space between nodes

    // Position generations horizontally (left to right for iterations)
    currentProject.generations.forEach((generation, index) => {
      newNodes.push({
        id: generation.id,
        x: index * nodeSpacing,
        y: 0,
        type: 'generation',
        data: generation
      });
    });

    // Position edits vertically below their parent generations
    currentProject.edits.forEach((edit, index) => {
      // Find parent generation position
      const parentGen = currentProject.generations.find(g => g.id === edit.parentGenerationId);
      const parentIndex = currentProject.generations.findIndex(g => g.id === edit.parentGenerationId);

      if (parentGen) {
        newNodes.push({
          id: edit.id,
          x: parentIndex * nodeSpacing,
          y: (index + 1) * 600, // Stack edits vertically below
          type: 'edit',
          data: edit
        });
      }
    });

    setNodes(newNodes);

    // Load images for each node
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

  // Load image element for a node
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

    // Handle both base64 and regular URLs
    if (imageUrl.startsWith('data:')) {
      img.src = imageUrl;
    } else {
      img.src = `data:image/jpeg;base64,${imageUrl}`;
    }
  };

  // Update active node based on selected generation/edit
  useEffect(() => {
    if (selectedGenerationId) {
      setActiveNodeId(selectedGenerationId);
    } else if (selectedEditId) {
      setActiveNodeId(selectedEditId);
    }
  }, [selectedGenerationId, selectedEditId]);

  // Pan to active node
  const panToNode = (nodeId: string) => {
    const node = nodes.find(n => n.id === nodeId);
    if (node && stageRef.current) {
      const stage = stageRef.current;
      const newPan = {
        x: stage.width() / 2 - node.x - 256, // Center node (256 = half of 512px node width)
        y: stage.height() / 2 - node.y - 256
      };
      setCanvasPan(newPan);
    }
  };

  // Handle node click
  const handleNodeClick = (node: CanvasNode) => {
    setActiveNodeId(node.id);

    if (node.type === 'generation') {
      selectGeneration(node.id);
      selectEdit(null);
      const gen = node.data as Generation;
      if (gen.outputAssets.length > 0) {
        setCanvasImages(gen.outputAssets);
      }
    } else {
      selectEdit(node.id);
      selectGeneration(null);
      const edit = node.data as Edit;
      if (edit.outputAssets.length > 0) {
        setCanvasImages(edit.outputAssets);
      }
    }
  };

  // Navigation functions
  const navigateRight = () => {
    const activeNode = nodes.find(n => n.id === activeNodeId);
    if (!activeNode) return;

    const rightNodes = nodes.filter(n =>
      n.x > activeNode.x &&
      Math.abs(n.y - activeNode.y) < 300
    );

    if (rightNodes.length > 0) {
      const closest = rightNodes.sort((a, b) =>
        Math.abs(a.x - activeNode.x) - Math.abs(b.x - activeNode.x)
      )[0];

      handleNodeClick(closest);
      panToNode(closest.id);
    }
  };

  const navigateLeft = () => {
    const activeNode = nodes.find(n => n.id === activeNodeId);
    if (!activeNode) return;

    const leftNodes = nodes.filter(n =>
      n.x < activeNode.x &&
      Math.abs(n.y - activeNode.y) < 300
    );

    if (leftNodes.length > 0) {
      const closest = leftNodes.sort((a, b) =>
        Math.abs(a.x - activeNode.x) - Math.abs(b.x - activeNode.x)
      )[0];

      handleNodeClick(closest);
      panToNode(closest.id);
    }
  };

  const navigateDown = () => {
    const activeNode = nodes.find(n => n.id === activeNodeId);
    if (!activeNode) return;

    const downNodes = nodes.filter(n =>
      n.y > activeNode.y &&
      Math.abs(n.x - activeNode.x) < 300
    );

    if (downNodes.length > 0) {
      const closest = downNodes.sort((a, b) =>
        Math.abs(a.y - activeNode.y) - Math.abs(b.y - activeNode.y)
      )[0];

      handleNodeClick(closest);
      panToNode(closest.id);
    }
  };

  const navigateUp = () => {
    const activeNode = nodes.find(n => n.id === activeNodeId);
    if (!activeNode) return;

    const upNodes = nodes.filter(n =>
      n.y < activeNode.y &&
      Math.abs(n.x - activeNode.x) < 300
    );

    if (upNodes.length > 0) {
      const closest = upNodes.sort((a, b) =>
        Math.abs(a.y - activeNode.y) - Math.abs(b.y - activeNode.y)
      )[0];

      handleNodeClick(closest);
      panToNode(closest.id);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return; // Don't handle navigation in input fields
      }

      switch (e.code) {
        case 'ArrowRight':
          e.preventDefault();
          navigateRight();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          navigateLeft();
          break;
        case 'ArrowDown':
          e.preventDefault();
          navigateDown();
          break;
        case 'ArrowUp':
          e.preventDefault();
          navigateUp();
          break;
        case 'Space':
          e.preventDefault();
          if (activeNodeId) {
            panToNode(activeNodeId);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nodes, activeNodeId]);

  // Handle stage interactions
  const handleStageMouseDown = (e: any) => {
    if (e.evt.button === 1 || e.evt.ctrlKey || e.evt.metaKey) { // Middle click or Ctrl+click
      setIsPanning(true);
      setLastPointerPosition({ x: e.evt.clientX, y: e.evt.clientY });
    }
  };

  const handleStageMouseMove = (e: any) => {
    if (!isPanning) return;

    const deltaX = e.evt.clientX - lastPointerPosition.x;
    const deltaY = e.evt.clientY - lastPointerPosition.y;

    setCanvasPan({
      x: canvasPan.x + deltaX,
      y: canvasPan.y + deltaY
    });

    setLastPointerPosition({ x: e.evt.clientX, y: e.evt.clientY });
  };

  const handleStageMouseUp = () => {
    setIsPanning(false);
  };

  const handleWheel = (e: any) => {
    e.evt.preventDefault();

    const scaleBy = 1.1;
    const stage = stageRef.current;
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
    const clampedScale = Math.max(0.1, Math.min(3, newScale));

    setCanvasZoom(clampedScale);

    const newPos = {
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale,
    };

    setCanvasPan(newPos);
  };

  return (
    <div className="w-full h-full bg-gray-100 relative overflow-hidden">
      <Stage
        ref={stageRef}
        width={window.innerWidth}
        height={window.innerHeight}
        scaleX={canvasZoom}
        scaleY={canvasZoom}
        x={canvasPan.x}
        y={canvasPan.y}
        onMouseDown={handleStageMouseDown}
        onMousemove={handleStageMouseMove}
        onMouseup={handleStageMouseUp}
        onWheel={handleWheel}
        style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
      >
        <Layer>
          {nodes.map(node => (
            <Group
              key={node.id}
              x={node.x}
              y={node.y}
              onClick={() => handleNodeClick(node)}
              onTap={() => handleNodeClick(node)}
            >
              {/* Node background */}
              <Rect
                width={512}
                height={512}
                fill={node.id === activeNodeId ? '#3b82f6' : '#ffffff'}
                stroke={node.id === activeNodeId ? '#1d4ed8' : '#e5e7eb'}
                strokeWidth={node.id === activeNodeId ? 4 : 2}
                cornerRadius={8}
                shadowColor="rgba(0,0,0,0.2)"
                shadowBlur={10}
                shadowOffset={{ x: 0, y: 4 }}
              />

              {/* Image */}
              {node.imageElement && (
                <KonvaImage
                  image={node.imageElement}
                  width={512}
                  height={512}
                  cornerRadius={8}
                />
              )}

              {/* Node type indicator */}
              <Rect
                x={8}
                y={8}
                width={80}
                height={24}
                fill={node.type === 'generation' ? '#10b981' : '#8b5cf6'}
                cornerRadius={4}
              />
              <Text
                x={48}
                y={20}
                text={node.type === 'generation' ? 'GEN' : 'EDIT'}
                fontSize={12}
                fill="white"
                align="center"
              />
            </Group>
          ))}
        </Layer>
      </Stage>

      {/* Navigation indicator */}
      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center p-8 bg-white rounded-lg shadow-lg">
            <div className="text-6xl mb-4">🎨</div>
            <h2 className="text-xl font-medium text-gray-700 mb-2">
              Infinite Canvas Ready
            </h2>
            <p className="text-gray-500 max-w-md">
              Generate your first image to start exploring the infinite canvas with spatial navigation
            </p>
            <div className="mt-4 text-sm text-gray-400">
              <p>← → Navigate horizontally between iterations</p>
              <p>↑ ↓ Navigate vertically between edits</p>
              <p>Space: Center on active node</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};