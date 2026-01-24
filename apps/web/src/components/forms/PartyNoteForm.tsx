import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { FileText, User } from 'lucide-react';
import { getCurrentUserId } from '@/utils/auth-utils';

interface PartyNote {
  id?: string;
  partyId: string;
  title: string;
  content: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: 'medical' | 'administrative' | 'technical' | 'general';
  isPrivate: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
  tags?: string[];
}

interface PartyNoteFormProps {
  partyId: string;
  note?: PartyNote | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (noteData: Partial<PartyNote>) => Promise<void>;
  isLoading?: boolean;
}

export const PartyNoteForm: React.FC<PartyNoteFormProps> = ({
  partyId,
  note,
  isOpen,
  onClose,
  onSave,
  isLoading = false
}) => {
  const [formData, setFormData] = useState<Partial<PartyNote>>({
    partyId,
    title: '',
    content: '',
    priority: 'medium',
    category: 'general',
    isPrivate: false,
    createdBy: getCurrentUserId(),
    tags: []
  });

  const [tagInput, setTagInput] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset form when modal opens/closes or note changes
  useEffect(() => {
    if (isOpen) {
      if (note) {
        // Edit mode
        setFormData({
          ...note,
          tags: note.tags || []
        });
        setTagInput('');
      } else {
        // Create mode
        setFormData({
          partyId,
          title: '',
          content: '',
          priority: 'medium',
          category: 'general',
          isPrivate: false,
          createdBy: getCurrentUserId(),
          tags: []
        });
        setTagInput('');
      }
      setErrors({});
    }
  }, [isOpen, note, partyId]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title?.trim()) {
      newErrors.title = 'Not başlığı zorunludur';
    }

    if (!formData.content?.trim()) {
      newErrors.content = 'Not içeriği zorunludur';
    }

    if (formData.title && formData.title.length > 100) {
      newErrors.title = 'Başlık 100 karakterden uzun olamaz';
    }

    if (formData.content && formData.content.length > 2000) {
      newErrors.content = 'İçerik 2000 karakterden uzun olamaz';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      const noteData = {
        ...formData,
        title: formData.title?.trim(),
        content: formData.content?.trim(),
        tags: formData.tags || []
      };

      await onSave(noteData);
      onClose();
    } catch (error) {
      console.error('Not kaydedilirken hata:', error);
    }
  };

  // Helper functions for commented-out priority/tags UI sections
  /*
  const _addTag = () => {
    if (tagInput.trim() && !formData.tags?.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...(prev.tags || []), tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags?.filter(tag => tag !== tagToRemove) || []
    }));
  };

  const handleTagInputKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'low':
        return <Info className="w-4 h-4 text-blue-500" />;
      case 'medium':
        return <Info className="w-4 h-4 text-yellow-500" />;
      case 'high':
        return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'critical':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return <Info className="w-4 h-4 text-gray-400" />;
    }
  };

  const getPriorityText = (priority: string): string => {
    switch (priority) {
      case 'low': return 'Düşük';
      case 'medium': return 'Orta';
      case 'high': return 'Yüksek';
      case 'critical': return 'Kritik';
      default: return priority;
    }
  };

  const getCategoryText = (category: string): string => {
    switch (category) {
      case 'medical': return 'Tıbbi';
      case 'administrative': return 'İdari';
      case 'technical': return 'Teknik';
      case 'general': return 'Genel';
      default: return category;
    }
  };
  */

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={note ? 'Notu Düzenle' : 'Yeni Not Ekle'}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Başlık */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Başlık *
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FileText className="w-4 h-4 text-gray-400" />
            </div>
            <input
              type="text"
              value={formData.title || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Not başlığı..."
              maxLength={100}
              className={`w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.title ? 'border-red-300' : ''}`}
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <span className="text-xs text-gray-400">
                {(formData.title?.length || 0)}/100
              </span>
            </div>
          </div>
          {errors.title && (
            <p className="mt-1 text-sm text-red-600">{errors.title}</p>
          )}
        </div>

        {/* İçerik */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            İçerik *
          </label>
          <textarea
            value={formData.content || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
            placeholder="Not içeriği..."
            rows={6}
            maxLength={2000}
            className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.content ? 'border-red-300' : ''}`}
          />
          <div className="flex justify-between items-center mt-1">
            {errors.content && (
              <p className="text-sm text-red-600">{errors.content}</p>
            )}
            <span className="text-xs text-gray-400 ml-auto">
              {(formData.content?.length || 0)}/2000
            </span>
          </div>
        </div>

        {/* Öncelik ve Kategori */}
        {/* TEMPORARILY COMMENTED OUT - Will be added in future version
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Öncelik
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'low', label: 'Düşük' },
                { value: 'medium', label: 'Orta' },
                { value: 'high', label: 'Yüksek' },
                { value: 'critical', label: 'Kritik' }
              ].map((priority) => (
                <label key={priority.value} className="relative">
                  <input
                    type="radio"
                    name="priority"
                    value={priority.value}
                    checked={formData.priority === priority.value}
                    onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as PartyNote['priority'] }))}
                    className="sr-only"
                  />
                  <div className={`flex items-center justify-center p-2 border rounded-lg cursor-pointer transition-colors text-sm ${
                    formData.priority === priority.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  }`}>
                    {getPriorityIcon(priority.value)}
                    <span className="ml-1">{priority.label}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Kategori
            </label>
            <select
              value={formData.category || 'general'}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as PartyNote['category'] }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="medical">Tıbbi</option>
              <option value="administrative">İdari</option>
              <option value="technical">Teknik</option>
              <option value="general">Genel</option>
            </select>
          </div>
        </div>
        */}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Kategori
          </label>
          <select
            value={formData.category || 'general'}
            onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as PartyNote['category'] }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="general">Genel</option>
          </select>
        </div>

        {/* Gizlilik */}
        <div>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={formData.isPrivate || false}
              onChange={(e) => setFormData(prev => ({ ...prev, isPrivate: e.target.checked }))}
              className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
            />
            <span className="ml-2 text-sm text-gray-700">
              <User className="w-4 h-4 inline mr-1" />
              Özel not (sadece yetkili kişiler görebilir)
            </span>
          </label>
        </div>

        {/* Etiketler - TEMPORARILY COMMENTED OUT - Will be added in future version
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Etiketler
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {formData.tags?.map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="ml-1 text-blue-600 hover:text-blue-800"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyPress={handleTagInputKeyPress}
              placeholder="Etiket ekleyin..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <Button
              type="button"
              onClick={addTag}
              disabled={!tagInput.trim()}
              variant="secondary"
            >
              Ekle
            </Button>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Enter tuşuna basarak veya "Ekle" butonuna tıklayarak etiket ekleyin
          </p>
        </div>
        */}

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-6 border-t">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
          >
            İptal
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
            className="min-w-[120px]"
          >
            {isLoading ? 'Kaydediliyor...' : (note ? 'Güncelle' : 'Not Ekle')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};