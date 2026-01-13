/**
 * Virtualized Patient List Component
 * High-performance patient list with virtual scrolling and lazy loading
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { List } from 'react-window';
import { debounce } from 'lodash';
import { Search, Filter, X, ChevronDown, ChevronUp, User, Phone, Calendar, MapPin, Trash2, Mail, Eye, MessageSquare, Edit } from 'lucide-react';
import { Patient } from '../../types/patient/patient-base.types';
import { Button, Badge, Checkbox, Loading, Input } from '@x-ear/ui-web';
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

interface PatientRowProps {
  index: number;
  style: React.CSSProperties;
  data: {
    patients: Patient[];
    selectedPatients: string[];
    onPatientSelect?: (patientId: string) => void;
    onPatientClick?: (patient: Patient) => void;
    onEdit?: (patient: Patient) => void;
    onDelete?: (patient: Patient) => void;
    onCommunicationClick?: (patient: Patient) => void;
  };
}


// Patient row component for virtualization
const PatientRow = ({ index, style, data }: PatientRowProps) => {
  const patient = data.patients[index];
  const isSelected = data.selectedPatients.includes(patient.id || '');

  if (!patient) {
    return (
      <div style={style} className="flex items-center justify-center p-4">
        <Loading size="sm" />
      </div>
    );
  }

  const formatPhone = (phone?: string) => {
    if (!phone) return '-';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11 && cleaned.startsWith('0')) {
      return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7, 9)} ${cleaned.slice(9)}`;
    }
    return phone;
  };

  const getStatusBadge = (status?: string) => {
    const normalizedStatus = (status || '').toLowerCase();
    switch (normalizedStatus) {
      case 'active':
        return <Badge variant="success" size="sm">Aktif</Badge>;
      case 'inactive':
        return <Badge variant="warning" size="sm">Pasif</Badge>;
      default:
        return <Badge variant="secondary" size="sm">Bilinmiyor</Badge>;
    }
  };

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

  return (
    <div
      style={style}
      className={`flex items-center px-4 py-3 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' : ''
        }`}
    >
      {/* Selection Checkbox */}
      <div className="flex-shrink-0 mr-3">
        <Checkbox
          checked={isSelected}
          onChange={() => data.onPatientSelect?.(patient.id || '')}
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
            onClick={() => data.onPatientClick?.(patient)}
          >
            {`${patient.firstName || ''} ${patient.lastName || ''}`.trim() || 'İsimsiz Hasta'}
          </h3>
          {getStatusBadge(patient.status)}
          {getLabelBadge((patient as any).label || (patient as any).labels?.[0])}
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
            data.onPatientClick?.(patient);
          }}
          title="Görüntüle"
        >
          <Eye className="w-4 h-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            data.onCommunicationClick?.(patient);
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
            data.onEdit?.(patient);
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
            data.onDelete?.(patient);
          }}
          title="Sil"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export const VirtualizedPatientList: React.FC<VirtualizedPatientListProps> = ({
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

  // Memoized data for list
  const listData = useMemo(() => ({
    patients,
    selectedPatients,
    onPatientSelect,
    onPatientClick,
    onEdit,
    onDelete,
    onCommunicationClick: setCommunicationPatient
  }), [patients, selectedPatients, onPatientSelect, onPatientClick, onEdit, onDelete]);

  // Select all functionality
  const isAllSelected = useMemo(() => {
    return patients.length > 0 && patients.every(p => selectedPatients.includes(p.id || ''));
  }, [patients, selectedPatients]);

  const isPartiallySelected = useMemo(() => {
    return selectedPatients.length > 0 && !isAllSelected;
  }, [selectedPatients, isAllSelected]);

  const handleSelectAll = useCallback(() => {
    if (isAllSelected) {
      // Deselect all
      patients.forEach(p => onPatientSelect?.(p.id || ''));
    } else {
      // Select all visible
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

  if (loading && patients.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loading size="lg" />
        <span className="ml-2 text-gray-600 dark:text-gray-400">Hastalar yükleniyor...</span>
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md ${className}`}>
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
            <select
              value={filters?.status || 'all'}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">Tüm Durumlar</option>
              <option value="active">Aktif</option>
              <option value="inactive">Pasif</option>
              <option value="archived">Arşivlenmiş</option>
            </select>

            <select
              value={filters?.segment || 'all'}
              onChange={(e) => handleFilterChange('segment', e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">Tüm Segmentler</option>
              <option value="new">Yeni</option>
              <option value="trial">Deneme</option>
              <option value="purchased">Satın Almış</option>
              <option value="control">Kontrol</option>
              <option value="renewal">Yenileme</option>
            </select>

            <select
              value={filters?.label || 'all'}
              onChange={(e) => handleFilterChange('label', e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">Tüm Etiketler</option>
              <option value="yeni">Yeni</option>
              <option value="arama-bekliyor">Arama Bekliyor</option>
              <option value="randevu-verildi">Randevu Verildi</option>
              <option value="deneme-yapildi">Deneme Yapıldı</option>
              <option value="kontrol-hastasi">Kontrol Hastası</option>
              <option value="satis-tamamlandi">Satış Tamamlandı</option>
            </select>

            <select
              value={filters?.hasDevices ? 'true' : filters?.hasDevices === false ? 'false' : 'all'}
              onChange={(e) => handleFilterChange('hasDevices', e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">Tüm Hastalar</option>
              <option value="true">Cihazı Var</option>
              <option value="false">Cihazı Yok</option>
            </select>

            <select
              value={filters?.sgkStatus || 'all'}
              onChange={(e) => handleFilterChange('sgkStatus', e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">Tüm SGK Durumları</option>
              <option value="pending">Beklemede</option>
              <option value="approved">Onaylandı</option>
              <option value="rejected">Reddedildi</option>
              <option value="paid">Ödendi</option>
            </select>
          </div>
        )}
      </div>

      {/* Virtualized List */}
      {patients.length > 0 ? (
        <div className="max-h-96 overflow-y-auto">
          {patients.map((patient, index) => (
            <PatientRow
              key={patient.id}
              index={index}
              style={{}}
              data={{
                patients,
                selectedPatients,
                onPatientSelect,
                onPatientClick,
                onEdit,
                onDelete,
                onCommunicationClick: setCommunicationPatient
              }}
            />
          ))}
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

export default VirtualizedPatientList;