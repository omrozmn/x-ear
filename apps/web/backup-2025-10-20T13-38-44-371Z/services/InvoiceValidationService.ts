import { InvoiceFormData, InvoiceValidation, InvoiceItem } from '../types/invoice';
import { InvoiceValidationUtils } from '../utils/invoice-validation';

export interface ValidationRule {
  field: string;
  message: string;
  validator: (value: any, formData: InvoiceFormData) => boolean;
}

export interface ValidationContext {
  formData: InvoiceFormData;
  isSubmitting: boolean;
  isDraft: boolean;
  skipOptionalFields?: boolean;
}

export class InvoiceValidationService {
  private static instance: InvoiceValidationService;
  private validationRules: ValidationRule[] = [];

  private constructor() {
    this.initializeValidationRules();
  }

  public static getInstance(): InvoiceValidationService {
    if (!InvoiceValidationService.instance) {
      InvoiceValidationService.instance = new InvoiceValidationService();
    }
    return InvoiceValidationService.instance;
  }

  private initializeValidationRules(): void {
    this.validationRules = [
      // Patient Information Validation
      {
        field: 'patientName',
        message: 'Hasta adı gereklidir',
        validator: (value: string) => !!value && value.trim().length >= 2
      },
      {
        field: 'patientTcNumber',
        message: 'Geçerli bir T.C. kimlik numarası giriniz',
        validator: (value: string) => !value || InvoiceValidationUtils.validateTCKN(value)
      },
      {
        field: 'patientPhone',
        message: 'Geçerli bir telefon numarası giriniz',
        validator: (value: string) => !value || InvoiceValidationUtils.validateTurkishPhone(value)
      },

      // Billing Address Validation
      {
        field: 'billingAddress.name',
        message: 'Fatura adresi adı gereklidir',
        validator: (value: string) => !!value && value.trim().length >= 2
      },
      {
        field: 'billingAddress.address',
        message: 'Fatura adresi gereklidir',
        validator: (value: string) => !!value && value.trim().length >= 10
      },
      {
        field: 'billingAddress.city',
        message: 'Şehir bilgisi gereklidir',
        validator: (value: string) => !!value && value.trim().length >= 2
      },
      {
        field: 'billingAddress.taxNumber',
        message: 'Geçerli bir vergi numarası giriniz',
        validator: (value: string) => !value || InvoiceValidationUtils.validateTurkishTaxNumber(value)
      },
      {
        field: 'billingAddress.postalCode',
        message: 'Geçerli bir posta kodu giriniz',
        validator: (value: string) => !value || InvoiceValidationUtils.validateTurkishPostalCode(value)
      },

      // Date Validation
      {
        field: 'issueDate',
        message: 'Fatura tarihi gereklidir',
        validator: (value: string) => !!value && InvoiceValidationUtils.validateInvoiceDate(value)
      },
      {
        field: 'dueDate',
        message: 'Vade tarihi fatura tarihinden sonra olmalıdır',
        validator: (value: string, formData: InvoiceFormData) => 
          !value || InvoiceValidationUtils.validateDueDate(value, formData.issueDate)
      },

      // Items Validation
      {
        field: 'items',
        message: 'En az bir fatura kalemi gereklidir',
        validator: (value: InvoiceItem[]) => Array.isArray(value) && value.length > 0
      },

      // Amount Validation
      {
        field: 'grandTotal',
        message: 'Toplam tutar 0\'dan büyük olmalıdır',
        validator: (value: number) => typeof value === 'number' && value > 0
      }
    ];
  }

