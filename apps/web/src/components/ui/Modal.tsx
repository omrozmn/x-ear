import { Button } from '@x-ear/ui-web';
import React, { useEffect } from 'react';
import { X } from 'lucide-react';

type Props = {
  open: boolean;
  title?: string;
  onClose: () => void;
  children?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  className?: string;
};

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-2xl',
  lg: 'max-w-4xl',
  xl: 'max-w-6xl',
  full: 'max-w-[95vw]',
};

export const Modal: React.FC<Props> = ({
  open,
  title,
  onClose,
  children,
  size = 'xl',
  showCloseButton = true,
  closeOnOverlayClick = true,
  className = '',
}) => {
  // ESC tuşu ile modal'ı kapatma
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && open) {
        onClose();
      }
    };

    if (open) {
      document.addEventListener('keydown', handleEscape);
      // Body scroll'unu engelle
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [open, onClose]);

  if (!open) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-[9999] p-4">
      <div
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={handleOverlayClick}
      />
      <div className={`
        bg-white rounded-lg shadow-xl z-10 w-full h-auto max-h-[90vh] 
        flex flex-col overflow-hidden
        ${sizeClasses[size]}
        ${className}
      `}>
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200 flex-shrink-0">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {showCloseButton && (
            <Button
              onClick={onClose}
              aria-label="close"
              variant='ghost'
              className="p-1 hover:bg-gray-100 rounded-full"
            >
              <X size={20} />
            </Button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
