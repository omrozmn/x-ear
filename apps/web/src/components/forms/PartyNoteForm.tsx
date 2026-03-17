import React, { useState, useEffect } from 'react';
import { Button, Textarea } from '@x-ear/ui-web';
import { Modal } from '../ui/Modal';
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
    content: '',
    priority: 'medium',
    category: 'general',
    isPrivate: false,
    createdBy: getCurrentUserId(),
    tags: []
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  // Removed unused tagInput state - tags functionality is temporarily commented out

  // Reset form when modal opens/closes or note changes
  useEffect(() => {
    if (isOpen) {
      if (note) {
        // Edit mode
        setFormData({
          ...note,
          tags: note.tags || []
        });
      } else {
        // Create mode
        setFormData({
          partyId,
          content: '',
          priority: 'medium',
          category: 'general',
          isPrivate: false,
          createdBy: getCurrentUserId(),
          tags: []
        });
      }
      setErrors({});
    }
  }, [isOpen, note, partyId]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.content?.trim()) {
      newErrors.content = 'Not içeriği zorunludur';
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
        return <Info className="w-4 h-4 text-primary" />;
      case 'medium':
        return <Info className="w-4 h-4 text-yellow-500" />;
      case 'high':
        return <AlertTriangle className="w-4 h-4 text-orange-500" />;
      case 'critical':
        return <AlertTriangle className="w-4 h-4 text-destructive" />;
      default:
        return <Info className="w-4 h-4 text-muted-foreground" />;
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
      title={note ? 'Notu Düzenle' : 'Yeni Not'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        {/* İçerik */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Not İçeriği *
          </label>
          <Textarea
            value={formData.content || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
            placeholder="Not içeriğini yazınız..."
            rows={4}
            maxLength={2000}
            className={`w-full ${errors.content ? 'border-red-300' : ''}`}
          />
          <div className="flex justify-between items-center mt-1">
            {errors.content && (
              <p className="text-xs text-destructive">{errors.content}</p>
            )}
            <span className="text-xs text-muted-foreground ml-auto">
              {(formData.content?.length || 0)}/2000
            </span>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-2 pt-3 border-t border-border">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isLoading}
          >
            İptal
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={isLoading}
          >
            {isLoading ? 'Kaydediliyor...' : (note ? 'Güncelle' : 'Kaydet')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};