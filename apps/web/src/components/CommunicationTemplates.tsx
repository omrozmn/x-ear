import React, { useState, useEffect } from 'react';
import {
  listTemplates,
  updateTemplate,
  createTemplate,
  deleteTemplate
} from '@/api/generated';
// CommunicationTemplate type defined locally since schema may not export it
import { Button, Input, Select, Textarea, Checkbox } from '@x-ear/ui-web';

interface CommunicationTemplate {
  id?: string;
  name?: string;
  description?: string;
  templateType?: 'sms' | 'email' | string;
  category?: string;
  subject?: string;
  bodyText?: string;
  bodyHtml?: string;
  variables?: string[];
  isActive?: boolean;
  isSystem?: boolean;
  usageCount?: number;
}
import {
  Plus,
  Search,
  Edit3,
  Trash2,
  Copy,
  Eye,
  Mail,
  MessageSquare,
  Tag,
  Save,
  X,
  AlertCircle
} from 'lucide-react';

interface TemplateFormData {
  name: string;
  description: string;
  templateType: 'sms' | 'email';
  category: string;
  subject: string;
  bodyText: string;
  bodyHtml: string;
  variables: string[];
  isActive: boolean;
}

const CommunicationTemplates: React.FC = () => {
  // State
  const [templates, setTemplates] = useState<CommunicationTemplate[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<CommunicationTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'sms' | 'email'>('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<CommunicationTemplate | null>(null);

  // Form state
  const [formData, setFormData] = useState<TemplateFormData>({
    name: '',
    description: '',
    templateType: 'sms',
    category: '',
    subject: '',
    bodyText: '',
    bodyHtml: '',
    variables: [],
    isActive: true
  });

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Categories
  const categories = [
    'appointment_reminder',
    'appointment_confirmation',
    'payment_reminder',
    'welcome_message',
    'follow_up',
    'marketing',
    'system_notification',
    'custom'
  ];

  // Load templates
  useEffect(() => {
    loadTemplates();
  }, []);

  // Filter templates
  useEffect(() => {
    let filtered = templates;

    if (searchTerm) {
      filtered = filtered.filter(template =>
        template.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.bodyText?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterType !== 'all') {
      filtered = filtered.filter(template => template.templateType === filterType);
    }

    if (filterCategory !== 'all') {
      filtered = filtered.filter(template => template.category === filterCategory);
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(template =>
        filterStatus === 'active' ? template.isActive : !template.isActive
      );
    }

    setFilteredTemplates(filtered);
  }, [templates, searchTerm, filterType, filterCategory, filterStatus]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const response = await listTemplates() as any;

      if (response?.success && response?.data) {
        // Filter out templates with undefined id
        const validTemplates = (response.data || []).filter((template: any) => template.id !== undefined) as CommunicationTemplate[];
        setTemplates(validTemplates);
      } else {
        setTemplates([]);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = () => {
    setFormData({
      name: '',
      description: '',
      templateType: 'sms',
      category: '',
      subject: '',
      bodyText: '',
      bodyHtml: '',
      variables: [],
      isActive: true
    });
    setFormErrors({});
    setShowCreateModal(true);
  };

  const handleEditTemplate = (template: CommunicationTemplate) => {
    setSelectedTemplate(template);
    setFormData({
      name: template.name || '',
      description: template.description || '',
      templateType: (template.templateType || 'sms') as 'email' | 'sms',
      category: template.category || '',
      subject: template.subject || '',
      bodyText: template.bodyText || '',
      bodyHtml: template.bodyHtml || '',
      variables: template.variables || [],
      isActive: template.isActive ?? true
    });
    setFormErrors({});
    setShowEditModal(true);
  };

  const handlePreviewTemplate = (template: CommunicationTemplate) => {
    setSelectedTemplate(template);
    setShowPreviewModal(true);
  };

  const handleDuplicateTemplate = async (template: CommunicationTemplate) => {
    setFormData({
      name: `${template.name || 'Şablon'} - Kopya`,
      description: template.description || '',
      templateType: (template.templateType || 'sms') as 'email' | 'sms',
      category: template.category || '',
      subject: template.subject || '',
      bodyText: template.bodyText || '',
      bodyHtml: template.bodyHtml || '',
      variables: template.variables || [],
      isActive: true
    });
    setFormErrors({});
    setShowCreateModal(true);
  };

  const handleSaveTemplate = async () => {
    setSaving(true);
    setFormErrors({});

    try {

      if (selectedTemplate?.id) {
        // Update existing template
        const response = await updateTemplate(
          selectedTemplate.id,
          formData
        ) as any;

        if (response?.success) {
          await loadTemplates();
          setShowEditModal(false);
          setSelectedTemplate(null);
        } else {
          setFormErrors({ general: 'Güncelleme başarısız' });
        }
      } else {
        // Create new template
        const response = await createTemplate(formData) as any;

        if (response?.success) {
          await loadTemplates();
          setShowCreateModal(false);
        } else {
          setFormErrors({ general: 'Oluşturma başarısız' });
        }
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      console.error('Template save error:', error);
      setFormErrors({
        general: err.response?.data?.error || 'Bir hata oluştu'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTemplate = async (template: CommunicationTemplate) => {
    if (!confirm(`Are you sure you want to delete "${template.name}"?`)) return;

    try {
      const response = await deleteTemplate(template.id!) as any;

      if (response?.success) {
        await loadTemplates();
      }
    } catch (error: unknown) {
      console.error('Error deleting template:', error);
    }
  };

  const extractVariables = (text: string): string[] => {
    const matches = text.match(/\{\{([^}]+)\}\}/g);
    return matches ? matches.map(match => match.slice(2, -2).trim()) : [];
  };

  const handleBodyTextChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      bodyText: value,
      variables: extractVariables(value)
    }));
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      appointment_reminder: 'Randevu Hatırlatması',
      appointment_confirmation: 'Randevu Onayı',
      payment_reminder: 'Ödeme Hatırlatması',
      welcome_message: 'Hoş Geldin Mesajı',
      follow_up: 'Takip Mesajı',
      marketing: 'Pazarlama',
      system_notification: 'Sistem Bildirimi',
      custom: 'Özel'
    };
    return labels[category] || category;
  };

  const getTypeIcon = (type: string) => {
    return type === 'email' ? <Mail className="w-4 h-4" /> : <MessageSquare className="w-4 h-4" />;
  };

  const getTypeColor = (type: string) => {
    return type === 'email' ? 'text-blue-600' : 'text-green-600';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">İletişim Şablonları</h2>
          <p className="text-gray-600">SMS ve e-posta şablonlarını yönetin</p>
        </div>
        <Button
          onClick={handleCreateTemplate}
        >
          <Plus className="w-4 h-4 mr-2" />
          Yeni Şablon
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              type="text"
              placeholder="Şablon ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Type Filter */}
          <Select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as "sms" | "email" | "all")}
            options={[
              { value: 'all', label: 'Tüm Tipler' },
              { value: 'sms', label: 'SMS' },
              { value: 'email', label: 'E-posta' }
            ]}
          />

          {/* Category Filter */}
          <Select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            options={[
              { value: 'all', label: 'Tüm Kategoriler' },
              ...categories.map(category => ({
                value: category,
                label: getCategoryLabel(category)
              }))
            ]}
          />

          {/* Status Filter */}
          <Select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as "active" | "inactive" | "all")}
            options={[
              { value: 'all', label: 'Tüm Durumlar' },
              { value: 'active', label: 'Aktif' },
              { value: 'inactive', label: 'Pasif' }
            ]}
          />
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map((template) => (
          <div key={template.id} className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
            <div className="p-4">
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className={getTypeColor(template.templateType || 'sms')}>
                    {getTypeIcon(template.templateType || 'sms')}
                  </span>
                  <h3 className="font-semibold text-gray-900 truncate">{template.name || ''}</h3>
                </div>
                <div className="flex items-center gap-1">
                  {template.isSystem && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                      Sistem
                    </span>
                  )}
                  <span className={`px-2 py-1 text-xs rounded ${template.isActive
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                    }`}>
                    {template.isActive ? 'Aktif' : 'Pasif'}
                  </span>
                </div>
              </div>

              {/* Description */}
              {template.description && (
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {template.description}
                </p>
              )}

              {/* Category */}
              {template.category && (
                <div className="flex items-center gap-1 mb-3">
                  <Tag className="w-3 h-3 text-gray-400" />
                  <span className="text-xs text-gray-500">
                    {getCategoryLabel(template.category)}
                  </span>
                </div>
              )}

              {/* Content Preview */}
              <div className="bg-gray-50 p-3 rounded mb-3">
                <p className="text-sm text-gray-700 line-clamp-3">
                  {template.bodyText}
                </p>
              </div>

              {/* Variables */}
              {template.variables && template.variables.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs text-gray-500 mb-1">Değişkenler:</p>
                  <div className="flex flex-wrap gap-1">
                    {template.variables?.slice(0, 3).map((variable, index) => (
                      <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                        {variable}
                      </span>
                    ))}
                    {template.variables && template.variables.length > 3 && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                        +{template.variables.length - 3}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Stats */}
              <div className="text-xs text-gray-500 mb-4">
                Kullanım: {template.usageCount || 0} kez
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => handlePreviewTemplate(template)}
                    variant="ghost"
                    size="sm"
                    title="Önizle"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={() => handleDuplicateTemplate(template)}
                    variant="ghost"
                    size="sm"
                    title="Kopyala"
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => handleEditTemplate(template)}
                    variant="ghost"
                    size="sm"
                    title="Düzenle"
                    disabled={template.isSystem || false}
                  >
                    <Edit3 className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={() => handleDeleteTemplate(template)}
                    variant="ghost"
                    size="sm"
                    title="Sil"
                    disabled={template.isSystem || false}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Şablon bulunamadı</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm || filterType !== 'all' || filterCategory !== 'all' || filterStatus !== 'all'
              ? 'Arama kriterlerinize uygun şablon bulunamadı.'
              : 'Henüz hiç şablon oluşturulmamış.'}
          </p>
          <Button
            onClick={handleCreateTemplate}
          >
            İlk Şablonu Oluştur
          </Button>
        </div>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">
                  {showCreateModal ? 'Yeni Şablon Oluştur' : 'Şablonu Düzenle'}
                </h3>
                <Button
                  onClick={() => {
                    setShowCreateModal(false);
                    setShowEditModal(false);
                    setSelectedTemplate(null);
                  }}
                  variant="ghost"
                  size="sm"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {formErrors.general && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <span className="text-red-700 text-sm">{formErrors.general}</span>
                </div>
              )}

              <div className="space-y-4">
                {/* Template Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Şablon Adı *
                  </label>
                  <Input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className={formErrors.name ? 'border-red-300' : ''}
                    placeholder="Şablon adını girin"
                  />
                  {formErrors.name && (
                    <p className="text-red-600 text-sm mt-1">{formErrors.name}</p>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Açıklama
                  </label>
                  <Input
                    type="text"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Şablon açıklaması"
                  />
                </div>

                {/* Type and Category */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tip *
                    </label>
                    <Select
                      value={formData.templateType}
                      onChange={(e) => setFormData(prev => ({ ...prev, templateType: e.target.value as "sms" | "email" }))}
                      options={[
                        { value: 'sms', label: 'SMS' },
                        { value: 'email', label: 'E-posta' }
                      ]}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Kategori
                    </label>
                    <Select
                      value={formData.category}
                      onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                      options={[
                        { value: '', label: 'Kategori seçin' },
                        ...categories.map(category => ({
                          value: category,
                          label: getCategoryLabel(category)
                        }))
                      ]}
                    />
                  </div>
                </div>

                {/* Email Subject */}
                {formData.templateType === 'email' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      E-posta Konusu *
                    </label>
                    <Input
                      type="text"
                      value={formData.subject}
                      onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
                      className={formErrors.subject ? 'border-red-300' : ''}
                      placeholder="E-posta konusu"
                    />
                    {formErrors.subject && (
                      <p className="text-red-600 text-sm mt-1">{formErrors.subject}</p>
                    )}
                  </div>
                )}

                {/* Body Text */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    İçerik *
                  </label>
                  <Textarea
                    value={formData.bodyText}
                    onChange={(e) => handleBodyTextChange(e.target.value)}
                    rows={6}
                    className={formErrors.bodyText ? 'border-red-300' : ''}
                    placeholder="Şablon içeriği... Değişkenler için {{değişken_adı}} formatını kullanın"
                  />
                  {formErrors.bodyText && (
                    <p className="text-red-600 text-sm mt-1">{formErrors.bodyText}</p>
                  )}
                  <p className="text-gray-500 text-sm mt-1">
                    Değişkenler için {`{{değişken_adı}}`} formatını kullanın
                  </p>
                </div>

                {/* Variables Preview */}
                {formData.variables.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tespit Edilen Değişkenler
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {formData.variables.map((variable, index) => (
                        <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded">
                          {variable}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Active Status */}
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                  />
                  <label htmlFor="isActive" className="text-sm text-gray-700">
                    Şablon aktif
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                <Button
                  onClick={() => {
                    setShowCreateModal(false);
                    setShowEditModal(false);
                    setSelectedTemplate(null);
                  }}
                  variant="outline"
                  disabled={saving}
                >
                  İptal
                </Button>
                <Button
                  onClick={handleSaveTemplate}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Kaydediliyor...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Kaydet
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreviewModal && selectedTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold">Şablon Önizleme</h3>
                <Button
                  onClick={() => {
                    setShowPreviewModal(false);
                    setSelectedTemplate(null);
                  }}
                  variant="ghost"
                  size="sm"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="space-y-4">
                {/* Template Info */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={getTypeColor(selectedTemplate.templateType || 'sms')}>
                      {getTypeIcon(selectedTemplate.templateType || 'sms')}
                    </span>
                    <h4 className="font-semibold">{selectedTemplate.name || ''}</h4>
                  </div>
                  {selectedTemplate.description && (
                    <p className="text-gray-600 text-sm mb-2">{selectedTemplate.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>Tip: {(selectedTemplate.templateType || 'sms').toUpperCase()}</span>
                    {selectedTemplate.category && (
                      <span>Kategori: {getCategoryLabel(selectedTemplate.category)}</span>
                    )}
                    <span>Kullanım: {selectedTemplate.usageCount || 0} kez</span>
                  </div>
                </div>

                {/* Subject (for email) */}
                {selectedTemplate.templateType === 'email' && selectedTemplate.subject && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Konu
                    </label>
                    <div className="p-3 bg-gray-50 rounded border">
                      {selectedTemplate.subject}
                    </div>
                  </div>
                )}

                {/* Content */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    İçerik
                  </label>
                  <div className="p-4 bg-gray-50 rounded border whitespace-pre-wrap">
                    {selectedTemplate.bodyText}
                  </div>
                </div>

                {/* Variables */}
                {selectedTemplate.variables && selectedTemplate.variables.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Değişkenler
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {selectedTemplate.variables?.map((variable, index) => (
                        <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded">
                          {variable}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                <Button
                  onClick={() => {
                    setShowPreviewModal(false);
                    handleEditTemplate(selectedTemplate);
                  }}
                  disabled={selectedTemplate.isSystem || false}
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  Düzenle
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommunicationTemplates;