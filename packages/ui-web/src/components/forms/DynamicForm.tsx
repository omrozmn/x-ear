import React, { useState, useEffect, useCallback } from 'react';
import { ChevronDown, AlertCircle, Check } from 'lucide-react';

export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url' | 'textarea' | 'select' | 'multiselect' | 'checkbox' | 'radio' | 'date' | 'datetime-local' | 'file' | 'hidden';
  required?: boolean;
  placeholder?: string;
  defaultValue?: any;
  options?: { label: string; value: any }[];
  validation?: {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    custom?: (value: any) => string | null;
  };
  disabled?: boolean;
  hidden?: boolean;
  description?: string;
  dependsOn?: string;
  showWhen?: (formData: Record<string, any>) => boolean;
  multiple?: boolean;
  accept?: string; // for file inputs
  rows?: number; // for textarea
  step?: number; // for number inputs
  className?: string;
}

export interface FormSection {
  title: string;
  description?: string;
  fields: FormField[];
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

export interface DynamicFormProps {
  fields?: FormField[];
  sections?: FormSection[];
  initialData?: Record<string, any>;
  onSubmit: (data: Record<string, any>) => void | Promise<void>;
  onCancel?: () => void;
  onReset?: () => void;
  onFieldChange?: (name: string, value: any, formData: Record<string, any>) => void;
  submitText?: string;
  cancelText?: string;
  resetText?: string;
  loading?: boolean;
  disabled?: boolean;
  showActions?: boolean;
  actionPosition?: 'top' | 'bottom' | 'both';
  className?: string;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
}

interface FormErrors {
  [key: string]: string;
}

export const DynamicForm: React.FC<DynamicFormProps> = ({
  fields = [],
  sections = [],
  initialData = {},
  onSubmit,
  onCancel,
  onReset,
  onFieldChange,
  submitText = 'Kaydet',
  cancelText = 'İptal',
  resetText = 'Sıfırla',
  loading = false,
  disabled = false,
  showActions = true,
  actionPosition = 'bottom',
  className = '',
  validateOnChange = false,
  validateOnBlur = true,
}) => {
  const [formData, setFormData] = useState<Record<string, any>>(initialData);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  // Initialize collapsed sections
  useEffect(() => {
    const initialCollapsed: Record<string, boolean> = {};
    sections.forEach(section => {
      if (section.collapsible && section.defaultCollapsed) {
        initialCollapsed[section.title] = true;
      }
    });
    setCollapsedSections(initialCollapsed);
  }, [sections]);

  // Update form data when initialData changes
  useEffect(() => {
    setFormData(initialData);
  }, [initialData]);

  const getAllFields = useCallback((): FormField[] => {
    if (sections.length > 0) {
      return sections.flatMap(section => section.fields);
    }
    return fields;
  }, [fields, sections]);

  const validateField = useCallback((field: FormField, value: any): string | null => {
    if (field.required && (value === undefined || value === null || value === '')) {
      return `${field.label} alanı zorunludur`;
    }

    if (field.validation) {
      const { min, max, minLength, maxLength, pattern, custom } = field.validation;

      if (typeof value === 'string') {
        if (minLength && value.length < minLength) {
          return `${field.label} en az ${minLength} karakter olmalıdır`;
        }
        if (maxLength && value.length > maxLength) {
          return `${field.label} en fazla ${maxLength} karakter olmalıdır`;
        }
        if (pattern && !new RegExp(pattern).test(value)) {
          return `${field.label} geçerli bir format değil`;
        }
      }

      if (typeof value === 'number') {
        if (min !== undefined && value < min) {
          return `${field.label} en az ${min} olmalıdır`;
        }
        if (max !== undefined && value > max) {
          return `${field.label} en fazla ${max} olmalıdır`;
        }
      }

      if (custom) {
        const customError = custom(value);
        if (customError) return customError;
      }
    }

    return null;
  }, []);

  const validateForm = useCallback((): FormErrors => {
    const newErrors: FormErrors = {};
    const allFields = getAllFields();

    allFields.forEach(field => {
      if (field.hidden || (field.showWhen && !field.showWhen(formData))) {
        return;
      }

      const error = validateField(field, formData[field.name]);
      if (error) {
        newErrors[field.name] = error;
      }
    });

    return newErrors;
  }, [formData, getAllFields, validateField]);

  const handleFieldChange = (field: FormField, value: any) => {
    const newFormData = { ...formData, [field.name]: value };
    setFormData(newFormData);

    if (validateOnChange) {
      const error = validateField(field, value);
      setErrors(prev => ({
        ...prev,
        [field.name]: error || '',
      }));
    }

    onFieldChange?.(field.name, value, newFormData);
  };

  const handleFieldBlur = (field: FormField) => {
    setTouched(prev => ({ ...prev, [field.name]: true }));

    if (validateOnBlur) {
      const error = validateField(field, formData[field.name]);
      setErrors(prev => ({
        ...prev,
        [field.name]: error || '',
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const formErrors = validateForm();
    setErrors(formErrors);
    
    if (Object.keys(formErrors).length === 0) {
      await onSubmit(formData);
    }
  };

  const handleReset = () => {
    setFormData(initialData);
    setErrors({});
    setTouched({});
    onReset?.();
  };

  const toggleSection = (sectionTitle: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [sectionTitle]: !prev[sectionTitle],
    }));
  };

  const renderField = (field: FormField) => {
    if (field.hidden || (field.showWhen && !field.showWhen(formData))) {
      return null;
    }

    const value = formData[field.name] ?? field.defaultValue ?? '';
    const error = errors[field.name];
    const isTouched = touched[field.name];
    const showError = error && isTouched;

    const baseInputClasses = `
      w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
      ${showError 
        ? 'border-red-300 bg-red-50 dark:border-red-600 dark:bg-red-900/20' 
        : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
      }
      ${field.disabled || disabled ? 'opacity-50 cursor-not-allowed' : ''}
      text-gray-900 dark:text-gray-100
      ${field.className || ''}
    `;

    const renderInput = () => {
      switch (field.type) {
        case 'textarea':
          return (
            <textarea
              id={field.name}
              name={field.name}
              value={value}
              onChange={(e) => handleFieldChange(field, e.target.value)}
              onBlur={() => handleFieldBlur(field)}
              placeholder={field.placeholder}
              disabled={field.disabled || disabled}
              required={field.required}
              rows={field.rows || 3}
              className={baseInputClasses}
            />
          );

        case 'select':
          return (
            <div className="relative">
              <select
                id={field.name}
                name={field.name}
                value={value}
                onChange={(e) => handleFieldChange(field, e.target.value)}
                onBlur={() => handleFieldBlur(field)}
                disabled={field.disabled || disabled}
                required={field.required}
                className={`${baseInputClasses} pr-10 appearance-none`}
              >
                <option value="">{field.placeholder || 'Seçiniz...'}</option>
                {field.options?.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          );

        case 'multiselect':
          return (
            <div className="space-y-2">
              {field.options?.map(option => (
                <label key={option.value} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={Array.isArray(value) ? value.includes(option.value) : false}
                    onChange={(e) => {
                      const currentValues = Array.isArray(value) ? value : [];
                      const newValues = e.target.checked
                        ? [...currentValues, option.value]
                        : currentValues.filter(v => v !== option.value);
                      handleFieldChange(field, newValues);
                    }}
                    disabled={field.disabled || disabled}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{option.label}</span>
                </label>
              ))}
            </div>
          );

        case 'radio':
          return (
            <div className="space-y-2">
              {field.options?.map(option => (
                <label key={option.value} className="flex items-center">
                  <input
                    type="radio"
                    name={field.name}
                    value={option.value}
                    checked={value === option.value}
                    onChange={(e) => handleFieldChange(field, e.target.value)}
                    onBlur={() => handleFieldBlur(field)}
                    disabled={field.disabled || disabled}
                    className="border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{option.label}</span>
                </label>
              ))}
            </div>
          );

        case 'checkbox':
          return (
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={!!value}
                onChange={(e) => handleFieldChange(field, e.target.checked)}
                onBlur={() => handleFieldBlur(field)}
                disabled={field.disabled || disabled}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">{field.label}</span>
            </label>
          );

        case 'file':
          return (
            <input
              type="file"
              id={field.name}
              name={field.name}
              onChange={(e) => handleFieldChange(field, e.target.files?.[0] || null)}
              onBlur={() => handleFieldBlur(field)}
              disabled={field.disabled || disabled}
              required={field.required}
              multiple={field.multiple}
              accept={field.accept}
              className={baseInputClasses}
            />
          );

        case 'number':
          return (
            <input
              type="number"
              id={field.name}
              name={field.name}
              value={value}
              onChange={(e) => handleFieldChange(field, e.target.valueAsNumber || '')}
              onBlur={() => handleFieldBlur(field)}
              placeholder={field.placeholder}
              disabled={field.disabled || disabled}
              required={field.required}
              min={field.validation?.min}
              max={field.validation?.max}
              step={field.step}
              className={baseInputClasses}
            />
          );

        default:
          return (
            <input
              type={field.type}
              id={field.name}
              name={field.name}
              value={value}
              onChange={(e) => handleFieldChange(field, e.target.value)}
              onBlur={() => handleFieldBlur(field)}
              placeholder={field.placeholder}
              disabled={field.disabled || disabled}
              required={field.required}
              minLength={field.validation?.minLength}
              maxLength={field.validation?.maxLength}
              pattern={field.validation?.pattern}
              className={baseInputClasses}
            />
          );
      }
    };

    return (
      <div key={field.name} className="space-y-1">
        {field.type !== 'checkbox' && (
          <label htmlFor={field.name} className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}
        
        {renderInput()}
        
        {field.description && (
          <p className="text-sm text-gray-500 dark:text-gray-400">{field.description}</p>
        )}
        
        {showError && (
          <div className="flex items-center text-sm text-red-600 dark:text-red-400">
            <AlertCircle className="w-4 h-4 mr-1" />
            {error}
          </div>
        )}
      </div>
    );
  };

  const renderActions = () => {
    if (!showActions) return null;

    return (
      <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
        {onReset && (
          <button
            type="button"
            onClick={handleReset}
            disabled={loading || disabled}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {resetText}
          </button>
        )}
        
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={loading || disabled}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {cancelText}
          </button>
        )}
        
        <button
          type="submit"
          disabled={loading || disabled}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Kaydediliyor...
            </>
          ) : (
            <>
              <Check className="w-4 h-4 mr-2" />
              {submitText}
            </>
          )}
        </button>
      </div>
    );
  };

