/**
 * Party Offline Status Component
 * Shows sync status, offline indicator, and pending operations
 */

import React from 'react';
import { WifiOff, RefreshCw, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { Badge, Button, useToastHelpers } from '@x-ear/ui-web';

interface PartyOfflineStatusProps {
  syncStatus: {
    isOnline: boolean;
    isSyncing: boolean;
    lastSync: string | null;
    pendingOperations: number;
    totalParties: number;
  };
  onSync: () => Promise<void>;
  className?: string;
}

export const PartyOfflineStatus: React.FC<PartyOfflineStatusProps> = ({
  syncStatus,
  onSync,
  className = ''
}) => {
  const { success, error } = useToastHelpers();

  const handleSync = async () => {
    try {
      await onSync();
      success('Senkronizasyon tamamlandı');
    } catch (err) {
      error('Senkronizasyon başarısız: ' + (err instanceof Error ? err.message : 'Bilinmeyen hata'));
    }
  };

  const formatLastSync = (lastSync: string | null) => {
    if (!lastSync) return 'Henüz senkronize edilmedi';
    
    const date = new Date(lastSync);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return 'Az önce';
    if (diffMins < 60) return `${diffMins} dakika önce`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} saat önce`;
    return date.toLocaleDateString('tr-TR');
  };

  const getStatusColor = () => {
    if (!syncStatus.isOnline) return 'bg-red-100 text-red-800 border-red-200';
    if (syncStatus.isSyncing) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (syncStatus.pendingOperations > 0) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-green-100 text-green-800 border-green-200';
  };

  const getStatusIcon = () => {
    if (!syncStatus.isOnline) return <WifiOff className="w-4 h-4" />;
    if (syncStatus.isSyncing) return <RefreshCw className="w-4 h-4 animate-spin" />;
    if (syncStatus.pendingOperations > 0) return <Clock className="w-4 h-4" />;
    return <CheckCircle className="w-4 h-4" />;
  };

  const getStatusText = () => {
    if (!syncStatus.isOnline) return 'Çevrimdışı';
    if (syncStatus.isSyncing) return 'Senkronize ediliyor...';
    if (syncStatus.pendingOperations > 0) return `${syncStatus.pendingOperations} işlem bekliyor`;
    return 'Senkronize';
  };

  return (
    <div className={`flex items-center gap-3 p-3 bg-white border rounded-lg shadow-sm ${className}`}>
      {/* Status Badge */}
      <div className={`flex items-center gap-2 px-3 py-1 rounded-full border ${getStatusColor()}`}>
        {getStatusIcon()}
        <span className="text-sm font-medium">{getStatusText()}</span>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm text-gray-600">
        <div className="flex items-center gap-1">
          <span className="font-medium">{syncStatus.totalParties}</span>
          <span>hasta</span>
        </div>
        
        {syncStatus.lastSync && (
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{formatLastSync(syncStatus.lastSync)}</span>
          </div>
        )}
      </div>

      {/* Sync Button */}
      <div className="ml-auto">
        <Button
          variant="outline"
          size="sm"
          onClick={handleSync}
          disabled={syncStatus.isSyncing || !syncStatus.isOnline}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${syncStatus.isSyncing ? 'animate-spin' : ''}`} />
          Senkronize Et
        </Button>
      </div>

      {/* Pending Operations Indicator */}
      {syncStatus.pendingOperations > 0 && (
        <Badge variant="warning" className="ml-2">
          <AlertCircle className="w-3 h-3 mr-1" />
          {syncStatus.pendingOperations} bekliyor
        </Badge>
      )}
    </div>
  );
};

export default PartyOfflineStatus;