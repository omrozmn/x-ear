import React from 'react';

interface AlertIconProps extends React.HTMLAttributes<HTMLSpanElement> {
  status?: 'info' | 'warning' | 'success' | 'error';
}

const iconMap = {
  info: '🛈',
  warning: '⚠️',
  success: '✓',
  error: '✕'
};

const colorMap = {
  info: 'text-blue-500',
  warning: 'text-yellow-500',
  success: 'text-green-500',
  error: 'text-red-500'
};

export const AlertIcon: React.FC<AlertIconProps> = ({ 
  status = 'info',
  className = '', 
  ...props 
}) => {
  const classes = [
    'inline-flex items-center justify-center w-5 h-5 mr-2',
    colorMap[status],
    className
  ].filter(Boolean).join(' ');

  return (
    <span className={classes} {...props}>
      {iconMap[status]}
    </span>
  );
};