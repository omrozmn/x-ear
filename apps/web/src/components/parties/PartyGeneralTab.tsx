import React from 'react';
import { Party } from '../../types/party';

interface PartyGeneralTabProps {
  party: Party;
  onPartyUpdate?: (party: Party) => void;
}

export const PartyGeneralTab: React.FC<PartyGeneralTabProps> = ({ party }) => {
  // onPartyUpdate parameter removed - not used in component
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Name */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Ad Soyad</p>
            <p className="text-lg font-semibold">{party.firstName || ''} {party.lastName || ''}</p>
          </div>
        </div>
      </div>

      {/* TC Number */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">TC Kimlik No</p>
            <p className="text-lg font-semibold">{party.tcNumber}</p>
          </div>
        </div>
      </div>

      {/* Phone */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Telefon</p>
            <p className="text-lg font-semibold">{party.phone}</p>
          </div>
        </div>
      </div>

      {/* Email */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">E-posta</p>
            <p className="text-lg font-semibold">{party.email || '-'}</p>
          </div>
        </div>
      </div>

      {/* Birth Date */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Doğum Tarihi</p>
            <p className="text-lg font-semibold">
              {party.birthDate ? new Date(party.birthDate).toLocaleDateString('tr-TR') : '-'}
            </p>
          </div>
        </div>
      </div>

      {/* Address */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">Adres</p>
            <p className="text-lg font-semibold">
              {(() => {
                // Handle address as object or string
                const address = party.address;
                if (typeof address === 'string') {
                  return address || '-';
                } else if (typeof address === 'object' && address !== null) {
                  // Handle address object with city, district, fullAddress
                  interface AddressObj { fullAddress?: string; district?: string; city?: string; }
                  const addressObj = address as AddressObj;
                  return addressObj.fullAddress ||
                    `${addressObj.district || ''} ${addressObj.city || ''}`.trim() ||
                    '-';
                }
                return '-';
              })()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};