  const renderSection = (section: FormSection) => {
    const isCollapsed = collapsedSections[section.title];

    return (
      <div key={section.title} className="border border-gray-200 dark:border-gray-700 rounded-lg">
        <div
          className={`px-4 py-3 bg-gray-50 dark:bg-gray-700 ${
            section.collapsible ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600' : ''
          }`}
          onClick={section.collapsible ? () => toggleSection(section.title) : undefined}
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                {section.title}
              </h3>
              {section.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {section.description}
                </p>
              )}
            </div>
            {section.collapsible && (
              <ChevronDown
                className={`w-5 h-5 text-gray-400 transition-transform ${
                  isCollapsed ? '-rotate-90' : ''
                }`}
              />
            )}
          </div>
        </div>
        
        {(!section.collapsible || !isCollapsed) && (
          <div className="p-4 space-y-4">
            {section.fields.map(renderField)}
          </div>
        )}
      </div>
    );
  };

  return (
    <form onSubmit={handleSubmit} className={`space-y-6 ${className}`}>
      {actionPosition === 'top' && renderActions()}
      
      {sections.length > 0 ? (
        <div className="space-y-6">
          {sections.map(renderSection)}
        </div>
      ) : (
        <div className="space-y-4">
          {fields.map(renderField)}
        </div>
      )}
      
      {(actionPosition === 'bottom' || actionPosition === 'both') && renderActions()}
    </form>
  );
};

export default DynamicForm;