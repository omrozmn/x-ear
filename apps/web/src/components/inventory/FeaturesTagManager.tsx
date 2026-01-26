import React, { useState } from 'react';
import { X, Plus, Tag } from 'lucide-react';
import { Button, Input } from '@x-ear/ui-web';

interface FeaturesTagManagerProps {
  features: string[];
  onChange: (features: string[]) => void;
  isEditMode?: boolean;
}

export const FeaturesTagManager: React.FC<FeaturesTagManagerProps> = ({
  features,
  onChange,
  isEditMode = false
}) => {
  const [inputValue, setInputValue] = useState('');

  const handleAddFeature = () => {
    const trimmedValue = inputValue.trim();
    if (trimmedValue && !features.includes(trimmedValue)) {
      onChange([...features, trimmedValue]);
      setInputValue('');
    }
  };

  const handleRemoveFeature = (featureToRemove: string) => {
    onChange(features.filter(f => f !== featureToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddFeature();
    }
  };

  if (!isEditMode && features.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
        <Tag className="w-4 h-4 mr-2" />
        Özellikler
      </label>

      {/* Display Tags */}
      {features.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {features.map((feature, index) => (
            <span
              key={index}
              className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
            >
              {feature}
              {isEditMode && (
                <Button
                  onClick={() => handleRemoveFeature(feature)}
                  variant="ghost"
                  size="sm"
                  className="ml-2 hover:text-blue-900 dark:hover:text-blue-200"
                  title="Kaldır"
                >
                  <X className="w-3 h-3" />
                </Button>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Add Feature Input (Edit Mode Only) */}
      {isEditMode && (
        <div className="flex gap-2">
          <Input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Örn: 24 kanal, streaming, şarjlı, bluetooth"
            className="flex-1"
          />
          <Button
            variant="outline"
            onClick={handleAddFeature}
            icon={<Plus className="w-4 h-4" />}
            disabled={!inputValue.trim()}
          >
            Ekle
          </Button>
        </div>
      )}
    </div>
  );
};

export default FeaturesTagManager;
