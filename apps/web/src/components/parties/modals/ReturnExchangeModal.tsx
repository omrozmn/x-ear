import React, { useState, useEffect } from 'react';
import {
  Button,
  Textarea,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Alert,
  Input,
  Select
} from '@x-ear/ui-web';
import {
  X,
  AlertCircle,
  CheckCircle,
  RefreshCw,
  ArrowLeftRight,
  Package,
  FileText,
  Send,
  Eye
} from 'lucide-react';
import { Party } from '../../../types/party';
import { updateSale } from '@/api/client/sales.client';
import type { SaleUpdate, SaleRead, InventoryItemRead } from '@/api/generated/schemas';
import { useInventory } from '../../../hooks/useInventory';
import { useFuzzySearch } from '../../../hooks/useFuzzySearch';

// Use InventoryItemRead directly from generated schemas
type LocalInventoryItem = InventoryItemRead;

/* 
// Local types for API compatibility
interface _APISale {
  id: string;
  partyId?: string;
  totalAmount?: number;
  partyPayment?: number;
}

interface _SalesUpdateSale1Body {
  status?: string;
  notes?: string;
}

interface _InventoryItem {
  id: string;
  name: string;
  brand?: string;
  model?: string;
  price?: number;
}
*/

interface ReturnInvoice {
  id: string;
  invoiceNumber: string;
  amount: number;
  status: 'draft' | 'sent' | 'gib_sent' | 'completed';
  gibSent?: boolean;
  gibSentDate?: string;
  gibErrorMessage?: string;
  createdAt: string;
}

// interface Sale {
//   id: string;
//   productName: string;
//   brand: string;
//   model: string;
//   serialNumber?: string;
//   salePrice: number;
//   saleDate: string;
//   paymentMethod: string;
//   status: string;
//   productId?: string;
//   totalAmount?: number;
//   notes?: string;
// }

interface ReturnExchangeData {
  saleId: string;
  type: 'return' | 'exchange';
  reason: string;
  notes: string;
  refundAmount?: number;
  newProductId?: string;
  newProductName?: string;
  priceDifference?: number;
  createReturnInvoice?: boolean;
  invoiceType?: 'individual' | 'corporate' | 'e_archive';
  supplierName?: string;
  supplierInvoiceNumber?: string;
  supplierInvoiceDate?: string;
  invoiceNote?: string;
}

interface ReturnExchangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  party: Party;
  sale: SaleRead;
  onReturnExchangeCreate: (data: ReturnExchangeData) => void;
}

