import React, { useState } from 'react';
import { Bookmark, Plus, Edit2, Trash2, Eye } from 'lucide-react';

interface SavedView {
  id: string;
  name: string;
  filters: Record<string, any>;
  isDefault?: boolean;
  createdAt: Date;
}

interface PartySavedViewsProps {
  savedViews: SavedView[];
  currentView?: string;
  onSelectView: (viewId: string) => void;
  onSaveView: (name: string, filters: Record<string, any>) => void;
  onUpdateView: (viewId: string, name: string, filters: Record<string, any>) => void;
  onDeleteView: (viewId: string) => void;
  currentFilters: Record<string, any>;
  className?: string;
}

export const PartySavedViews: React.FC<PartySavedViewsProps> = ({
  savedViews,
  currentView,
  onSelectView,
  onSaveView,
  onUpdateView,
  onDeleteView,
  currentFilters,
  className = ""
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [editingView, setEditingView] = useState<string | null>(null);
  const [viewName, setViewName] = useState('');

  const handleSaveNew = () => {
    if (viewName.trim()) {
      onSaveView(viewName.trim(), currentFilters);
      setViewName('');
      setIsCreating(false);
    }
  };

  const handleUpdateView = (viewId: string) => {
    if (viewName.trim()) {
      onUpdateView(viewId, viewName.trim(), currentFilters);
      setViewName('');
      setEditingView(null);
    }
  };

  const startEditing = (view: SavedView) => {
    setEditingView(view.id);
    setViewName(view.name);
  };

  const cancelEditing = () => {
    setEditingView(null);
    setIsCreating(false);
    setViewName('');
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-900 flex items-center gap-2">
          <Bookmark className="h-4 w-4" />
          Kayıtlı Görünümler
        </h3>
        <button
          onClick={() => setIsCreating(true)}
          className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
        >
          <Plus className="h-4 w-4" />
          Yeni Görünüm
        </button>
      </div>

      <div className="space-y-2">
        {/* Create New View */}
        {isCreating && (
          <div className="p-3 border border-blue-200 rounded-lg bg-blue-50">
            <input
              type="text"
              value={viewName}
              onChange={(e) => setViewName(e.target.value)}
              placeholder="Görünüm adı..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 mb-2"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveNew}
                disabled={!viewName.trim()}
                className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Kaydet
              </button>
              <button
                onClick={cancelEditing}
                className="px-3 py-1 text-xs border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
              >
                İptal
              </button>
            </div>
          </div>
        )}

        {/* Saved Views List */}
        {savedViews.map((view) => (
          <div
            key={view.id}
            className={`p-3 rounded-lg border transition-colors ${
              currentView === view.id
                ? 'border-blue-200 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            {editingView === view.id ? (
              <div>
                <input
                  type="text"
                  value={viewName}
                  onChange={(e) => setViewName(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 mb-2"
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleUpdateView(view.id)}
                    disabled={!viewName.trim()}
                    className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Güncelle
                  </button>
                  <button
                    onClick={cancelEditing}
                    className="px-3 py-1 text-xs border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
                  >
                    İptal
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <button
                    onClick={() => onSelectView(view.id)}
                    className="text-left w-full"
                  >
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900">
                        {view.name}
                      </span>
                      {view.isDefault && (
                        <span className="px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded-full">
                          Varsayılan
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1 ml-6">
                      {new Date(view.createdAt).toLocaleDateString('tr-TR')}
                    </p>
                  </button>
                </div>
                
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => startEditing(view)}
                    className="p-1 text-gray-400 hover:text-gray-600 rounded"
                    title="Düzenle"
                  >
                    <Edit2 className="h-3 w-3" />
                  </button>
                  {!view.isDefault && (
                    <button
                      onClick={() => onDeleteView(view.id)}
                      className="p-1 text-gray-400 hover:text-red-600 rounded"
                      title="Sil"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {savedViews.length === 0 && !isCreating && (
          <div className="text-center py-6 text-gray-500">
            <Bookmark className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">Henüz kayıtlı görünüm yok</p>
            <p className="text-xs">Filtreleri ayarlayıp yeni görünüm oluşturun</p>
          </div>
        )}
      </div>
    </div>
  );
};