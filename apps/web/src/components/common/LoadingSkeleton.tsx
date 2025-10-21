import React from 'react';

interface LoadingSkeletonProps {
  className?: string;
  lines?: number;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  className = '',
  lines = 3
}) => {
  return (
    <div className={`animate-pulse space-y-3 ${className}`} role="status" aria-label="Yükleniyor">
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className={`bg-gray-300 rounded ${
            index === 0 ? 'h-4 w-3/4' :
            index === 1 ? 'h-4 w-1/2' :
            'h-4 w-2/3'
          }`}
        />
      ))}
    </div>
  );
};