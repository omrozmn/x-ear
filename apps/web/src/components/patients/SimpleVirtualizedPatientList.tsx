/**
 * Simple Virtualized Patient List Component
 * High-performance patient list with custom virtual scrolling implementation
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Button, Badge, Checkbox, Loading, Input, Select } from '@x-ear/ui-web';
import {
  User,
  Phone,
  Mail,
  MessageSquare,
  Eye,
  Edit,
  Trash2,
  Search,
  Filter,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Patient } from '../../types/patient';
import { PatientCommunicationIntegration } from './PatientCommunicationIntegration';

interface VirtualizedPatientListProps {
  patients: Patient[];
  loading?: boolean;
  selectedPatients?: string[];
  onPatientSelect?: (patientId: string) => void;
  onPatientClick?: (patient: Patient) => void;
  onEdit?: (patient: Patient) => void;
  onDelete?: (patient: Patient) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  searchTerm?: string;
  onSearchChange?: (term: string) => void;
  filters?: PatientFilters;
  onFiltersChange?: (filters: PatientFilters) => void;
  className?: string;
}

interface PatientFilters {
  status?: string;
  segment?: string;
  label?: string;
  hasDevices?: boolean;
  sgkStatus?: string;
}

const ITEM_HEIGHT = 80;
const BUFFER_SIZE = 5;

export const SimpleVirtualizedPatientList: React.FC<VirtualizedPatientListProps> = ({
  patients,
  loading = false,
  selectedPatients = [],
  onPatientSelect,
  onPatientClick,
  onEdit,
  onDelete,
  onLoadMore,
  hasMore = false,
  searchTerm = '',
  onSearchChange,
  filters,
  onFiltersChange,
  className = ''
}) => {
  const [communicationPatient, setCommunicationPatient] = useState<Patient | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(600);

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Update container height on resize
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const availableHeight = window.innerHeight - rect.top - 100;
        setContainerHeight(Math.max(400, Math.min(800, availableHeight)));
      }
    };

    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);

  // Calculate visible items
  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - BUFFER_SIZE);
    const endIndex = Math.min(
      patients.length - 1,
      Math.ceil((scrollTop + containerHeight) / ITEM_HEIGHT) + BUFFER_SIZE
    );
    return { startIndex, endIndex };
  }, [scrollTop, containerHeight, patients.length]);

  // Handle scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = e.currentTarget.scrollTop;
    setScrollTop(newScrollTop);

    // Check if we need to load more
    const scrollHeight = e.currentTarget.scrollHeight;
    const clientHeight = e.currentTarget.clientHeight;

    if (hasMore && !loading && newScrollTop + clientHeight >= scrollHeight - 200) {
      onLoadMore?.();
    }
  }, [hasMore, loading, onLoadMore]);

  // Format phone number
  const formatPhone = (phone?: string) => {
    if (!phone) return '-';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11 && cleaned.startsWith('0')) {
      return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7, 9)} ${cleaned.slice(9)}`;
    }
    return phone;
  };

  // Get status badge
  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="success" size="sm">Aktif</Badge>;
      case 'inactive':
        return <Badge variant="warning" size="sm">Pasif</Badge>;
      default:
        return <Badge variant="secondary" size="sm">Bilinmiyor</Badge>;
    }
  };

  // Get label badge
  const getLabelBadge = (label?: string) => {
    const labelMap: Record<string, { text: string; variant: 'default' | 'success' | 'warning' | 'danger' }> = {
      'yeni': { text: 'Yeni', variant: 'default' },
      'arama-bekliyor': { text: 'Arama Bekliyor', variant: 'warning' },
      'randevu-verildi': { text: 'Randevu Verildi', variant: 'default' },
      'deneme-yapildi': { text: 'Deneme Yapıldı', variant: 'default' },
      'kontrol-hastasi': { text: 'Kontrol Hastası', variant: 'default' },
      'satis-tamamlandi': { text: 'Satış Tamamlandı', variant: 'success' }
    };

    if (!label || !labelMap[label]) return null;
    const { text, variant } = labelMap[label];
    return <Badge variant={variant} size="sm">{text}</Badge>;
  };

  // Select all functionality
  const isAllSelected = useMemo(() => {
    return patients.length > 0 && patients.every(p => selectedPatients.includes(p.id || ''));
  }, [patients, selectedPatients]);

  const isPartiallySelected = useMemo(() => {
    return selectedPatients.length > 0 && !isAllSelected;
  }, [selectedPatients, isAllSelected]);

  const handleSelectAll = useCallback(() => {
    if (isAllSelected) {
      patients.forEach(p => onPatientSelect?.(p.id || ''));
    } else {
      patients.forEach(p => {
        if (!selectedPatients.includes(p.id || '')) {
          onPatientSelect?.(p.id || '');
        }
      });
    }
  }, [patients, selectedPatients, isAllSelected, onPatientSelect]);

  // Filter handlers
  const handleFilterChange = useCallback((key: keyof PatientFilters, value: string) => {
    const newFilters = { ...filters, [key]: value === 'all' ? undefined : value };
    onFiltersChange?.(newFilters);
  }, [filters, onFiltersChange]);

  // Render patient row
  const renderPatientRow = (patient: Patient, index: number) => {
    const isSelected = selectedPatients.includes(patient.id || '');
    const top = index * ITEM_HEIGHT;

    return (
      <div
        key={patient.id || `patient-${index}`}
        style={{
          position: 'absolute',
          top: `${top}px`,
          left: 0,
          right: 0,
          height: `${ITEM_HEIGHT}px`
        }}
        className={`flex items-center px-4 py-3 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' : ''
          }`}
      >
        {/* Selection Checkbox */}
        <div className="flex-shrink-0 mr-3">
          <Checkbox
            checked={isSelected}
            onChange={() => onPatientSelect?.(patient.id || '')}
          />
        </div>

        {/* Patient Avatar */}
        <div className="flex-shrink-0 mr-4">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
            <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
        </div>

        {/* Patient Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-3 mb-1">
            <h3
              className="text-sm font-medium text-gray-900 dark:text-white truncate cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
              onClick={() => onPatientClick?.(patient)}
            >
              {`${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'İsimsiz Hasta'}
            </h3>
            {getStatusBadge(patient.status)}
            {getLabelBadge(patient.label)}
          </div>

          <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
            {patient.tcNumber && (
              <span>TC: {patient.tcNumber}</span>
            )}
            {patient.phone && (
              <div className="flex items-center">
                <Phone className="w-3 h-3 mr-1" />
                {formatPhone(patient.phone)}
              </div>
            )}
            {patient.email && (
              <div className="flex items-center">
                <Mail className="w-3 h-3 mr-1" />
                <span className="truncate max-w-32">{patient.email}</span>
              </div>
            )}
            {patient.devices && patient.devices.length > 0 && (
              <span className="text-green-600">
                {patient.devices.length} cihaz
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex-shrink-0 flex items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onEdit?.(patient);
            }}
            title="Düzenle"
          >
            <Edit className="w-4 h-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setCommunicationPatient(patient);
            }}
            title="İletişim"
          >
            <MessageSquare className="w-4 h-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onEdit?.(patient);
            }}
            title="Düzenle"
          >
            <Edit className="w-4 h-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.(patient);
            }}
            title="Sil"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  };

  if (loading && patients.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loading size="lg" />
        <span className="ml-2 text-gray-600 dark:text-gray-400">Hastalar yükleniyor...</span>
      </div>
    );
  }

  const totalHeight = patients.length * ITEM_HEIGHT;
  const visiblePatients = patients.slice(visibleRange.startIndex, visibleRange.endIndex + 1);

  return (
    <div className={`bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md ${className}`} ref={containerRef}>
      {/* Header with Search and Filters */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            <Checkbox
              checked={isAllSelected}
              indeterminate={isPartiallySelected}
              onChange={handleSelectAll}
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              {selectedPatients.length > 0
                ? `${selectedPatients.length} hasta seçildi`
                : `${patients.length} hasta`
              }
            </span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-4 h-4 mr-1" />
            Filtreler
            {showFilters ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Hasta ara (isim, TC, telefon)..."
            value={searchTerm}
            onChange={(e) => onSearchChange?.(e.target.value)}
            className="pl-10 text-gray-900 dark:text-white dark:bg-gray-700 dark:border-gray-600"
          />
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mt-3 grid grid-cols-2 md:grid-cols-5 gap-3">
            <Select
              value={filters?.status || 'all'}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              options={[
                { value: 'all', label: 'Tüm Durumlar' },
                { value: 'active', label: 'Aktif' },
                { value: 'inactive', label: 'Pasif' },
                { value: 'archived', label: 'Arşivlenmiş' }
              ]}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />

            <Select
              value={filters?.segment || 'all'}
              onChange={(e) => handleFilterChange('segment', e.target.value)}
              options={[
                { value: 'all', label: 'Tüm Segmentler' },
                { value: 'new', label: 'Yeni' },
                { value: 'trial', label: 'Deneme' },
                { value: 'purchased', label: 'Satın Almış' },
                { value: 'control', label: 'Kontrol' },
                { value: 'renewal', label: 'Yenileme' }
              ]}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />

            <Select
              value={filters?.label || 'all'}
              onChange={(e) => handleFilterChange('label', e.target.value)}
              options={[
                { value: 'all', label: 'Tüm Etiketler' },
                { value: 'yeni', label: 'Yeni' },
                { value: 'arama-bekliyor', label: 'Arama Bekliyor' },
                { value: 'randevu-verildi', label: 'Randevu Verildi' },
                { value: 'deneme-yapildi', label: 'Deneme Yapıldı' },
                { value: 'kontrol-hastasi', label: 'Kontrol Hastası' },
                { value: 'satis-tamamlandi', label: 'Satış Tamamlandı' }
              ]}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />

            <Select
              value={filters?.hasDevices ? 'true' : filters?.hasDevices === false ? 'false' : 'all'}
              onChange={(e) => handleFilterChange('hasDevices', e.target.value)}
              options={[
                { value: 'all', label: 'Tüm Hastalar' },
                { value: 'true', label: 'Cihazı Var' },
                { value: 'false', label: 'Cihazı Yok' }
              ]}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />

            <Select
              value={filters?.sgkStatus || 'all'}
              onChange={(e) => handleFilterChange('sgkStatus', e.target.value)}
              options={[
                { value: 'all', label: 'Tüm SGK Durumları' },
                { value: 'pending', label: 'Beklemede' },
                { value: 'approved', label: 'Onaylandı' },
                { value: 'rejected', label: 'Reddedildi' },
                { value: 'paid', label: 'Ödendi' }
              ]}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        )}
      </div>

      {/* Virtual Scrolling Container */}
      {patients.length > 0 ? (
        <div
          ref={scrollContainerRef}
          style={{ height: containerHeight, overflow: 'auto' }}
          onScroll={handleScroll}
        >
          <div style={{ height: totalHeight, position: 'relative' }}>
            {visiblePatients.map((patient, index) =>
              renderPatientRow(patient, visibleRange.startIndex + index)
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12">
          <User className="w-12 h-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Hasta bulunamadı</h3>
          <p className="text-gray-600 dark:text-gray-400 text-center">
            {searchTerm || Object.values(filters || {}).some(v => v)
              ? 'Arama kriterlerinize uygun hasta bulunamadı.'
              : 'Henüz hasta kaydı bulunmuyor.'
            }
          </p>
        </div>
      )}

      {/* Loading indicator at bottom */}
      {loading && patients.length > 0 && (
        <div className="flex items-center justify-center py-4 border-t border-gray-200 dark:border-gray-700">
          <Loading size="sm" />
          <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Daha fazla hasta yükleniyor...</span>
        </div>
      )}

      {/* Communication Modal */}
      {communicationPatient && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={() => setCommunicationPatient(null)}></div>
            </div>

            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    İletişim - {`${communicationPatient.firstName || ''} ${communicationPatient.lastName || ''}`.trim() || 'İsimsiz Hasta'}
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCommunicationPatient(null)}
                  >
                    ✕
                  </Button>
                </div>

                <PatientCommunicationIntegration
                  patient={communicationPatient}
                  onClose={() => setCommunicationPatient(null)}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SimpleVirtualizedPatientList;