  public validateForm(context: ValidationContext): InvoiceValidation {
    const { formData, isSubmitting, isDraft, skipOptionalFields } = context;
    const errors: Record<string, string> = {};
    const warnings: Record<string, string> = {};

    // Skip validation for drafts unless submitting
    if (isDraft && !isSubmitting) {
      return { isValid: true, errors: {}, warnings: {} };
    }

    // Apply validation rules
    for (const rule of this.validationRules) {
      const fieldValue = this.getNestedValue(formData, rule.field);
      
      // Skip optional field validation if requested
      if (skipOptionalFields && this.isOptionalField(rule.field)) {
        continue;
      }

      if (!rule.validator(fieldValue, formData)) {
        errors[rule.field] = rule.message;
      }
    }

    // Validate items in detail
    if (formData.items && formData.items.length > 0) {
      formData.items.forEach((item, index) => {
        const itemErrors = this.validateInvoiceItem(item, index);
        Object.assign(errors, itemErrors);
      });
    }

    // Business logic validations
    const businessErrors = this.validateBusinessLogic(formData);
    Object.assign(errors, businessErrors);

    // Generate warnings
    const validationWarnings = this.generateWarnings(formData);
    Object.assign(warnings, validationWarnings);

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
      warnings
    };
  }

  private validateInvoiceItem(item: InvoiceItem, index: number): Record<string, string> {
    const errors: Record<string, string> = {};
    const prefix = `items[${index}]`;

    if (!item.name || item.name.trim().length < 2) {
      errors[`${prefix}.name`] = `${index + 1}. kalem adı gereklidir`;
    }

    if (!item.quantity || item.quantity <= 0) {
      errors[`${prefix}.quantity`] = `${index + 1}. kalem miktarı 0'dan büyük olmalıdır`;
    }

    if (!item.unitPrice || item.unitPrice <= 0) {
      errors[`${prefix}.unitPrice`] = `${index + 1}. kalem birim fiyatı 0'dan büyük olmalıdır`;
    }

    if (item.taxRate < 0 || item.taxRate > 100) {
      errors[`${prefix}.taxRate`] = `${index + 1}. kalem vergi oranı 0-100 arasında olmalıdır`;
    }

    // Validate discount
    if (item.discount && item.discount < 0) {
      errors[`${prefix}.discount`] = `${index + 1}. kalem indirimi negatif olamaz`;
    }

    if (item.discountType === 'percentage' && item.discount && item.discount > 100) {
      errors[`${prefix}.discount`] = `${index + 1}. kalem yüzde indirimi 100'den fazla olamaz`;
    }

    return errors;
  }

  private validateBusinessLogic(formData: InvoiceFormData): Record<string, string> {
    const errors: Record<string, string> = {};

    // Corporate invoice must have tax number
    if (formData.type === 'service' && !formData.billingAddress.taxNumber) {
      errors['billingAddress.taxNumber'] = 'Hizmet faturası için vergi numarası gereklidir';
    }

    // SGK invoice validations
    if (formData.type === 'sgk') {
      if (!formData.patientTcNumber) {
        errors['patientTcNumber'] = 'SGK faturası için T.C. kimlik numarası gereklidir';
      }

      // Check if all items have SGK codes
      formData.items.forEach((item, index) => {
        if (!item.sgkCode) {
          errors[`items[${index}].sgkCode`] = `${index + 1}. kalem için SGK kodu gereklidir`;
        }
      });
    }

    // Payment method validations
    if (formData.paymentMethod === 'installment' && !formData.dueDate) {
      errors['dueDate'] = 'Taksitli ödeme için vade tarihi gereklidir';
    }

    // Currency validations
    if (formData.currency !== 'TRY' && !formData.exchangeRate) {
      errors['exchangeRate'] = 'Yabancı para birimi için döviz kuru gereklidir';
    }

    return errors;
  }

  private generateWarnings(formData: InvoiceFormData): Record<string, string> {
    const warnings: Record<string, string> = {};

    // High amount warning
    if (formData.grandTotal > 50000) {
      warnings['grandTotal'] = 'Yüksek tutarlı fatura - onay gerekebilir';
    }

    // Future date warning
    const issueDate = new Date(formData.issueDate);
    const today = new Date();
    if (issueDate > today) {
      warnings['issueDate'] = 'Gelecek tarihli fatura oluşturuyorsunuz';
    }

    // Missing optional but recommended fields
    if (!formData.referenceNumber) {
      warnings['referenceNumber'] = 'Referans numarası eklemeniz önerilir';
    }

    if (!formData.notes && formData.items.some(item => item.discount && item.discount > 0)) {
      warnings['notes'] = 'İndirimli kalemler için açıklama eklemeniz önerilir';
    }

    // Tax office warning for corporate customers
    if (formData.billingAddress.taxNumber && !formData.billingAddress.taxOffice) {
      warnings['billingAddress.taxOffice'] = 'Vergi dairesi bilgisi eklemeniz önerilir';
    }

    return warnings;
  }

  public validateField(fieldName: string, value: any, formData: InvoiceFormData): string | null {
    const rule = this.validationRules.find(r => r.field === fieldName);
    if (rule && !rule.validator(value, formData)) {
      return rule.message;
    }
    return null;
  }

  public validateItemField(itemIndex: number, fieldName: string, value: any): string | null {
    const item = { [fieldName]: value } as Partial<InvoiceItem>;
    const errors = this.validateInvoiceItem(item as InvoiceItem, itemIndex);
    return errors[`items[${itemIndex}].${fieldName}`] || null;
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      if (key.includes('[') && key.includes(']')) {
        const arrayKey = key.substring(0, key.indexOf('['));
        const index = parseInt(key.substring(key.indexOf('[') + 1, key.indexOf(']')));
        const property = key.substring(key.indexOf('].') + 2);
        return current?.[arrayKey]?.[index]?.[property];
      }
      return current?.[key];
    }, obj);
  }

  private isOptionalField(fieldName: string): boolean {
    const optionalFields = [
      'patientPhone',
      'patientTcNumber',
      'dueDate',
      'referenceNumber',
      'orderNumber',
      'notes',
      'internalNotes',
      'billingAddress.taxNumber',
      'billingAddress.taxOffice',
      'billingAddress.postalCode'
    ];
    return optionalFields.includes(fieldName);
  }

  // Real-time validation for form fields
  public createFieldValidator(fieldName: string, formData: InvoiceFormData) {
    return (value: any) => {
      return this.validateField(fieldName, value, formData);
    };
  }

  // Batch validation for multiple fields
  public validateFields(fields: Record<string, any>, formData: InvoiceFormData): Record<string, string> {
    const errors: Record<string, string> = {};
    
    Object.entries(fields).forEach(([fieldName, value]) => {
      const error = this.validateField(fieldName, value, formData);
      if (error) {
        errors[fieldName] = error;
      }
    });

    return errors;
  }

  // Custom validation rule registration
  public addValidationRule(rule: ValidationRule): void {
    this.validationRules.push(rule);
  }

  public removeValidationRule(fieldName: string): void {
    this.validationRules = this.validationRules.filter(rule => rule.field !== fieldName);
  }
}

export default InvoiceValidationService;