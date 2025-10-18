import React from 'react';
import { Loader2 } from 'lucide-react';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'primary' | 'secondary' | 'white' | 'gray';
  className?: string;
}

const sizeClasses = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12',
};

const colorClasses = {
  primary: 'text-blue-600',
  secondary: 'text-gray-600',
  white: 'text-white',
  gray: 'text-gray-400',
};

export const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  color = 'primary',
  className = '',
}) => {
  const classes = [
    'animate-spin',
    sizeClasses[size],
    colorClasses[color],
    className,
  ].filter(Boolean).join(' ');

  return <Loader2 className={classes} />;
};

interface LoadingProps {
  text?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  color?: 'primary' | 'secondary' | 'white' | 'gray';
  center?: boolean;
  className?: string;
}

export const Loading: React.FC<LoadingProps> = ({
  text = 'Yükleniyor...',
  size = 'md',
  color = 'primary',
  center = false,
  className = '',
}) => {
  const containerClasses = [
    'flex items-center gap-2',
    center ? 'justify-center' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={containerClasses}>
      <Spinner size={size} color={color} />
      {text && (
        <span className={`text-sm ${colorClasses[color]}`}>
          {text}
        </span>
      )}
    </div>
  );
};

export default Spinner;