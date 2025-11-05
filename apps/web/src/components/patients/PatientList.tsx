import React, { useState, useCallback, useMemo } from 'react';
import { Button, Loading, Badge, Checkbox, Modal } from '@x-ear/ui-web';
import { 
  User, 
  Phone, 
  Mail, 
  Calendar, 
  MapPin, 
  CreditCard,
  AlertCircle,
  CheckCircle,
  Clock,
  MoreVertical,
  Edit,
  Trash2,
  Download,
  Upload,
  MessageSquare
} from 'lucide-react';
import { useDeletePatient } from '../../hooks/usePatients';
import type { Patient } from '../../types/patient/index';
import { PatientCommunicationIntegration } from './PatientCommunicationIntegration';
import { 
  getStatusBadge, 
  formatDate, 
  formatPhone, 
  getSegmentBadge, 
  getAcquisitionStatusBadge, 
  getBranchBadge 
} from './PatientListHelpers';

interface PatientListProps {
  patients: Patient[];
  loading?: boolean;
  selectedPatients?: string[];
  onPatientSelect?: (patientId: string) => void;
  onPatientClick?: (patient: Patient) => void;
  onView?: (patient: Patient) => void;
  onEdit?: (patient: Patient) => void;
  onDelete?: (patient: Patient) => void;
  onTagClick?: (patient: Patient) => void;
  onBulkAction?: (action: string, patientIds: string[]) => void;
  showSelection?: boolean;
  showActions?: boolean;
  viewMode?: 'list' | 'grid' | 'compact';
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (field: string) => void;
  className?: string;
}

interface SortableHeaderProps {
  field: string;
  label: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (field: string) => void;
}

function SortableHeader({ field, label, sortBy, sortOrder, onSort }: SortableHeaderProps) {
  const isActive = sortBy === field;
  
  return (
    <button
      onClick={() => onSort?.(field)}
      className={`flex items-center space-x-1 text-left font-medium text-gray-700 hover:text-gray-900 ${
        isActive ? 'text-blue-600' : ''
      }`}
    >
      <span>{label}</span>
      {isActive && (
        <span className="text-xs">
          {sortOrder === 'asc' ? '↑' : '↓'}
        </span>
      )}
    </button>
  );
}

/**
 * PatientList Component
 * Displays a list of patients with various view modes and actions
 */
