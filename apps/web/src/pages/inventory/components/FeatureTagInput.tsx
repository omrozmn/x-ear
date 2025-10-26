import React, { useState, useRef } from 'react';
import { Badge, Button, Input } from '@x-ear/ui-web';

interface FeatureTagInputProps {
  value: string[];
  onChange: (features: string[]) => void;
  placeholder?: string;
  label?: string;
  className?: string;
  error?: string;
}

export const FeatureTagInput: React.FC<FeatureTagInputProps> = ({
  value = [],
  onChange,
  placeholder = "Özellik ekleyin ve Enter'a basın",
  label,
  className = '',
  error
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Predefined common features for suggestions
  const commonFeatures = [
    'Bluetooth',
    'Su geçirmez',
    'Şarj edilebilir',
    'Gürültü engelleme',
    'Kablosuz',
    'Dijital',
    'Programlanabilir',
    'Tinnitus maskeleme',
    'Yön mikrofonu',
    'Telecoil',
    'FM uyumlu',
    'Çok kanallı',
    'Otomatik ayar',
    'Rüzgar gürültüsü azaltma',
    'Geri bildirim önleme'
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addFeature();
    } else if (e.key === 'Backspace' && inputValue === '' && value.length > 0) {
      // Remove last tag when backspace is pressed on empty input
      removeFeature(value.length - 1);
    }
  };

  const addFeature = () => {
    const trimmedValue = inputValue.trim();
    if (trimmedValue && !value.includes(trimmedValue)) {
      onChange([...value, trimmedValue]);
      setInputValue('');
    }
  };

  const removeFeature = (index: number) => {
    const newFeatures = value.filter((_, i) => i !== index);
    onChange(newFeatures);
  };

  const addSuggestedFeature = (feature: string) => {
    if (!value.includes(feature)) {
      onChange([...value, feature]);
    }
  };

  const filteredSuggestions = commonFeatures.filter(
    feature => 
      !value.includes(feature) && 
      feature.toLowerCase().includes(inputValue.toLowerCase())
  );

  return (
    <div className={`space-y-2 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      
      <div 
        className={`min-h-[42px] p-2 border rounded-lg bg-white dark:bg-gray-800 cursor-text transition-colors ${
          isInputFocused 
            ? 'border-blue-500 ring-1 ring-blue-500' 
            : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
        }`}
        onClick={() => inputRef.current?.focus()}
      >
        <div className="flex flex-wrap gap-1 items-center">
          {/* Render existing tags */}
          {value.map((feature, index) => (
            <Badge
              key={index}
              variant="secondary"
              className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
            >
              {feature}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFeature(index);
                }}
                className="ml-1 text-blue-600 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-100"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
                </svg>
              </Button>
            </Badge>
          ))}
          
          {/* Input field */}
          <Input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsInputFocused(true)}
            onBlur={() => setIsInputFocused(false)}
            placeholder={value.length === 0 ? placeholder : ''}
            className="flex-1 min-w-[120px] bg-transparent border-none outline-none text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500"
          />
        </div>
      </div>

      {/* Suggestions */}
      {isInputFocused && inputValue && filteredSuggestions.length > 0 && (
        <div className="absolute z-10 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-40 overflow-y-auto">
          {filteredSuggestions.slice(0, 5).map((feature, index) => (
            <Button
              key={index}
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => addSuggestedFeature(feature)}
              className="w-full px-3 py-2 text-left text-sm text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg"
            >
              {feature}
            </Button>
          ))}
        </div>
      )}

      {/* Common features as quick add buttons */}
      {value.length === 0 && !isInputFocused && (
        <div className="flex flex-wrap gap-1 mt-2">
          <span className="text-xs text-gray-500 dark:text-gray-400 mr-2">Hızlı ekle:</span>
          {commonFeatures.slice(0, 6).map((feature, index) => (
            <Button
              key={index}
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => addSuggestedFeature(feature)}
              className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              + {feature}
            </Button>
          ))}
        </div>
      )}
      
      {/* Error message */}
      {error && (
        <div className="mt-1 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}
    </div>
  );
};