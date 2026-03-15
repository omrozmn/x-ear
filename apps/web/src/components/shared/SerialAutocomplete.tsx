import React, { useState, useRef, useEffect } from 'react';
import { Input } from '@x-ear/ui-web';

interface SerialAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  availableSerials: string[];
  placeholder?: string;
  label?: string;
  color?: 'blue' | 'red';
  className?: string;
  id?: string;
}

export const SerialAutocomplete: React.FC<SerialAutocompleteProps> = ({
  value,
  onChange,
  availableSerials,
  placeholder = 'Seri numarası',
  label,
  color = 'blue',
  className,
  id,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filteredSerials, setFilteredSerials] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value && isOpen) {
      const filtered = availableSerials.filter(serial =>
        serial.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredSerials(filtered);
    } else if (isOpen) {
      setFilteredSerials(availableSerials);
    } else {
      setFilteredSerials([]);
    }
  }, [value, isOpen, availableSerials]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (serial: string) => {
    onChange(serial);
    setIsOpen(false);
  };

  const colorClasses = {
    blue: 'text-blue-700 dark:text-blue-300',
    red: 'text-red-700 dark:text-red-300'
  };

  return (
    <div className="relative">
      {label && (
        <label className={`block text-sm font-medium mb-1 ${colorClasses[color]}`}>
          {label}
        </label>
      )}
      <Input
        ref={inputRef}
        id={id}
        type="text"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          if (!isOpen) setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        className={className || 'w-full'}
      />

      {isOpen && filteredSerials.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-xl shadow-lg max-h-48 overflow-auto"
        >
          {filteredSerials.map((serial, index) => (
            <div
              key={index}
              onClick={() => handleSelect(serial)}
              className="px-4 py-2 cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
            >
              <span className="text-sm text-gray-900 dark:text-gray-100 font-mono">{serial}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SerialAutocomplete;
