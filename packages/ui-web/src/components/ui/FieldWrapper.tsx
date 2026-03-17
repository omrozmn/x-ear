import React from 'react';

interface FieldWrapperProps {
  /** Field label */
  label?: string;
  /** Show required indicator */
  required?: boolean;
  /** Error message */
  error?: string;
  /** Help text below the field */
  hint?: string;
  /** Additional class */
  className?: string;
  /** The form control (Input, Textarea, Select, etc.) */
  children: React.ReactNode;
}

/**
 * FieldWrapper - wraps any form control with consistent label, error, and hint.
 * Use this instead of manually writing <label>/<div>/<p> around form elements.
 *
 * @example
 * <FieldWrapper label="Konu" required error={errors.subject}>
 *   <Input value={subject} onChange={...} />
 * </FieldWrapper>
 */
export const FieldWrapper: React.FC<FieldWrapperProps> = ({
  label,
  required = false,
  error,
  hint,
  className = '',
  children,
}) => {
  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-foreground">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </label>
      )}
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
};
