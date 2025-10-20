import React from 'react';
import { Patient } from '../types/patient';
import { 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar,
  Tag,
  AlertCircle,
  CheckCircle,
  Clock,
  FileText
} from 'lucide-react';

interface PatientTabContentProps {
  activeTab: string;
  patient?: Patient;
  isLoading?: boolean;
}

export const PatientTabContent: React.FC<PatientTabContentProps> = ({ 
  activeTab, 
  patient, 
  isLoading 
}) => {
  if (isLoading || !patient) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-300 rounded w-3/4"></div>
          <div className="h-4 bg-gray-300 rounded w-1/2"></div>
          <div className="h-4 bg-gray-300 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Belirtilmemiş';
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const renderOverview = () => (
    <div className="p-6 space-y-6">
      {/* Personal Information */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <User className="w-5 h-5 mr-2" />
          Kişisel Bilgiler
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Ad Soyad</label>
            <p className="mt-1 text-sm text-gray-900">{patient.firstName || ''} {patient.lastName || ''}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">TC Kimlik No</label>
            <p className="mt-1 text-sm text-gray-900">{patient.tcNumber}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Telefon</label>
            <p className="mt-1 text-sm text-gray-900">{patient.phone || 'Belirtilmemiş'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">E-posta</label>
            <p className="mt-1 text-sm text-gray-900">{patient.email || 'Belirtilmemiş'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Doğum Tarihi</label>
            <p className="mt-1 text-sm text-gray-900">{formatDate(patient.birthDate)}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Cinsiyet</label>
            <p className="mt-1 text-sm text-gray-900">Belirtilmemiş</p>
          </div>
        </div>
      </div>

      {/* Address Information */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <MapPin className="w-5 h-5 mr-2" />
          Adres Bilgileri
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Tam Adres</label>
            <p className="mt-1 text-sm text-gray-900">{patient.addressFull || 'Belirtilmemiş'}</p>
          </div>
        </div>
      </div>

      {/* Additional Information */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Tag className="w-5 h-5 mr-2" />
          Ek Bilgiler
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Durum</label>
            <p className="mt-1">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                patient.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
                {patient.status === 'active' ? (
                  <CheckCircle className="w-3 h-3 mr-1" />
                ) : (
                  <AlertCircle className="w-3 h-3 mr-1" />
                )}
                {patient.status === 'active' ? 'Aktif' : 'Pasif'}
              </span>
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Segment</label>
            <p className="mt-1 text-sm text-gray-900">{patient.segment || 'Belirtilmemiş'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Edinim Türü</label>
            <p className="mt-1 text-sm text-gray-900">{patient.acquisitionType || 'Belirtilmemiş'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Öncelik Skoru</label>
            <p className="mt-1 text-sm text-gray-900">{patient.priorityScore || 'Belirtilmemiş'}</p>
          </div>
        </div>
        
        {patient.tags && patient.tags.length > 0 && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Etiketler</label>
            <div className="flex flex-wrap gap-2">
              {patient.tags.map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderComingSoon = (tabName: string) => (
    <div className="p-6 text-center">
      <div className="max-w-sm mx-auto">
        <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">{tabName} Yakında Gelecek</h3>
        <p className="text-gray-500">
          Bu özellik şu anda geliştirme aşamasında. Yakında kullanıma sunulacak.
        </p>
      </div>
    </div>
  );

  switch (activeTab) {
    case 'overview':
      return renderOverview();
    case 'appointments':
      return renderComingSoon('Randevular');
    case 'devices':
      return renderComingSoon('Cihazlar');
    case 'sales':
      return renderComingSoon('Satışlar');
    case 'documents':
      return renderComingSoon('Belgeler');
    case 'timeline':
      return renderComingSoon('Zaman Çizelgesi');
    case 'tests':
      return renderComingSoon('İşitme Testleri');
    case 'settings':
      return renderComingSoon('Ayarlar');
    default:
      return renderOverview();
  }
};