import React, { useState } from 'react'
import { Bookmark, Plus, Edit2, Trash2, Eye } from 'lucide-react'
import { usePatientFilters } from '@/hooks/patient/usePatientFilters'

interface SavedView {
  id: string
  name: string
  filters: any
  isDefault?: boolean
  createdAt: string
}

interface PatientSavedViewsProps {
  className?: string
}

export const PatientSavedViews: React.FC<PatientSavedViewsProps> = ({
  className = ""
}) => {
  const { filters, setFilters } = usePatientFilters()
  const [savedViews, setSavedViews] = useState<SavedView[]>([
    {
      id: '1',
      name: 'Aktif Hastalar',
      filters: { status: 'active' },
      isDefault: true,
      createdAt: '2024-01-15'
    },
    {
      id: '2',
      name: 'Bu Ay Kayıt Olanlar',
      filters: { 
        dateRange: { 
          from: new Date().toISOString().slice(0, 7) + '-01',
          to: new Date().toISOString().slice(0, 10)
        }
      },
      createdAt: '2024-01-10'
    },
    {
      id: '3',
      name: 'İstanbul Hastaları',
      filters: { city: 'İstanbul' },
      createdAt: '2024-01-05'
    }
  ])
  
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [newViewName, setNewViewName] = useState('')
  const [editingView, setEditingView] = useState<SavedView | null>(null)

  const applyView = (view: SavedView) => {
    setFilters(view.filters)
  }

  const saveCurrentView = () => {
    if (!newViewName.trim()) return

    const newView: SavedView = {
      id: Date.now().toString(),
      name: newViewName.trim(),
      filters: { ...filters },
      createdAt: new Date().toISOString().slice(0, 10)
    }

    setSavedViews(prev => [...prev, newView])
    setNewViewName('')
    setShowSaveDialog(false)
  }

  const updateView = (viewId: string, newName: string) => {
    setSavedViews(prev => prev.map(view => 
      view.id === viewId 
        ? { ...view, name: newName, filters: { ...filters } }
        : view
    ))
    setEditingView(null)
  }

  const deleteView = (viewId: string) => {
    if (window.confirm('Bu görünümü silmek istediğinizden emin misiniz?')) {
      setSavedViews(prev => prev.filter(view => view.id !== viewId))
    }
  }

  const hasActiveFilters = Object.keys(filters).some(key => 
    key !== 'search' && filters[key as keyof typeof filters]
  )

  return (
    <div className={`bg-white border border-gray-200 rounded-lg ${className}`}>
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bookmark className="h-5 w-5 text-gray-400" />
            <h3 className="text-sm font-medium text-gray-900">Kayıtlı Görünümler</h3>
          </div>
          
          {hasActiveFilters && (
            <button
              onClick={() => setShowSaveDialog(true)}
              className="inline-flex items-center px-2 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 rounded hover:bg-indigo-100"
            >
              <Plus className="h-3 w-3 mr-1" />
              Kaydet
            </button>
          )}
        </div>
      </div>

      <div className="p-2">
        {savedViews.length === 0 ? (
          <div className="text-center py-6">
            <Bookmark className="mx-auto h-8 w-8 text-gray-300 mb-2" />
            <p className="text-sm text-gray-500">Henüz kayıtlı görünüm yok</p>
            <p className="text-xs text-gray-400 mt-1">
              Filtre uygulayıp kaydet butonuna tıklayın
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {savedViews.map((view) => (
              <div
                key={view.id}
                className="group flex items-center justify-between p-2 rounded hover:bg-gray-50"
              >
                <div className="flex-1 min-w-0">
                  {editingView?.id === view.id ? (
                    <input
                      type="text"
                      value={editingView.name}
                      onChange={(e) => setEditingView({ ...editingView, name: e.target.value })}
                      onBlur={() => updateView(view.id, editingView.name)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          updateView(view.id, editingView.name)
                        } else if (e.key === 'Escape') {
                          setEditingView(null)
                        }
                      }}
                      className="w-full text-sm font-medium text-gray-900 bg-transparent border-none outline-none focus:ring-1 focus:ring-indigo-500 rounded px-1"
                      autoFocus
                    />
                  ) : (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => applyView(view)}
                        className="text-sm font-medium text-gray-900 hover:text-indigo-600 truncate"
                      >
                        {view.name}
                      </button>
                      {view.isDefault && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Varsayılan
                        </span>
                      )}
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-0.5">
                    {Object.keys(view.filters).length} filtre • {view.createdAt}
                  </p>
                </div>

                <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => applyView(view)}
                    className="p-1 text-gray-400 hover:text-indigo-600 rounded"
                    title="Görünümü uygula"
                  >
                    <Eye className="h-3 w-3" />
                  </button>
                  
                  <button
                    onClick={() => setEditingView(view)}
                    className="p-1 text-gray-400 hover:text-gray-600 rounded"
                    title="Düzenle"
                  >
                    <Edit2 className="h-3 w-3" />
                  </button>
                  
                  {!view.isDefault && (
                    <button
                      onClick={() => deleteView(view.id)}
                      className="p-1 text-gray-400 hover:text-red-600 rounded"
                      title="Sil"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Save Dialog */}
      {showSaveDialog && (
        <div className="border-t border-gray-200 p-3">
          <div className="space-y-2">
            <label className="block text-xs font-medium text-gray-700">
              Görünüm Adı
            </label>
            <input
              type="text"
              value={newViewName}
              onChange={(e) => setNewViewName(e.target.value)}
              placeholder="Örn: Aktif İstanbul Hastaları"
              className="block w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
              autoFocus
            />
            <div className="flex justify-end space-x-2 pt-1">
              <button
                onClick={() => {
                  setShowSaveDialog(false)
                  setNewViewName('')
                }}
                className="px-2 py-1 text-xs text-gray-600 hover:text-gray-800"
              >
                İptal
              </button>
              <button
                onClick={saveCurrentView}
                disabled={!newViewName.trim()}
                className="px-2 py-1 text-xs font-medium text-white bg-indigo-600 rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}