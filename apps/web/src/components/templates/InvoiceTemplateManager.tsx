import { Button, Input, Select, Textarea } from '@x-ear/ui-web';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { InvoiceTemplate, CreateInvoiceTemplateData, UpdateInvoiceTemplateData } from '../../types/invoice';
import { InvoiceTemplateService } from '../../services/InvoiceTemplateService';
import { DynamicInvoiceForm } from '../forms/DynamicInvoiceForm';

interface InvoiceTemplateManagerProps {
  onTemplateSelect?: (template: InvoiceTemplate) => void;
  onTemplateCreate?: (template: InvoiceTemplate) => void;
  onTemplateUpdate?: (template: InvoiceTemplate) => void;
  onTemplateDelete?: (templateId: string) => void;
  className?: string;
}

interface TemplateManagerState {
  templates: InvoiceTemplate[];
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  selectedCategory: string;
  sortBy: 'name' | 'createdAt' | 'usageCount';
  sortOrder: 'asc' | 'desc';
}

interface TemplateFormState {
  isOpen: boolean;
  mode: 'create' | 'edit' | 'view';
  template: InvoiceTemplate | null;
  isSubmitting: boolean;
}

export const InvoiceTemplateManager: React.FC<InvoiceTemplateManagerProps> = ({
  onTemplateSelect,
  onTemplateCreate,
  onTemplateUpdate,
  onTemplateDelete,
  className = ''
}) => {
  const [state, setState] = useState<TemplateManagerState>({
    templates: [],
    isLoading: true,
    error: null,
    searchQuery: '',
    selectedCategory: 'all',
    sortBy: 'name',
    sortOrder: 'asc'
  });

  const [formState, setFormState] = useState<TemplateFormState>({
    isOpen: false,
    mode: 'create',
    template: null,
    isSubmitting: false
  });

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    templateId: string | null;
    templateName: string;
  }>({
    isOpen: false,
    templateId: null,
    templateName: ''
  });

  // Load templates on component mount
  useEffect(() => {
    loadTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadTemplates = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const templates = await InvoiceTemplateService.getTemplates();
      setState(prev => ({
        ...prev,
        templates,
        isLoading: false
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Şablonlar yüklenirken hata oluştu',
        isLoading: false
      }));
    }
  }, []);

  // Filter and sort templates
  const filteredAndSortedTemplates = useMemo(() => {
    let filtered = state.templates;

    // Apply search filter
    if (state.searchQuery) {
      const query = state.searchQuery.toLowerCase();
      filtered = filtered.filter(template =>
        template.name.toLowerCase().includes(query) ||
        template.description?.toLowerCase().includes(query) ||
        template.category.toLowerCase().includes(query)
      );
    }

    // Apply category filter
    if (state.selectedCategory !== 'all') {
      filtered = filtered.filter(template => template.category === state.selectedCategory);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (state.sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name, 'tr');
          break;
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'usageCount':
          comparison = (a.usageCount || 0) - (b.usageCount || 0);
          break;
      }

      return state.sortOrder === 'desc' ? -comparison : comparison;
    });

    return filtered;
  }, [state.templates, state.searchQuery, state.selectedCategory, state.sortBy, state.sortOrder]);

  // Get unique categories
  const categories = useMemo(() => {
    const uniqueCategories = [...new Set(state.templates.map(t => t.category))];
    return uniqueCategories.sort();
  }, [state.templates]);

  const handleCreateTemplate = useCallback(() => {
    setFormState({
      isOpen: true,
      mode: 'create',
      template: null,
      isSubmitting: false
    });
  }, []);

  const handleEditTemplate = useCallback((template: InvoiceTemplate) => {
    setFormState({
      isOpen: true,
      mode: 'edit',
      template,
      isSubmitting: false
    });
  }, []);

  const handleViewTemplate = useCallback((template: InvoiceTemplate) => {
    setFormState({
      isOpen: true,
      mode: 'view',
      template,
      isSubmitting: false
    });
  }, []);

  const handleDeleteTemplate = useCallback((template: InvoiceTemplate) => {
    setConfirmDialog({
      isOpen: true,
      templateId: template.id,
      templateName: template.name
    });
  }, []);

  const handleDuplicateTemplate = useCallback(async (template: InvoiceTemplate) => {
    try {
      const duplicatedTemplate = await InvoiceTemplateService.duplicateTemplate(template.id);
      setState(prev => ({
        ...prev,
        templates: [...prev.templates, duplicatedTemplate]
      }));

      if (onTemplateCreate) {
        onTemplateCreate(duplicatedTemplate);
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Şablon kopyalanırken hata oluştu'
      }));
    }
  }, [onTemplateCreate]);

  const handleFormSubmit = useCallback(async (formData: Record<string, any>) => {
    setFormState(prev => ({ ...prev, isSubmitting: true }));

    try {
      let result: InvoiceTemplate;

      if (formState.mode === 'create') {
        const createData: CreateInvoiceTemplateData = {
          name: formData.name,
          description: formData.description,
          category: formData.category,
          templateData: formData,
          isActive: true
        };

        result = await InvoiceTemplateService.createCommunicationTemplates(createData);
        setState(prev => ({
          ...prev,
          templates: [...prev.templates, result]
        }));

        if (onTemplateCreate) {
          onTemplateCreate(result);
        }
      } else if (formState.mode === 'edit' && formState.template) {
        const updateData: UpdateInvoiceTemplateData = {
          name: formData.name,
          description: formData.description,
          category: formData.category,
          templateData: formData
        };

        result = await InvoiceTemplateService.updateCommunicationTemplate(formState.template.id, updateData);
        setState(prev => ({
          ...prev,
          templates: prev.templates.map(t => t.id === result.id ? result : t)
        }));

        if (onTemplateUpdate) {
          onTemplateUpdate(result);
        }
      }

      setFormState({
        isOpen: false,
        mode: 'create',
        template: null,
        isSubmitting: false
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Şablon kaydedilirken hata oluştu'
      }));
      setFormState(prev => ({ ...prev, isSubmitting: false }));
    }
  }, [formState.mode, formState.template, onTemplateCreate, onTemplateUpdate]);

  const confirmDelete = useCallback(async () => {
    if (!confirmDialog.templateId) return;

    try {
      await InvoiceTemplateService.deleteCommunicationTemplate(confirmDialog.templateId);
      setState(prev => ({
        ...prev,
        templates: prev.templates.filter(t => t.id !== confirmDialog.templateId)
      }));

      if (onTemplateDelete) {
        onTemplateDelete(confirmDialog.templateId);
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Şablon silinirken hata oluştu'
      }));
    }

    setConfirmDialog({ isOpen: false, templateId: null, templateName: '' });
  }, [confirmDialog.templateId, onTemplateDelete]);

  const cancelDelete = useCallback(() => {
    setConfirmDialog({ isOpen: false, templateId: null, templateName: '' });
  }, []);

  const closeForm = useCallback(() => {
    setFormState({
      isOpen: false,
      mode: 'create',
      template: null,
      isSubmitting: false
    });
  }, []);

  if (state.isLoading) {
    return (
      <div className={`template-manager-loading ${className}`}>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">Şablonlar yükleniyor...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`invoice-template-manager ${className}`}>
      {/* Header */}
      <div className="template-manager-header mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-900">Fatura Şablonları</h2>
          <Button
            onClick={handleCreateTemplate}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm"
            style={{ backgroundColor: '#2563eb', color: 'white' }}
            variant='default'>
            + Yeni Şablon
          </Button>
        </div>

        {/* Filters and Search */}
        <div className="filters-section bg-gray-50 rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Arama
              </label>
              <Input
                type="text"
                value={state.searchQuery}
                onChange={(e) => setState(prev => ({ ...prev, searchQuery: e.target.value }))}
                placeholder="Şablon adı, açıklama..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kategori
              </label>
              <Select
                value={state.selectedCategory}
                onChange={(e) => setState(prev => ({ ...prev, selectedCategory: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                options={[
                  { value: "all", label: "Tüm Kategoriler" },
                  ...categories.map(category => ({
                    value: category,
                    label: getCategoryLabel(category)
                  }))
                ]}
              />
            </div>

            {/* Sort By */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sıralama
              </label>
              <Select
                value={state.sortBy}
                onChange={(e) => setState(prev => ({ ...prev, sortBy: e.target.value as "name" | "createdAt" | "usageCount" }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                options={[
                  { value: "name", label: "İsim" },
                  { value: "createdAt", label: "Oluşturma Tarihi" },
                  { value: "usageCount", label: "Kullanım Sayısı" }
                ]}
              />
            </div>

            {/* Sort Order */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sıra
              </label>
              <Select
                value={state.sortOrder}
                onChange={(e) => setState(prev => ({ ...prev, sortOrder: e.target.value as "asc" | "desc" }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                options={[
                  { value: "asc", label: "Artan" },
                  { value: "desc", label: "Azalan" }
                ]}
              />
            </div>
          </div>
        </div>
      </div>
      {/* Error Display */}
      {state.error && (
        <div className="error-message bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-red-400">⚠️</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Hata</h3>
              <p className="mt-1 text-sm text-red-700">{state.error}</p>
            </div>
            <div className="ml-auto pl-3">
              <Button
                onClick={() => setState(prev => ({ ...prev, error: null }))}
                className="text-red-400 hover:text-red-600"
                variant='default'>
                ✕
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Templates Grid */}
      <div className="templates-grid">
        {filteredAndSortedTemplates.length === 0 ? (
          <div className="empty-state text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">📄</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {state.searchQuery || state.selectedCategory !== 'all'
                ? 'Arama kriterlerine uygun şablon bulunamadı'
                : 'Henüz şablon oluşturulmamış'
              }
            </h3>
            <p className="text-gray-600 mb-4">
              {state.searchQuery || state.selectedCategory !== 'all'
                ? 'Farklı arama kriterleri deneyin'
                : 'İlk şablonunuzu oluşturmak için "Yeni Şablon" butonuna tıklayın'
              }
            </p>
            {(!state.searchQuery && state.selectedCategory === 'all') && (
              <Button
                onClick={handleCreateTemplate}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-sm"
                style={{ backgroundColor: '#2563eb', color: 'white' }}
                variant='default'>
                Yeni Şablon Oluştur
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSortedTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onSelect={() => onTemplateSelect?.(template)}
                onEdit={() => handleEditTemplate(template)}
                onView={() => handleViewTemplate(template)}
                onDelete={() => handleDeleteTemplate(template)}
                onDuplicate={() => handleDuplicateTemplate(template)}
              />
            ))}
          </div>
        )}
      </div>
      {/* Template Form Modal */}
      {formState.isOpen && (
        <TemplateFormModal
          mode={formState.mode}
          template={formState.template}
          isSubmitting={formState.isSubmitting}
          onSubmit={handleFormSubmit}
          onClose={closeForm}
        />
      )}
      {/* Delete Confirmation Dialog */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="font-medium text-lg mb-4">Şablonu Sil</h3>
            <p className="text-gray-700 mb-6">
              "<strong>{confirmDialog.templateName}</strong>" şablonunu silmek istediğinizden emin misiniz?
              Bu işlem geri alınamaz.
            </p>
            <div className="flex justify-end gap-3">
              <Button
                onClick={cancelDelete}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                variant='default'>
                İptal
              </Button>
              <Button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                variant='default'>
                Sil
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Template Card Component
interface TemplateCardProps {
  template: InvoiceTemplate;
  onSelect?: () => void;
  onEdit?: () => void;
  onView?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
}

const TemplateCard: React.FC<TemplateCardProps> = ({
  template,
  onSelect,
  onEdit,
  onView,
  onDelete,
  onDuplicate
}) => {
  return (
    <div className="template-card bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="font-medium text-lg text-gray-900 mb-1">{template.name}</h3>
          <p className="text-sm text-gray-600 mb-2">{template.description}</p>
          <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
            {getCategoryLabel(template.category)}
          </span>
        </div>

        <div className="flex items-center space-x-1">
          <Button
            onClick={onView}
            className="p-1 text-gray-400 hover:text-gray-600"
            title="Görüntüle"
            variant='default'>
            👁️
          </Button>
          <Button
            onClick={onEdit}
            className="p-1 text-gray-400 hover:text-blue-600"
            title="Düzenle"
            variant='default'>
            ✏️
          </Button>
          <Button
            onClick={onDuplicate}
            className="p-1 text-gray-400 hover:text-green-600"
            title="Kopyala"
            variant='default'>
            📋
          </Button>
          <Button
            onClick={onDelete}
            className="p-1 text-gray-400 hover:text-red-600"
            title="Sil"
            variant='default'>
            🗑️
          </Button>
        </div>
      </div>
      <div className="template-stats text-sm text-gray-500 mb-4">
        <div className="flex justify-between">
          <span>Kullanım: {template.usageCount || 0}</span>
          <span>{new Date(template.createdAt).toLocaleDateString('tr-TR')}</span>
        </div>
      </div>
      <div className="template-actions">
        <Button
          onClick={onSelect}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-medium shadow-sm"
          style={{ backgroundColor: '#2563eb', color: 'white' }}
          variant='default'>
          Şablonu Kullan
        </Button>
      </div>
    </div>
  );
};

// Template Form Modal Component
interface TemplateFormModalProps {
  mode: 'create' | 'edit' | 'view';
  template: InvoiceTemplate | null;
  isSubmitting: boolean;
  onSubmit: (data: any) => void;
  onClose: () => void;
}

const TemplateFormModal: React.FC<TemplateFormModalProps> = ({
  mode,
  template,
  isSubmitting,
  onSubmit,
  onClose
}) => {
  const [formData, setFormData] = useState({
    name: template?.name || '',
    description: template?.description || '',
    category: template?.category || 'general',
    ...(template?.templateData || {})
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const isReadOnly = mode === 'view';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto mx-4">
        <div className="sticky top-0 bg-white border-b px-6 py-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">
              {mode === 'create' && 'Yeni Şablon Oluştur'}
              {mode === 'edit' && 'Şablonu Düzenle'}
              {mode === 'view' && 'Şablon Detayları'}
            </h2>
            <Button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              variant='default'>
              ✕
            </Button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {/* Template Metadata */}
          <div className="template-metadata mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Şablon Adı *
                </label>
                <Input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  disabled={isReadOnly}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kategori
                </label>
                <Select
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  disabled={isReadOnly}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                  options={[
                    { value: "general", label: "Genel" },
                    { value: "medical", label: "Tıbbi" },
                    { value: "dental", label: "Diş" },
                    { value: "consultation", label: "Konsültasyon" },
                    { value: "treatment", label: "Tedavi" },
                    { value: "surgery", label: "Cerrahi" }
                  ]}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Açıklama
              </label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                disabled={isReadOnly}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                placeholder="Şablon açıklaması..."
              />
            </div>
          </div>

          {/* Dynamic Invoice Form */}
          <div className="template-form-content">
            <h3 className="text-lg font-medium mb-4">Fatura Şablonu</h3>
            <DynamicInvoiceForm
              initialData={template?.templateData as Record<string, any>}
              onSubmit={(data: Record<string, any>) => setFormData((prev: any) => ({ ...prev, ...data }))}
              disabled={isReadOnly}
            />
          </div>

          {/* Form Actions */}
          {!isReadOnly && (
            <div className="form-actions sticky bottom-0 bg-white border-t pt-4 mt-6">
              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-6 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                  variant='default'>
                  İptal
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  variant='default'>
                  {isSubmitting ? 'Kaydediliyor...' : (mode === 'create' ? 'Oluştur' : 'Güncelle')}
                </Button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

// Helper function to get category label in Turkish
function getCategoryLabel(category: string): string {
  const categoryLabels: Record<string, string> = {
    'general': 'Genel',
    'medical': 'Tıbbi',
    'dental': 'Diş',
    'consultation': 'Konsültasyon',
    'treatment': 'Tedavi',
    'surgery': 'Cerrahi'
  };
  return categoryLabels[category] || category;
}

export default InvoiceTemplateManager;