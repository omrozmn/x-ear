import { useState, useCallback, useMemo } from 'react';
import { InvoiceFormData, InvoiceValidation } from '../types/invoice';
import { InvoiceValidationService, ValidationContext } from '../services/InvoiceValidationService';

export interface UseInvoiceValidationOptions {
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  debounceMs?: number;
  skipOptionalFields?: boolean;
}

export interface UseInvoiceValidationReturn {
  validation: InvoiceValidation;
  fieldErrors: Record<string, string>;
  fieldWarnings: Record<string, string>;
  isValidating: boolean;
  validateForm: (formData: InvoiceFormData, context?: Partial<ValidationContext>) => Promise<InvoiceValidation>;
  validateField: (fieldName: string, value: unknown, formData: InvoiceFormData) => Promise<string | null>;
  clearFieldError: (fieldName: string) => void;
  clearAllErrors: () => void;
  hasErrors: boolean;
  hasWarnings: boolean;
}

export function useInvoiceValidation(
  options: UseInvoiceValidationOptions = {}
): UseInvoiceValidationReturn {
  const {
    // validateOnChange = true, // Not used yet
    // validateOnBlur = true,   // Not used yet
    // debounceMs = 300,        // Not used yet
    skipOptionalFields = false
  } = options;

  const [validation, setValidation] = useState<InvoiceValidation>({
    isValid: true,
    errors: {},
    warnings: {}
  });

  const [isValidating, setIsValidating] = useState(false);
  const validationService = useMemo(() => InvoiceValidationService.getInstance(), []);

  const validateForm = useCallback(async (
    formData: InvoiceFormData,
    context: Partial<ValidationContext> = {}
  ): Promise<InvoiceValidation> => {
    setIsValidating(true);

    try {
      const validationContext: ValidationContext = {
        formData,
        isSubmitting: false,
        isDraft: false,
        skipOptionalFields,
        ...context
      };

      const result = validationService.validateForm(validationContext);
      setValidation(result);
      return result;
    } finally {
      setIsValidating(false);
    }
  }, [validationService, skipOptionalFields]);

  const validateField = useCallback(async (
    fieldName: string,
    value: unknown,
    formData: InvoiceFormData
  ): Promise<string | null> => {
    const error = validationService.validateField(fieldName, value, formData);

    setValidation(prev => ({
      ...prev,
      errors: {
        ...prev.errors,
        [fieldName]: error || ''
      }
    }));

    return error;
  }, [validationService]);

  const clearFieldError = useCallback((fieldName: string) => {
    setValidation(prev => {
      const newErrors = { ...prev.errors };
      delete newErrors[fieldName];

      return {
        ...prev,
        errors: newErrors,
        isValid: Object.keys(newErrors).length === 0
      };
    });
  }, []);

  const clearAllErrors = useCallback(() => {
    setValidation({
      isValid: true,
      errors: {},
      warnings: {}
    });
  }, []);

  const fieldErrors = useMemo(() => validation.errors, [validation.errors]);
  const fieldWarnings = useMemo(() => validation.warnings, [validation.warnings]);
  const hasErrors = useMemo(() => Object.keys(validation.errors).length > 0, [validation.errors]);
  const hasWarnings = useMemo(() => Object.keys(validation.warnings).length > 0, [validation.warnings]);

  return {
    validation,
    fieldErrors,
    fieldWarnings,
    isValidating,
    validateForm,
    validateField,
    clearFieldError,
    clearAllErrors,
    hasErrors,
    hasWarnings
  };
}

// Hook for real-time field validation with debouncing
export function useFieldValidation(
  fieldName: string,
  formData: InvoiceFormData,
  debounceMs: number = 300
) {
  const [error, setError] = useState<string | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const validationService = useMemo(() => InvoiceValidationService.getInstance(), []);

  const validateField = useCallback(
    async (value: unknown) => {
      setIsValidating(true);

      // Debounce validation
      const timeoutId = setTimeout(async () => {
        try {
          const result = validationService.validateField(fieldName, value, formData);
          setError(result);
        } finally {
          setIsValidating(false);
        }
      }, debounceMs);

      return () => clearTimeout(timeoutId);
    },
    [fieldName, formData, validationService, debounceMs]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    error,
    isValidating,
    validateField,
    clearError
  };
}

// Hook for item validation in invoice forms
export function useItemValidation() {
  const [itemErrors, setItemErrors] = useState<Record<string, Record<string, string>>>({});
  const validationService = useMemo(() => InvoiceValidationService.getInstance(), []);

  const validateItem = useCallback((
    itemIndex: number,
    fieldName: string,
    value: unknown
  ): string | null => {
    const error = validationService.validateItemField(itemIndex, fieldName, value);

    setItemErrors(prev => ({
      ...prev,
      [itemIndex]: {
        ...prev[itemIndex],
        [fieldName]: error || ''
      }
    }));

    return error;
  }, [validationService]);

  const clearItemError = useCallback((itemIndex: number, fieldName?: string) => {
    setItemErrors(prev => {
      const newErrors = { ...prev };

      if (fieldName) {
        if (newErrors[itemIndex]) {
          delete newErrors[itemIndex][fieldName];
          if (Object.keys(newErrors[itemIndex]).length === 0) {
            delete newErrors[itemIndex];
          }
        }
      } else {
        delete newErrors[itemIndex];
      }

      return newErrors;
    });
  }, []);

  const clearAllItemErrors = useCallback(() => {
    setItemErrors({});
  }, []);

  const getItemError = useCallback((itemIndex: number, fieldName: string): string | null => {
    return itemErrors[itemIndex]?.[fieldName] || null;
  }, [itemErrors]);

  const hasItemErrors = useCallback((itemIndex?: number): boolean => {
    if (itemIndex !== undefined) {
      return !!itemErrors[itemIndex] && Object.keys(itemErrors[itemIndex]).length > 0;
    }
    return Object.keys(itemErrors).length > 0;
  }, [itemErrors]);

  return {
    itemErrors,
    validateItem,
    clearItemError,
    clearAllItemErrors,
    getItemError,
    hasItemErrors
  };
}

export default useInvoiceValidation;