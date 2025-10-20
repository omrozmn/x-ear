import React from 'react';
import { User, Phone, Mail, MapPin, Calendar, Tag } from 'lucide-react';
import { Patient } from '../types/patient';

interface PatientHeaderProps {
  patient?: Patient;
  isLoading?: boolean;
}

export const PatientHeader: React.FC<PatientHeaderProps> = ({ patient, isLoading }) => {
  if (isLoading || !patient) {
    return (
      <div className="bg-white shadow-sm border-b border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-gray-300 rounded-full"></div>
            <div className="flex-1">
              <div className="h-6 bg-gray-300 rounded w-48 mb-2"></div>
              <div className="h-4 bg-gray-300 rounded w-32"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const getInitials = (firstName?: string, lastName?: string) => {
    const first = firstName?.charAt(0) || '';
    const last = lastName?.charAt(0) || '';
    return `${first}${last}`.toUpperCase() || 'N/A';
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('tr-TR');
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white shadow-sm border-b border-gray-200 p-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-4">
          {/* Avatar */}
          <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center text-white text-xl font-semibold">
            {getInitials(patient.firstName, patient.lastName)}
          </div>
          
          {/* Patient Info */}
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">
          {patient.firstName || ''} {patient.lastName || ''}
        </h1>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(patient.status)}`}>
                {patient.status === 'active' ? 'Aktif' : 'Pasif'}
              </span>
            </div>
            
            {/* Contact Info */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center space-x-1">
                <User className="w-4 h-4" />
                <span>TC: {patient.tcNumber}</span>
              </div>
              
              {patient.phone && (
                <div className="flex items-center space-x-1">
                  <Phone className="w-4 h-4" />
                  <span>{patient.phone}</span>
                </div>
              )}
              
              {patient.email && (
                <div className="flex items-center space-x-1">
                  <Mail className="w-4 h-4" />
                  <span>{patient.email}</span>
                </div>
              )}
              
              {patient.birthDate && (
                <div className="flex items-center space-x-1">
                  <Calendar className="w-4 h-4" />
                  <span>Doğum: {formatDate(patient.birthDate)}</span>
                </div>
              )}
            </div>
            
            {/* Address */}
            {patient.addressFull && (
              <div className="flex items-center space-x-1 mt-2 text-sm text-gray-600">
                <MapPin className="w-4 h-4" />
                <span>
                  {patient.addressFull || 'Adres bilgisi yok'}
                </span>
              </div>
            )}
          </div>
        </div>
        
        {/* Tags and Additional Info */}
        <div className="flex flex-col items-end space-y-2">
          {patient.tags && patient.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {patient.tags.map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                >
                  <Tag className="w-3 h-3 mr-1" />
                  {tag}
                </span>
              ))}
            </div>
          )}
          
          {patient.segment && (
            <div className="text-sm text-gray-600">
              <span className="font-medium">Segment:</span> {patient.segment}
            </div>
          )}
          
          {patient.acquisitionType && (
            <div className="text-sm text-gray-600">
              <span className="font-medium">Kaynak:</span> {patient.acquisitionType}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};