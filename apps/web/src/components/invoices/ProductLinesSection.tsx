import { Input, Select, Button } from '@x-ear/ui-web';
import { useState } from 'react';
import { UnitSelector } from './UnitSelector';
import { ProductServiceCodeInput } from './ProductServiceCodeInput';
import { GTIPCodeInput } from './GTIPCodeInput';
import { LineWithholdingModal, LineWithholdingData } from './LineWithholdingModal';
import { SpecialBaseModal, SpecialBaseData } from './SpecialBaseModal';
import { MedicalDeviceModal, MedicalDeviceData } from './MedicalDeviceModal';
import { ProductSearchModal } from './ProductSearchModal';

interface ProductLine {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  discount?: number;
  discountType?: 'amount' | 'percentage';
  taxRate: number;
  taxAmount: number;
  total: number;
  productServiceCode?: string;
  gtipCode?: string;
  withholdingData?: LineWithholdingData;
  specialBaseData?: SpecialBaseData;
  medicalDeviceData?: MedicalDeviceData;
}

interface ProductLinesSectionProps {
  lines: ProductLine[];
  onChange: (lines: ProductLine[]) => void;
  invoiceType?: string;
  scenario?: string;
  currency?: string;
  errors?: Record<string, string>;
}

export function ProductLinesSection({
  lines,
  onChange,
  invoiceType = '0',
  scenario = '',
  currency = 'TRY',
  errors = {}
}: ProductLinesSectionProps) {
  // Modal states
  const [withholdingModalOpen, setWithholdingModalOpen] = useState(false);
  const [specialBaseModalOpen, setSpecialBaseModalOpen] = useState(false);
  const [medicalModalOpen, setMedicalModalOpen] = useState(false);
  const [productSearchModalOpen, setProductSearchModalOpen] = useState(false);
  const [currentLineIndex, setCurrentLineIndex] = useState<number>(0);

  // Koşullu görünürlük
  const isWithholdingType = ['11', '18', '24', '32'].includes(invoiceType);
  const isSpecialBaseType = ['12', '19', '25', '33'].includes(invoiceType);
  const isReturnWithholdingType = ['15', '49'].includes(invoiceType);
  const isReturnType = ['15', '49', '50'].includes(invoiceType);
  const isMedicalScenario = scenario === '45' || scenario === 'medical';
  const isExportScenario = scenario === '5' || scenario === 'export';

  // KDV oranları
  const taxRates = [
    { value: '0', label: '%0' },
    { value: '1', label: '%1' },
    { value: '8', label: '%8' },
    { value: '10', label: '%10' },
    { value: '18', label: '%18' },
    { value: '20', label: '%20' }
  ];

  const handleLineChange = (index: number, field: keyof ProductLine, value: any) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };

    // Otomatik hesaplamalar
    if (['quantity', 'unitPrice', 'discount', 'discountType', 'taxRate'].includes(field)) {
      const line = newLines[index];
      const subtotal = line.quantity * line.unitPrice;
      
      let discountAmount = 0;
      if (line.discount) {
        discountAmount = line.discountType === 'percentage'
          ? (subtotal * line.discount) / 100
          : line.discount;
      }
      
      const taxBase = subtotal - discountAmount;
      const taxAmount = (taxBase * line.taxRate) / 100;
      const total = taxBase + taxAmount;

      newLines[index].taxAmount = taxAmount;
      newLines[index].total = total;
    }

    // İade faturası için KDV'yi otomatik 0 yap
    if (isReturnType && field === 'taxRate' && value !== 0) {
      newLines[index].taxRate = 0;
      newLines[index].taxAmount = 0;
      newLines[index].total = newLines[index].quantity * newLines[index].unitPrice;
    }

    onChange(newLines);
  };

  const addLine = () => {
    const newLine: ProductLine = {
      id: Date.now().toString(),
      name: '',
      quantity: 1,
      unit: 'Adet',
      unitPrice: 0,
      taxRate: 18,
      taxAmount: 0,
      total: 0
    };
    onChange([...lines, newLine]);
  };

  const handleProductSelect = (product: any) => {
    const newLine: ProductLine = {
      id: Date.now().toString(),
      name: product.name,
      description: product.model || '',
      quantity: 1,
      unit: product.unit || 'Adet',
      unitPrice: product.price || 0,
      taxRate: product.taxRate || 18,
      taxAmount: 0,
      total: product.price || 0,
      productServiceCode: product.code || ''
    };
    
    // Calculate tax and total
    const subtotal = newLine.quantity * newLine.unitPrice;
    newLine.taxAmount = subtotal * (newLine.taxRate / 100);
    newLine.total = subtotal + newLine.taxAmount;
    
    onChange([...lines, newLine]);
  };

  const removeLine = (index: number) => {
    if (lines.length > 1) {
      onChange(lines.filter((_, i) => i !== index));
    }
  };

  const duplicateLine = (index: number) => {
    const lineToDuplicate = { ...lines[index], id: Date.now().toString() };
    const newLines = [...lines];
    newLines.splice(index + 1, 0, lineToDuplicate);
    onChange(newLines);
  };

  // Modal handlers
  const openWithholdingModal = (index: number) => {
    setCurrentLineIndex(index);
    setWithholdingModalOpen(true);
  };

  const openSpecialBaseModal = (index: number) => {
    setCurrentLineIndex(index);
    setSpecialBaseModalOpen(true);
  };

  const openMedicalModal = (index: number) => {
    setCurrentLineIndex(index);
    setMedicalModalOpen(true);
  };

  const handleWithholdingSave = (data: LineWithholdingData) => {
    const newLines = [...lines];
    newLines[currentLineIndex].withholdingData = data;
    onChange(newLines);
  };

  const handleSpecialBaseSave = (data: SpecialBaseData) => {
    const newLines = [...lines];
    newLines[currentLineIndex].specialBaseData = data;
    onChange(newLines);
  };

  const handleMedicalSave = (data: MedicalDeviceData) => {
    const newLines = [...lines];
    newLines[currentLineIndex].medicalDeviceData = data;
    onChange(newLines);
  };

  // Toplam hesaplamalar
  const totals = {
    subtotal: lines.reduce((sum, line) => sum + (line.quantity * line.unitPrice), 0),
    discount: lines.reduce((sum, line) => {
      if (!line.discount) return sum;
      const subtotal = line.quantity * line.unitPrice;
      return sum + (line.discountType === 'percentage' 
        ? (subtotal * line.discount) / 100 
        : line.discount);
    }, 0),
    tax: lines.reduce((sum, line) => sum + (line.taxAmount || 0), 0),
    total: lines.reduce((sum, line) => sum + (line.total || 0), 0)
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Fatura Kalemleri</h3>
        <div className="flex space-x-2">
          <Button
            type="button"
            onClick={() => setProductSearchModalOpen(true)}
            variant="default"
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            🔍 Ürün Ara
          </Button>
          <Button
            type="button"
            onClick={addLine}
            variant="default"
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            + Yeni Kalem Ekle
          </Button>
        </div>
      </div>

      {/* Uyarılar */}
      {isReturnType && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-amber-700">
            ⚠️ İade faturası: KDV oranları otomatik olarak %0 yapılacaktır.
          </p>
        </div>
      )}

      {isMedicalScenario && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-purple-700">
            ℹ️ İlaç/Tıbbi Cihaz faturası: Her kalem için ruhsat numarası gereklidir.
          </p>
        </div>
      )}

      {isExportScenario && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
          <p className="text-sm text-green-700">
            ℹ️ İhracat faturası: Her kalem için GTİP kodu zorunludur.
          </p>
        </div>
      )}

      {/* Ürün Satırları */}
      <div className="space-y-4">
        {lines.map((line, index) => (
          <div key={line.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            {/* Satır Başlığı */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-700">
                Kalem {index + 1}
              </span>
              <div className="flex items-center space-x-2">
                <Button
                  type="button"
                  onClick={() => duplicateLine(index)}
                  variant="default"
                  className="text-xs px-2 py-1 bg-gray-200 hover:bg-gray-300 text-gray-700"
                  title="Kopyala"
                >
                  📋
                </Button>
                {lines.length > 1 && (
                  <Button
                    type="button"
                    onClick={() => removeLine(index)}
                    variant="default"
                    className="text-xs px-2 py-1 bg-red-100 hover:bg-red-200 text-red-700"
                    title="Sil"
                  >
                    🗑️
                  </Button>
                )}
              </div>
            </div>

            {/* Ana Alanlar */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              {/* Ürün/Hizmet Adı */}
              <div className="md:col-span-3">
                <Input
                  type="text"
                  label="Ürün/Hizmet Adı"
                  value={line.name}
                  onChange={(e) => handleLineChange(index, 'name', e.target.value)}
                  placeholder="Ürün adı"
                  error={errors[`lines.${index}.name`]}
                  fullWidth
                  required
                />
              </div>

              {/* Miktar */}
              <div className="md:col-span-1">
                <Input
                  type="number"
                  label="Miktar"
                  value={line.quantity}
                  onChange={(e) => handleLineChange(index, 'quantity', parseFloat(e.target.value) || 1)}
                  min="0.01"
                  step="0.01"
                  fullWidth
                  required
                />
              </div>

              {/* Birim */}
              <div className="md:col-span-1">
                <UnitSelector
                  value={line.unit}
                  onChange={(value) => handleLineChange(index, 'unit', value)}
                  error={errors[`lines.${index}.unit`]}
                />
              </div>

              {/* Birim Fiyat */}
              <div className="md:col-span-2">
                <Input
                  type="number"
                  label="Birim Fiyat"
                  value={line.unitPrice}
                  onChange={(e) => handleLineChange(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                  min="0"
                  step="0.01"
                  fullWidth
                  required
                />
              </div>

              {/* İskonto */}
              <div className="md:col-span-1">
                <Input
                  type="number"
                  label="İskonto"
                  value={line.discount || ''}
                  onChange={(e) => handleLineChange(index, 'discount', parseFloat(e.target.value) || 0)}
                  min="0"
                  step="0.01"
                  fullWidth
                />
              </div>

              {/* KDV */}
              <div className="md:col-span-1">
                <Select
                  label="KDV"
                  value={line.taxRate.toString()}
                  onChange={(e) => handleLineChange(index, 'taxRate', parseFloat(e.target.value))}
                  options={taxRates}
                  disabled={isReturnType}
                  fullWidth
                />
              </div>

              {/* Toplam */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Toplam
                </label>
                <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-right font-medium">
                  {line.total.toFixed(2)} {currency}
                </div>
              </div>
            </div>

            {/* Ek Alanlar */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
              {/* Mal/Hizmet Kodu */}
              <div>
                <ProductServiceCodeInput
                  value={line.productServiceCode || ''}
                  onChange={(value) => handleLineChange(index, 'productServiceCode', value)}
                  error={errors[`lines.${index}.productServiceCode`]}
                />
              </div>

              {/* Açıklama */}
              <div>
                <Input
                  type="text"
                  label="Açıklama"
                  value={line.description || ''}
                  onChange={(e) => handleLineChange(index, 'description', e.target.value)}
                  placeholder="Ek açıklama (opsiyonel)"
                  fullWidth
                />
              </div>
            </div>

            {/* Koşullu Alanlar */}
            <div className="mt-3 space-y-3">
              {/* GTİP Kodu (İhracat için) */}
              {isExportScenario && (
                <div>
                  <GTIPCodeInput
                    value={line.gtipCode || ''}
                    onChange={(value) => handleLineChange(index, 'gtipCode', value)}
                    error={errors[`lines.${index}.gtipCode`]}
                    required
                  />
                </div>
              )}

              {/* Koşullu Butonlar */}
              <div className="flex flex-wrap gap-2">
                {/* Tevkifat Butonu */}
                {isWithholdingType && (
                  <Button
                    type="button"
                    onClick={() => openWithholdingModal(index)}
                    variant="default"
                    className="text-sm px-3 py-1 bg-orange-100 hover:bg-orange-200 text-orange-700 border border-orange-300"
                  >
                    📊 Tevkifat
                    {line.withholdingData && ' ✓'}
                  </Button>
                )}

                {/* Özel Matrah Butonu */}
                {isSpecialBaseType && (
                  <Button
                    type="button"
                    onClick={() => openSpecialBaseModal(index)}
                    variant="default"
                    className="text-sm px-3 py-1 bg-yellow-100 hover:bg-yellow-200 text-yellow-700 border border-yellow-300"
                  >
                    💰 Özel Matrah
                    {line.specialBaseData && ' ✓'}
                  </Button>
                )}

                {/* Tevkifat-İade Butonu */}
                {isReturnWithholdingType && (
                  <Button
                    type="button"
                    onClick={() => openWithholdingModal(index)}
                    variant="default"
                    className="text-sm px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 border border-red-300"
                  >
                    🔄 Tevkifat İade
                    {line.withholdingData && ` (${line.withholdingData.returnedGoodsRate}% - ${line.withholdingData.withholdingTaxAmount} TL)`}
                  </Button>
                )}

                {/* İlaç/Tıbbi Cihaz Butonu */}
                {isMedicalScenario && (
                  <Button
                    type="button"
                    onClick={() => openMedicalModal(index)}
                    variant="default"
                    className="text-sm px-3 py-1 bg-purple-100 hover:bg-purple-200 text-purple-700 border border-purple-300"
                  >
                    💊 İlaç/Tıbbi Cihaz
                    {line.medicalDeviceData && ' ✓'}
                  </Button>
                )}
              </div>

              {/* Koşullu Alan Göstergeleri */}
              {line.withholdingData && (isWithholdingType || isReturnWithholdingType) && (
                <div className="text-xs text-gray-600 bg-orange-50 border border-orange-200 rounded p-2">
                  Tevkifat: {line.withholdingData.returnedGoodsRate}% - {line.withholdingData.withholdingTaxAmount} TL
                </div>
              )}

              {line.specialBaseData && isSpecialBaseType && (
                <div className="text-xs text-gray-600 bg-yellow-50 border border-yellow-200 rounded p-2">
                  Özel Matrah: {line.specialBaseData.specialBaseAmount} TL × {line.specialBaseData.specialBaseRate}% = {line.specialBaseData.calculatedTax} TL
                </div>
              )}

              {line.medicalDeviceData && isMedicalScenario && (
                <div className="text-xs text-gray-600 bg-purple-50 border border-purple-200 rounded p-2">
                  Ruhsat No: {line.medicalDeviceData.licenseNumber}
                  {line.medicalDeviceData.serialNumber && ` | Seri: ${line.medicalDeviceData.serialNumber}`}
                  {line.medicalDeviceData.lotNumber && ` | Lot: ${line.medicalDeviceData.lotNumber}`}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Toplam Hesaplamalar */}
      <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Ara Toplam:</span>
            <span className="font-medium">{totals.subtotal.toFixed(2)} {currency}</span>
          </div>
          {totals.discount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">İskonto:</span>
              <span className="font-medium text-red-600">-{totals.discount.toFixed(2)} {currency}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">KDV:</span>
            <span className="font-medium">{totals.tax.toFixed(2)} {currency}</span>
          </div>
          <div className="flex justify-between text-lg font-bold border-t border-gray-300 pt-2">
            <span className="text-gray-900">Genel Toplam:</span>
            <span className="text-blue-600">{totals.total.toFixed(2)} {currency}</span>
          </div>
        </div>
      </div>

      {/* Modals */}
      <LineWithholdingModal
        isOpen={withholdingModalOpen}
        onClose={() => setWithholdingModalOpen(false)}
        onSave={handleWithholdingSave}
        initialData={lines[currentLineIndex]?.withholdingData}
        itemIndex={currentLineIndex}
        itemName={lines[currentLineIndex]?.name || ''}
        itemAmount={lines[currentLineIndex]?.total || 0}
      />

      <SpecialBaseModal
        isOpen={specialBaseModalOpen}
        onClose={() => setSpecialBaseModalOpen(false)}
        onSave={handleSpecialBaseSave}
        initialData={lines[currentLineIndex]?.specialBaseData}
        lineIndex={currentLineIndex}
      />

      <MedicalDeviceModal
        isOpen={medicalModalOpen}
        onClose={() => setMedicalModalOpen(false)}
        onSave={handleMedicalSave}
        initialData={lines[currentLineIndex]?.medicalDeviceData}
        lineIndex={currentLineIndex}
        itemName={lines[currentLineIndex]?.name}
      />

      {/* Product Search Modal */}
      <ProductSearchModal
        isOpen={productSearchModalOpen}
        onClose={() => setProductSearchModalOpen(false)}
        onSelect={handleProductSelect}
      />
    </div>
  );
}
