import React from 'react';

interface SimpleGridProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  columns?: number | { base?: number; sm?: number; md?: number; lg?: number; xl?: number };
  spacing?: number | string;
  minChildWidth?: string;
}

export const SimpleGrid: React.FC<SimpleGridProps> = ({ 
  children, 
  columns = 1,
  spacing = 4,
  minChildWidth,
  className = '', 
  ...props 
}) => {
  let gridClasses = 'grid';
  
  if (minChildWidth) {
    gridClasses += ` grid-cols-[repeat(auto-fit,minmax(${minChildWidth},1fr))]`;
  } else if (typeof columns === 'number') {
    gridClasses += ` grid-cols-${columns}`;
  } else {
    // Handle responsive columns
    const { base = 1, sm, md, lg, xl } = columns;
    gridClasses += ` grid-cols-${base}`;
    if (sm) gridClasses += ` sm:grid-cols-${sm}`;
    if (md) gridClasses += ` md:grid-cols-${md}`;
    if (lg) gridClasses += ` lg:grid-cols-${lg}`;
    if (xl) gridClasses += ` xl:grid-cols-${xl}`;
  }

  const spacingClass = typeof spacing === 'number' ? `gap-${spacing}` : `gap-[${spacing}]`;
  
  const classes = [
    gridClasses,
    spacingClass,
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
};