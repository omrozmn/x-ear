import React, { useCallback, useRef, useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import type { ComponentConfig } from '@/services/label.service';

interface DraggableComponentProps {
  component: ComponentConfig;
  isSelected: boolean;
  scale: number;
  onSelect: () => void;
  onResize: (width: number, height: number) => void;
}

const DraggableComponent: React.FC<DraggableComponentProps> = ({
  component,
  isSelected,
  scale,
  onSelect,
  onResize,
}) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: component.id,
    data: {
      fromPalette: false,
      component,
    },
  });

  const [resizing, setResizing] = useState(false);
  const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0 });

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      setResizing(true);
      resizeStart.current = {
        x: e.clientX,
        y: e.clientY,
        w: component.width,
        h: component.height,
      };

      const handleMouseMove = (ev: MouseEvent) => {
        const dx = (ev.clientX - resizeStart.current.x) / scale;
        const dy = (ev.clientY - resizeStart.current.y) / scale;
        const newW = Math.max(5, resizeStart.current.w + dx);
        const newH = Math.max(5, resizeStart.current.h + dy);
        onResize(Math.round(newW * 10) / 10, Math.round(newH * 10) / 10);
      };

      const handleMouseUp = () => {
        setResizing(false);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [component.width, component.height, scale, onResize]
  );

  const style: React.CSSProperties = {
    position: 'absolute',
    left: component.x * scale,
    top: component.y * scale,
    width: component.width * scale,
    height: component.height * scale,
    transform: component.rotation ? `rotate(${component.rotation}deg)` : undefined,
    zIndex: component.zIndex + 10,
    cursor: isDragging ? 'grabbing' : 'grab',
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group"
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      {...(resizing ? {} : { ...listeners, ...attributes })}
    >
      {/* Component visual */}
      <div className="w-full h-full overflow-hidden">
        <ComponentPreview component={component} scale={scale} />
      </div>

      {/* Selection outline */}
      {isSelected && (
        <>
          <div className="absolute inset-0 border-2 border-blue-500 pointer-events-none rounded-sm" />
          {/* Resize handle - bottom right */}
          <div
            onMouseDown={handleResizeStart}
            className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-blue-500 border-2 border-white rounded-sm cursor-se-resize z-50"
          />
          {/* Corner indicators */}
          <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-blue-500 border-2 border-white rounded-sm pointer-events-none" />
          <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-blue-500 border-2 border-white rounded-sm pointer-events-none" />
          <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-blue-500 border-2 border-white rounded-sm pointer-events-none" />
        </>
      )}

      {/* Hover outline */}
      {!isSelected && (
        <div className="absolute inset-0 border border-transparent group-hover:border-blue-300 pointer-events-none rounded-sm transition-colors" />
      )}
    </div>
  );
};

const ComponentPreview: React.FC<{ component: ComponentConfig; scale: number }> = ({
  component,
  scale,
}) => {
  const props = component.properties;

  switch (component.type) {
    case 'text': {
      const text = (props.text as string) || 'Metin';
      const fontSize = ((props.fontSize as number) || 12) * scale;
      const color = (props.color as string) || '#000000';
      const fontFamily = (props.fontFamily as string) || 'Arial';
      const fontWeight = (props.fontWeight as string) || 'normal';
      const align = (props.align as string) || 'left';
      return (
        <div
          className="w-full h-full flex items-center overflow-hidden"
          style={{
            fontSize: `${fontSize}px`,
            color,
            fontFamily,
            fontWeight,
            textAlign: align as 'left' | 'center' | 'right',
            lineHeight: 1.2,
          }}
        >
          <span className="w-full whitespace-pre-wrap">{text}</span>
        </div>
      );
    }

    case 'barcode': {
      const barColor = (props.barColor as string) || '#000000';
      return (
        <div className="w-full h-full flex flex-col items-center justify-center">
          {/* Simplified barcode visual */}
          <div className="flex-1 w-full flex items-end justify-center gap-px px-1 py-1">
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className="flex-1"
                style={{
                  backgroundColor: i % 3 === 0 ? 'transparent' : barColor,
                  height: `${60 + (i % 5) * 8}%`,
                }}
              />
            ))}
          </div>
          {(props.showText !== false) && (
            <div className="text-center w-full" style={{ fontSize: `${Math.max(8, 8 * scale)}px`, color: barColor }}>
              {(props.data as string) || '123456'}
            </div>
          )}
        </div>
      );
    }

    case 'qrcode': {
      const color = (props.color as string) || '#000000';
      return (
        <div className="w-full h-full flex items-center justify-center p-1">
          <div
            className="w-full h-full border-2 rounded-sm grid grid-cols-5 grid-rows-5 gap-px p-1"
            style={{ borderColor: color }}
          >
            {Array.from({ length: 25 }).map((_, i) => (
              <div
                key={i}
                style={{
                  backgroundColor:
                    [0, 1, 2, 4, 5, 6, 10, 12, 14, 18, 20, 22, 23, 24].includes(i)
                      ? color
                      : 'transparent',
                }}
              />
            ))}
          </div>
        </div>
      );
    }

    case 'shape': {
      const shape = (props.shape as string) || 'rect';
      const fill = (props.fill as string) || '#3b82f6';
      const stroke = (props.stroke as string) || '#1e40af';
      const strokeWidth = (props.strokeWidth as number) || 1;
      const cornerRadius = (props.cornerRadius as number) || 0;

      if (shape === 'circle') {
        return (
          <div className="w-full h-full flex items-center justify-center">
            <div
              className="rounded-full"
              style={{
                width: '90%',
                height: '90%',
                backgroundColor: fill,
                border: `${strokeWidth}px solid ${stroke}`,
              }}
            />
          </div>
        );
      }

      if (shape === 'line') {
        return (
          <div className="w-full h-full flex items-center">
            <div
              className="w-full"
              style={{
                height: `${Math.max(strokeWidth, 2)}px`,
                backgroundColor: stroke,
              }}
            />
          </div>
        );
      }

      return (
        <div
          className="w-full h-full"
          style={{
            backgroundColor: fill,
            border: `${strokeWidth}px solid ${stroke}`,
            borderRadius: `${cornerRadius}px`,
          }}
        />
      );
    }

    case 'image': {
      const src = props.src as string;
      const objectFit = (props.objectFit as string) || 'contain';
      return src ? (
        <img
          src={src}
          alt=""
          className="w-full h-full"
          style={{ objectFit: objectFit as 'contain' | 'cover' | 'fill' }}
        />
      ) : (
        <div className="w-full h-full bg-gray-100 dark:bg-gray-600 flex items-center justify-center text-gray-400 text-xs">
          Gorsel
        </div>
      );
    }

    default:
      return (
        <div className="w-full h-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-xs text-gray-500">
          {component.type}
        </div>
      );
  }
};

export default DraggableComponent;
