import React, { useState, useEffect, useMemo } from 'react';
import {
  Button,
  Textarea,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Alert,
  Input,
  useToastHelpers
} from '@x-ear/ui-web';
import {
  X,
  AlertCircle,
  CheckCircle,
  FileText,
  Calculator,
  Calendar,
  User
} from 'lucide-react';
import { getCurrentUserId } from '@/utils/auth-utils';
import { useListInventory } from '@/api/client/inventory.client';
import { useCreatePatientDocuments } from '@/api/client/documents.client';
import type { InventoryItemRead } from '@/api/generated/schemas';

import { Party } from '../../../types/party';
import ProductSearchComponent from './components/ProductSearchComponent';

interface ProformaProduct {
  id: string;
  name: string;
  brand: string;
  model: string;
  category: string;
  listPrice: number;
  salePrice: number;
  vatRate: number;
  stock: number;
  serialNumber?: string;
  barcode?: string;
  sgkSupported: boolean;
  sgkCode?: string;
  [key: string]: unknown; // Allow additional properties for compatibility
}

interface ProformaItem {
  product: ProformaProduct;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  discountAmount: number;
  totalPrice: number;
}

interface ProformaData {
  partyId: string;
  proformaNumber: string;
  validUntil: string;
  items: ProformaItem[];
  subtotal: number;
  totalDiscount: number;
  vatAmount: number;
  grandTotal: number;
  notes: string;
  terms: string;
}

interface ProformaModalProps {
  isOpen: boolean;
  onClose: () => void;
  party: Party;
  onProformaCreate: (data: ProformaData, pdfBlob: Blob, fileName: string) => void;
}

