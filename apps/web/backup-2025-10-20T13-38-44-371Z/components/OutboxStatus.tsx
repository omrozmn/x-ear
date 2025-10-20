import { Button } from '@x-ear/ui-web';
import React from 'react';
import { useOutbox } from '../hooks/useOutbox';

interface OutboxStatusProps {
  className?: string;
}

export const OutboxStatus: React.FC<OutboxStatusProps> = ({ className = '' }) => {
  const { stats, isOnline, isSyncing, syncNow, clearFailedOperations } = useOutbox();

  if (!stats) return null;

  const hasPendingOperations = stats.pending > 0;
  const hasFailedOperations = stats.failed > 0;

  return (
    <div className={`outbox-status ${className}`}>
      {/* Online/Offline Indicator */}
      <div className={`flex items-center gap-2 ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
        <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
        <span className="text-sm font-medium">
          {isOnline ? 'Online' : 'Offline'}
        </span>
      </div>
      {/* Sync Status */}
      {isSyncing && (
        <div className="flex items-center gap-2 text-blue-600">
          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Syncing...</span>
        </div>
      )}
      {/* Pending Operations */}
      {hasPendingOperations && (
        <div className="flex items-center gap-2 text-orange-600">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
          <span className="text-sm">
            {stats.pending} pending operation{stats.pending !== 1 ? 's' : ''}
          </span>
        </div>
      )}
      {/* Failed Operations */}
      {hasFailedOperations && (
        <div className="flex items-center gap-2 text-red-600">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span className="text-sm">
            {stats.failed} failed operation{stats.failed !== 1 ? 's' : ''}
          </span>
          <Button
            onClick={clearFailedOperations}
            className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
            variant='default'>
            Clear
          </Button>
        </div>
      )}
      {/* Manual Sync Button */}
      {isOnline && hasPendingOperations && !isSyncing && (
        <Button
          onClick={syncNow}
          className="flex items-center gap-1 text-sm px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
          variant='default'>
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
          </svg>
          Sync Now
        </Button>
      )}
    </div>
  );
};