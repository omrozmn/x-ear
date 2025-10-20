import { useState } from 'react';
import { Invoice, InvoiceFilters, InvoiceStatus, InvoiceType } from '../types/invoice';
import { InvoiceList } from '../components/invoices/InvoiceList';
import { invoiceService } from '../services/invoice.service';
import { DynamicInvoiceForm } from '../components/forms/DynamicInvoiceForm';
import { InvoiceFormData } from '../types/invoice-schema';
import { CreateInvoiceData } from '../types/invoice';
import { Button, Input, Select } from '@x-ear/ui-web';

interface InvoicesPageProps {
  initialViewMode?: 'list' | 'form' | 'details';
}

export function InvoicesPage({ initialViewMode = 'list' }: InvoicesPageProps = {}) {
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [filters, setFilters] = useState<InvoiceFilters>({});
  const [viewMode, setViewMode] = useState<'list' | 'form' | 'details'>(initialViewMode);
  const [showFilters, setShowFilters] = useState(false);

  const handleInvoiceSelect = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setViewMode('details');
  };

  const handleNewInvoice = () => {
    setSelectedInvoice(null);
    setViewMode('form');
  };

  const handleEditInvoice = (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setViewMode('form');
  };

  const handleBackToList = () => {
    setSelectedInvoice(null);
    setViewMode('list');
  };

  const handleFilterChange = (newFilters: Partial<InvoiceFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const clearFilters = () => {
    setFilters({});
  };

  // Convert form data to invoice creation data
  const convertFormDataToInvoiceData = (formData: InvoiceFormData): CreateInvoiceData => {
    const { invoiceType, scenario, items, ...sections } = formData;

    // Extract customer/company info based on invoice type
    let customerInfo: any = {};
    if (invoiceType === 'individual' && sections.customer_info) {
      customerInfo = {
        type: 'individual',
        firstName: sections.customer_info.first_name,
        lastName: sections.customer_info.last_name,
        tcNumber: sections.customer_info.tc_number,
        email: sections.customer_info.email,
        phone: sections.customer_info.phone,
        address: {
          street: sections.customer_info.address,
          city: sections.customer_info.city,
          postalCode: sections.customer_info.postal_code
        }
      };
    } else if (invoiceType === 'corporate' && sections.company_info) {
      customerInfo = {
        type: 'corporate',
        companyName: sections.company_info.company_name,
        taxNumber: sections.company_info.tax_number,
        taxOffice: sections.company_info.tax_office,
        contactPerson: sections.company_info.contact_person,
        email: sections.company_info.email,
        phone: sections.company_info.phone,
        address: {
          street: sections.company_info.address,
          city: sections.company_info.city,
          postalCode: sections.company_info.postal_code
        }
      };
    } else if (invoiceType === 'export' && sections.export_info) {
      customerInfo = {
        type: 'export',
        companyName: sections.export_info.company_name,
        country: sections.export_info.country,
        currency: sections.export_info.currency,
        exchangeRate: sections.export_info.exchange_rate,
        address: {
          street: sections.export_info.address
        }
      };
    }

    // Extract invoice details
    const invoiceDetails = sections.invoice_details || {};

    // Convert items
    const invoiceItems = (items as any[])?.map((item: any) => ({
      name: item.description || item.name || 'Ürün/Hizmet',
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      taxRate: item.taxRate
    })) || [];

    // Extract device info if available
      brand: sections.device_info.device_brand,
      model: sections.device_info.device_model,
      serialNumber: sections.device_info.device_serial,
      side: sections.device_info.device_side,
      warrantyPeriod: sections.device_info.warranty_period
    } : undefined;

    // Extract SGK info if available
    const sgkInfo = sections.sgk_info?.has_sgk_coverage ? {
      hasCoverage: true,
      sgkNumber: sections.sgk_info.sgk_number,
      institution: sections.sgk_info.sgk_institution,
      coverageRate: sections.sgk_info.sgk_coverage_rate
    } : undefined;

    return {
      type: invoiceType as any,
      patientName: customerInfo.firstName ? `${customerInfo.firstName} ${customerInfo.lastName}` : customerInfo.companyName || 'Müşteri',
      patientId: customerInfo.id,
      patientPhone: customerInfo.phone,
      patientTcNumber: customerInfo.tcNumber,
      billingAddress: {
        name: customerInfo.firstName ? `${customerInfo.firstName} ${customerInfo.lastName}` : customerInfo.companyName || 'Müşteri',
        address: customerInfo.address?.street || '',
        city: customerInfo.address?.city || '',
        postalCode: customerInfo.address?.postalCode || '',
        taxNumber: customerInfo.taxNumber,
        taxOffice: customerInfo.taxOffice
      },
      issueDate: invoiceDetails.invoice_date || new Date().toISOString().split('T')[0],
      dueDate: invoiceDetails.due_date,
      paymentMethod: invoiceDetails.payment_method as any,
      notes: invoiceDetails.notes,
      items: invoiceItems
    };
  };

  const handleInvoiceSubmit = async (formData: InvoiceFormData) => {
    try {
      let result;
      if (selectedInvoice) {
        // Update existing invoice
        const updateData = convertFormDataToInvoiceData(formData);
        result = await invoiceService.updateInvoice(selectedInvoice.id, updateData);
      } else {
        // Create new invoice
        const createData = convertFormDataToInvoiceData(formData);
        result = await invoiceService.createInvoice(createData);
      }
      
      // Go back to list view
      handleBackToList();
      
      // Show success message
      console.log('Invoice saved successfully:', result);
      
    } catch (error) {
      console.error('Error submitting invoice:', error);
      // Handle error (show notification, etc.)
    }
  };

  const hasActiveFilters = Object.keys(filters).some(key => {
    const value = filters[key as keyof InvoiceFilters];
    return value !== undefined && value !== null && value !== '';
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              {viewMode !== 'list' && (
                <Button
                  variant="outline"
                  onClick={handleBackToList}
                  icon={
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  }
                  iconPosition="left"
                >
                  Geri
                </Button>
              )}
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {viewMode === 'list' && 'Satışlar'}
                  {viewMode === 'form' && (selectedInvoice ? 'Fatura Düzenle' : 'Yeni Fatura')}
                  {viewMode === 'details' && 'Fatura Detayları'}
                </h1>
                {viewMode === 'list' && (
                  <p className="mt-1 text-sm text-gray-500">
                    Satış faturalarınızı yönetin ve takip edin
                  </p>
                )}
              </div>
            </div>
            
            {viewMode === 'list' && (
              <div className="flex items-center space-x-3">
                <Button
                  variant={hasActiveFilters ? "secondary" : "outline"}
                  onClick={() => setShowFilters(!showFilters)}
                  icon={
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
                    </svg>
                  }
                  iconPosition="left"
                >
                  Filtrele
                  {hasActiveFilters && (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Aktif
                    </span>
                  )}
                </Button>
                
                <Button
                  variant="primary"
                  onClick={handleNewInvoice}
                  icon={
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  }
                  iconPosition="left"
                >
                  Yeni Fatura
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Filters Panel */}
      {viewMode === 'list' && showFilters && (
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Durum
                </label>
                <Select
                  value={filters.status?.[0] || ''}
                  onChange={(e) => handleFilterChange({ 
                    status: e.target.value ? [e.target.value as InvoiceStatus] : undefined 
                  })}
                  options={[
                    { value: '', label: 'Tüm Durumlar' },
                    { value: 'draft', label: 'Taslak' },
                    { value: 'sent', label: 'Gönderildi' },
                    { value: 'paid', label: 'Ödendi' },
                    { value: 'overdue', label: 'Vadesi Geçti' },
                    { value: 'cancelled', label: 'İptal' }
                  ]}
                  placeholder="Durum seçiniz"
                  className="w-full"
                />
              </div>

              {/* Type Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tip
                </label>
                <Select
                  value={filters.type?.[0] || ''}
                  onChange={(e) => handleFilterChange({ 
                    type: e.target.value ? [e.target.value as InvoiceType] : undefined 
                  })}
                  options={[
                    { value: '', label: 'Tüm Tipler' },
                    { value: 'sale', label: 'Satış' },
                    { value: 'service', label: 'Hizmet' },
                    { value: 'proforma', label: 'Proforma' },
                    { value: 'sgk', label: 'SGK' }
                  ]}
                  placeholder="Tip seçiniz"
                  className="w-full"
                />
              </div>

              {/* Date Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Başlangıç Tarihi
                </label>
                <Input
                  type="date"
                  value={filters.issueDateFrom || ''}
                  onChange={(e) => handleFilterChange({ issueDateFrom: e.target.value || undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bitiş Tarihi
                </label>
                <Input
                  type="date"
                  value={filters.issueDateTo || ''}
                  onChange={(e) => handleFilterChange({ issueDateTo: e.target.value || undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Filter Actions */}
            {hasActiveFilters && (
              <div className="mt-4 flex justify-end">
                <Button
                  variant="outline"
                  onClick={clearFilters}
                >
                  Filtreleri Temizle
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {viewMode === 'list' && (
          <InvoiceList
            onInvoiceSelect={handleInvoiceSelect}
            filters={filters}
            showActions={true}
          />
        )}

        {viewMode === 'form' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {selectedInvoice ? 'Fatura Düzenle' : 'Yeni Fatura Oluştur'}
              </h2>
            </div>
            <div className="p-6">
              <DynamicInvoiceForm
                onSubmit={handleInvoiceSubmit}
                initialData={selectedInvoice ? {
                  // Convert selected invoice to form data if editing
                  type: selectedInvoice.type,
                  patientName: selectedInvoice.patientName,
                  patientPhone: selectedInvoice.patientPhone,
                  patientTcNumber: selectedInvoice.patientTcNumber,
                  billingAddress: selectedInvoice.billingAddress,
                  issueDate: selectedInvoice.issueDate,
                  dueDate: selectedInvoice.dueDate,
                  paymentMethod: selectedInvoice.paymentMethod,
                  notes: selectedInvoice.notes,
                  items: selectedInvoice.items,
                  subtotal: selectedInvoice.subtotal,
                  totalDiscount: selectedInvoice.totalDiscount,
                  totalTax: selectedInvoice.totalTax,
                  grandTotal: selectedInvoice.grandTotal,
                  currency: selectedInvoice.currency || 'TRY',
                  autoCalculateTax: true
                } : undefined}
              />
            </div>
          </div>
        )}

        {viewMode === 'details' && selectedInvoice && (
          <InvoiceDetails
            invoice={selectedInvoice}
            onEdit={() => handleEditInvoice(selectedInvoice)}
          />
        )}
      </div>
    </div>
  );
}

interface InvoiceDetailsProps {
  invoice: Invoice;
  onEdit: () => void;
}

function InvoiceDetails({ invoice, onEdit }: InvoiceDetailsProps) {
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(amount);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('tr-TR');
  };

  const getStatusColor = (status: InvoiceStatus): string => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'sent': return 'bg-blue-100 text-blue-800';
      case 'paid': return 'bg-green-100 text-green-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: InvoiceStatus): string => {
    switch (status) {
      case 'draft': return 'Taslak';
      case 'sent': return 'Gönderildi';
      case 'paid': return 'Ödendi';
      case 'overdue': return 'Vadesi Geçti';
      case 'cancelled': return 'İptal';
      default: return status;
    }
  };

  return (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
      {/* Header */}
      <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Fatura #{invoice.invoiceNumber}
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              {formatDate(invoice.createdAt || '')} tarihinde oluşturuldu
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(invoice.status)}`}>
              {getStatusText(invoice.status)}
            </span>
            <Button
              variant="outline"
              onClick={onEdit}
            >
              Düzenle
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-5 sm:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Customer Information */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">Müşteri Bilgileri</h4>
            <dl className="space-y-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Ad Soyad</dt>
                <dd className="text-sm text-gray-900">{invoice.patientName}</dd>
              </div>
              {invoice.patientPhone && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Telefon</dt>
                  <dd className="text-sm text-gray-900">{invoice.patientPhone}</dd>
                </div>
              )}
              {invoice.patientTcNumber && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">TC Kimlik No</dt>
                  <dd className="text-sm text-gray-900">{invoice.patientTcNumber}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Billing Address */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-3">Fatura Adresi</h4>
            <dl className="space-y-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Adres</dt>
                <dd className="text-sm text-gray-900">{invoice.billingAddress?.address || 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Şehir</dt>
                <dd className="text-sm text-gray-900">{invoice.billingAddress?.city || 'N/A'}</dd>
              </div>
              {invoice.billingAddress?.taxNumber && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Vergi No</dt>
                  <dd className="text-sm text-gray-900">{invoice.billingAddress?.taxNumber}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        {/* Invoice Items */}
        <div className="mt-8">
          <h4 className="text-sm font-medium text-gray-900 mb-4">Fatura Kalemleri</h4>
          <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ürün/Hizmet
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Miktar
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Birim Fiyat
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    KDV
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Toplam
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoice.items?.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{item.name}</div>
                        {item.description && (
                          <div className="text-sm text-gray-500">{item.description}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(item.unitPrice)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      %{item.taxRate}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(item.totalPrice)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals */}
        <div className="mt-6 flex justify-end">
          <div className="w-full max-w-md">
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">Ara Toplam</dt>
                <dd className="text-sm text-gray-900">{formatCurrency(invoice.subtotal || 0)}</dd>
              </div>
              {invoice.totalDiscount && invoice.totalDiscount > 0 && (
                <div className="flex justify-between">
                  <dt className="text-sm text-gray-500">İndirim</dt>
                  <dd className="text-sm text-gray-900">-{formatCurrency(invoice.totalDiscount)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-sm text-gray-500">KDV</dt>
                <dd className="text-sm text-gray-900">{formatCurrency(invoice.totalTax || 0)}</dd>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-2">
                <dt className="text-base font-medium text-gray-900">Genel Toplam</dt>
                <dd className="text-base font-medium text-gray-900">{formatCurrency(invoice.grandTotal || 0)}</dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Notes */}
        {invoice.notes && (
          <div className="mt-6">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Notlar</h4>
            <p className="text-sm text-gray-700">{invoice.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}