import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Edit3,
  Trash2,
  Eye,
  Upload,
  RefreshCw,
  X,
  ChevronDown,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAdminResponsive } from '@/hooks/useAdminResponsive';
import {
  labelService,
  type Template,
  type TemplateStatus,
  type LayoutConfig,
  type ComponentConfig,
  type UnitType,
  type Orientation,
  type ComponentType,
} from '@/services/label.service';

const STATUS_BADGES: Record<TemplateStatus, string> = {
  draft: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  published: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  archived: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
};

const STATUS_LABELS: Record<TemplateStatus, string> = {
  draft: 'Taslak',
  published: 'Yayinda',
  archived: 'Arsivlenmis',
};

const UNIT_OPTIONS: UnitType[] = ['mm', 'px', 'inch'];
const ORIENTATION_OPTIONS: Orientation[] = ['portrait', 'landscape'];
const COMPONENT_TYPE_OPTIONS: { value: ComponentType; label: string }[] = [
  { value: 'text', label: 'Metin' },
  { value: 'barcode', label: 'Barkod' },
  { value: 'qrcode', label: 'QR Kod' },
  { value: 'image', label: 'Gorsel' },
  { value: 'shape', label: 'Sekil' },
];

const DEFAULT_LAYOUT: LayoutConfig = {
  width: 100,
  height: 50,
  unit: 'mm',
  dpi: 300,
  orientation: 'landscape',
  margins: { top: 2, right: 2, bottom: 2, left: 2 },
};

