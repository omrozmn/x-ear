import React, { useState, useRef, useEffect } from 'react';


interface DropdownItem {
  label: string;
  value: string;
  disabled?: boolean;
  onClick?: () => void;
}

interface DropdownProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
  position?: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right';
  className?: string;
  onSelect?: (item: DropdownItem) => void;
}

const positionClasses = {
  'bottom-left': 'top-full left-0 mt-1',
  'bottom-right': 'top-full right-0 mt-1',
  'top-left': 'bottom-full left-0 mb-1',
  'top-right': 'bottom-full right-0 mb-1'
};

export const Dropdown: React.FC<DropdownProps> = ({
  trigger,
  items,
  position = 'bottom-left',
  className = '',
  onSelect
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleItemClick = (item: DropdownItem) => {
    if (!item.disabled) {
      item.onClick?.();
      onSelect?.(item);
      setIsOpen(false);
    }
  };

  return (
    <div ref={dropdownRef} className={`relative inline-block ${className}`}>
      <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
        {trigger}
      </div>

      {isOpen && (
        <div
          className={`absolute z-50 min-w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg py-1 ${positionClasses[position]}`}
        >
          {items.map((item, index) => (
            <button
              key={index}
              onClick={() => handleItemClick(item)}
              disabled={item.disabled}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700/50 focus:bg-gray-100 dark:focus:bg-gray-700/50 focus:outline-none transition-colors ${item.disabled ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed' : 'text-gray-700 dark:text-gray-200'
                }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};