export const ProformaModal: React.FC<ProformaModalProps> = ({
  isOpen,
  onClose,
  party,
  onProformaCreate
}) => {
  // State management
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<ProformaProduct | null>(null);
  const [quantity, setQuantity] = useState('1');
  const [customPrice, setCustomPrice] = useState('');
  const [discountPercent, setDiscountPercent] = useState('');
  const [items, setItems] = useState<ProformaItem[]>([]);
  const [validUntil, setValidUntil] = useState('');
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState('Proforma geçerlilik süresi 30 gündür. Fiyatlar KDV dahildir.');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  // Fetch inventory from API
  const { data: inventoryData, isLoading: isLoadingInventory } = useListInventory({
    page: 1,
    per_page: 100
  });

  const { mutateAsync: createDocument } = useCreatePatientDocuments();

  // Toast helpers
  const { success, error: showError } = useToastHelpers();

  // Convert inventory to ProformaProduct format
  const products: ProformaProduct[] = useMemo(() => {
    console.log('🔍 Inventory Data:', inventoryData);

    // Backend returns ResponseEnvelope: {success: true, data: [...]}
    // Orval unwraps the outer response, so we get {data: [...]} directly
    const items = Array.isArray(inventoryData?.data) ? inventoryData.data : [];

    if (!items || items.length === 0) {
      console.log('❌ No inventory items available');
      return [];
    }

    // Category translation map
    const categoryMap: Record<string, string> = {
      'hearing_aid': 'İşitme Cihazı',
      'accessory': 'Aksesuar',
      'battery': 'Pil',
      'earmold': 'Kulak Kalıbı',
      'other': 'Diğer'
    };

    const mapped = items.map((item: InventoryItemRead) => ({
      id: item.id,
      name: item.name || `${item.brand} ${item.model ?? ''}`.trim(),
      brand: item.brand || '',
      model: item.model || '',
      category: categoryMap[item.category ?? ''] || item.category || 'İşitme Cihazı',
      listPrice: item.price || 0,
      salePrice: item.price || 0,
      vatRate: item.vatRate || 18,
      stock: item.availableInventory || 0,
      serialNumber: item.barcode ?? undefined,
      barcode: item.barcode ?? undefined,
      sgkSupported: false,
      sgkCode: ''
    }));
    console.log('✅ Mapped products:', mapped.length, mapped);
    return mapped;
  }, [inventoryData]);

  const searchResults = useMemo(() => {
    console.log('🔎 Search term:', searchTerm, 'Products count:', products.length);
    if (!searchTerm.trim()) {
      console.log('⚠️ Empty search term');
      return [];
    }
    const filtered = products.filter(product =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.model.toLowerCase().includes(searchTerm.toLowerCase())
    );
    console.log('✅ Search results:', filtered.length, filtered);
    return filtered;
  }, [searchTerm, products]);

  useEffect(() => {
    if (isOpen) {
      // Set default valid until date (30 days from now)
      const defaultValidUntil = new Date();
      defaultValidUntil.setDate(defaultValidUntil.getDate() + 30);
      setValidUntil(defaultValidUntil.toISOString().split('T')[0]);

      // Reset form
      setSearchTerm('');
      setSelectedProduct(null);
      setItems([]);
      setQuantity('1');
      setCustomPrice('');
      setDiscountPercent('');
      setNotes('');
      setError('');
      setShowSuccess(false);
    }
  }, [isOpen]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(amount);
  };

  // generateProformaNumber function removed - not used in component
  // Proforma numbers are generated by backend

  const addItem = () => {
    if (!selectedProduct) {
      setError('Lütfen bir ürün seçiniz');
      return;
    }

    const qty = parseInt(quantity) || 1;
    const unitPrice = parseFloat(customPrice) || selectedProduct.salePrice;
    const discount = parseFloat(discountPercent) || 0;
    const discountAmount = (unitPrice * qty * discount) / 100;
    const totalPrice = (unitPrice * qty) - discountAmount;

    const newItem: ProformaItem = {
      product: selectedProduct,
      quantity: qty,
      unitPrice,
      discountPercent: discount,
      discountAmount,
      totalPrice
    };

    setItems(prev => [...prev, newItem]);

    // Reset form
    setSelectedProduct(null);
    setSearchTerm('');
    setQuantity('1');
    setCustomPrice('');
    setDiscountPercent('');
    setError('');
  };

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const totals = useMemo(() => {
    let subtotal = 0;
    let totalDiscount = 0;
    let vatAmount = 0;
    const vatRates = new Set<number>();

    items.forEach(item => {
      const itemSubtotal = item.unitPrice * item.quantity;
      const itemDiscount = item.discountAmount;
      const itemNet = itemSubtotal - itemDiscount;
      // Use vatRate from product, defaulting to 18 if missing
      const rate = item.product.vatRate ?? 18;
      vatRates.add(rate);
      const itemVat = itemNet * (rate / 100);

      subtotal += itemSubtotal;
      totalDiscount += itemDiscount;
      vatAmount += itemVat;
    });

    const grandTotal = subtotal - totalDiscount + vatAmount;

    // Determine VAT label
    let vatLabel = 'KDV';
    if (vatRates.size === 1) {
      vatLabel = `KDV (%${Array.from(vatRates)[0]})`;
    } else if (vatRates.size > 1) {
      vatLabel = `KDV (Karma: ${Array.from(vatRates).sort((a, b) => a - b).map(r => `%${r}`).join(', ')})`;
    }

    return {
      subtotal,
      totalDiscount,
      vatAmount,
      grandTotal,
      vatLabel
    };
  }, [items]);

  // Form validation
  const validateForm = () => {
    if (items.length === 0) {
      return { isValid: false, message: 'En az bir ürün eklemelisiniz' };
    }

    if (!validUntil) {
      return { isValid: false, message: 'Geçerlilik tarihi seçmelisiniz' };
    }

    const validDate = new Date(validUntil);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (validDate <= today) {
      return { isValid: false, message: 'Geçerlilik tarihi bugünden sonra olmalıdır' };
    }

    return { isValid: true, message: '' };
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validateForm();
    if (!validation.isValid) {
      setError(validation.message);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Generate proforma number
      const proformaNumber = `PF-${Date.now()}`;
      const proformaDate = new Date().toLocaleDateString('tr-TR');

      // Generate PDF
      const pdfBlob = await generateProformaPDFBlob();

      // Save as document to backend
      const fileName = `Proforma_${proformaNumber}_${party.firstName}_${party.lastName}_${proformaDate}.pdf`;

      try {
        console.log('📄 Saving document to backend...', {
          partyId: party.id,
          fileName,
          documentType: 'proforma',
          notes: notes || `Proforma Fatura - ${proformaNumber}`
        });

        // Convert PDF blob to base64
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onloadend = () => {
            const base64 = reader.result as string;
            // Remove data:application/pdf;base64, prefix
            const base64Content = base64.split(',')[1];
            resolve(base64Content);
          };
          reader.onerror = reject;
          reader.readAsDataURL(pdfBlob);
        });

        const base64Content = await base64Promise;

        const docResult = await createDocument({
          partyId: party.id,
          data: {
            type: 'proforma',
            fileName: fileName,
            content: base64Content,
            mimeType: 'application/pdf',
            metadata: {
              proformaNumber,
              validUntil,
              grandTotal: totals.grandTotal,
              notes: notes || ''
            },
            createdBy: getCurrentUserId() || 'system'
          }
        });

        console.log('✅ Document saved successfully:', docResult);

        // Show success toast
        success('Proforma belgelere kaydedildi');
      } catch (docError) {
        console.error('❌ Document save error (non-blocking):', docError);
        showError('Proforma oluşturuldu ancak belgelere kaydedilemedi');
      }

      // Prepare data for parent component
      const finalProformaData = {
        partyId: party.id,
        proformaNumber: proformaNumber,
        validUntil: validUntil,
        items: items,
        subtotal: totals.subtotal,
        totalDiscount: totals.totalDiscount,
        vatAmount: totals.vatAmount,
        grandTotal: totals.grandTotal,
        notes: notes,
        terms: terms
      };

      setShowSuccess(true);

      // Call parent callback with PDF blob and filename to open viewer in parent
      onProformaCreate(finalProformaData, pdfBlob, fileName);

      // Close proforma creation modal
      onClose();

    } catch (error) {
      console.error('Proforma creation error:', error);
      setError(error instanceof Error ? error.message : 'Proforma oluşturulurken bir hata oluştu');
      showError(error instanceof Error ? error.message : 'Proforma oluşturulurken bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  // Generate PDF for proforma and return as Blob
  const generateProformaPDFBlob = async (): Promise<Blob> => {
    // Dynamic import of jsPDF
    const jsPDFModule = await import('jspdf');
    const jsPDF = jsPDFModule.default;

    const pdf = new jsPDF();
    const proformaNumber = `PF-${Date.now()}`;

    // Company header
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text('X-EAR İŞİTME CİHAZLARI', 20, 30);

    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Adres: Merkez Mah. İşitme Sok. No:1 İstanbul', 20, 40);
    pdf.text('Tel: +90 212 555 0123', 20, 50);

    // Proforma title and number
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('PROFORMA FATURA', 20, 70);

    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Proforma No: ${proformaNumber}`, 20, 85);
    pdf.text(`Tarih: ${new Date().toLocaleDateString('tr-TR')}`, 20, 95);
    pdf.text(`Geçerlilik: ${new Date(validUntil).toLocaleDateString('tr-TR')}`, 20, 105);

    // Customer info
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('MÜŞTERİ BİLGİLERİ', 20, 125);

    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Ad Soyad: ${party.firstName} ${party.lastName}`, 20, 140);
    pdf.text(`TC No: ${party.tcNumber}`, 20, 150);
    pdf.text(`Telefon: ${party.phone}`, 20, 160);

    // Items table header
    let yPos = 180;
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('ÜRÜN ADI', 20, yPos);
    pdf.text('MİKTAR', 80, yPos);
    pdf.text('BİRİM FİYAT', 110, yPos);
    pdf.text('İNDİRİM', 140, yPos);
    pdf.text('TOPLAM', 170, yPos);

    // Draw line under header
    pdf.line(20, yPos + 5, 190, yPos + 5);
    yPos += 15;

    // Items
    pdf.setFont('helvetica', 'normal');
    items.forEach((item) => {
      const productName = `${item.product.brand} ${item.product.model}`;
      pdf.text(productName.substring(0, 25), 20, yPos);
      pdf.text(item.quantity.toString(), 80, yPos);
      pdf.text(`${item.unitPrice.toLocaleString('tr-TR')} TL`, 110, yPos);
      pdf.text(`%${item.discountPercent}`, 140, yPos);
      pdf.text(`${item.totalPrice.toLocaleString('tr-TR')} TL`, 170, yPos);
      yPos += 10;
    });

    // Summary
    yPos += 10;
    pdf.line(20, yPos, 190, yPos);
    yPos += 15;

    pdf.setFont('helvetica', 'normal');
    pdf.text(`Ara Toplam: ${totals.subtotal.toLocaleString('tr-TR')} TL`, 120, yPos);
    yPos += 10;
    pdf.text(`Toplam İndirim: ${totals.totalDiscount.toLocaleString('tr-TR')} TL`, 120, yPos);
    yPos += 10;
    pdf.text(`KDV (%18): ${totals.vatAmount.toLocaleString('tr-TR')} TL`, 120, yPos);
    yPos += 10;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.text(`GENEL TOPLAM: ${totals.grandTotal.toLocaleString('tr-TR')} TL`, 120, yPos);

    // Terms and conditions
    if (terms) {
      yPos += 20;
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Şartlar ve Koşullar:', 20, yPos);
      yPos += 10;
      const termsLines = pdf.splitTextToSize(terms, 170);
      pdf.text(termsLines, 20, yPos);
    }

    // Notes
    if (notes) {
      yPos += (terms ? 20 : 10);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Notlar:', 20, yPos);
      yPos += 10;
      const notesLines = pdf.splitTextToSize(notes, 170);
      pdf.text(notesLines, 20, yPos);
    }

    // Return as Blob
    return pdf.output('blob');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-2xl">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Proforma Fatura Oluştur</h2>
                <p className="text-sm text-gray-600">
                  {party.firstName} {party.lastName} - {party.tcNumber}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-2xl transition-colors !h-auto"
              aria-label="Kapat"
            >
              <X className="w-6 h-6 text-gray-700" />
            </Button>
          </div>

          <div className="p-6 space-y-6">
            {/* Success Message */}
            {showSuccess && (
              <Alert variant="success" className="mb-4">
                <CheckCircle className="h-4 w-4" />
                <span>Proforma fatura başarıyla oluşturuldu!</span>
              </Alert>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Product Selection */}
              <div className="space-y-6">
                {/* Customer Info */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center">
                      <User className="w-5 h-5 mr-2 text-gray-600" />
                      Müşteri Bilgileri
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-600">Ad Soyad:</span>
                        <span className="text-gray-900">{party.firstName} {party.lastName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-600">TC No:</span>
                        <span className="text-gray-900">{party.tcNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-600">Telefon:</span>
                        <span className="text-gray-900">{party.phone}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Product Search */}
                <ProductSearchComponent
                  searchTerm={searchTerm}
                  onSearchChange={setSearchTerm}
                  searchResults={searchResults}
                  selectedProduct={selectedProduct}
                  onProductSelect={(p) => {
                    setSelectedProduct(p as ProformaProduct);
                    setSearchTerm('');
                  }}
                  isSearching={isLoadingInventory}
                  showResults={searchTerm.length > 0 && searchResults.length > 0}
                />

                {/* Add Item Form */}
                {selectedProduct && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">Ürün Detayları</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Miktar
                          </label>
                          <Input
                            type="number"
                            min="1"
                            value={quantity === '0' || quantity === '' ? '' : quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            placeholder="1"
                            className="w-full"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Birim Fiyat (₺)
                          </label>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder={selectedProduct.salePrice.toString()}
                            value={customPrice === '0' || customPrice === '' ? '' : customPrice}
                            onChange={(e) => setCustomPrice(e.target.value)}
                            className="w-full"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          İndirim (%)
                        </label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          placeholder="0"
                          value={discountPercent === '0' || discountPercent === '' ? '' : discountPercent}
                          onChange={(e) => setDiscountPercent(e.target.value)}
                          className="w-full"
                        />
                      </div>
                      <Button
                        type="button"
                        onClick={addItem}
                        className="w-full bg-green-600 hover:bg-green-700 text-white"
                      >
                        Ürünü Ekle
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {/* Proforma Details */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center">
                      <Calendar className="w-5 h-5 mr-2 text-gray-600" />
                      Proforma Detayları
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Geçerlilik Tarihi
                      </label>
                      <Input
                        type="date"
                        value={validUntil}
                        onChange={(e) => setValidUntil(e.target.value)}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Şartlar ve Koşullar
                      </label>
                      <Textarea
                        rows={3}
                        value={terms}
                        onChange={(e) => setTerms(e.target.value)}
                        className="resize-none w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Notlar
                      </label>
                      <Textarea
                        rows={3}
                        placeholder="Proforma ile ilgili notlarınızı buraya yazabilirsiniz..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="resize-none w-full"
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Right Column - Items List & Summary */}
              <div className="space-y-6">
                {/* Items List */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center">
                      <Calculator className="w-5 h-5 mr-2 text-gray-600" />
                      Ürün Listesi ({items.length} ürün)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {items.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        Henüz ürün eklenmemiş
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {items.map((item, index) => (
                          <div key={index} className="p-3 border rounded-2xl">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="font-medium text-gray-900">
                                  {item.product.name}
                                </div>
                                <div className="text-sm text-gray-600">
                                  {item.product.brand} {item.product.model}
                                </div>
                                <div className="text-sm text-gray-600 mt-1">
                                  {item.quantity} x {formatCurrency(item.unitPrice)}
                                  {item.discountPercent > 0 && (
                                    <span className="text-red-600 ml-2">
                                      (-%{item.discountPercent})
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-bold text-gray-900">
                                  {formatCurrency(item.totalPrice)}
                                </div>
                                <Button
                                  type="button"
                                  onClick={() => removeItem(index)}
                                  className="text-red-600 hover:text-red-800 text-sm mt-1"
                                >
                                  Kaldır
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Summary */}
                {items.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">Özet</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Ara Toplam:</span>
                          <span className="text-gray-900">{formatCurrency(totals.subtotal)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Toplam İndirim:</span>
                          <span className="text-red-600">-{formatCurrency(totals.totalDiscount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">{totals.vatLabel}:</span>
                          <span className="text-gray-900">{formatCurrency(totals.vatAmount)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-lg border-t pt-2">
                          <span className="text-gray-900">Genel Toplam:</span>
                          <span className="text-blue-600">{formatCurrency(totals.grandTotal)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>

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
                variant="outline"
                className="px-6 py-2"
              >
                İptal
              </Button>
              <Button
                type="submit"
                disabled={isLoading || items.length === 0}
                className="px-6 py-2 premium-gradient tactile-press text-white rounded-2xl transition-colors disabled:opacity-50 flex items-center space-x-2"
              >
                {isLoading && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                <span>Proforma Oluştur</span>
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProformaModal;
