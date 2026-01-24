import React from 'react';
import { Party } from '../../../types/party/party-base.types';
import {
  User,
  MapPin,
  Tag,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

interface PartyOverviewTabProps {
  party: Party;
}

export const PartyOverviewTab: React.FC<PartyOverviewTabProps> = ({ party }) => {
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Belirtilmemiş';
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
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
            <p className="mt-1 text-sm text-gray-900">{party.firstName || ''} {party.lastName || ''}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">TC Kimlik No</label>
            <p className="mt-1 text-sm text-gray-900">{party.tcNumber}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Telefon</label>
            <p className="mt-1 text-sm text-gray-900">{party.phone || 'Belirtilmemiş'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">E-posta</label>
            <p className="mt-1 text-sm text-gray-900">{party.email || 'Belirtilmemiş'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Doğum Tarihi</label>
            <p className="mt-1 text-sm text-gray-900">{formatDate(party.birthDate || undefined)}</p>
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
            <p className="mt-1 text-sm text-gray-900">{party.addressFull || 'Belirtilmemiş'}</p>
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
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${party.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                {party.status === 'ACTIVE' ? (
                  <CheckCircle className="w-3 h-3 mr-1" />
                ) : (
                  <AlertCircle className="w-3 h-3 mr-1" />
                )}
                {party.status === 'ACTIVE' ? 'Aktif' : 'Pasif'}
              </span>
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Segment</label>
            <p className="mt-1 text-sm text-gray-900">{party.segment || 'Belirtilmemiş'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Edinim Türü</label>
            <p className="mt-1 text-sm text-gray-900">{party.acquisitionType || 'Belirtilmemiş'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Öncelik Skoru</label>
            <p className="mt-1 text-sm text-gray-900">{party.priorityScore || 'Belirtilmemiş'}</p>
          </div>
        </div>

        {party.tags && party.tags.length > 0 && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Etiketler</label>
            <div className="flex flex-wrap gap-2">
              {party.tags.map((tag, index) => (
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
};