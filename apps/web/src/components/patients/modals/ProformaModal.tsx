import React, { useState, useEffect, useMemo } from 'react';
import {
  Button,
  Textarea,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Alert,
  Input
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
// Mock API function since Proforma endpoint is missing in generated client
const proformasCreateProforma = async (data: any) => {
  console.log('Mock create proforma', data);
  return { data: { proforma_number: `PF-${Date.now()}`, success: true } };
};
import { Patient } from '../../../types/patient';
import ProductSearchComponent from './components/ProductSearchComponent';
import PricingPreviewComponent from './components/PricingPreviewComponent';

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
  patientId: string;
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
  patient: Patient;
  onProformaCreate: (data: ProformaData) => void;
}

export const ProformaModal: React.FC<ProformaModalProps> = ({
  isOpen,
  onClose,
  patient,
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

  // Mock product data
  const mockProducts: ProformaProduct[] = [
    {
      id: '1',
      name: 'İşitme Cihazı Premium',
      brand: 'Phonak',
      model: 'Audéo Paradise P90',
      category: 'İşitme Cihazı',
      listPrice: 25000,
      salePrice: 22000,
      vatRate: 18,
      stock: 5,
      sgkSupported: true,
      sgkCode: 'SGK001'
    },
    {
      id: '2',
      name: 'İşitme Cihazı Standart',
      brand: 'Oticon',
      model: 'More 1',
      category: 'İşitme Cihazı',
      listPrice: 18000,
      salePrice: 16000,
      vatRate: 18,
      stock: 8,
      sgkSupported: true,
      sgkCode: 'SGK002'
    }
  ];

  const searchResults = useMemo(() => {
    if (!searchTerm.trim()) return [];
    return mockProducts.filter(product =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.model.toLowerCase().includes(searchTerm.toLowerCase())
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

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

  const generateProformaNumber = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `PF${year}${month}${day}${random}`;
  };

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

    items.forEach(item => {
      const itemSubtotal = item.unitPrice * item.quantity;
      const itemDiscount = item.discountAmount;
      const itemNet = itemSubtotal - itemDiscount;
      // Use vatRate from product, defaulting to 18 if missing
      const rate = item.product.vatRate ?? 18;
      const itemVat = itemNet * (rate / 100);

      subtotal += itemSubtotal;
      totalDiscount += itemDiscount;
      vatAmount += itemVat;
    });

    const grandTotal = subtotal - totalDiscount + vatAmount;

    return {
      subtotal,
      totalDiscount,
      vatAmount,
      grandTotal
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

      // Create proforma data for API
      const proformaData = {
        patientId: patient.id,
        devicePrice: totals.grandTotal,
        deviceName: items.map(item => `${item.product.brand} ${item.product.model}`).join(', '),
        deviceSerial: items.map(item => item.product.serialNumber || 'N/A').join(', '),
        companyName: 'X-EAR İşitme Cihazları',
        notes: notes,
        createdBy: getCurrentUserId()
      };

      // Call proforma creation API
      const response = await proformasCreateProforma(proformaData as any) as any;

      // The generated client returns existing data in response.data
      // Adjust handling based on typical generated code
      const result = response?.data;

      // Assuming result is the Proforma object or contains it. 
      // If result has 'success' field check it, otherwise assume 200 OK means success.

      // Generate PDF
      // If result is the proforma object directly:
      // await generateProformaPDF(result);

      // If we are here, it succeeded (client throws on error)
      const data: any = (result as any) || {};

      // Generate PDF
      await generateProformaPDF(data);

      // Prepare data for parent component
      const finalProformaData: ProformaData = {
        patientId: patient.id || patient.tcNumber || '', // Use id if available, fallback to tcNumber
        proformaNumber: data.proforma_number || 'PF-' + Date.now(),
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
      setTimeout(() => {
        onProformaCreate(finalProformaData);
        onClose();
      }, 1500);

    } catch (error) {
      console.error('Proforma creation error:', error);
      setError(error instanceof Error ? error.message : 'Proforma oluşturulurken bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  // Generate PDF for proforma
  const generateProformaPDF = async (proformaData: any) => {
    try {
      // Dynamic import of jsPDF
      const jsPDFModule = await import('jspdf');
      const jsPDF = jsPDFModule.default;

      const pdf = new jsPDF();

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
      pdf.text(`Proforma No: ${proformaData.proforma_number}`, 20, 85);
      pdf.text(`Tarih: ${new Date().toLocaleDateString('tr-TR')}`, 20, 95);
      pdf.text(`Geçerlilik: ${new Date(validUntil).toLocaleDateString('tr-TR')}`, 20, 105);

      // Customer info
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('MÜŞTERİ BİLGİLERİ', 20, 125);

      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Ad Soyad: ${patient.firstName} ${patient.lastName}`, 20, 140);
      pdf.text(`TC No: ${patient.tcNumber}`, 20, 150);
      pdf.text(`Telefon: ${patient.phone}`, 20, 160);

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

      // Save PDF
      const fileName = `Proforma_${proformaData.proforma_number}_${patient.firstName}_${patient.lastName}.pdf`;
      pdf.save(fileName);

    } catch (error) {
      console.error('PDF generation error:', error);
      // Don't throw error, just log it - proforma creation should still succeed
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Proforma Fatura Oluştur</h2>
                <p className="text-sm text-gray-600">
                  {patient.firstName} {patient.lastName} - {patient.tcNumber}
                </p>
              </div>
            </div>
            <Button
              type="button"
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
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
                        <span className="text-gray-900">{patient.firstName} {patient.lastName}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-600">TC No:</span>
                        <span className="text-gray-900">{patient.tcNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-600">Telefon:</span>
                        <span className="text-gray-900">{patient.phone}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Product Search */}
                <ProductSearchComponent
                  searchTerm={searchTerm}
                  onSearchChange={setSearchTerm}
                  searchResults={searchResults as any}
                  selectedProduct={selectedProduct as any}
                  onProductSelect={(p: any) => {
                    setSelectedProduct(p);
                    setSearchTerm('');
                  }}
                  isSearching={false}
                  showResults={searchTerm.length > 0}
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
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            className="w-full"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Birim Fiyat
                          </label>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder={selectedProduct.salePrice.toString()}
                            value={customPrice}
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
                          placeholder="İndirim oranı"
                          value={discountPercent}
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
                        className="resize-none"
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
                        className="resize-none"
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
                          <div key={index} className="p-3 border rounded-lg">
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
                          <span className="text-gray-600">KDV (%18):</span>
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
                className="px-6 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 flex items-center space-x-2"
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