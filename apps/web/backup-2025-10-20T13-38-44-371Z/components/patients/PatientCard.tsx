import React, { useState } from 'react';
import { Button, Badge, Checkbox } from '@x-ear/ui-web';
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
  Eye,
  Edit,
  Trash2,
  Heart,
  Activity,
  Shield
} from 'lucide-react';
import { PatientSearchItem } from '../../types/patient/patient-search.types';

interface PatientCardProps {
  patient: PatientSearchItem;
  selected?: boolean;
  onSelect?: (patientId: string) => void;
  onClick?: (patient: PatientSearchItem) => void;
  onEdit?: (patient: PatientSearchItem) => void;
  onDelete?: (patient: PatientSearchItem) => void;
  showSelection?: boolean;
  showActions?: boolean;
  compact?: boolean;
  className?: string;
}

/**
 * PatientCard Component
 * Displays patient information in a card format
 */
export function PatientCard({
  patient,
  selected = false,
  onSelect,
  onClick,
  onEdit,
  onDelete,
  showSelection = false,
  showActions = true,
  compact = false,
  className = ''
}: PatientCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="success" size="sm">Aktif</Badge>;
      case 'inactive':
        return <Badge variant="warning" size="sm">Pasif</Badge>;
      case 'archived':
        return <Badge variant="secondary" size="sm">Arşiv</Badge>;
      default:
        return <Badge variant="secondary" size="sm">{status}</Badge>;
    }
  };

  const getSegmentColor = (segment: string) => {
    switch (segment) {
      case 'premium':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'standard':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'basic':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR');
  };

  const formatCurrency = (amount: number) => {
    return `₺${amount.toLocaleString('tr-TR')}`;
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    const first = firstName?.charAt(0) || '';
    const last = lastName?.charAt(0) || '';
    return `${first}${last}`.toUpperCase() || 'N/A';
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger card click if clicking on interactive elements
    if ((e.target as HTMLElement).closest('button, input, [role="button"]')) {
      return;
    }
    onClick?.(patient);
  };

  if (compact) {
    return (
      <div
        className={`bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-all cursor-pointer ${
          selected ? 'ring-2 ring-blue-500 border-blue-300' : ''
        } ${className}`}
        onClick={handleCardClick}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {showSelection && (
              <Checkbox
                checked={selected}
                onChange={() => onSelect?.(patient.id)}
                onClick={(e) => e.stopPropagation()}
              />
            )}
            
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-medium">
              {getInitials(patient.firstName, patient.lastName)}
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-900">
                {patient.firstName || ''} {patient.lastName || ''}
              </h3>
              <p className="text-xs text-gray-500">
                {formatDate(patient.registrationDate)}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {getStatusBadge(patient.status)}
            
            {showActions && (
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(!showMenu);
                  }}
                  className="p-1"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
                
                {showMenu && (
                  <div className="absolute right-0 top-full mt-1 w-32 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                    <div className="py-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onClick?.(patient);
                          setShowMenu(false);
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Görüntüle
                      </button>
                      
                      {onEdit && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit(patient);
                            setShowMenu(false);
                          }}
                          className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Düzenle
                        </button>
                      )}
                      
                      {onDelete && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(patient);
                            setShowMenu(false);
                          }}
                          className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Sil
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-white rounded-lg border border-gray-200 hover:shadow-lg transition-all cursor-pointer ${
        selected ? 'ring-2 ring-blue-500 border-blue-300' : ''
      } ${className}`}
      onClick={handleCardClick}
    >
      {/* Header */}
      <div className="p-6 pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-4">
            {showSelection && (
              <Checkbox
                checked={selected}
                onChange={() => onSelect?.(patient.id)}
                onClick={(e) => e.stopPropagation()}
              />
            )}
            
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-xl font-medium">
              {getInitials(patient.firstName, patient.lastName)}
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {patient.firstName || ''} {patient.lastName || ''}
              </h3>
              
              <div className="flex items-center space-x-2 mt-1">
                {getStatusBadge(patient.status)}
                
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                  getSegmentColor(patient.segment)
                }`}>
                  {patient.segment}
                </span>
              </div>
              
              {patient.priority > 0 && (
                <div className="mt-2">
                  <Badge variant="warning" size="sm">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Yüksek Öncelik ({patient.priority})
                  </Badge>
                </div>
              )}
            </div>
          </div>
          
          {showActions && (
            <div className="relative">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                }}
                className="p-2"
              >
                <MoreVertical className="h-5 w-5" />
              </Button>
              
              {showMenu && (
                <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                  <div className="py-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onClick?.(patient);
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                    >
                      <Eye className="h-4 w-4 mr-3" />
                      Detayları Görüntüle
                    </button>
                    
                    {onEdit && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(patient);
                          setShowMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                      >
                        <Edit className="h-4 w-4 mr-3" />
                        Düzenle
                      </button>
                    )}
                    
                    {onDelete && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(patient);
                          setShowMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center"
                      >
                        <Trash2 className="h-4 w-4 mr-3" />
                        Sil
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="px-6 pb-4">
        <div className="grid grid-cols-2 gap-4">
          {/* Contact Info */}
           <div className="space-y-2">
             {patient.phone && (
               <div className="flex items-center text-sm text-gray-600">
                 <Phone className="h-4 w-4 mr-2 text-gray-400" />
                 {patient.phone}
               </div>
             )}
             
             {patient.email && (
               <div className="flex items-center text-sm text-gray-600">
                 <Mail className="h-4 w-4 mr-2 text-gray-400" />
                 {patient.email}
               </div>
             )}
           </div>
          
          {/* Stats */}
          <div className="space-y-2">
            <div className="flex items-center text-sm text-gray-600">
              <Calendar className="h-4 w-4 mr-2 text-gray-400" />
              Kayıt: {formatDate(patient.registrationDate)}
            </div>
            
            {patient.deviceCount > 0 && (
              <div className="flex items-center text-sm text-gray-600">
                <Activity className="h-4 w-4 mr-2 text-gray-400" />
                {patient.deviceCount} Cihaz
              </div>
            )}
            
            {patient.hasInsurance && (
              <div className="flex items-center text-sm text-green-600">
                <Shield className="h-4 w-4 mr-2" />
                Sigortalı
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
        <div className="flex items-center justify-between">
          {/* Labels */}
          <div className="flex flex-wrap gap-1">
            {patient.labels && patient.labels.length > 0 && (
              patient.labels.slice(0, 3).map((label, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {label}
                </span>
              ))
            )}
            
            {patient.labels && patient.labels.length > 3 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                +{patient.labels.length - 3}
              </span>
            )}
          </div>
          
          {/* Balance */}
          <div className="text-right">
            {patient.outstandingBalance > 0 ? (
              <div className="text-sm font-medium text-red-600">
                Borç: {formatCurrency(patient.outstandingBalance)}
              </div>
            ) : (
              <div className="flex items-center text-sm text-green-600">
                <CheckCircle className="h-4 w-4 mr-1" />
                Bakiye Temiz
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}