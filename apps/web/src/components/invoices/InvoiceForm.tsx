import { Button, Input, Select, Textarea } from '@x-ear/ui-web';
import { useState, useEffect } from 'react';
import { Invoice, InvoiceItem, InvoiceType, InvoiceStatus, InvoiceAddress, CreateInvoiceData, UpdateInvoiceData } from '../../types/invoice';
import { Patient } from '../../types/patient';
import { usePatients } from '../../hooks/usePatients';

interface InvoiceFormProps {
  invoice?: Invoice;
  onSubmit: (data: CreateInvoiceData | UpdateInvoiceData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

interface InvoiceFormData {
  patientId: string;
  patientName: string;
  invoiceNumber: string;
  type: InvoiceType;
  issueDate: string;
  dueDate: string;
  items: Array<{
    name: string;
    description?: string;
    quantity: number;
    unitPrice: number;
    discount?: number;
    discountType?: 'percentage' | 'amount';
    taxRate: number;
  }>;
  notes: string;
  billingAddress: {
    name: string;
    address: string;
    city: string;
    postalCode: string;
    country: string;
    taxNumber?: string;
    taxOffice?: string;
  };
  shippingAddress: {
    name: string;
    address: string;
    city: string;
    postalCode: string;
    country: string;
  };
  currency: string;
  exchangeRate: number;
  status: InvoiceStatus;
}

export default function InvoiceForm({ invoice, onSubmit, onCancel, isLoading = false }: InvoiceFormProps) {
  const { searchPatients } = usePatients();
  
  const [formData, setFormData] = useState<InvoiceFormData>({
    patientId: invoice?.patientId || '',
    patientName: invoice?.patientName || '',
    invoiceNumber: invoice?.invoiceNumber || '',
    type: invoice?.type || 'sale',
    issueDate: invoice?.issueDate || new Date().toISOString().split('T')[0],
    dueDate: invoice?.dueDate || '',
    items: invoice?.items?.map(item => ({
      name: item.name,
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discount: item.discount,
      discountType: item.discountType,
      taxRate: item.taxRate,
    })) || [],
    notes: invoice?.notes || '',
    billingAddress: {
      name: invoice?.billingAddress?.name || '',
      address: invoice?.billingAddress?.address || '',
      city: invoice?.billingAddress?.city || '',
      postalCode: invoice?.billingAddress?.postalCode || '',
      country: invoice?.billingAddress?.country || 'Türkiye',
      taxNumber: invoice?.billingAddress?.taxNumber || '',
      taxOffice: invoice?.billingAddress?.taxOffice || ''
    },
    shippingAddress: {
      name: invoice?.shippingAddress?.name || '',
      address: invoice?.shippingAddress?.address || '',
      city: invoice?.shippingAddress?.city || '',
      postalCode: invoice?.shippingAddress?.postalCode || '',
      country: invoice?.shippingAddress?.country || 'Türkiye'
    },
    currency: invoice?.currency || 'TRY',
    exchangeRate: invoice?.exchangeRate || 1,
    status: invoice?.status || 'draft'
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [patientSearch, setPatientSearch] = useState('');
  const [patientResults, setPatientResults] = useState<Patient[]>([]);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);

  // Search patients
  useEffect(() => {
    if (patientSearch.length >= 2) {
      searchPatients({ search: patientSearch })
        .then(result => {
          setPatientResults(result.patients);
          setShowPatientDropdown(true);
        })
        .catch(err => console.error('Patient search failed:', err));
    } else {
      setPatientResults([]);
      setShowPatientDropdown(false);
    }
  }, [patientSearch, searchPatients]);

  const handlePatientSelect = (patient: Patient) => {
    setFormData(prev => ({
      ...prev,
      patientId: patient.id,
      patientName: patient.name,
      patientPhone: patient.phone,
      patientTcNumber: patient.tcNumber,
      billingAddress: {
        ...prev.billingAddress,
        name: patient.name,
        address: patient.address || '',
        city: '',
        postalCode: ''
      }
    }));
    setPatientSearch(patient.name);
    setShowPatientDropdown(false);
  };

  // Form handlers
  const handleInputChange = (field: keyof InvoiceFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleAddressChange = (type: 'billingAddress' | 'shippingAddress', field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [field]: value
      }
    }));
  };

  // Item management
  const addItem = () => {
    const newItem = {
      name: '',
      description: '',
      quantity: 1,
      unitPrice: 0,
      discount: 0,
      discountType: 'percentage' as const,
      taxRate: 18
    };
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
  };

  const updateItem = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const removeItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  // Calculations
  const calculateItemTotal = (item: InvoiceFormData['items'][0]) => {
    const subtotal = item.quantity * item.unitPrice;
    const discountAmount = item.discountType === 'percentage' 
      ? subtotal * (item.discount || 0) / 100
      : (item.discount || 0);
    const afterDiscount = subtotal - discountAmount;
    const taxAmount = afterDiscount * item.taxRate / 100;
    return afterDiscount + taxAmount;
  };

