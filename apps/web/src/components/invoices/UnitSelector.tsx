import { Select } from '@x-ear/ui-web';
import { ExtendedUnitType } from '../../types/invoice';

interface UnitSelectorProps {
  value?: string;
  onChange: (unit: string) => void;
  className?: string;
}

const units: { value: ExtendedUnitType; label: string; category: string }[] = [
  // Sayı Birimleri
  { value: 'Adet', label: 'Adet', category: 'Sayı' },
  { value: 'Paket', label: 'Paket', category: 'Sayı' },
  { value: 'Koli', label: 'Koli', category: 'Sayı' },
  { value: 'Kutu', label: 'Kutu', category: 'Sayı' },
  { value: 'Takım', label: 'Takım', category: 'Sayı' },
  
  // Ağırlık Birimleri
  { value: 'Kg', label: 'Kilogram (Kg)', category: 'Ağırlık' },
  { value: 'Ton', label: 'Ton', category: 'Ağırlık' },
  
  // Hacim Birimleri
  { value: 'Lt', label: 'Litre (Lt)', category: 'Hacim' },
  
  // Uzunluk Birimleri
  { value: 'M', label: 'Metre (M)', category: 'Uzunluk' },
  { value: 'M2', label: 'Metrekare (M²)', category: 'Alan' },
  { value: 'M3', label: 'Metreküp (M³)', category: 'Hacim' },
  
  // Zaman Birimleri
  { value: 'Saat', label: 'Saat', category: 'Zaman' },
  { value: 'Gün', label: 'Gün', category: 'Zaman' },
  { value: 'Ay', label: 'Ay', category: 'Zaman' },
  { value: 'Yıl', label: 'Yıl', category: 'Zaman' },
  
  // Diğer
  { value: 'Kişi', label: 'Kişi', category: 'Diğer' }
];

export function UnitSelector({ value, onChange, className }: UnitSelectorProps) {
  // Kategorilere göre grupla
  const _categories = Array.from(new Set(units.map(u => u.category)));

  const options = [
    { value: '', label: 'Birim Seçiniz' },
    ...units.map(unit => ({
      value: unit.value,
      label: `${unit.label} (${unit.category})`
    }))
  ];

  return (
    <Select
      label="Birim"
      value={value || 'Adet'}
      onChange={(e) => onChange(e.target.value)}
      options={options}
      className={className}
      fullWidth
    />
  );
}
