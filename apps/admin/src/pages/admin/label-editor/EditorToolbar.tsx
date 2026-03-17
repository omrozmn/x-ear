import React, { useState } from 'react';
import {
  Save,
  Eye,
  Printer,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Grid3X3,
  Trash2,
  Settings2,
  Maximize,
  ArrowLeft,
} from 'lucide-react';
import type { LayoutConfig, UnitType, Orientation } from '@/services/label.service';
import type { EditorActions } from './useEditorState';

interface EditorToolbarProps {
  editor: EditorActions;
  onSave: () => void;
  onPreview: () => void;
  saving: boolean;
  onBack: () => void;
}

const ZOOM_PRESETS = [0.5, 0.75, 1, 1.5, 2];

const EditorToolbar: React.FC<EditorToolbarProps> = ({
  editor,
  onSave,
  onPreview,
  saving,
  onBack,
}) => {
  const [showSettings, setShowSettings] = useState(false);

  const handleZoomIn = () => {
    const next = Math.min(editor.zoom + 0.25, 3);
    editor.setZoom(next);
  };

  const handleZoomOut = () => {
    const next = Math.max(editor.zoom - 0.25, 0.25);
    editor.setZoom(next);
  };

  const handleFitZoom = () => {
    editor.setZoom(1);
  };

  return (
    <div className="h-12 border-b dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center px-3 gap-1 shrink-0">
      {/* Back */}
      <button
        onClick={onBack}
        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors mr-2"
        title="Geri Don"
      >
        <ArrowLeft className="w-4 h-4 text-gray-600 dark:text-gray-300" />
      </button>

      {/* Template name */}
      <input
        type="text"
        value={editor.state.name}
        onChange={(e) => editor.setName(e.target.value)}
        placeholder="Sablon Adi"
        className="text-sm font-medium bg-transparent border-none outline-none text-gray-900 dark:text-white w-48 mr-4 px-2 py-1 rounded hover:bg-gray-50 dark:hover:bg-gray-700 focus:bg-gray-50 dark:focus:bg-gray-700"
      />

      <div className="w-px h-6 bg-gray-200 dark:bg-gray-600 mx-1" />

      {/* Save */}
      <button
        onClick={onSave}
        disabled={saving}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
        title="Kaydet (Ctrl+S)"
      >
        <Save className="w-3.5 h-3.5" />
        {saving ? 'Kaydediliyor...' : 'Kaydet'}
      </button>

      {/* Preview */}
      <button
        onClick={onPreview}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        title="Onizleme"
      >
        <Eye className="w-3.5 h-3.5" />
        Onizleme
      </button>

      <div className="w-px h-6 bg-gray-200 dark:bg-gray-600 mx-1" />

      {/* Undo / Redo */}
      <button
        onClick={editor.undo}
        disabled={!editor.canUndo}
        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 transition-colors"
        title="Geri Al (Ctrl+Z)"
      >
        <Undo2 className="w-4 h-4 text-gray-600 dark:text-gray-300" />
      </button>
      <button
        onClick={editor.redo}
        disabled={!editor.canRedo}
        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 transition-colors"
        title="Yinele (Ctrl+Y)"
      >
        <Redo2 className="w-4 h-4 text-gray-600 dark:text-gray-300" />
      </button>

      <div className="w-px h-6 bg-gray-200 dark:bg-gray-600 mx-1" />

      {/* Zoom */}
      <button
        onClick={handleZoomOut}
        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        title="Uzaklastir"
      >
        <ZoomOut className="w-4 h-4 text-gray-600 dark:text-gray-300" />
      </button>
      <select
        value={editor.zoom}
        onChange={(e) => editor.setZoom(Number(e.target.value))}
        className="text-xs bg-transparent border border-gray-300 dark:border-gray-600 rounded px-1 py-1 text-gray-700 dark:text-gray-300 min-w-[60px]"
      >
        {ZOOM_PRESETS.map((z) => (
          <option key={z} value={z}>
            {Math.round(z * 100)}%
          </option>
        ))}
      </select>
      <button
        onClick={handleZoomIn}
        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        title="Yakinlastir"
      >
        <ZoomIn className="w-4 h-4 text-gray-600 dark:text-gray-300" />
      </button>
      <button
        onClick={handleFitZoom}
        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        title="Sığdır"
      >
        <Maximize className="w-4 h-4 text-gray-600 dark:text-gray-300" />
      </button>

      <div className="w-px h-6 bg-gray-200 dark:bg-gray-600 mx-1" />

      {/* Grid toggle */}
      <button
        onClick={() => editor.setShowGrid(!editor.showGrid)}
        className={`p-2 rounded-lg transition-colors ${
          editor.showGrid
            ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600'
            : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300'
        }`}
        title="Izgara"
      >
        <Grid3X3 className="w-4 h-4" />
      </button>

      {/* Delete selected */}
      <button
        onClick={() => editor.selectedId && editor.removeComponent(editor.selectedId)}
        disabled={!editor.selectedId}
        className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-30 transition-colors"
        title="Secili Bileseni Sil (Del)"
      >
        <Trash2 className="w-4 h-4 text-red-500" />
      </button>

      <div className="w-px h-6 bg-gray-200 dark:bg-gray-600 mx-1" />

      {/* Settings popover */}
      <div className="relative">
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`p-2 rounded-lg transition-colors ${
            showSettings
              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600'
              : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300'
          }`}
          title="Etiket Ayarlari"
        >
          <Settings2 className="w-4 h-4" />
        </button>
        {showSettings && (
          <SettingsPopover
            layout={editor.state.layout}
            onChange={(l) => editor.setLayout(l)}
            onClose={() => setShowSettings(false)}
          />
        )}
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Print */}
      <button
        onClick={onPreview}
        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        title="Yazdir"
      >
        <Printer className="w-4 h-4 text-gray-600 dark:text-gray-300" />
      </button>
    </div>
  );
};