  const calculateTotals = () => {
    const subtotal = formData.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const totalDiscount = formData.items.reduce((sum, item) => {
      const itemSubtotal = item.quantity * item.unitPrice;
      return sum + (item.discountType === 'percentage' 
        ? itemSubtotal * (item.discount || 0) / 100
        : (item.discount || 0));
    }, 0);
    const afterDiscount = subtotal - totalDiscount;
    const totalTax = formData.items.reduce((sum, item) => {
      const itemSubtotal = item.quantity * item.unitPrice;
      const itemDiscount = item.discountType === 'percentage' 
        ? itemSubtotal * (item.discount || 0) / 100
        : (item.discount || 0);
      const itemAfterDiscount = itemSubtotal - itemDiscount;
      return sum + (itemAfterDiscount * item.taxRate / 100);
    }, 0);
    const grandTotal = afterDiscount + totalTax;

    return { subtotal, totalDiscount, totalTax, grandTotal };
  };

  // Validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.patientName.trim()) {
      errors.patientName = 'Hasta adı gereklidir';
    }

    if (!formData.invoiceNumber.trim()) {
      errors.invoiceNumber = 'Fatura numarası gereklidir';
    }

    if (!formData.issueDate) {
      errors.issueDate = 'Fatura tarihi gereklidir';
    }

    if (formData.items.length === 0) {
      errors.items = 'En az bir kalem eklemelisiniz';
    }

    formData.items.forEach((item, index) => {
      if (!item.name.trim()) {
        errors[`item_${index}_name`] = 'Kalem adı gereklidir';
      }
      if (item.quantity <= 0) {
        errors[`item_${index}_quantity`] = 'Miktar 0\'dan büyük olmalıdır';
      }
      if (item.unitPrice < 0) {
        errors[`item_${index}_unitPrice`] = 'Birim fiyat negatif olamaz';
      }
    });

    if (!formData.billingAddress.name.trim()) {
      errors.billingAddress_name = 'Fatura adresi adı gereklidir';
    }

    if (!formData.billingAddress.address.trim()) {
      errors.billingAddress_address = 'Fatura adresi gereklidir';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const submitData = {
      type: formData.type,
      patientId: formData.patientId || undefined,
      patientName: formData.patientName,
      billingAddress: {
        name: formData.billingAddress.name,
        address: formData.billingAddress.address,
        city: formData.billingAddress.city,
        postalCode: formData.billingAddress.postalCode || undefined,
        country: formData.billingAddress.country,
        taxNumber: formData.billingAddress.taxNumber || undefined,
        taxOffice: formData.billingAddress.taxOffice || undefined
      },
      shippingAddress: formData.shippingAddress.name ? {
        name: formData.shippingAddress.name,
        address: formData.shippingAddress.address,
        city: formData.shippingAddress.city,
        postalCode: formData.shippingAddress.postalCode || undefined,
        country: formData.shippingAddress.country
      } : undefined,
      issueDate: formData.issueDate,
      dueDate: formData.dueDate || undefined,
      items: formData.items.map(item => ({
        name: item.name,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discount,
        discountType: item.discountType,
        taxRate: item.taxRate
      })),
      notes: formData.notes || undefined,
      currency: formData.currency,
      exchangeRate: formData.exchangeRate
    };

    if (invoice) {
      onSubmit({ ...submitData, id: invoice.id, status: formData.status } as UpdateInvoiceData);
    } else {
      onSubmit(submitData as CreateInvoiceData);
    }
  };

  const totals = calculateTotals();

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          {invoice ? 'Fatura Düzenle' : 'Yeni Fatura'}
        </h2>
        <div className="flex space-x-3">
          <Button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
            variant='default'>
            İptal
          </Button>
          <Button
            type="submit"
            form="invoice-form"
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            variant='default'>
            {isLoading ? 'Kaydediliyor...' : (invoice ? 'Güncelle' : 'Kaydet')}
          </Button>
        </div>
      </div>
      <form id="invoice-form" onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fatura Numarası *
            </label>
            <Input
              type="text"
              value={formData.invoiceNumber}
              onChange={(e) => handleInputChange('invoiceNumber', e.target.value)}
              className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                validationErrors.invoiceNumber ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {validationErrors.invoiceNumber && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.invoiceNumber}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fatura Tipi
            </label>
            <Select
              value={formData.type}
              onChange={(e) => handleInputChange('type', e.target.value as InvoiceType)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="sale">Satış Faturası</option>
              <option value="service">Hizmet Faturası</option>
              <option value="proforma">Proforma Fatura</option>
              <option value="return">İade Faturası</option>
              <option value="replacement">Değişim Faturası</option>
              <option value="sgk">SGK Faturası</option>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fatura Tarihi *
            </label>
            <Input
              type="date"
              value={formData.issueDate}
              onChange={(e) => handleInputChange('issueDate', e.target.value)}
              className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                validationErrors.issueDate ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            {validationErrors.issueDate && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.issueDate}</p>
            )}
          </div>
        </div>

        {/* Patient Selection */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Hasta *
          </label>
          <div className="flex space-x-2">
            <Input
              type="text"
              value={formData.patientName}
              onChange={(e) => {
                handleInputChange('patientName', e.target.value);
                setPatientSearch(e.target.value);
              }}
              placeholder="Hasta adı yazın veya arayın..."
              className={`flex-1 px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                validationErrors.patientName ? 'border-red-300' : 'border-gray-300'
              }`}
            />
            <Button
              type="button"
              onClick={() => setShowPatientDropdown(!showPatientDropdown)}
              className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
              variant='default'>
              🔍
            </Button>
          </div>
          
          {showPatientDropdown && patientResults.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
              {patientResults.map((patient: Patient) => (
                <Button
                  key={patient.id}
                  type="button"
                  onClick={() => handlePatientSelect(patient)}
                  className="w-full px-4 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                  variant='default'>
                  <div className="font-medium">{patient.name}</div>
                  <div className="text-sm text-gray-500">{patient.phone}</div>
                </Button>
              ))}
            </div>
          )}
          
          {validationErrors.patientName && (
            <p className="mt-1 text-sm text-red-600">{validationErrors.patientName}</p>
          )}
        </div>

        {/* Invoice Items */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">Fatura Kalemleri</h3>
            <Button
              type="button"
              onClick={addItem}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              variant='default'>
              + Kalem Ekle
            </Button>
          </div>

          {formData.items.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Henüz kalem eklenmemiş. Yukarıdaki butona tıklayarak kalem ekleyin.
            </div>
          ) : (
            <div className="space-y-4">
              {formData.items.map((item, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Kalem Adı *
                      </label>
                      <Input
                        type="text"
                        value={item.name}
                        onChange={(e) => updateItem(index, 'name', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                          validationErrors[`item_${index}_name`] ? 'border-red-300' : 'border-gray-300'
                        }`}
                      />
                      {validationErrors[`item_${index}_name`] && (
                        <p className="mt-1 text-sm text-red-600">{validationErrors[`item_${index}_name`]}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Miktar *
                      </label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                          validationErrors[`item_${index}_quantity`] ? 'border-red-300' : 'border-gray-300'
                        }`}
                      />
                      {validationErrors[`item_${index}_quantity`] && (
                        <p className="mt-1 text-sm text-red-600">{validationErrors[`item_${index}_quantity`]}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Birim Fiyat *
                      </label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                          validationErrors[`item_${index}_unitPrice`] ? 'border-red-300' : 'border-gray-300'
                        }`}
                      />
                      {validationErrors[`item_${index}_unitPrice`] && (
                        <p className="mt-1 text-sm text-red-600">{validationErrors[`item_${index}_unitPrice`]}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        KDV (%)
                      </label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={item.taxRate}
                        onChange={(e) => updateItem(index, 'taxRate', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>

                    <div className="flex items-end">
                      <Button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="w-full px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                        variant='default'>
                        Sil
                      </Button>
                    </div>
                  </div>

                  <div className="mt-2 text-right text-sm text-gray-600">
                    Toplam: {calculateItemTotal(item).toFixed(2)} {formData.currency}
                  </div>
                </div>
              ))}
            </div>
          )}

          {validationErrors.items && (
            <p className="mt-2 text-sm text-red-600">{validationErrors.items}</p>
          )}
        </div>

        {/* Billing Address */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Fatura Adresi</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ad/Unvan *
              </label>
              <Input
                type="text"
                value={formData.billingAddress.name}
                onChange={(e) => handleAddressChange('billingAddress', 'name', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                  validationErrors.billingAddress_name ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {validationErrors.billingAddress_name && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.billingAddress_name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Şehir
              </label>
              <Input
                type="text"
                value={formData.billingAddress.city}
                onChange={(e) => handleAddressChange('billingAddress', 'city', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Adres *
              </label>
              <Textarea
                value={formData.billingAddress.address}
                onChange={(e) => handleAddressChange('billingAddress', 'address', e.target.value)}
                rows={3}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
                  validationErrors.billingAddress_address ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {validationErrors.billingAddress_address && (
                <p className="mt-1 text-sm text-red-600">{validationErrors.billingAddress_address}</p>
              )}
            </div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notlar
          </label>
          <Textarea
            value={formData.notes}
            onChange={(e) => handleInputChange('notes', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Fatura ile ilgili notlarınızı buraya yazabilirsiniz..."
          />
        </div>

        {/* Totals */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Fatura Özeti</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Ara Toplam:</span>
              <span>{totals.subtotal.toFixed(2)} {formData.currency}</span>
            </div>
            <div className="flex justify-between">
              <span>Toplam İndirim:</span>
              <span>-{totals.totalDiscount.toFixed(2)} {formData.currency}</span>
            </div>
            <div className="flex justify-between">
              <span>Toplam KDV:</span>
              <span>{totals.totalTax.toFixed(2)} {formData.currency}</span>
            </div>
            <div className="flex justify-between text-lg font-bold border-t pt-2">
              <span>Genel Toplam:</span>
              <span>{totals.grandTotal.toFixed(2)} {formData.currency}</span>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}