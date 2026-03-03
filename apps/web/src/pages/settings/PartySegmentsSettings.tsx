import React, { useState, useEffect } from 'react';
import { Users, Plus, Trash2, Edit2, X, Check } from 'lucide-react';
import { Button } from '@x-ear/ui-web';
import toast from 'react-hot-toast';

interface SegmentOption {
  value: string;
  label: string;
  isCustom?: boolean;
}

interface AcquisitionOption {
  value: string;
  label: string;
  isCustom?: boolean;
}

const DEFAULT_SEGMENTS: SegmentOption[] = [
  { value: 'new', label: 'Yeni' },
  { value: 'lead', label: 'Potansiyel Müşteri' },
  { value: 'trial', label: 'Deneme Aşamasında' },
  { value: 'customer', label: 'Müşteri' },
  { value: 'control', label: 'Kontrol Hastası' },
  { value: 'renewal', label: 'Yenileme' },
  { value: 'existing', label: 'Mevcut Hasta' },
  { value: 'vip', label: 'VIP' },
];

const DEFAULT_ACQUISITIONS: AcquisitionOption[] = [
  { value: 'referral', label: 'Referans' },
  { value: 'online', label: 'Online' },
  { value: 'walk-in', label: 'Ziyaret' },
  { value: 'social-media', label: 'Sosyal Medya' },
  { value: 'advertisement', label: 'Reklam' },
  { value: 'tabela', label: 'Tabela' },
  { value: 'other', label: 'Diğer' },
];

const STORAGE_KEY_SEGMENTS = 'custom_party_segments';
const STORAGE_KEY_ACQUISITIONS = 'custom_acquisition_types';

