import React, { useEffect, useState, useCallback, useRef } from 'react';
import DOMPurify from 'dompurify';
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { useNavigate } from '@tanstack/react-router';
import toast from 'react-hot-toast';
import { RefreshCw, X } from 'lucide-react';
import {
  labelService,
  type ComponentType,
} from '@/services/label.service';

import { useEditorState } from './useEditorState';
import EditorToolbar from './EditorToolbar';
import ComponentPalette from './ComponentPalette';
import EditorCanvas from './EditorCanvas';
import PropertiesPanel from './PropertiesPanel';

interface LabelEditorPageProps {
  templateId: string;
}

const LabelEditorPage: React.FC<LabelEditorPageProps> = ({ templateId }) => {
  const editor = useEditorState();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewSvg, setPreviewSvg] = useState<string | null>(null);
  const [activeDragType, setActiveDragType] = useState<string | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const isNew = templateId === 'new';

  // Load template
  useEffect(() => {
    if (isNew) {
      editor.initState({
        name: 'Yeni Sablon',
        layout: {
          width: 100,
          height: 50,
          unit: 'mm',
          dpi: 300,
          orientation: 'landscape',
          margins: { top: 2, right: 2, bottom: 2, left: 2 },
        },
        components: [],
      });
      setLoading(false);
      return;
    }

    labelService
      .getTemplate(templateId)
      .then((t) => {
        editor.initState({
          name: t.name,
          layout: t.layout,
          components: t.components,
        });
      })
      .catch(() => {
        toast.error('Sablon yuklenemedi');
        navigate({ to: '/label-templates' });
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId]);

  // Save
  const handleSave = useCallback(async () => {
    if (!editor.state.name.trim()) {
      toast.error('Sablon adi gerekli');
      return;
    }
    setSaving(true);
    try {
      if (isNew) {
        const created = await labelService.createTemplate({
          name: editor.state.name,
          layout: editor.state.layout,
          components: editor.state.components,
        });
        toast.success('Sablon olusturuldu');
        // Navigate to the created template's editor
        navigate({ to: '/label-editor/$templateId', params: { templateId: created.id } });
      } else {
        await labelService.updateTemplate(templateId, {
          name: editor.state.name,
          layout: editor.state.layout,
          components: editor.state.components,
        });
        toast.success('Sablon kaydedildi');
      }
      editor.setIsDirty(false);
    } catch {
      toast.error('Kaydetme basarisiz');
    } finally {
      setSaving(false);
    }
  }, [editor, isNew, templateId, navigate]);

  // Preview
  const handlePreview = useCallback(async () => {
    if (isNew) {
      toast.error('Once sablonu kaydedin');
      return;
    }
    try {
      const result = await labelService.renderPreview({
        templateId,
        data: {},
        format: 'svg',
      });
      setPreviewSvg(result.svg);
    } catch {
      toast.error('Onizleme olusturulamadi');
    }
  }, [isNew, templateId]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMeta = e.metaKey || e.ctrlKey;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        // Only delete if not typing in an input
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return;
        if (editor.selectedId) {
          e.preventDefault();
          editor.removeComponent(editor.selectedId);
        }
      }

      if (isMeta && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        editor.undo();
      }

      if (isMeta && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        editor.redo();
      }

      if (isMeta && e.key === 's') {
        e.preventDefault();
        handleSave();
      }

      if (isMeta && e.key === 'd') {
        e.preventDefault();
        if (editor.selectedId) {
          editor.duplicateComponent(editor.selectedId);
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [editor, handleSave]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current;
    if (data?.fromPalette) {
      setActiveDragType(data.componentType as string);
    }
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveDragType(null);
      const { active, over, delta } = event;
      const data = active.data.current;

      if (!data) return;

      if (data.fromPalette && over?.id === 'editor-canvas') {
        // Dropped from palette onto canvas
        const type = data.componentType as ComponentType;
        // Add at center-ish position
        const x = editor.state.layout.width / 2 - 15;
        const y = editor.state.layout.height / 2 - 5;
        const newId = editor.addComponent(type, Math.max(0, x), Math.max(0, y));

        // If shape has extra data (circle, line), update properties
        if (data.extraData && newId) {
          editor.updateComponentProperties(newId, data.extraData as Record<string, unknown>);
        }
      } else if (!data.fromPalette && data.component) {
        // Moving existing component on canvas
        const comp = data.component;
        // We need to figure out the canvas scale to convert delta pixels to layout units
        // We'll use a simple approach: get the canvas element and compute scale
        const canvasEl = document.querySelector('[data-canvas-drop]') || document.querySelector('.bg-white.shadow-lg');
        if (canvasEl) {
          const rect = canvasEl.getBoundingClientRect();
          const scale = rect.width / editor.state.layout.width;
          const dx = delta.x / scale;
          const dy = delta.y / scale;
          const newX = Math.max(0, Math.round((comp.x + dx) * 10) / 10);
          const newY = Math.max(0, Math.round((comp.y + dy) * 10) / 10);
          editor.updateComponent(comp.id, { x: newX, y: newY });
        }
      }
    },
    [editor]
  );

  const handleBack = useCallback(() => {
    if (editor.isDirty) {
      if (!window.confirm('Kaydedilmemis degisiklikler var. Cikmak istediginizden emin misiniz?')) {
        return;
      }
    }
    navigate({ to: '/label-templates' });
  }, [editor.isDirty, navigate]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
          <p className="text-sm text-gray-500">Sablon yukleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="h-full flex flex-col bg-gray-100 dark:bg-gray-900">
        {/* Toolbar */}
        <EditorToolbar
          editor={editor}
          onSave={handleSave}
          onPreview={handlePreview}
          saving={saving}
          onBack={handleBack}
        />

        {/* Main area */}
        <div className="flex-1 flex overflow-hidden" ref={canvasRef}>
          {/* Left: Component Palette */}
          <ComponentPalette />

          {/* Center: Canvas */}
          <EditorCanvas editor={editor} />

          {/* Right: Properties Panel */}
          <PropertiesPanel editor={editor} />
        </div>

        {/* Status bar */}
        <div className="h-7 border-t dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center px-3 text-xs text-gray-500 dark:text-gray-400 gap-4 shrink-0">
          <span>
            {editor.state.layout.width} x {editor.state.layout.height} {editor.state.layout.unit}
          </span>
          <span>{editor.state.layout.dpi} DPI</span>
          <span>
            {editor.state.layout.orientation === 'landscape' ? 'Yatay' : 'Dikey'}
          </span>
          <span>{editor.state.components.length} bilesen</span>
          <div className="flex-1" />
          {editor.isDirty && (
            <span className="text-amber-500 font-medium">Kaydedilmemis degisiklikler</span>
          )}
          <span>Yakinlastirma: {Math.round(editor.zoom * 100)}%</span>
        </div>
      </div>

      {/* Drag overlay for palette items */}
      <DragOverlay>
        {activeDragType && (
          <div className="px-3 py-2 bg-blue-600 text-white rounded-lg shadow-xl text-sm font-medium opacity-90">
            {activeDragType === 'text'
              ? 'Metin'
              : activeDragType === 'barcode'
              ? 'Barkod'
              : activeDragType === 'qrcode'
              ? 'QR Kod'
              : activeDragType === 'shape'
              ? 'Sekil'
              : activeDragType === 'image'
              ? 'Gorsel'
              : activeDragType}
          </div>
        )}
      </DragOverlay>

      {/* Preview Modal */}
      {previewSvg !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setPreviewSvg(null)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Etiket Onizleme
              </h3>
              <button
                onClick={() => setPreviewSvg(null)}
                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 flex items-center justify-center bg-gray-50 dark:bg-gray-900 min-h-[300px]">
              <div
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(previewSvg, { USE_PROFILES: { svg: true } }) }}
                className="max-w-full overflow-auto"
              />
            </div>
          </div>
        </div>
      )}
    </DndContext>
  );
};

export default LabelEditorPage;
