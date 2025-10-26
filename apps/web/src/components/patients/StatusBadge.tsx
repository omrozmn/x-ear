import React from 'react';
import { Badge } from '@x-ear/ui-web';
import { AlertCircle, CheckCircle, Clock, RefreshCw } from 'lucide-react';

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '' }) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'Kaydedildi':
      case 'saved':
        return { color: 'bg-blue-100 text-blue-800', icon: CheckCircle, text: 'Kaydedildi' };
      case 'Teslim Edildi':
      case 'delivered':
        return { color: 'bg-green-100 text-green-800', icon: CheckCircle, text: 'Teslim Edildi' };
      case 'Beklemede':
      case 'pending':
        return { color: 'bg-yellow-100 text-yellow-800', icon: Clock, text: 'Beklemede' };
      case 'rejected':
        return { color: 'bg-red-100 text-red-800', icon: AlertCircle, text: 'Reddedildi' };
      case 'processing':
        return { color: 'bg-blue-100 text-blue-800', icon: RefreshCw, text: 'İşleniyor' };
      case 'expired':
        return { color: 'bg-red-100 text-red-800', icon: AlertCircle, text: 'Süresi Dolmuş' };
      default:
        return { color: 'bg-gray-100 text-gray-800', icon: AlertCircle, text: 'Bilinmiyor' };
    }
  };

  const config = getStatusConfig(status);
  const Icon = config.icon;

  return (
    <Badge className={`${config.color} ${className} inline-flex items-center gap-1`}>
      <Icon className="w-3 h-3" />
      {config.text}
    </Badge>
  );
};