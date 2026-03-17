import React, { useRef, useCallback, useEffect, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import DraggableComponent from './DraggableComponent';
import type { EditorActions } from './useEditorState';

interface EditorCanvasProps {
  editor: EditorActions;
}

const EditorCanvas: React.FC<EditorCanvasProps> = ({ editor }) => {
  const { state, zoom, showGrid, selectedId, setSelectedId, updateComponent } = editor;
  const { layout, components } = state;

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });

  // Observe container size
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setContainerSize({ width, height });
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Calculate scale: how many screen pixels per layout unit
  // Base scale fits the label into the container, then multiply by zoom
  const padding = 40;
  const availW = containerSize.width - padding * 2;
  const availH = containerSize.height - padding * 2;
  const fitScale = Math.min(availW / layout.width, availH / layout.height, 8);
  const scale = fitScale * zoom;

  const canvasW = layout.width * scale;
  const canvasH = layout.height * scale;

  const { setNodeRef: setDropRef } = useDroppable({
    id: 'editor-canvas',
  });

  const handleCanvasClick = useCallback(() => {
    setSelectedId(null);
  }, [setSelectedId]);

  const handleResize = useCallback(
    (id: string, width: number, height: number) => {
      updateComponent(id, { width, height });
    },
    [updateComponent]
  );

  // Grid lines
  const gridSpacing = layout.unit === 'mm' ? 5 : layout.unit === 'inch' ? 0.25 : 10;

  return (
    <div
      ref={containerRef}
      className="flex-1 bg-gray-100 dark:bg-gray-900 overflow-auto flex items-center justify-center"
    >
      <div
        ref={setDropRef}
        className="relative bg-white shadow-lg"
        style={{
          width: canvasW,
          height: canvasH,
          minWidth: canvasW,
          minHeight: canvasH,
        }}
        onClick={handleCanvasClick}
      >
        {/* Grid */}
        {showGrid && (
          <svg
            className="absolute inset-0 pointer-events-none"
            width={canvasW}
            height={canvasH}
          >
            <defs>
              <pattern
                id="grid-pattern"
                width={gridSpacing * scale}
                height={gridSpacing * scale}
                patternUnits="userSpaceOnUse"
              >
                <path
                  d={`M ${gridSpacing * scale} 0 L 0 0 0 ${gridSpacing * scale}`}
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="0.5"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid-pattern)" />
          </svg>
        )}

        {/* Margin / safe area */}
        <div
          className="absolute border border-dashed border-blue-300/50 pointer-events-none"
          style={{
            left: layout.margins.left * scale,
            top: layout.margins.top * scale,
            width: (layout.width - layout.margins.left - layout.margins.right) * scale,
            height: (layout.height - layout.margins.top - layout.margins.bottom) * scale,
          }}
        />

        {/* Components */}
        {components
          .slice()
          .sort((a, b) => a.zIndex - b.zIndex)
          .map((comp) => (
            <DraggableComponent
              key={comp.id}
              component={comp}
              isSelected={selectedId === comp.id}
              scale={scale}
              onSelect={() => setSelectedId(comp.id)}
              onResize={(w, h) => handleResize(comp.id, w, h)}
            />
          ))}

        {/* Empty state */}
        {components.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center text-gray-400 dark:text-gray-500">
              <p className="text-sm">Bilesenlerinizi buraya surekleyin</p>
              <p className="text-xs mt-1">Soldan bir bilesen secip birakin</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EditorCanvas;
