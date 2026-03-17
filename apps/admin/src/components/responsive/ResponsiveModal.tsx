import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { useAdminResponsive } from '../../hooks/useAdminResponsive';

interface ResponsiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function ResponsiveModal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  className = '',
}: ResponsiveModalProps) {
  const { isMobile } = useAdminResponsive();

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className={`
            relative bg-white dark:bg-gray-800 
            ${isMobile ? 'modal-mobile-fullscreen' : `${sizeClasses[size]} w-full rounded-2xl`}
            shadow-xl
            ${className}
          `}
        >
          {/* Header */}
          {title && (
            <div className={`flex items-center justify-between border-b border-gray-200 dark:border-gray-700 ${isMobile ? 'p-4 pt-safe' : 'p-6'}`}>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {title}
              </h3>
              <button
                onClick={onClose}
                className="p-2 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors touch-feedback"
                aria-label="Close"
              >
                <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
          )}

          {/* Content */}
          <div className={`${isMobile ? 'p-4 pb-safe' : 'p-6'} ${isMobile && title ? '' : 'pt-safe'}`}>
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className={`border-t border-gray-200 dark:border-gray-700 ${isMobile ? 'p-4 pb-safe' : 'p-6'}`}>
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
