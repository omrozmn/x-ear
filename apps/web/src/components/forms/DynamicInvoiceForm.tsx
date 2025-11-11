import { Button, Input, Select, Textarea } from '@x-ear/ui-web';
import React, { useState, useEffect, useMemo } from 'react';
import { 
  InvoiceFormSchema, 
  InvoiceFormData, 
  InvoiceFieldDefinition, 
  InvoiceFieldSection,
  InvoiceFormValidationResult,
  InvoiceFormValidationError
} from '../../types/invoice-schema';
import { InvoiceValidationUtils } from '../../utils/invoice-validation';
import { INVOICE_FORM_SCHEMA } from '../../data/invoice-schema';

interface DynamicInvoiceFormProps {
  onSubmit: (data: InvoiceFormData) => void;
  onValidationChange?: (result: InvoiceFormValidationResult) => void;
  onFormDataChange?: (data: InvoiceFormData) => void;
  initialData?: Partial<InvoiceFormData>;
  disabled?: boolean;
  className?: string;
}

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  total: number;
}

export const DynamicInvoiceForm: React.FC<DynamicInvoiceFormProps> = ({
  onSubmit,
  onValidationChange,
  onFormDataChange,
  initialData = {},
  disabled = false,
  className = ''
}) => {
  const [formData, setFormData] = useState<InvoiceFormData>({
    invoiceType: initialData.invoiceType || 'individual',
    scenario: initialData.scenario || 'device_sale',
    ...initialData
  });

  const [items, setItems] = useState<InvoiceItem[]>([
    {
      id: '1',
      description: '',
      quantity: 1,
      unitPrice: 0,
      taxRate: 18,
      total: 0
    }
  ]);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  // Check if a section should be visible based on conditions
  const shouldShowSection = (section: InvoiceFieldSection, data: InvoiceFormData): boolean => {
    if (!section.conditional) return true;

    const { dependsOn, condition, value } = section.conditional;
    const fieldValue = data[dependsOn];

    switch (condition) {
      case 'equals':
        return fieldValue === value;
      case 'not_equals':
        return fieldValue !== value;
      case 'contains':
        return String(fieldValue).includes(String(value));
      default:
        return true;
    }
  };

  // Get visible sections based on invoice type and conditions
  const visibleSections = useMemo(() => {
    const schema = INVOICE_FORM_SCHEMA;
    const invoiceTypeConfig = schema.invoiceTypes[formData.invoiceType];
    
    if (!invoiceTypeConfig) return [];

    const sections: InvoiceFieldSection[] = [];
    
    // Add required sections
    invoiceTypeConfig.requiredFields.forEach(sectionKey => {
      const section = schema.fieldDefinitions[sectionKey];
      if (section) {
        sections.push(section);
      }
    });

    // Add conditional sections
    invoiceTypeConfig.conditionalFields.forEach(sectionKey => {
      const section = schema.fieldDefinitions[sectionKey];
      if (section && shouldShowSection(section, formData)) {
        sections.push(section);
      }
    });

    return sections;
  }, [formData.invoiceType, formData.scenario, formData]);

  // Check if a field should be visible based on conditions
  const shouldShowField = (field: InvoiceFieldDefinition, sectionData: any): boolean => {
    if (!field.conditional) return true;

    const { dependsOn, condition, value } = field.conditional;
    const fieldValue = sectionData[dependsOn];

    switch (condition) {
      case 'equals':
        return fieldValue === value;
      case 'not_equals':
        return fieldValue !== value;
      case 'contains':
        return String(fieldValue).includes(String(value));
      case 'greater_than':
        return Number(fieldValue) > Number(value);
      case 'less_than':
        return Number(fieldValue) < Number(value);
      default:
        return true;
    }
  };

  // Validate a single field
  const validateField = (field: InvoiceFieldDefinition, value: any): string | null => {
    if (field.required && (!value || value === '')) {
      return `${field.label} alanı zorunludur`;
    }

    if (!value) return null;

    const validation = field.validation;
    if (!validation) return null;

    // Pattern validation
    if (validation.pattern && !new RegExp(validation.pattern).test(String(value))) {
      if (field.id === 'tc_number') {
        return InvoiceValidationUtils.validateTCKN(String(value)) 
          ? null 
          : 'Geçersiz T.C. Kimlik Numarası';
      }
      if (field.id === 'tax_number') {
        return InvoiceValidationUtils.validateTurkishTaxNumber(String(value))
          ? null
          : 'Geçersiz Vergi Kimlik Numarası';
      }
      if (field.id === 'postal_code') {
        return InvoiceValidationUtils.validateTurkishPostalCode(String(value))
          ? null
          : 'Geçersiz posta kodu';
      }
      return `${field.label} formatı geçersiz`;
    }

    // Email validation
    if (field.type === 'email' && !InvoiceValidationUtils.validateEmail(String(value))) {
      return 'Geçersiz e-posta adresi';
    }

    // Phone validation
    if (field.type === 'tel' && !InvoiceValidationUtils.validateTurkishPhone(String(value))) {
      return 'Geçersiz telefon numarası';
    }

    // Length validation
    if (validation.minLength && String(value).length < validation.minLength) {
      return `${field.label} en az ${validation.minLength} karakter olmalıdır`;
    }
    if (validation.maxLength && String(value).length > validation.maxLength) {
      return `${field.label} en fazla ${validation.maxLength} karakter olmalıdır`;
    }

    // Number range validation
    if (validation.min !== undefined && Number(value) < validation.min) {
      return `${field.label} en az ${validation.min} olmalıdır`;
    }
    if (validation.max !== undefined && Number(value) > validation.max) {
      return `${field.label} en fazla ${validation.max} olmalıdır`;
    }

    return null;
  };

  // Validate entire form
  const validateForm = (): InvoiceFormValidationResult => {
    const validationErrors: InvoiceFormValidationError[] = [];
    const newErrors: Record<string, string> = {};

    visibleSections.forEach(section => {
      const sectionData = formData[section.name] || {};
      
      Object.values(section.fields).forEach(field => {
        if (shouldShowField(field, sectionData)) {
          const fieldValue = sectionData[field.id];
          const error = validateField(field, fieldValue);
          
          if (error) {
            const fieldKey = `${section.name}.${field.id}`;
            newErrors[fieldKey] = error;
            validationErrors.push({
              field: field.id,
              section: section.name,
              message: error,
              type: field.required && (!fieldValue || fieldValue === '') ? 'required' : 'pattern'
            });
          }
        }
      });
    });

    // Validate items
    if (items.length === 0 || items.every(item => !item.description)) {
      newErrors['items'] = 'En az bir fatura kalemi eklemelisiniz';
      validationErrors.push({
        field: 'items_list',
        section: 'items',
        message: 'En az bir fatura kalemi eklemelisiniz',
        type: 'required'
      });
    }

    setErrors(newErrors);

    const result: InvoiceFormValidationResult = {
      isValid: validationErrors.length === 0,
      errors: validationErrors,
      warnings: []
    };

    if (onValidationChange) {
      onValidationChange(result);
    }

    return result;
  };

  // Handle field change
  const handleFieldChange = (sectionName: string, fieldId: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [sectionName]: {
        ...(prev[sectionName] as Record<string, any> || {}),
        [fieldId]: value
      }
    }));

    // Mark field as touched
    const fieldKey = `${sectionName}.${fieldId}`;
    setTouched(prev => ({ ...prev, [fieldKey]: true }));

    // Clear error for this field
    if (errors[fieldKey]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[fieldKey];
        return newErrors;
      });
    }
  };

  // Handle invoice type change
  const handleInvoiceTypeChange = (type: string) => {
    setFormData(prev => ({
      invoiceType: type,
      scenario: prev.scenario,
      // Clear other sections when type changes
    }));
  };

  // Handle item changes
  const handleItemChange = (index: number, field: keyof InvoiceItem, value: any) => {
    setItems(prev => {
      const newItems = [...prev];
      newItems[index] = {
        ...newItems[index],
        [field]: value
      };
      
      // Recalculate total
      if (field === 'quantity' || field === 'unitPrice' || field === 'taxRate') {
        const item = newItems[index];
        const subtotal = item.quantity * item.unitPrice;
        const tax = subtotal * (item.taxRate / 100);
        newItems[index].total = subtotal + tax;
      }
      
      return newItems;
    });
  };

  // Add new item
  const addItem = () => {
    setItems(prev => [...prev, {
      id: Date.now().toString(),
      description: '',
      quantity: 1,
      unitPrice: 0,
      taxRate: 18,
      total: 0
    }]);
  };

  // Remove item
  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(prev => prev.filter((_, i) => i !== index));
    }
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = validateForm();
    if (validation.isValid) {
      const submitData: InvoiceFormData = {
        ...formData,
        items: items.filter(item => item.description.trim() !== '')
      };
      onSubmit(submitData);
    }
  };

  // Validate on mount and when form data changes
  useEffect(() => {
    validateForm();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData, items]);

  // Call onFormDataChange when form data changes
  useEffect(() => {
    if (onFormDataChange) {
      const submitData: InvoiceFormData = {
        ...formData,
        items: items.filter(item => item.description.trim() !== '')
      };
      onFormDataChange(submitData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData, items]);

  // Render field based on type
  const renderField = (section: InvoiceFieldSection, field: InvoiceFieldDefinition) => {
    const sectionData = formData[section.name] || {};
    const fieldValue = sectionData[field.id] || field.defaultValue || '';
    const fieldKey = `${section.name}.${field.id}`;
    const hasError = errors[fieldKey] && touched[fieldKey];

    if (!shouldShowField(field, sectionData)) {
      return null;
    }

    const commonInputProps = {
      id: field.id,
      name: field.id,
      value: fieldValue,
      disabled,
      className: `w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
        hasError ? 'border-red-500' : 'border-gray-300'
      }`,
      placeholder: field.placeholder,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const value = field.type === 'checkbox' 
          ? (e.target as HTMLInputElement).checked
          : field.type === 'number' 
            ? parseFloat(e.target.value) || 0
            : e.target.value;
        handleFieldChange(section.name, field.id, value);
      }
    };

    const selectProps = {
      value: fieldValue,
      disabled,
      onChange: (e: React.ChangeEvent<HTMLSelectElement>) => {
        handleFieldChange(section.name, field.id, e.target.value);
      },
      options: field.options?.map(option => ({
        value: option.value,
        label: option.text,
        disabled: option.disabled
      })) || [],
      error: hasError ? errors[fieldKey] : undefined,
      fullWidth: true
    };

    let fieldElement;

    switch (field.type) {
      case 'select':
        fieldElement = (
          <Select {...selectProps} />
        );
        break;

      case 'textarea':
        fieldElement = (
          <Textarea 
            {...commonInputProps}
            rows={3}
          />
        );
        break;

      case 'checkbox':
        fieldElement = (
          <Input
            type="checkbox"
            id={field.id}
            name={field.id}
            checked={!!fieldValue}
            disabled={disabled}
            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
            onChange={(e) => handleFieldChange(section.name, field.id, e.target.checked)}
          />
        );
        break;

      default:
        fieldElement = (
          <Input
            type={field.type}
            {...commonInputProps}
          />
        );
    }

    return (
      <div key={field.id} className="mb-4">
        <label htmlFor={field.id} className="block text-sm font-medium text-gray-700 mb-1">
          {field.label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        
        {field.type === 'checkbox' ? (
          <div className="flex items-center">
            {fieldElement}
            <label htmlFor={field.id} className="ml-2 text-sm text-gray-700">
              {field.label}
            </label>
          </div>
        ) : (
          fieldElement
        )}
        
        {field.helpText && (
          <p className="mt-1 text-xs text-gray-500">{field.helpText}</p>
        )}
        
        {hasError && (
          <p className="mt-1 text-xs text-red-500">{errors[fieldKey]}</p>
        )}
      </div>
    );
  };

  // Calculate totals
  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const totalTax = items.reduce((sum, item) => {
      const itemSubtotal = item.quantity * item.unitPrice;
      return sum + (itemSubtotal * (item.taxRate / 100));
    }, 0);
    const total = subtotal + totalTax;

    return { subtotal, totalTax, total };
  }, [items]);

  return (
    <form onSubmit={handleSubmit} className={`space-y-6 ${className}`}>
      {/* Invoice Type Selection */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Fatura Tipi</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(INVOICE_FORM_SCHEMA.invoiceTypes).map(([key, config]) => (
            <label key={key} className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
              <Input
                type="radio"
                name="invoiceType"
                value={key}
                checked={formData.invoiceType === key}
                onChange={(e) => handleInvoiceTypeChange(e.target.value)}
                disabled={disabled}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500"
              />
              <div className="ml-3">
                <div className="text-sm font-medium text-gray-900">{config.name}</div>
                {config.description && (
                  <div className="text-xs text-gray-500">{config.description}</div>
                )}
              </div>
            </label>
          ))}
        </div>
      </div>
      {/* Scenario Selection */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Senaryo</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(INVOICE_FORM_SCHEMA.scenarios)
            .filter(([_, scenario]) => scenario.applicableTypes.includes(formData.invoiceType))
            .map(([key, scenario]) => (
              <label key={key} className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                <Input
                  type="radio"
                  name="scenario"
                  value={key}
                  checked={formData.scenario === key}
                  onChange={(e) => handleFieldChange('', 'scenario', e.target.value)}
                  disabled={disabled}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500"
                />
                <div className="ml-3">
                  <div className="text-sm font-medium text-gray-900">{scenario.name}</div>
                  {scenario.description && (
                    <div className="text-xs text-gray-500">{scenario.description}</div>
                  )}
                </div>
              </label>
            ))}
        </div>
      </div>
      {/* Dynamic Sections */}
      {visibleSections.map(section => (
        <div key={section.name} className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-medium text-gray-900 mb-4">{section.title}</h3>
          {section.description && (
            <p className="text-sm text-gray-600 mb-4">{section.description}</p>
          )}
          
          {section.name === 'items' ? (
            // Special handling for items section
            (<div className="space-y-4">
              {items.map((item, index) => (
                <div key={item.id} className="p-4 border rounded-lg bg-gray-50">
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Açıklama <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="text"
                        value={item.description}
                        onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Ürün/hizmet açıklaması"
                        disabled={disabled}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Miktar <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 1)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={disabled}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Birim Fiyat <span className="text-red-500">*</span>
                      </label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => handleItemChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={disabled}
                      />
                    </div>
                    <div>
                      <Select
                        label="KDV (%)"
                        value={item.taxRate.toString()}
                        onChange={(e) => handleItemChange(index, 'taxRate', parseFloat(e.target.value))}
                        options={[
                          { value: "0", label: "0%" },
                          { value: "1", label: "1%" },
                          { value: "8", label: "8%" },
                          { value: "18", label: "18%" }
                        ]}
                        disabled={disabled}
                        fullWidth
                      />
                    </div>
                    <div className="flex items-end">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Toplam
                        </label>
                        <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-right">
                          {InvoiceValidationUtils.formatTurkishCurrency(item.total)}
                        </div>
                      </div>
                      {items.length > 1 && (
                        <Button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="ml-2 p-2 text-red-600 hover:text-red-800 focus:outline-none"
                          disabled={disabled}
                          variant='default'>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <Button
                type="button"
                onClick={addItem}
                className="w-full p-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={disabled}
                variant='default'>
                + Yeni Kalem Ekle
              </Button>
              {errors.items && (
                <p className="text-sm text-red-500">{errors.items}</p>
              )}
              {/* Totals */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Ara Toplam:</span>
                    <span>{InvoiceValidationUtils.formatTurkishCurrency(totals.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>KDV:</span>
                    <span>{InvoiceValidationUtils.formatTurkishCurrency(totals.totalTax)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-semibold border-t pt-2">
                    <span>Genel Toplam:</span>
                    <span>{InvoiceValidationUtils.formatTurkishCurrency(totals.total)}</span>
                  </div>
                </div>
              </div>
            </div>)
          ) : (
            // Regular section fields
            (<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.values(section.fields).map(field => renderField(section, field))}
            </div>)
          )}
        </div>
      ))}
      {/* Submit Button */}
      <div className="flex justify-end space-x-4">
        <Button
          type="submit"
          disabled={disabled || Object.keys(errors).length > 0}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          variant='default'>
          Fatura Oluştur
        </Button>
      </div>
    </form>
  );
};