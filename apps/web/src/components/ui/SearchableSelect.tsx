import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

interface SearchableSelectProps {
  ['data-testid']?: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  fullWidth?: boolean;
  error?: string;
}

export function SearchableSelect({
  'data-testid': dataTestId,
  label,
  value,
  onChange,
  options,
  placeholder = 'Seciniz...',
  disabled = false,
  required = false,
  fullWidth = false,
  error
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedOption = options.find(opt => opt.value === value);
  const displayValue = selectedOption ? selectedOption.label : '';

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setSearchTerm('');
  };

  const handleClearKeyDown = (event: React.KeyboardEvent<HTMLSpanElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      event.stopPropagation();
      onChange('');
      setSearchTerm('');
    }
  };

  return (
    <div className={fullWidth ? 'w-full' : ''} ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-foreground mb-1">
          {label} {required && <span className="text-destructive">*</span>}
        </label>
      )}

      <div className="relative">
        {/* Trigger Button */}
        {/* eslint-disable-next-line no-restricted-syntax */}
        <button
          data-testid={dataTestId}
          data-allow-raw="true"
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={`
            w-full px-3 py-2 pr-10 text-left border rounded-2xl bg-card text-card-foreground relative
            ${error ? 'border-destructive' : 'border-border'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-muted-foreground/50 cursor-pointer'}
            focus:outline-none focus:ring-2 focus:ring-primary
          `}
        >
          <span className={displayValue ? 'text-foreground' : 'text-muted-foreground'}>
            {displayValue || placeholder}
          </span>
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <ChevronDown
              size={16}
              className={`text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`}
            />
          </div>
          {value && !disabled && (
            <span
              data-allow-raw="true"
              role="button"
              tabIndex={0}
              onClick={handleClear}
              onKeyDown={handleClearKeyDown}
              className="absolute inset-y-0 right-8 flex items-center pointer-events-auto"
            >
              <X
                size={16}
                className="text-muted-foreground hover:text-foreground"
              />
            </span>
          )}
        </button>

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-popover text-popover-foreground border border-border rounded-2xl shadow-lg max-h-64 overflow-hidden">
            {/* Search Input */}
            <div className="p-2 border-b border-border">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-2.5 text-muted-foreground" />
                <input
                  data-allow-raw="true"
                  ref={inputRef}
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Ara..."
                  className="w-full pl-9 pr-3 py-2 border border-border rounded-xl text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {/* Options List */}
            <div className="max-h-48 overflow-y-auto">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((option) => (
                  <button
                    data-allow-raw="true"
                    key={option.value}
                    type="button"
                    onClick={() => handleSelect(option.value)}
                    className={`
                      w-full px-3 py-2 text-left text-sm hover:bg-accent
                      ${option.value === value ? 'bg-primary/10 text-primary font-medium' : 'text-foreground'}
                    `}
                  >
                    {option.label}
                  </button>
                ))
              ) : (
                <div className="px-3 py-2 text-sm text-muted-foreground text-center">
                  Sonuc bulunamadi
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="mt-1 text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
