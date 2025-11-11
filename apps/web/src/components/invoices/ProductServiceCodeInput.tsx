import { Input, Select } from '@x-ear/ui-web';
import { useState } from 'react';

interface ProductServiceCodeInputProps {
  value?: string;
  onChange: (code: string) => void;
  onDescriptionChange?: (description: string) => void;
}

const commonServiceCodes = [
  { code: '85.11.10.00.00.19', description: 'Genel Tıbbi Muayene Hizmetleri' },
  { code: '85.12.10.00.00.19', description: 'Uzman Hekim Muayene Hizmetleri' },
  { code: '85.14.10.00.00.19', description: 'Laboratuvar Hizmetleri' },
  { code: '85.14.20.00.00.19', description: 'Görüntüleme Hizmetleri' },
  { code: '32.50.50.00.00.19', description: 'İşitme Cihazı İmalatı' },
  { code: '47.74.10.00.00.19', description: 'Tıbbi Cihaz Satışı' },
  { code: '95.29.11.00.00.19', description: 'İşitme Cihazı Tamir ve Bakım' },
  { code: '85.11.20.00.00.19', description: 'Odyoloji Hizmetleri' },
  { code: '85.59.90.00.00.19', description: 'Diğer Sağlık Hizmetleri' }
];

export function ProductServiceCodeInput({ 
  value, 
  onChange, 
  onDescriptionChange 
}: ProductServiceCodeInputProps) {
  const [showCommonCodes, setShowCommonCodes] = useState(false);

  const handleCodeSelect = (code: string) => {
    const selected = commonServiceCodes.find(c => c.code === code);
    if (selected) {
      onChange(selected.code);
      onDescriptionChange?.(selected.description);
    }
    setShowCommonCodes(false);
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Mal/Hizmet Kodu
      </label>
      
      <div className="flex space-x-2">
        <Input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="00.00.00.00.00.00"
          className="flex-1 font-mono text-sm"
        />
        <button
          type="button"
          onClick={() => setShowCommonCodes(!showCommonCodes)}
          className="px-3 py-2 bg-blue-100 text-blue-600 rounded-md hover:bg-blue-200 text-sm whitespace-nowrap">
          📋 Sık Kullanılan
        </button>
      </div>

      {/* Sık Kullanılan Kodlar */}
      {showCommonCodes && (
        <div className="bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {commonServiceCodes.map((item) => (
            <button
              key={item.code}
              type="button"
              onClick={() => handleCodeSelect(item.code)}
              className="w-full px-4 py-3 text-left hover:bg-blue-50 border-b border-gray-100 last:border-b-0">
              <div className="font-mono text-sm text-blue-600 mb-1">
                {item.code}
              </div>
              <div className="text-sm text-gray-700">
                {item.description}
              </div>
            </button>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-500">
        GİB tarafından belirlenen mal/hizmet kodu (opsiyonel)
      </p>
    </div>
  );
}