export const ReturnExchangeModal: React.FC<ReturnExchangeModalProps> = ({
  isOpen,
  onClose,
  party,
  sale,
  onReturnExchangeCreate
}) => {
  // Use inventory hook for products
  const { products } = useInventory(); // productsLoading removed as unused

  const [type, setType] = useState<'return' | 'exchange'>('return');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [priceDifference, setPriceDifference] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // GIB Integration states
  const [createReturnInvoice, setCreateReturnInvoice] = useState(false);
  const [invoiceType, setInvoiceType] = useState<'individual' | 'corporate' | 'e_archive'>('individual');
  const [returnInvoice, setReturnInvoice] = useState<ReturnInvoice | null>(null);
  const [gibLoading, setGibLoading] = useState(false);
  const [supplierName, setSupplierName] = useState('');
  const [supplierInvoiceNumber, setSupplierInvoiceNumber] = useState('');
  const [supplierInvoiceDate, setSupplierInvoiceDate] = useState('');
  const [invoiceNote, setInvoiceNote] = useState('');
  // const [showInvoicePreview, setShowInvoicePreview] = useState(false);
  // const [previewInvoiceData, setPreviewInvoiceData] = useState<any>(null);

  // Device replacement states
  // const [replacementId, setReplacementId] = useState<string | null>(null);
  // const [replacementStatus, setReplacementStatus] = useState<'draft' | 'invoice_created' | 'completed'>('draft');
  const [gibError, setGibError] = useState('');

  // New product selection for exchange
  const [selectedNewProduct, setSelectedNewProduct] = useState<LocalInventoryItem | null>(null);
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [productSearchTerm, setProductSearchTerm] = useState('');

  const returnReasons = [
    'Ürün arızalı',
    'Yanlış ürün gönderildi',
    'Müşteri memnun kalmadı',
    'Ürün hasarlı geldi',
    'Boyut/uyum sorunu',
    'Müşteri fikir değiştirdi',
    'Garanti kapsamında değişim',
    'Diğer'
  ];

  const { /* results, */ search, clearSearch } = useFuzzySearch<LocalInventoryItem>(products, {
    threshold: 0.3,
    maxDistance: 3,
    keys: ['name', 'brand', 'model', 'category', 'barcode', 'serialNumber']
  });

  useEffect(() => {
    if (showProductSearch) {
      search(productSearchTerm);
    } else {
      clearSearch();
    }
  }, [productSearchTerm, showProductSearch, search, clearSearch]);

  // Placeholder for product selection UI - currently incomplete
  // const filteredProducts: LocalInventoryItem[] = useMemo(() => {
  //   if (!showProductSearch) return [];
  //   if (!productSearchTerm.trim()) {
  //     return products.slice(0, 10);
  //   }
  //   return results.slice(0, 10).map(r => r.item);
  // }, [results, products, productSearchTerm, showProductSearch]);

  useEffect(() => {
    if (isOpen) {
      // Reset form when modal opens
      setType('return');
      setReason('');
      setNotes('');
      setRefundAmount('');
      setPriceDifference('');
      setError('');
      setSuccess(false);
      setSelectedNewProduct(null);
      setShowProductSearch(false);
      setProductSearchTerm('');
      // setReplacementId(null);
      // setReplacementStatus('draft');
      setGibError('');
      // focus first control for accessibility
      setTimeout(() => {
        const el = document.querySelector('#return-exchange-first-input') as HTMLElement | null;
        if (el) el.focus();
      }, 50);
    }
  }, [isOpen]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR');
  };

  const validateForm = () => {
    if (!reason) {
      setError('Lütfen iade/değişim nedenini seçiniz.');
      return false;
    }

    if (type === 'return') {
      if (!refundAmount || parseFloat(refundAmount) <= 0) {
        setError('Lütfen geçerli bir iade tutarı giriniz.');
        return false;
      }
      if (parseFloat(refundAmount) > (sale.totalAmount || 0)) {
        setError('İade tutarı satış tutarından fazla olamaz.');
        return false;
      }
    }

    if (type === 'exchange') {
      if (!selectedNewProduct) {
        setError('Lütfen değişim için yeni bir ürün seçiniz.');
        return false;
      }
    }

    return true;
  };

  const createReturnInvoiceForReturn = async (data: ReturnExchangeData) => {
    setGibLoading(true);
    setGibError('');

    try {
      // TODO: Implement return invoice creation API call
      // const api = getXEarCRMAPIAutoGenerated();

      // Mock response for now
      const invoiceData = {
        invoice: {
          id: `INV-${Date.now()}`,
          invoice_number: `İADE-${Date.now()}`,
          created_at: new Date().toISOString()
        }
      };

      setReturnInvoice({
        id: invoiceData.invoice.id,
        invoiceNumber: invoiceData.invoice.invoice_number,
        amount: data.refundAmount || 0,
        status: 'draft',
        createdAt: invoiceData.invoice.created_at
      });

      // Update replacement status
      // setReplacementStatus('invoice_created');

    } catch (error: unknown) {
      console.error('Return invoice creation error:', error);
      const errorMessage = error instanceof Error && 'response' in error 
        ? (error as { response?: { data?: { error?: string } } }).response?.data?.error 
        : undefined;
      setGibError(errorMessage || 'İade faturası oluşturulurken hata oluştu');
    } finally {
      setGibLoading(false);
    }
  };

  const previewInvoice = async () => {
    try {
      // TODO: Implement invoice preview API call
      // Mock preview data for now
      /*
      const mockPreviewData = {
        ...
      };
      */

      // setPreviewInvoiceData(mockPreviewData);
      // setShowInvoicePreview(true);
    } catch (error) {
      console.error('Invoice preview error:', error);
      setError('Fatura önizlemesi yüklenirken hata oluştu');
    }
  };

  const sendInvoiceToGib = async () => {
    setGibLoading(true);
    setGibError('');

    try {
      // TODO: Implement GIB send API call
      // const api = getXEarCRMAPIAutoGenerated();

      // Mock response for now
      /*
      const invoiceData = {
        invoice: {
          gib_sent_date: new Date().toISOString()
        }
      };
      */

      setReturnInvoice(prev => prev ? {
        ...prev,
        status: 'gib_sent',
        gibSent: true,
        gibSentDate: new Date().toISOString() // Using current date directly
      } : null);

      // Update replacement status
      // setReplacementStatus('completed');

    } catch (error: unknown) {
      console.error('GIB send error:', error);
      const errorMessage = error instanceof Error && 'response' in error 
        ? (error as { response?: { data?: { error?: string } } }).response?.data?.error 
        : undefined;
      setGibError(errorMessage || 'GİB gönderimi sırasında hata oluştu');
      setReturnInvoice(prev => prev ? {
        ...prev,
        gibErrorMessage: 'GİB gönderimi başarısız'
      } : null);
    } finally {
      setGibLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Create return/exchange data
      const returnExchangeData: ReturnExchangeData = {
        saleId: sale.id || '',
        type,
        reason,
        notes,
        ...(type === 'return' && { refundAmount: parseFloat(refundAmount) }),
        ...(type === 'exchange' && {
          newProductId: selectedNewProduct?.id,
          newProductName: selectedNewProduct?.name || '',
          priceDifference: priceDifference ? parseFloat(priceDifference) :
            (selectedNewProduct?.price || 0) - (sale.totalAmount || 0)
        }),
        createReturnInvoice,
        invoiceType: createReturnInvoice ? invoiceType : undefined,
        supplierName,
        supplierInvoiceNumber,
        supplierInvoiceDate,
        invoiceNote
      };

      // Update sale status based on return/exchange type
      const updateData: SaleUpdate = {
        status: type === 'return' ? 'RETURNED' : 'EXCHANGED',
        notes: `${type === 'return' ? 'İade' : 'Değişim'} - Neden: ${reason}${notes ? ` - Notlar: ${notes}` : ''}`
      };

      await updateSale(sale.id || '', updateData);

      // Create return invoice if requested
      if (createReturnInvoice && type === 'return') {
        await createReturnInvoiceForReturn(returnExchangeData);
      }

      setSuccess(true);
      onReturnExchangeCreate(returnExchangeData);

      // Close modal after 2 seconds
      setTimeout(() => {
        onClose();
      }, 2000);

    } catch (err: unknown) {
      console.error('Return/Exchange error:', err);
      const errorMessage = err instanceof Error && 'response' in err 
        ? (err as { response?: { data?: { error?: string } } }).response?.data?.error 
        : undefined;
      setError(errorMessage || 'İade/değişim işlemi sırasında bir hata oluştu.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">İade/Değişim İşlemi</h2>
                <p className="text-gray-600 mt-1">
                  {party.firstName} {party.lastName} - Satış #{sale.id}
                </p>
              </div>
              <Button
                type="button"
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-gray-600" />
              </Button>
            </div>

            {/* Success Message */}
            {success && (
              <Alert variant="success">
                <CheckCircle className="h-4 w-4" />
                <span>
                  {type === 'return' ? 'İade işlemi' : 'Değişim işlemi'} başarıyla tamamlandı!
                </span>
              </Alert>
            )}

            {/* Sale Information */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center">
                  <Package className="w-5 h-5 mr-2 text-gray-600" />
                  Satış Bilgileri
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Ürün ID:</span>
                    <span className="text-gray-900">{sale.productId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Satış Fiyatı:</span>
                    <span className="text-gray-900 font-bold">{formatCurrency(sale.totalAmount || 0)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Satış Tarihi:</span>
                    <span className="text-gray-900">{formatDate(sale.saleDate || '')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Ödeme Yöntemi:</span>
                    <span className="text-gray-900">{sale.paymentMethod}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-600">Durum:</span>
                    <span className="text-gray-900">{sale.status}</span>
                  </div>
                  {sale.notes && (
                    <div className="col-span-2">
                      <span className="font-medium text-gray-600">Notlar:</span>
                      <p className="text-gray-900 mt-1">{sale.notes}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Return/Exchange Type Selection */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center">
                  <ArrowLeftRight className="w-5 h-5 mr-2 text-gray-600" />
                  İşlem Türü
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <label className="flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="type"
                      value="return"
                      checked={type === 'return'}
                      onChange={(e) => setType(e.target.value as 'return' | 'exchange')}
                      className="text-red-600 focus:ring-red-500"
                    />
                    <div>
                      <div className="font-medium text-gray-900">İade</div>
                      <div className="text-sm text-gray-600">Ürünü iade et ve para iadesi yap</div>
                    </div>
                  </label>
                  <label className="flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                    <input
                      type="radio"
                      name="type"
                      value="exchange"
                      checked={type === 'exchange'}
                      onChange={(e) => setType(e.target.value as 'return' | 'exchange')}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <div className="font-medium text-gray-900">Değişim</div>
                      <div className="text-sm text-gray-600">Ürünü başka bir ürünle değiştir</div>
                    </div>
                  </label>
                </div>
              </CardContent>
            </Card>

            {/* Reason Selection */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">İade/Değişim Nedeni</CardTitle>
              </CardHeader>
              <CardContent>
                <Select
                  value={reason}
                  onChange={(e: any) => setReason(e.target.value)}
                  options={[
                    { value: '', label: 'Neden seçiniz' },
                    ...returnReasons.map(r => ({ value: r, label: r }))
                  ]}
                  id="return-exchange-first-input"
                />
              </CardContent>
            </Card>

            {/* Return Amount (for returns) */}
            {type === 'return' && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">İade Tutarı</CardTitle>
                </CardHeader>
                <CardContent>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max={sale.totalAmount || 0}
                    placeholder="İade tutarı"
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    className="w-full"
                  />
                  <p className="text-sm text-gray-600 mt-2">
                    Maksimum iade tutarı: {formatCurrency(sale.totalAmount || 0)}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Exchange Details (for exchanges) */}
            {type === 'exchange' && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Değişim Detayları</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Yeni Ürün Seçimi
                    </label>
                    {selectedNewProduct ? (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-green-900">{selectedNewProduct.name}</p>
                            <p className="text-sm text-green-700">
                              {selectedNewProduct.brand} - {selectedNewProduct.model}
                              {selectedNewProduct.barcode && ` (Barkod: ${selectedNewProduct.barcode})`}
                            </p>
                            <p className="text-sm text-green-700 font-medium">
                              Stok: {selectedNewProduct.availableInventory || 0} adet - {formatCurrency(selectedNewProduct.price || 0)}
                            </p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedNewProduct(null);
                              setShowProductSearch(true);
                            }}
                          >
                            Değiştir
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowProductSearch(true)}
                        className="w-full h-12 border-2 border-dashed border-gray-300 hover:border-blue-400"
                      >
                        <Package className="w-5 h-5 mr-2 text-gray-400" />
                        Yeni Ürün Seç
                      </Button>
                    )}
                  </div>

                  {selectedNewProduct && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Fiyat Farkı
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Fiyat farkı (+ ek ödeme, - iade)"
                        value={priceDifference}
                        onChange={(e) => setPriceDifference(e.target.value)}
                        className="w-full"
                      />
                      <p className="text-sm text-gray-600 mt-2">
                        Pozitif değer ek ödeme, negatif değer iade anlamına gelir
                      </p>
                      <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                        <div className="flex justify-between text-sm">
                          <span>Eski ürün fiyatı:</span>
                          <span>{formatCurrency(sale.totalAmount || 0)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Yeni ürün fiyatı:</span>
                          <span>{formatCurrency(selectedNewProduct.price || 0)}</span>
                        </div>
                        <div className="flex justify-between text-sm font-medium border-t pt-1 mt-1">
                          <span>Fiyat farkı:</span>
                          <span className={(selectedNewProduct.price || 0) - (sale.totalAmount || 0) >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {formatCurrency((selectedNewProduct.price || 0) - (sale.totalAmount || 0))}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Return Invoice Section (for returns only) */}
            {type === 'return' && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center">
                    <FileText className="w-5 h-5 mr-2 text-gray-600" />
                    İade Faturası
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="createReturnInvoice"
                      checked={createReturnInvoice}
                      onChange={(e) => setCreateReturnInvoice(e.target.checked)}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <label htmlFor="createReturnInvoice" className="text-sm font-medium text-gray-700">
                      İade faturası oluştur ve GİB'e gönder
                    </label>
                  </div>

                  {createReturnInvoice && (
                    <div className="space-y-3 pl-6 border-l-2 border-blue-200">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Tedarikçi Adı
                        </label>
                        <Input
                          type="text"
                          placeholder="Tedarikçi firma adı"
                          value={supplierName}
                          onChange={(e) => setSupplierName(e.target.value)}
                          className="w-full"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Tedarikçi Fatura Numarası
                        </label>
                        <Input
                          type="text"
                          placeholder="İadeye konu fatura numarası"
                          value={supplierInvoiceNumber}
                          onChange={(e) => setSupplierInvoiceNumber(e.target.value)}
                          className="w-full"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Tedarikçi Fatura Tarihi
                        </label>
                        <Input
                          type="date"
                          value={supplierInvoiceDate}
                          onChange={(e) => setSupplierInvoiceDate(e.target.value)}
                          className="w-full"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Fatura Notu
                        </label>
                        <Textarea
                          rows={2}
                          placeholder="Fatura ile ilgili notlar..."
                          value={invoiceNote}
                          onChange={(e) => setInvoiceNote(e.target.value)}
                          className="resize-none"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Fatura Türü
                        </label>
                        <Select
                          value={invoiceType}
                          onChange={(e: any) => setInvoiceType(e.target.value as 'individual' | 'corporate' | 'e_archive')}
                          options={[
                            { value: 'individual', label: 'Bireysel Fatura' },
                            { value: 'corporate', label: 'Kurumsal Fatura' },
                            { value: 'e_archive', label: 'E-Arşiv Fatura' }
                          ]}
                        />
                      </div>

                      {returnInvoice && (
                        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-blue-900">
                              İade Faturası: {returnInvoice.invoiceNumber}
                            </span>
                            <span className={`text-xs px-2 py-1 rounded-full ${returnInvoice.status === 'gib_sent'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                              }`}>
                              {returnInvoice.status === 'gib_sent' ? 'GİB\'e Gönderildi' : 'Hazırlanıyor'}
                            </span>
                          </div>

                          {returnInvoice.gibSent && returnInvoice.gibSentDate && (
                            <p className="text-xs text-green-700 flex items-center">
                              <CheckCircle className="w-3 h-3 mr-1" />
                              GİB'e gönderildi: {new Date(returnInvoice.gibSentDate).toLocaleString('tr-TR')}
                            </p>
                          )}

                          {gibError && (
                            <p className="text-xs text-red-600 flex items-center mt-1">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              {gibError}
                            </p>
                          )}

                          <div className="flex space-x-2 mt-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="text-xs"
                              onClick={() => returnInvoice && previewInvoice()}
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              Önizle
                            </Button>

                            {!returnInvoice.gibSent && (
                              <Button
                                type="button"
                                size="sm"
                                className="text-xs bg-green-600 hover:bg-green-700"
                                disabled={gibLoading}
                                onClick={() => returnInvoice && sendInvoiceToGib()}
                              >
                                {gibLoading ? (
                                  <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                                ) : (
                                  <Send className="w-3 h-3 mr-1" />
                                )}
                                GİB'e Gönder
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Notes */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Notlar</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  rows={4}
                  placeholder="İade/değişim ile ilgili notlarınızı buraya yazabilirsiniz..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="resize-none"
                />
              </CardContent>
            </Card>

            {/* Error Message */}
            {error && (
              <Alert variant="error">
                <AlertCircle className="h-4 w-4" />
                <span>{error}</span>
              </Alert>
            )}

            {/* Form Actions */}
            <div className="flex justify-end space-x-4 pt-6 border-t bg-gray-50 -mx-6 -mb-6 px-6 py-4">
              <Button
                type="button"
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 rounded-lg transition-colors"
              >
                İptal
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="px-6 py-2 bg-orange-600 text-white hover:bg-orange-700 rounded-lg transition-colors disabled:opacity-50 flex items-center space-x-2"
              >
                {isLoading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                <span>{type === 'return' ? 'İade İşlemini Tamamla' : 'Değişim İşlemini Tamamla'}</span>
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );

};
