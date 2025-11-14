import { Input, Button, Select } from '@x-ear/ui-web';
import { useState, useEffect, useCallback } from 'react';
import { User, CheckCircle } from 'lucide-react';
import { patientService } from '../../services/patient.service';
import { Patient } from '../../types/patient';
import citiesData from '../../data/cities.json';

interface CustomerSectionCompactProps {
  isSGK?: boolean;
  customerId?: string;
  customerFirstName?: string;
  customerLastName?: string;
  customerTcNumber?: string;
  customerTaxNumber?: string;
  customerAddress?: string;
  customerCity?: string;
  customerDistrict?: string;
  onChange: (field: string, value: any) => void;
}

// SGK sabit bilgisi
const SGK_CUSTOMER = {
  id: '0',
  name: 'Sosyal Güvenlik Kurumu',
  taxNumber: '7750409379',
  address: 'Çankaya/ ANKARA - TÜRKİYE V.D ÇANKAYA VERGİ DAİRESİ (6257)'
};

export function CustomerSectionCompact({
  isSGK = false,
  customerId,
  customerFirstName,
  customerLastName,
  customerTcNumber,
  customerTaxNumber,
  customerAddress,
  customerCity,
  customerDistrict,
  onChange
}: CustomerSectionCompactProps) {
  const [searchResults, setSearchResults] = useState<Patient[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [districts, setDistricts] = useState<string[]>([]);

  // SGK modunda otomatik doldur
  useEffect(() => {
    if (isSGK) {
      onChange('customerId', SGK_CUSTOMER.id);
      onChange('customerFirstName', 'Sosyal Güvenlik');
      onChange('customerLastName', 'Kurumu');
      onChange('customerTaxNumber', SGK_CUSTOMER.taxNumber);
      onChange('customerAddress', SGK_CUSTOMER.address);
    }
  }, [isSGK]);

  // TC ile hasta arama
  const handleTcSearch = useCallback(async (tcNumber: string) => {
    if (tcNumber.length < 3) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    console.log('TC ile arama yapılıyor:', tcNumber);
    setIsSearching(true);
    setShowResults(true);
    
    try {
      const result = await patientService.getPatients({
        search: tcNumber,
        limit: 10
      });
      
      console.log('Arama sonucu:', result);
      
      if (result.patients && result.patients.length > 0) {
        setSearchResults(result.patients);
        console.log('Bulunan hasta sayısı:', result.patients.length);
      } else {
        setSearchResults([]);
        console.log('Hasta bulunamadı');
      }
    } catch (error) {
      console.error('Hasta arama hatası:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Ad ile hasta arama
  const handleNameSearch = useCallback(async (name: string) => {
    if (name.length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    console.log('Ad ile arama yapılıyor:', name);
    setIsSearching(true);
    setShowResults(true);
    
    try {
      const result = await patientService.getPatients({
        search: name,
        limit: 10
      });
      
      console.log('Arama sonucu:', result);
      
      if (result.patients && result.patients.length > 0) {
        setSearchResults(result.patients);
        console.log('Bulunan hasta sayısı:', result.patients.length);
      } else {
        setSearchResults([]);
        console.log('Hasta bulunamadı');
      }
    } catch (error) {
      console.error('Hasta arama hatası:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Hasta seçimi
  const handlePatientSelect = useCallback((patient: Patient) => {
    setSelectedPatient(patient);
    setShowResults(false);
    
    onChange('customerId', patient.id);
    onChange('customerFirstName', patient.firstName);
    onChange('customerLastName', patient.lastName);
    onChange('customerTcNumber', patient.tcNumber || '');
    onChange('customerTaxNumber', '');
    
    // Adres bilgilerini çek
    let addressText = '';
    let cityValue = '';
    let districtValue = '';
    
    if (typeof patient.address === 'string') {
      addressText = patient.address;
    } else if (patient.address && typeof patient.address === 'object') {
      addressText = patient.address.full || patient.address.street || '';
      cityValue = patient.address.city || '';
      districtValue = patient.address.district || '';
    }
    
    onChange('customerAddress', addressText);
    onChange('customerCity', cityValue);
    onChange('customerDistrict', districtValue);
    
    // İl seçildiğinde ilçeleri yükle
    if (cityValue) {
      const cityData = citiesData.cities.find(c => c.name === cityValue);
      if (cityData) {
        setDistricts(cityData.districts);
      }
    }
  }, [onChange]);

  // İl değiştiğinde ilçeleri yükle
  const handleCityChange = useCallback((city: string) => {
    onChange('customerCity', city);
    onChange('customerDistrict', ''); // İlçeyi sıfırla
    
    const cityData = citiesData.cities.find(c => c.name === city);
    if (cityData) {
      setDistricts(cityData.districts);
    } else {
      setDistricts([]);
    }
  }, [onChange]);

  // İlk yüklemede mevcut il varsa ilçeleri yükle
  useEffect(() => {
    if (customerCity) {
      const cityData = citiesData.cities.find(c => c.name === customerCity);
      if (cityData) {
        setDistricts(cityData.districts);
      }
    }
  }, [customerCity]);

  // Manuel düzenleme
  const handleManualEdit = useCallback((field: string, value: string) => {
    onChange(field, value);
  }, [onChange]);

  // SGK modu
  if (isSGK) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        <div className="p-4 border-b border-gray-200 bg-blue-50">
          <div className="flex items-center gap-2">
            <User className="text-blue-600" size={16} />
            <h3 className="text-sm font-bold text-gray-900">Fatura Alıcı</h3>
          </div>
        </div>
        <div className="p-4">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Alıcı Adı
              </label>
              <div className="text-sm text-gray-900 font-medium">
                {SGK_CUSTOMER.name}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Vergi No
              </label>
              <div className="text-sm text-gray-600">
                {SGK_CUSTOMER.taxNumber}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Adres
              </label>
              <div className="text-xs text-gray-600 leading-relaxed">
                {SGK_CUSTOMER.address}
              </div>
            </div>
          </div>
          <p className="mt-3 text-xs text-blue-600 bg-blue-50 p-2 rounded">
            SGK faturası için alıcı bilgisi sabittir.
          </p>
        </div>
      </div>
    );
  }

  // Normal mod
  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2">
          <User className="text-gray-600" size={16} />
          <h3 className="text-sm font-bold text-gray-900">Fatura Alıcı</h3>
        </div>
      </div>
      <div className="p-4">
        <div className="space-y-3">
          {/* TC / Vergi No - En Üstte */}
          <div className="relative">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              TC / Vergi No <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Input
                type="text"
                value={customerTcNumber || customerTaxNumber || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value.length === 11 && /^\d+$/.test(value)) {
                    handleManualEdit('customerTcNumber', value);
                    handleManualEdit('customerTaxNumber', '');
                    handleTcSearch(value);
                  } else {
                    handleManualEdit('customerTaxNumber', value);
                    handleManualEdit('customerTcNumber', '');
                    setSearchResults([]);
                    setShowResults(false);
                  }
                }}
                placeholder="TC Kimlik (11 haneli) veya Vergi No"
                className="w-full text-sm"
              />
              {isSearching && (
                <div className="absolute right-2 top-2.5">
                  <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                </div>
              )}
            </div>
            
            {/* TC Arama Sonuçları */}
            {showResults && searchResults.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {searchResults.map((patient) => (
                  <button
                    key={patient.id}
                    type="button"
                    onClick={() => handlePatientSelect(patient)}
                    className="w-full px-3 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                  >
                    <div className="text-sm font-medium text-gray-900">
                      {patient.firstName} {patient.lastName}
                    </div>
                    {patient.tcNumber && (
                      <div className="text-xs text-gray-500">TC: {patient.tcNumber}</div>
                    )}
                    {patient.phone && (
                      <div className="text-xs text-gray-500">Tel: {patient.phone}</div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Ad ve Soyad - Yan Yana - Arama ile */}
          <div className="grid grid-cols-2 gap-2">
            <div className="relative">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Ad <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={customerFirstName || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  handleManualEdit('customerFirstName', value);
                  // Ad girildiğinde arama yap
                  if (value.length >= 2) {
                    handleNameSearch(value);
                  }
                }}
                placeholder="Ad (hasta ara)"
                className="w-full text-sm"
              />
            </div>
            <div className="relative">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Soyad <span className="text-red-500">*</span>
              </label>
              <Input
                type="text"
                value={customerLastName || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  handleManualEdit('customerLastName', value);
                  // Soyad girildiğinde arama yap
                  if (value.length >= 2) {
                    handleNameSearch(value);
                  }
                }}
                placeholder="Soyad (hasta ara)"
                className="w-full text-sm"
              />
            </div>
          </div>
          
          {/* Ad/Soyad Arama Sonuçları */}
          {showResults && searchResults.length > 0 && !customerTcNumber && (
            <div className="relative">
              <div className="absolute z-50 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {searchResults.map((patient) => (
                  <button
                    key={patient.id}
                    type="button"
                    onClick={() => handlePatientSelect(patient)}
                    className="w-full px-3 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                  >
                    <div className="text-sm font-medium text-gray-900">
                      {patient.firstName} {patient.lastName}
                    </div>
                    {patient.tcNumber && (
                      <div className="text-xs text-gray-500">TC: {patient.tcNumber}</div>
                    )}
                    {patient.phone && (
                      <div className="text-xs text-gray-500">Tel: {patient.phone}</div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* İl ve İlçe - Yan Yana */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Select
                label="İl"
                value={customerCity || ''}
                onChange={(e) => handleCityChange(e.target.value)}
                options={[
                  { value: '', label: 'Seçiniz' },
                  ...citiesData.cities.map(city => ({
                    value: city.name,
                    label: city.name
                  }))
                ]}
                fullWidth
              />
            </div>
            <div>
              <Select
                label="İlçe"
                value={customerDistrict || ''}
                onChange={(e) => handleManualEdit('customerDistrict', e.target.value)}
                disabled={!customerCity || districts.length === 0}
                options={[
                  { value: '', label: 'Seçiniz' },
                  ...districts.map(district => ({
                    value: district,
                    label: district
                  }))
                ]}
                fullWidth
              />
            </div>
          </div>

          {/* Adres */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Adres
            </label>
            <textarea
              value={customerAddress || ''}
              onChange={(e) => handleManualEdit('customerAddress', e.target.value)}
              placeholder="Fatura adresi"
              rows={2}
              className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {selectedPatient && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-2 flex items-center gap-2">
              <CheckCircle className="text-green-600" size={14} />
              <p className="text-xs text-green-800">
                Hasta bulundu ve bilgiler dolduruldu
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
