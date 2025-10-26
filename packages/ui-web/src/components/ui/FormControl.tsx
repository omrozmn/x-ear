import React from 'react';

interface FormControlProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  isRequired?: boolean;
  isInvalid?: boolean;
  isDisabled?: boolean;
}

export const FormControl: React.FC<FormControlProps> = ({ 
  children, 
  isRequired = false,
  isInvalid = false,
  isDisabled = false,
  className = '', 
  ...props 
}) => {
  const classes = [
    'form-control',
    isRequired && 'required',
    isInvalid && 'invalid',
    isDisabled && 'disabled',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
};