const LabelTemplatesPage: React.FC = () => {
  const { isMobile } = useAdminResponsive();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [previewSvg, setPreviewSvg] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const data = await labelService.listTemplates();
      setTemplates(data);
    } catch {
      toast.error('Sablonlar yuklenemedi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handlePublish = async (id: string) => {
    try {
      await labelService.publishTemplate(id);
      toast.success('Sablon yayinlandi');
      fetchTemplates();
    } catch {
      toast.error('Yayinlama basarisiz');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bu sablonu silmek istediginizden emin misiniz?')) return;
    try {
      await labelService.deleteTemplate(id);
      toast.success('Sablon silindi');
      fetchTemplates();
    } catch {
      toast.error('Silme basarisiz');
    }
  };

  const handlePreview = async (template: Template) => {
    setPreviewLoading(true);
    try {
      const result = await labelService.renderPreview({
        templateId: template.id,
        data: {},
        format: 'svg',
      });
      setPreviewSvg(result.svg);
    } catch {
      toast.error('Onizleme olusturulamadi');
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleEdit = (template: Template) => {
    setEditingId(template.id);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingId(null);
  };

  const handleFormSaved = () => {
    handleFormClose();
    fetchTemplates();
  };

  return (
    <div className={isMobile ? 'p-4 pb-safe' : 'p-6'}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className={`font-bold text-gray-900 dark:text-white ${isMobile ? 'text-xl' : 'text-2xl'}`}>
            Etiket Sablonlari
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Etiket sablonlarini olusturun ve yonetin
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchTemplates}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => { setEditingId(null); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Yeni Sablon
          </button>
        </div>
      </div>

      {/* Template List */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-gray-500 dark:text-gray-400">
          <RefreshCw className="w-5 h-5 animate-spin mr-2" />
          Yukleniyor...
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400 mb-3">Henuz sablon yok</p>
          <button
            onClick={() => { setEditingId(null); setShowForm(true); }}
            className="text-blue-600 dark:text-blue-400 hover:underline text-sm font-medium"
          >
            Ilk sablonunuzu olusturun
          </button>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Ad</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Versiyon</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Durum</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Boyut</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Olusturulma</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Islemler</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-700">
                {templates.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{t.name}</div>
                      <div className="text-xs text-gray-400 font-mono">{t.id}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">v{t.version}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGES[t.status]}`}>
                        {STATUS_LABELS[t.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {t.layout.width}x{t.layout.height} {t.layout.unit}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {new Date(t.createdAt).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handlePreview(t)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          title="Onizleme"
                        >
                          <Eye className="w-4 h-4 text-gray-500" />
                        </button>
                        <button
                          onClick={() => handleEdit(t)}
                          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          title="Duzenle"
                        >
                          <Edit3 className="w-4 h-4 text-gray-500" />
                        </button>
                        {t.status === 'draft' && (
                          <button
                            onClick={() => handlePublish(t.id)}
                            className="p-1.5 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                            title="Yayinla"
                          >
                            <Upload className="w-4 h-4 text-green-600" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(t.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          title="Sil"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewSvg !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setPreviewSvg(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Etiket Onizleme</h3>
              <button onClick={() => setPreviewSvg(null)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 flex items-center justify-center bg-gray-50 dark:bg-gray-900 min-h-[300px]">
              {previewLoading ? (
                <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
              ) : (
                <div dangerouslySetInnerHTML={{ __html: previewSvg }} className="max-w-full overflow-auto" />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Form Modal */}
      {showForm && (
        <TemplateFormModal
          editingId={editingId}
          onClose={handleFormClose}
          onSaved={handleFormSaved}
        />
      )}
    </div>
  );
};

/* ─── Template Form Modal ─── */
const TemplateFormModal: React.FC<{
  editingId: string | null;
  onClose: () => void;
  onSaved: () => void;
}> = ({ editingId, onClose, onSaved }) => {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [name, setName] = useState('');
  const [layout, setLayout] = useState<LayoutConfig>({ ...DEFAULT_LAYOUT });
  const [components, setComponents] = useState<ComponentConfig[]>([]);
  const [showAddComponent, setShowAddComponent] = useState(false);

  useEffect(() => {
    if (editingId) {
      setFetching(true);
      labelService
        .getTemplate(editingId)
        .then((t) => {
          setName(t.name);
          setLayout(t.layout);
          setComponents(t.components);
        })
        .catch(() => toast.error('Sablon yuklenemedi'))
        .finally(() => setFetching(false));
    }
  }, [editingId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Sablon adi gerekli');
      return;
    }
    setLoading(true);
    try {
      if (editingId) {
        await labelService.updateTemplate(editingId, { name, layout, components });
        toast.success('Sablon guncellendi');
      } else {
        await labelService.createTemplate({ name, layout, components });
        toast.success('Sablon olusturuldu');
      }
      onSaved();
    } catch {
      toast.error(editingId ? 'Guncelleme basarisiz' : 'Olusturma basarisiz');
    } finally {
      setLoading(false);
    }
  };

  const addComponent = (type: ComponentType) => {
    const newComp: ComponentConfig = {
      id: `comp-${Date.now()}`,
      type,
      x: 0,
      y: 0,
      width: 30,
      height: 10,
      rotation: 0,
      zIndex: components.length,
      properties: type === 'text'
        ? { text: 'Ornek Metin', fontSize: 12 }
        : type === 'barcode'
        ? { data: '123456', symbology: 'code128' }
        : type === 'qrcode'
        ? { data: 'https://example.com' }
        : {},
    };
    setComponents((prev) => [...prev, newComp]);
    setShowAddComponent(false);
  };

  const removeComponent = (id: string) => {
    setComponents((prev) => prev.filter((c) => c.id !== id));
  };

  if (fetching) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-8">
          <RefreshCw className="w-6 h-6 animate-spin text-gray-400 mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {editingId ? 'Sablonu Duzenle' : 'Yeni Sablon Olustur'}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sablon Adi</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ornegin: Isitme Cihazi Etiketi"
              className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white p-2 text-sm"
              required
            />
          </div>

          {/* Layout */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Sayfa Duzeni</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Genislik</label>
                <input
                  type="number"
                  value={layout.width}
                  onChange={(e) => setLayout({ ...layout, width: Number(e.target.value) })}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white p-1.5 text-sm"
                  min={1}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Yukseklik</label>
                <input
                  type="number"
                  value={layout.height}
                  onChange={(e) => setLayout({ ...layout, height: Number(e.target.value) })}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white p-1.5 text-sm"
                  min={1}
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Birim</label>
                <select
                  value={layout.unit}
                  onChange={(e) => setLayout({ ...layout, unit: e.target.value as UnitType })}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white p-1.5 text-sm"
                >
                  {UNIT_OPTIONS.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">DPI</label>
                <input
                  type="number"
                  value={layout.dpi}
                  onChange={(e) => setLayout({ ...layout, dpi: Number(e.target.value) })}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white p-1.5 text-sm"
                  min={72}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Yon</label>
                <select
                  value={layout.orientation}
                  onChange={(e) => setLayout({ ...layout, orientation: e.target.value as Orientation })}
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white p-1.5 text-sm"
                >
                  {ORIENTATION_OPTIONS.map((o) => (
                    <option key={o} value={o}>{o === 'portrait' ? 'Dikey' : 'Yatay'}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">Kenar Bosluklari (ust/sag/alt/sol)</label>
                <div className="grid grid-cols-4 gap-1">
                  {(['top', 'right', 'bottom', 'left'] as const).map((side) => (
                    <input
                      key={side}
                      type="number"
                      value={layout.margins[side]}
                      onChange={(e) =>
                        setLayout({
                          ...layout,
                          margins: { ...layout.margins, [side]: Number(e.target.value) },
                        })
                      }
                      className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white p-1 text-xs text-center"
                      min={0}
                      placeholder={side}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Components */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Bilesenler ({components.length})
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowAddComponent(!showAddComponent)}
                  className="flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <Plus className="w-4 h-4" />
                  Bilesen Ekle
                  <ChevronDown className="w-3 h-3" />
                </button>
                {showAddComponent && (
                  <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-700 border dark:border-gray-600 rounded-lg shadow-lg py-1 z-20 min-w-[160px]">
                    {COMPONENT_TYPE_OPTIONS.map((ct) => (
                      <button
                        key={ct.value}
                        type="button"
                        onClick={() => addComponent(ct.value)}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600"
                      >
                        {ct.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {components.length === 0 ? (
              <div className="text-center py-6 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-sm text-gray-400 dark:text-gray-500">
                Bilesen eklenmedi
              </div>
            ) : (
              <div className="space-y-2">
                {components.map((comp, idx) => (
                  <div key={comp.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 border dark:border-gray-600">
                    <span className="text-xs font-mono text-gray-400 w-6">{idx + 1}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-medium">
                      {comp.type}
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-300 flex-1 truncate">
                      {comp.type === 'text'
                        ? (comp.properties as { text?: string }).text || 'Metin'
                        : comp.type === 'barcode' || comp.type === 'qrcode'
                        ? (comp.properties as { data?: string }).data || 'Veri'
                        : comp.type}
                    </span>
                    <span className="text-xs text-gray-400">
                      {comp.x},{comp.y} - {comp.width}x{comp.height}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeComponent(comp.id)}
                      className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Iptal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium"
            >
              {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
              {editingId ? 'Guncelle' : 'Olustur'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LabelTemplatesPage;