export function PatientList({
  patients,
  loading = false,
  selectedPatients = [],
  onPatientSelect,
  onPatientClick,
  onView,
  onEdit,
  onDelete,
  onTagClick,
  onBulkAction,
  showSelection = false,
  showActions = true,
  viewMode = 'list',
  sortBy,
  sortOrder,
  onSort,
  className = ''
}: PatientListProps) {
  const [hoveredPatient, setHoveredPatient] = useState<string | null>(null);
  const [communicationPatient, setCommunicationPatient] = useState<Patient | null>(null);

  const isAllSelected = useMemo(() => {
    return patients.length > 0 && patients.every(p => p.id && selectedPatients.includes(p.id));
  }, [patients, selectedPatients]);

  const isPartiallySelected = useMemo(() => {
    return selectedPatients.length > 0 && !isAllSelected;
  }, [selectedPatients, isAllSelected]);

  const handleSelectAll = useCallback(() => {
    if (isAllSelected) {
      // Deselect all
      patients.forEach(p => p.id && onPatientSelect?.(p.id));
    } else {
      // Select all
      patients.forEach(p => {
        if (p.id && !selectedPatients.includes(p.id)) {
          onPatientSelect?.(p.id);
        }
      });
    }
  }, [patients, selectedPatients, isAllSelected, onPatientSelect]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loading size="lg" />
        <span className="ml-2 text-gray-600">Hastalar yükleniyor...</span>
      </div>
    );
  }

  if (patients.length === 0) {
    return (
      <div className="text-center py-12">
        <User className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Hasta bulunamadı</h3>
        <p className="mt-1 text-sm text-gray-500">
          Arama kriterlerinizi değiştirmeyi deneyin.
        </p>
      </div>
    );
  }

  if (viewMode === 'grid') {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}>
        {patients.map((patient) => (
          <div
            key={patient.id}
            className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => {
              console.log('=== PATIENT CARD CLICK ===', patient);
              (onView || onPatientClick)?.(patient);
            }}
            onMouseEnter={() => setHoveredPatient(patient.id || null)}
            onMouseLeave={() => setHoveredPatient(null)}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  {showSelection && (
                    <Checkbox
                      checked={patient.id ? selectedPatients.includes(patient.id) : false}
                      onChange={() => patient.id && onPatientSelect?.(patient.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                  <h3 className="text-sm font-medium text-gray-900">
                    {patient.firstName} {patient.lastName}
                  </h3>
                </div>
                
                <div className="mt-2 space-y-1">
                  {patient.tcNumber && (
                    <div className="flex items-center text-xs text-gray-500">
                      <CreditCard className="h-3 w-3 mr-1" />
                      {patient.tcNumber}
                    </div>
                  )}
                  {patient.phone && (
                    <div className="flex items-center text-xs text-gray-500">
                      <Phone className="h-3 w-3 mr-1" />
                      {formatPhone(patient.phone)}
                    </div>
                  )}
                  {patient.email && (
                    <div className="flex items-center text-xs text-gray-500">
                      <Mail className="h-3 w-3 mr-1" />
                      {patient.email}
                    </div>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between">
                  {getStatusBadge(patient.status)}
                  {patient.createdAt && (
                    <span className="text-xs text-gray-400">
                      {formatDate(patient.createdAt)}
                    </span>
                  )}
                </div>
              </div>

              {showActions && hoveredPatient === patient.id && (
                <div className="flex space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit?.(patient);
                    }}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete?.(patient);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // List view (default)
  return (
    <>
      <div className={`bg-white shadow-sm border border-gray-200 rounded-lg overflow-hidden ${className}`}>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {showSelection && (
                  <th className="px-4 py-3 text-left w-12">
                    <Checkbox
                      checked={isAllSelected}
                      indeterminate={isPartiallySelected}
                      onChange={handleSelectAll}
                    />
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[200px]">
                  <SortableHeader
                    field="name"
                    label="Ad Soyad"
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={onSort}
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                  TC Kimlik
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[140px]">
                  Telefon
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">
                  Segment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                  Kazanım
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                  Şube
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[100px]">
                  Durum
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                  <SortableHeader
                    field="createdAt"
                    label="Kayıt Tarihi"
                    sortBy={sortBy}
                    sortOrder={sortOrder}
                    onSort={onSort}
                  />
                </th>
                {showActions && (
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[160px]">
                    İşlemler
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {patients.map((patient) => (
                <tr
                  key={patient.id}
                  className="hover:bg-gray-50 cursor-pointer transition-colors duration-150"
                  onClick={() => (onView || onPatientClick)?.(patient)}
                  onMouseEnter={() => setHoveredPatient(patient.id || null)}
                  onMouseLeave={() => setHoveredPatient(null)}
                >
                  {showSelection && (
                    <td className="px-4 py-4 whitespace-nowrap">
                      <Checkbox
                        checked={patient.id ? selectedPatients.includes(patient.id) : false}
                        onChange={() => patient.id && onPatientSelect?.(patient.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
                          <User className="h-5 w-5 text-blue-600" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {patient.firstName} {patient.lastName}
                        </div>
                        {patient.email && (
                          <div className="text-sm text-gray-500 truncate max-w-[180px]">{patient.email}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                    {patient.tcNumber || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatPhone(patient.phone)}
                  </td>
                  <td 
                    className="px-6 py-4 whitespace-nowrap cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      onTagClick?.(patient);
                    }}
                    title="Etiket güncellemek için tıklayın"
                  >
                    {getSegmentBadge(patient.segment)}
                  </td>
                  <td 
                    className="px-6 py-4 whitespace-nowrap cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      onTagClick?.(patient);
                    }}
                    title="Etiket güncellemek için tıklayın"
                  >
                    {getAcquisitionStatusBadge(patient.acquisitionType)}
                  </td>
                  <td 
                    className="px-6 py-4 whitespace-nowrap cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      onTagClick?.(patient);
                    }}
                    title="Etiket güncellemek için tıklayın"
                  >
                    {getBranchBadge((patient as any).branchId, (patient as any).branch)}
                  </td>
                  <td 
                    className="px-6 py-4 whitespace-nowrap cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      onTagClick?.(patient);
                    }}
                    title="Etiket güncellemek için tıklayın"
                  >
                    {getStatusBadge(patient.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(patient.createdAt)}
                  </td>
                  {showActions && (
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit?.(patient);
                          }}
                          className="h-9 w-9 p-0 hover:bg-blue-50 hover:text-blue-600"
                          title="Düzenle"
                        >
                          <Edit className="h-5 w-5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCommunicationPatient(patient);
                          }}
                          className="h-9 w-9 p-0 hover:bg-green-50 hover:text-green-600"
                          title="İletişim"
                        >
                          <MessageSquare className="h-5 w-5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete?.(patient);
                          }}
                          className="h-9 w-9 p-0 hover:bg-red-50 hover:text-red-600"
                          title="Sil"
                        >
                          <Trash2 className="h-5 w-5" />
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Communication Modal */}
      {communicationPatient && (
        <Modal
          isOpen={true}
          onClose={() => setCommunicationPatient(null)}
          title={`İletişim - ${communicationPatient.firstName} ${communicationPatient.lastName}`}
          size="xl"
        >
          <PatientCommunicationIntegration
            patient={communicationPatient}
            onClose={() => setCommunicationPatient(null)}
          />
        </Modal>
      )}
    </>
   );
}