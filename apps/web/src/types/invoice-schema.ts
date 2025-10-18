// Invoice Schema Types for Dynamic Form Generation
// Based on legacy DynamicInvoiceForm structure

export interface InvoiceFieldOption {
  value: string;
  text: string;
  disabled?: boolean;
}

export interface InvoiceFieldDefinition {
  id: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'number' | 'select' | 'textarea' | 'checkbox' | 'date';
  required?: boolean;
  placeholder?: string;
  options?: InvoiceFieldOption[];
  validation?: {
    pattern?: string;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
  };
  conditional?: {
    dependsOn: string;
    condition: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';
    value: string | number | boolean;
  };
  defaultValue?: string | number | boolean;
  helpText?: string;
}

export interface InvoiceFieldSection {
  name: string;
  title: string;
  description?: string;
  fields: Record<string, InvoiceFieldDefinition>;
  conditional?: {
    dependsOn: string;
    condition: 'equals' | 'not_equals' | 'contains';
    value: string | number | boolean;
  };
}

export interface InvoiceTypeConfig {
  name: string;
  description?: string;
  requiredFields: string[]; // section keys
  conditionalFields: string[]; // section keys
  scenarios?: string[];
}

export interface InvoiceFormSchema {
  version: string;
  invoiceTypes: Record<string, InvoiceTypeConfig>;
  fieldDefinitions: Record<string, InvoiceFieldSection>;
  scenarios: Record<string, {
    name: string;
    description?: string;
    applicableTypes: string[];
  }>;
}

export interface InvoiceFormData {
  invoiceType: string;
  scenario: string;
  [sectionKey: string]: unknown;
}

export interface InvoiceFormValidationError {
  field: string;
  section: string;
  message: string;
  type: 'required' | 'pattern' | 'length' | 'range' | 'custom';
}

export interface InvoiceFormValidationResult {
  isValid: boolean;
  errors: InvoiceFormValidationError[];
  warnings: InvoiceFormValidationError[];
}