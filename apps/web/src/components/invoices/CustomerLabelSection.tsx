import { Select, Input, Button } from '@x-ear/ui-web';
import { useState } from 'react';
import { CustomerLabelData } from '../../types/invoice';

interface CustomerLabelSectionProps {
  customerLabel?: CustomerLabelData;
  onChange: (data: CustomerLabelData) => void;
}

const predefinedLabels = [
  { id: '1', name: 'VIP Müşteri', color: '#FFD700' },
  { id: '2', name: 'Kurumsal', color: '#4169E1' },
  { id: '3', name: 'Bireysel', color: '#32CD32' },
  { id: '4', name: 'Toptan', color: '#FF6347' },
  { id: '5', name: 'Perakende', color: '#9370DB' },
  { id: '6', name: 'Yeni Müşteri', color: '#20B2AA' }
];

export function CustomerLabelSection({ customerLabel, onChange }: CustomerLabelSectionProps) {
  const [showCustomLabel, setShowCustomLabel] = useState(false);

  const handleLabelSelect = (labelId: string) => {
    const selected = predefinedLabels.find(l => l.id === labelId);
    if (selected) {
      onChange(selected);
    }
  };

  const handleCustomLabel = () => {
    setShowCustomLabel(true);
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-foreground">
        Alıcı Etiketi
      </label>
      
      <div className="flex items-center space-x-2">
        <Select
          value={customerLabel?.labelId || ''}
          onChange={(e) => handleLabelSelect(e.target.value)}
          options={[
            { value: '', label: 'Etiket Seçiniz' },
            ...predefinedLabels.map(l => ({ value: l.id, label: l.name }))
          ]}
          className="flex-1"
        />
        
        <Button
          type="button"
          onClick={handleCustomLabel}
          className="px-3 py-2 bg-muted border border-border rounded-xl hover:bg-accent dark:hover:bg-gray-600"
          variant="default">
          + Özel
        </Button>
      </div>

      {/* Seçili Etiket Önizleme */}
      {customerLabel?.labelName && (
        <div className="flex items-center space-x-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-xl">
          <div
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: customerLabel.color }}
          />
          <span className="text-sm font-medium text-foreground">
            {customerLabel.labelName}
          </span>
        </div>
      )}

      {/* Özel Etiket Formu */}
      {showCustomLabel && (
        <div className="bg-primary/10 border border-blue-200 dark:border-blue-800 rounded-2xl p-4 space-y-3">
          <h4 className="text-sm font-medium text-blue-900 dark:text-blue-300">Özel Etiket Oluştur</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Etiket Adı
              </label>
              <Input
                type="text"
                placeholder="Örn: Özel Müşteri"
                onChange={(e) => onChange({
                  ...customerLabel,
                  labelId: 'custom',
                  labelName: e.target.value
                })}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Renk
              </label>
              <Input
                type="color"
                defaultValue="#FF5733"
                onChange={(e) => onChange({
                  ...customerLabel,
                  color: e.target.value
                })}
                className="w-full h-10"
              />
            </div>
          </div>
          <Button
            type="button"
            onClick={() => setShowCustomLabel(false)}
            className="text-sm text-primary hover:text-blue-800"
            variant="default">
            Kapat
          </Button>
        </div>
      )}
    </div>
  );
}