export default function PartySegmentsSettings() {
  const [segments, setSegments] = useState<SegmentOption[]>([]);
  const [acquisitions, setAcquisitions] = useState<AcquisitionOption[]>([]);
  
  const [newSegmentValue, setNewSegmentValue] = useState('');
  const [newSegmentLabel, setNewSegmentLabel] = useState('');
  const [newAcquisitionValue, setNewAcquisitionValue] = useState('');
  const [newAcquisitionLabel, setNewAcquisitionLabel] = useState('');
  
  const [editingSegment, setEditingSegment] = useState<string | null>(null);
  const [editingAcquisition, setEditingAcquisition] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = () => {
    try {
      // Load custom segments
      const savedSegments = localStorage.getItem(STORAGE_KEY_SEGMENTS);
      const customSegments: SegmentOption[] = savedSegments ? JSON.parse(savedSegments) : [];
      setSegments([...DEFAULT_SEGMENTS, ...customSegments.map(s => ({ ...s, isCustom: true }))]);

      // Load custom acquisitions
      const savedAcquisitions = localStorage.getItem(STORAGE_KEY_ACQUISITIONS);
      const customAcquisitions: AcquisitionOption[] = savedAcquisitions ? JSON.parse(savedAcquisitions) : [];
      setAcquisitions([...DEFAULT_ACQUISITIONS, ...customAcquisitions.map(a => ({ ...a, isCustom: true }))]);
    } catch (error) {
      console.error('Ayarlar yüklenemedi:', error);
      setSegments(DEFAULT_SEGMENTS);
      setAcquisitions(DEFAULT_ACQUISITIONS);
    }
  };

  const saveCustomSegments = (customSegments: SegmentOption[]) => {
    localStorage.setItem(STORAGE_KEY_SEGMENTS, JSON.stringify(customSegments));
  };

  const saveCustomAcquisitions = (customAcquisitions: AcquisitionOption[]) => {
    localStorage.setItem(STORAGE_KEY_ACQUISITIONS, JSON.stringify(customAcquisitions));
  };

  const handleAddSegment = () => {
    if (!newSegmentValue.trim() || !newSegmentLabel.trim()) {
      toast.error('Lütfen tüm alanları doldurun');
      return;
    }

    if (segments.find(s => s.value === newSegmentValue)) {
      toast.error('Bu değer zaten mevcut');
      return;
    }

    const newSegment: SegmentOption = {
      value: newSegmentValue.trim(),
      label: newSegmentLabel.trim(),
      isCustom: true,
    };

    const updatedSegments = [...segments, newSegment];
    setSegments(updatedSegments);
    
    const customSegments = updatedSegments.filter(s => s.isCustom);
    saveCustomSegments(customSegments);

    setNewSegmentValue('');
    setNewSegmentLabel('');
    toast.success('Segment eklendi');
  };

  const handleDeleteSegment = (value: string) => {
    const segment = segments.find(s => s.value === value);
    if (!segment?.isCustom) {
      toast.error('Varsayılan segmentler silinemez');
      return;
    }

    const updatedSegments = segments.filter(s => s.value !== value);
    setSegments(updatedSegments);
    
    const customSegments = updatedSegments.filter(s => s.isCustom);
    saveCustomSegments(customSegments);
    
    toast.success('Segment silindi');
  };

  const handleEditSegment = (value: string) => {
    const segment = segments.find(s => s.value === value);
    if (!segment?.isCustom) {
      toast.error('Varsayılan segmentler düzenlenemez');
      return;
    }
    setEditingSegment(value);
    setEditLabel(segment.label);
  };

  const handleSaveSegmentEdit = () => {
    if (!editLabel.trim()) {
      toast.error('Label boş olamaz');
      return;
    }

    const updatedSegments = segments.map(s =>
      s.value === editingSegment ? { ...s, label: editLabel.trim() } : s
    );
    setSegments(updatedSegments);
    
    const customSegments = updatedSegments.filter(s => s.isCustom);
    saveCustomSegments(customSegments);
    
    setEditingSegment(null);
    setEditLabel('');
    toast.success('Segment güncellendi');
  };

  const handleAddAcquisition = () => {
    if (!newAcquisitionValue.trim() || !newAcquisitionLabel.trim()) {
      toast.error('Lütfen tüm alanları doldurun');
      return;
    }

    if (acquisitions.find(a => a.value === newAcquisitionValue)) {
      toast.error('Bu değer zaten mevcut');
      return;
    }

    const newAcquisition: AcquisitionOption = {
      value: newAcquisitionValue.trim(),
      label: newAcquisitionLabel.trim(),
      isCustom: true,
    };

    const updatedAcquisitions = [...acquisitions, newAcquisition];
    setAcquisitions(updatedAcquisitions);
    
    const customAcquisitions = updatedAcquisitions.filter(a => a.isCustom);
    saveCustomAcquisitions(customAcquisitions);

    setNewAcquisitionValue('');
    setNewAcquisitionLabel('');
    toast.success('Kazanım türü eklendi');
  };

  const handleDeleteAcquisition = (value: string) => {
    const acquisition = acquisitions.find(a => a.value === value);
    if (!acquisition?.isCustom) {
      toast.error('Varsayılan kazanım türleri silinemez');
      return;
    }

    const updatedAcquisitions = acquisitions.filter(a => a.value !== value);
    setAcquisitions(updatedAcquisitions);
    
    const customAcquisitions = updatedAcquisitions.filter(a => a.isCustom);
    saveCustomAcquisitions(customAcquisitions);
    
    toast.success('Kazanım türü silindi');
  };

  const handleEditAcquisition = (value: string) => {
    const acquisition = acquisitions.find(a => a.value === value);
    if (!acquisition?.isCustom) {
      toast.error('Varsayılan kazanım türleri düzenlenemez');
      return;
    }
    setEditingAcquisition(value);
    setEditLabel(acquisition.label);
  };

  const handleSaveAcquisitionEdit = () => {
    if (!editLabel.trim()) {
      toast.error('Label boş olamaz');
      return;
    }

    const updatedAcquisitions = acquisitions.map(a =>
      a.value === editingAcquisition ? { ...a, label: editLabel.trim() } : a
    );
    setAcquisitions(updatedAcquisitions);
    
    const customAcquisitions = updatedAcquisitions.filter(a => a.isCustom);
    saveCustomAcquisitions(customAcquisitions);
    
    setEditingAcquisition(null);
    setEditLabel('');
    toast.success('Kazanım türü güncellendi');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
            <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Hasta Segmentleri</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Hasta segmentlerini ve kazanım türlerini yönetin
            </p>
          </div>
        </div>
      </div>

      {/* Segments Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Hasta Segmentleri</h3>
        
        {/* Add New Segment */}
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Yeni Segment Ekle</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              type="text"
              placeholder="Değer (örn: premium)"
              value={newSegmentValue}
              onChange={(e) => setNewSegmentValue(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <input
              type="text"
              placeholder="Etiket (örn: Premium Müşteri)"
              value={newSegmentLabel}
              onChange={(e) => setNewSegmentLabel(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <Button
              onClick={handleAddSegment}
              icon={<Plus className="w-4 h-4" />}
              iconPosition="left"
              className="w-full"
            >
              Ekle
            </Button>
          </div>
        </div>

        {/* Segments List */}
        <div className="space-y-2">
          {segments.map((segment) => (
            <div
              key={segment.value}
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors"
            >
              {editingSegment === segment.value ? (
                <div className="flex items-center space-x-2 flex-1">
                  <span className="text-sm font-mono text-gray-600 dark:text-gray-400 min-w-[120px]">
                    {segment.value}
                  </span>
                  <input
                    type="text"
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    className="flex-1 px-3 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                    autoFocus
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleSaveSegmentEdit}
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingSegment(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-mono text-gray-600 dark:text-gray-400 min-w-[120px]">
                      {segment.value}
                    </span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {segment.label}
                    </span>
                    {!segment.isCustom && (
                      <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                        Varsayılan
                      </span>
                    )}
                  </div>
                  {segment.isCustom && (
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEditSegment(segment.value)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteSegment(segment.value)}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Acquisition Types Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Kazanım Türleri</h3>
        
        {/* Add New Acquisition */}
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Yeni Kazanım Türü Ekle</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              type="text"
              placeholder="Değer (örn: partner)"
              value={newAcquisitionValue}
              onChange={(e) => setNewAcquisitionValue(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <input
              type="text"
              placeholder="Etiket (örn: İş Ortağı)"
              value={newAcquisitionLabel}
              onChange={(e) => setNewAcquisitionLabel(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <Button
              onClick={handleAddAcquisition}
              icon={<Plus className="w-4 h-4" />}
              iconPosition="left"
              className="w-full"
            >
              Ekle
            </Button>
          </div>
        </div>

        {/* Acquisitions List */}
        <div className="space-y-2">
          {acquisitions.map((acquisition) => (
            <div
              key={acquisition.value}
              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors"
            >
              {editingAcquisition === acquisition.value ? (
                <div className="flex items-center space-x-2 flex-1">
                  <span className="text-sm font-mono text-gray-600 dark:text-gray-400 min-w-[120px]">
                    {acquisition.value}
                  </span>
                  <input
                    type="text"
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    className="flex-1 px-3 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                    autoFocus
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleSaveAcquisitionEdit}
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingAcquisition(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-mono text-gray-600 dark:text-gray-400 min-w-[120px]">
                      {acquisition.value}
                    </span>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {acquisition.label}
                    </span>
                    {!acquisition.isCustom && (
                      <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                        Varsayılan
                      </span>
                    )}
                  </div>
                  {acquisition.isCustom && (
                    <div className="flex items-center space-x-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEditAcquisition(acquisition.value)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteAcquisition(acquisition.value)}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
