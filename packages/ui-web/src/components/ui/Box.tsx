import React from 'react';

interface BoxProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const Box: React.FC<BoxProps> = ({ 
  children, 
  className = '', 
  ...props 
}) => {
  return (
    <div className={className} {...props}>
      {children}
    </div>
  );
};