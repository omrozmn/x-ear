import React from 'react';

interface StackProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  spacing?: number | string;
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
}

const alignClasses = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch'
};

const justifyClasses = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
  around: 'justify-around',
  evenly: 'justify-evenly'
};

export const HStack: React.FC<StackProps> = ({ 
  children, 
  spacing = 4,
  align = 'center',
  justify = 'start',
  className = '', 
  ...props 
}) => {
  const spacingClass = typeof spacing === 'number' ? `gap-${spacing}` : `gap-[${spacing}]`;
  const classes = [
    'flex flex-row',
    spacingClass,
    alignClasses[align],
    justifyClasses[justify],
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
};

export const VStack: React.FC<StackProps> = ({ 
  children, 
  spacing = 4,
  align = 'stretch',
  justify = 'start',
  className = '', 
  ...props 
}) => {
  const spacingClass = typeof spacing === 'number' ? `gap-${spacing}` : `gap-[${spacing}]`;
  const classes = [
    'flex flex-col',
    spacingClass,
    alignClasses[align],
    justifyClasses[justify],
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
};