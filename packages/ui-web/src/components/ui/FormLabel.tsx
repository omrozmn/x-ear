import React from 'react';

interface FormLabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  children: React.ReactNode;
  isRequired?: boolean;
}

export const FormLabel: React.FC<FormLabelProps> = ({ 
  children, 
  isRequired = false,
  className = '', 
  ...props 
}) => {
  const classes = [
    'block text-sm font-medium text-foreground mb-1',
    className
  ].filter(Boolean).join(' ');

  return (
    <label className={classes} {...props}>
      {children}
      {isRequired && <span className="text-destructive ml-1">*</span>}
    </label>
  );
};