const SettingsPopover: React.FC<{
  layout: LayoutConfig;
  onChange: (l: LayoutConfig) => void;
  onClose: () => void;
}> = ({ layout, onChange, onClose }) => {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute top-full right-0 mt-1 z-50 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl shadow-xl p-4 w-72">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
          Etiket Ayarlari
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400">Genislik</label>
            <input
              type="number"
              value={layout.width}
              onChange={(e) => onChange({ ...layout, width: Number(e.target.value) })}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white p-1.5 text-sm"
              min={1}
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400">Yukseklik</label>
            <input
              type="number"
              value={layout.height}
              onChange={(e) => onChange({ ...layout, height: Number(e.target.value) })}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white p-1.5 text-sm"
              min={1}
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400">Birim</label>
            <select
              value={layout.unit}
              onChange={(e) => onChange({ ...layout, unit: e.target.value as UnitType })}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white p-1.5 text-sm"
            >
              <option value="mm">mm</option>
              <option value="px">px</option>
              <option value="inch">inch</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400">DPI</label>
            <input
              type="number"
              value={layout.dpi}
              onChange={(e) => onChange({ ...layout, dpi: Number(e.target.value) })}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white p-1.5 text-sm"
              min={72}
            />
          </div>
          <div className="col-span-2">
            <label className="text-xs text-gray-500 dark:text-gray-400">Yon</label>
            <select
              value={layout.orientation}
              onChange={(e) => onChange({ ...layout, orientation: e.target.value as Orientation })}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white p-1.5 text-sm"
            >
              <option value="landscape">Yatay</option>
              <option value="portrait">Dikey</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Kenar Bosluklari</label>
            <div className="grid grid-cols-4 gap-1">
              {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
                <div key={side}>
                  <input
                    type="number"
                    value={layout.margins[side]}
                    onChange={(e) =>
                      onChange({
                        ...layout,
                        margins: { ...layout.margins, [side]: Number(e.target.value) },
                      })
                    }
                    className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white p-1 text-xs text-center"
                    min={0}
                    placeholder={side[0].toUpperCase()}
                    title={side}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default EditorToolbar;
