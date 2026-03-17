import React, { useState } from 'react';
import { Trash2, Star, Download, Edit3, GripVertical } from 'lucide-react';
import { Button } from '@x-ear/ui-web';
import type { ProductMedia } from '@/api/client/product-media.client';

interface ImageGalleryProps {
  media: ProductMedia[];
  onDelete: (mediaId: string) => void;
  onSetPrimary: (mediaId: string) => void;
  onEdit: (media: ProductMedia) => void;
  onReorder: (mediaIds: string[]) => void;
}

export const ImageGallery: React.FC<ImageGalleryProps> = ({
  media, onDelete, onSetPrimary, onEdit, onReorder
}) => {
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;

    const ids = media.map(m => m.id);
    const dragIdx = ids.indexOf(draggedId);
    const dropIdx = ids.indexOf(targetId);
    ids.splice(dragIdx, 1);
    ids.splice(dropIdx, 0, draggedId);
    onReorder(ids);
    setDraggedId(null);
  };

  if (media.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-sm">Henüz görsel eklenmemiş</p>
        <p className="text-xs mt-1">Yukarıdan görsel yükleyebilirsiniz</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {media.map((item) => (
        <div
          key={item.id}
          draggable
          onDragStart={(e) => handleDragStart(e, item.id)}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, item.id)}
          className={`group relative rounded-xl overflow-hidden border-2 transition-all cursor-move ${
            item.isPrimary ? 'border-yellow-400 ring-2 ring-yellow-200' : 'border-border hover:border-primary/50'
          } ${draggedId === item.id ? 'opacity-50' : ''}`}
        >
          {/* Image */}
          <div className="aspect-square bg-gray-100 dark:bg-gray-800">
            <img
              src={item.url}
              alt={item.altText || item.filename || 'Product image'}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>

          {/* Primary badge */}
          {item.isPrimary && (
            <div className="absolute top-2 left-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
              <Star className="w-3 h-3" /> Ana
            </div>
          )}

          {/* Drag handle */}
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <GripVertical className="w-4 h-4 text-white drop-shadow-lg" />
          </div>

          {/* Hover actions */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex justify-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onEdit(item)}
                className="p-1.5 text-white hover:bg-white/20"
                title="Düzenle"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </Button>
              {!item.isPrimary && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onSetPrimary(item.id)}
                  className="p-1.5 text-white hover:bg-white/20"
                  title="Ana görsel yap"
                >
                  <Star className="w-3.5 h-3.5" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const a = document.createElement('a');
                  a.href = item.url;
                  a.download = item.filename || 'image';
                  a.click();
                }}
                className="p-1.5 text-white hover:bg-white/20"
                title="İndir"
              >
                <Download className="w-3.5 h-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(item.id)}
                className="p-1.5 text-red-300 hover:bg-red-500/20"
                title="Sil"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* Source badge */}
          {item.source !== 'upload' && (
            <div className="absolute top-2 left-2 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded">
              {item.source === 'pexels' ? 'Pexels' : item.source === 'unsplash' ? 'Unsplash' : item.source === 'ai_generated' ? 'AI' : item.source}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
