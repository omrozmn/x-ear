import React from 'react';
import { AlertCircle, X, RefreshCw, AlertTriangle, Info, CheckCircle } from 'lucide-react';

interface ErrorMessageProps {
  title?: string;
  message: string | React.ReactNode;
  type?: 'error' | 'warning' | 'info' | 'success';
  dismissible?: boolean;
  onDismiss?: () => void;
  onRetry?: () => void;
  retryText?: string;
  className?: string;
}

const typeConfig = {
  error: {
    icon: AlertCircle,
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    iconColor: 'text-red-500',
    titleColor: 'text-red-800',
    messageColor: 'text-red-700',
    buttonColor: 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
  },
  warning: {
    icon: AlertTriangle,
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    iconColor: 'text-yellow-500',
    titleColor: 'text-yellow-800',
    messageColor: 'text-yellow-700',
    buttonColor: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500'
  },
  info: {
    icon: Info,
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    iconColor: 'text-blue-500',
    titleColor: 'text-blue-800',
    messageColor: 'text-blue-700',
    buttonColor: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
  },
  success: {
    icon: CheckCircle,
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    iconColor: 'text-green-500',
    titleColor: 'text-green-800',
    messageColor: 'text-green-700',
    buttonColor: 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
  }
};

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  title,
  message,
  type = 'error',
  dismissible = false,
  onDismiss,
  onRetry,
  retryText = 'Tekrar Dene',
  className = ''
}) => {
  const config = typeConfig[type];
  const Icon = config.icon;

  return (
    <div className={`rounded-md border p-4 ${config.bgColor} ${config.borderColor} ${className}`}>
      <div className="flex">
        <div className="flex-shrink-0">
          <Icon className={`h-5 w-5 ${config.iconColor}`} />
        </div>
        
        <div className="ml-3 flex-1">
          {title && (
            <h3 className={`text-sm font-medium ${config.titleColor}`}>
              {title}
            </h3>
          )}
          
          <div className={`${title ? 'mt-2' : ''} text-sm ${config.messageColor}`}>
            <p>{message}</p>
          </div>

          {onRetry && (
            <div className="mt-4">
              <button
                type="button"
                onClick={onRetry}
                className={`inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white ${config.buttonColor} focus:outline-none focus:ring-2 focus:ring-offset-2`}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {retryText}
              </button>
            </div>
          )}
        </div>

        {dismissible && onDismiss && (
          <div className="ml-auto pl-3">
            <div className="-mx-1.5 -my-1.5">
              <button
                type="button"
                onClick={onDismiss}
                className={`inline-flex rounded-md p-1.5 ${config.iconColor} hover:bg-opacity-20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent`}
              >
                <span className="sr-only">Kapat</span>
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Specialized error components
export const NetworkError: React.FC<{ onRetry?: () => void }> = ({ onRetry }) => (
  <ErrorMessage
    title="Bağlantı Hatası"
    message="Sunucuya bağlanırken bir hata oluştu. İnternet bağlantınızı kontrol edin ve tekrar deneyin."
    type="error"
    onRetry={onRetry}
  />
);

export const NotFoundError: React.FC<{ resource?: string }> = ({ resource = 'kaynak' }) => (
  <ErrorMessage
    title="Bulunamadı"
    message={`Aradığınız ${resource} bulunamadı. Sayfa kaldırılmış veya taşınmış olabilir.`}
    type="warning"
  />
);

export const UnauthorizedError: React.FC = () => (
  <ErrorMessage
    title="Yetkisiz Erişim"
    message="Bu sayfaya erişim yetkiniz bulunmuyor. Lütfen giriş yapın veya yöneticinizle iletişime geçin."
    type="error"
  />
);

export const ValidationError: React.FC<{ errors: string[] }> = ({ errors }) => (
  <ErrorMessage
    title="Doğrulama Hatası"
    message={
      <div>
        <p className="mb-2">Lütfen aşağıdaki hataları düzeltin:</p>
        <ul className="list-disc list-inside space-y-1">
          {errors.map((error, index) => (
            <li key={index}>{error}</li>
          ))}
        </ul>
      </div>
    }
    type="error"
  />
);

// Toast-style notifications
export const Toast: React.FC<ErrorMessageProps & { 
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' 
}> = ({ 
  position = 'top-right',
  ...props 
}) => {
  const positionClasses = {
    'top-right': 'fixed top-4 right-4 z-50',
    'top-left': 'fixed top-4 left-4 z-50',
    'bottom-right': 'fixed bottom-4 right-4 z-50',
    'bottom-left': 'fixed bottom-4 left-4 z-50'
  };

  return (
    <div className={positionClasses[position]}>
      <ErrorMessage
        {...props}
        className={`max-w-sm shadow-lg ${props.className || ''}`}
        dismissible={true}
      />
    </div>
  );
};