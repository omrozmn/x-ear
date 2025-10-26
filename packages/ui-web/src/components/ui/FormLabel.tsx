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
    'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1',
    className
  ].filter(Boolean).join(' ');

  return (
    <label className={classes} {...props}>
      {children}
      {isRequired && <span className="text-red-500 ml-1">*</span>}
    </label>
  );
};