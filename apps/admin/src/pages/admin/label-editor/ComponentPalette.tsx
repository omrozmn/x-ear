import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import {
  Type,
  BarChart3,
  QrCode,
  Square,
  Circle,
  Minus,
  Image as ImageIcon,
} from 'lucide-react';
import type { ComponentType } from '@/services/label.service';

interface PaletteItem {
  type: ComponentType;
  label: string;
  icon: React.ReactNode;
  extraData?: Record<string, unknown>;
}

const PALETTE_ITEMS: PaletteItem[] = [
  { type: 'text', label: 'Metin', icon: <Type className="w-5 h-5" /> },
  { type: 'barcode', label: 'Barkod', icon: <BarChart3 className="w-5 h-5" /> },
  { type: 'qrcode', label: 'QR Kod', icon: <QrCode className="w-5 h-5" /> },
  { type: 'shape', label: 'Dikdortgen', icon: <Square className="w-5 h-5" />, extraData: { shape: 'rect' } },
  { type: 'shape', label: 'Daire', icon: <Circle className="w-5 h-5" />, extraData: { shape: 'circle' } },
  { type: 'shape', label: 'Cizgi', icon: <Minus className="w-5 h-5" />, extraData: { shape: 'line' } },
  { type: 'image', label: 'Gorsel', icon: <ImageIcon className="w-5 h-5" /> },
];

const ComponentPalette: React.FC = () => {
  return (
    <div className="w-48 border-r dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col shrink-0 overflow-y-auto">
      <div className="p-3 border-b dark:border-gray-700">
        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Bilesenler
        </h3>
      </div>
      <div className="p-2 space-y-1">
        {PALETTE_ITEMS.map((item, idx) => (
          <PaletteItemCard key={`${item.type}-${idx}`} item={item} index={idx} />
        ))}
      </div>
    </div>
  );
};

const PaletteItemCard: React.FC<{ item: PaletteItem; index: number }> = ({ item, index }) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${item.type}-${index}`,
    data: {
      fromPalette: true,
      componentType: item.type,
      extraData: item.extraData,
    },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`flex items-center gap-3 p-2.5 rounded-lg cursor-grab active:cursor-grabbing transition-all select-none ${
        isDragging
          ? 'opacity-40 bg-blue-50 dark:bg-blue-900/20'
          : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
      }`}
    >
      <div className="text-gray-500 dark:text-gray-400">{item.icon}</div>
      <span className="text-sm text-gray-700 dark:text-gray-300">{item.label}</span>
    </div>
  );
};

export default ComponentPalette;
