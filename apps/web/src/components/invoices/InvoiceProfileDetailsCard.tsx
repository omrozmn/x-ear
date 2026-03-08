import { Input, Select } from '@x-ear/ui-web';
import type { SpecialProfileDetailsData } from '../../types/invoice';

interface InvoiceProfileDetailsCardProps {
  invoiceType: string;
  value?: SpecialProfileDetailsData;
  onChange: (value: SpecialProfileDetailsData) => void;
}

const SYSTEM_TYPE_OPTIONS = [
  { value: 'EFATURA', label: 'E-Fatura' },
  { value: 'EARSIV', label: 'E-Arşiv' },
  { value: 'EIRSALIYE', label: 'E-İrsaliye' },
];

export function InvoiceProfileDetailsCard({
  invoiceType,
  value,
  onChange,
}: InvoiceProfileDetailsCardProps) {
  const data = value || {};

  const patch = (next: Partial<SpecialProfileDetailsData>) => {
    onChange({ ...data, ...next });
  };

  const renderSystemType = () => (
    <Select
      label="Belge Sistemi"
      value={data.systemType || ''}
      onChange={(e) => patch({ systemType: e.target.value as SpecialProfileDetailsData['systemType'] })}
      options={[{ value: '', label: 'Seçiniz' }, ...SYSTEM_TYPE_OPTIONS]}
      fullWidth
    />
  );

  if (invoiceType === 'earsiv') {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
        <h3 className="text-sm font-bold text-gray-900 mb-3">E-Arşiv Ayarları</h3>
        {renderSystemType()}
      </div>
    );
  }

  if (invoiceType === 'hks') {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
        <h3 className="text-sm font-bold text-gray-900 mb-3">Konaklama Vergisi Bilgileri</h3>
        <div className="grid grid-cols-1 gap-3">
          <Input type="text" label="Tesis Kayıt No" value={data.hotelRegistrationNo || ''} onChange={(e) => patch({ hotelRegistrationNo: e.target.value })} />
          <Input type="date" label="Konaklama Başlangıç" value={data.accommodationStartDate || ''} onChange={(e) => patch({ accommodationStartDate: e.target.value })} />
          <Input type="date" label="Konaklama Bitiş" value={data.accommodationEndDate || ''} onChange={(e) => patch({ accommodationEndDate: e.target.value })} />
          <Input type="number" label="Misafir Sayısı" value={data.guestCount || ''} onChange={(e) => patch({ guestCount: Number(e.target.value) || 0 })} />
        </div>
      </div>
    );
  }

  if (invoiceType === 'sarj' || invoiceType === 'sarjanlik') {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
        <h3 className="text-sm font-bold text-gray-900 mb-3">Enerji Şarj Bilgileri</h3>
        <div className="grid grid-cols-1 gap-3">
          <Input type="text" label="İstasyon Kodu" value={data.stationCode || ''} onChange={(e) => patch({ stationCode: e.target.value })} />
          <Input type="text" label="Plaka" value={data.plateNumber || ''} onChange={(e) => patch({ plateNumber: e.target.value })} />
          <Input type="date" label="Şarj Başlangıç" value={data.chargeStartDate || ''} onChange={(e) => patch({ chargeStartDate: e.target.value })} />
          <Input type="date" label="Şarj Bitiş" value={data.chargeEndDate || ''} onChange={(e) => patch({ chargeEndDate: e.target.value })} />
          <Input type="number" step="0.01" label="Enerji Miktarı (kWh)" value={data.energyAmount || ''} onChange={(e) => patch({ energyAmount: Number(e.target.value) || 0 })} />
        </div>
      </div>
    );
  }

  if (invoiceType === 'yolcu') {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
        <h3 className="text-sm font-bold text-gray-900 mb-3">Yolcu Beraberi Bilgileri</h3>
        <div className="grid grid-cols-1 gap-3">
          <Input type="text" label="Yolcu Adı" value={data.passengerName || ''} onChange={(e) => patch({ passengerName: e.target.value })} />
          <Input type="text" label="Pasaport No" value={data.passengerPassportNo || ''} onChange={(e) => patch({ passengerPassportNo: e.target.value })} />
          <Input type="text" label="Uyruğu" value={data.passengerNationality || ''} onChange={(e) => patch({ passengerNationality: e.target.value })} />
          <Input type="text" label="Vergi Temsilcisi" value={data.taxRepresentativeName || ''} onChange={(e) => patch({ taxRepresentativeName: e.target.value })} />
          <Input type="text" label="Temsilci Vergi No" value={data.taxRepresentativeTaxId || ''} onChange={(e) => patch({ taxRepresentativeTaxId: e.target.value })} />
          <Input type="text" label="İade IBAN" value={data.refundBankIban || ''} onChange={(e) => patch({ refundBankIban: e.target.value })} />
        </div>
      </div>
    );
  }

  if (invoiceType === 'otv') {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
        <h3 className="text-sm font-bold text-gray-900 mb-3">ÖTV Bilgileri</h3>
        <div className="grid grid-cols-1 gap-3">
          <Input type="text" label="ÖTV Kodu" value={data.otvCode || ''} onChange={(e) => patch({ otvCode: e.target.value })} />
          <Input type="number" step="0.01" label="ÖTV Oranı (%)" value={data.otvRate || ''} onChange={(e) => patch({ otvRate: Number(e.target.value) || 0 })} />
          <Input type="number" step="0.01" label="ÖTV Tutarı" value={data.otvAmount || ''} onChange={(e) => patch({ otvAmount: Number(e.target.value) || 0 })} />
        </div>
      </div>
    );
  }

  if (invoiceType === 'hastane') {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
        <h3 className="text-sm font-bold text-gray-900 mb-3">Hasta Bilgileri</h3>
        <div className="grid grid-cols-1 gap-3">
          <Input type="text" label="Hasta Adı" value={data.patientName || ''} onChange={(e) => patch({ patientName: e.target.value })} />
          <Input type="text" label="Hasta TCKN/VKN" value={data.patientTaxId || ''} onChange={(e) => patch({ patientTaxId: e.target.value })} />
        </div>
      </div>
    );
  }

  if (invoiceType === 'sevk') {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
        <h3 className="text-sm font-bold text-gray-900 mb-3">E-İrsaliye Ayarları</h3>
        {renderSystemType()}
      </div>
    );
  }

  return null;
}
