import { Button, Input, Select } from '@x-ear/ui-web';
import React, { useState, useEffect } from 'react';
import { X, Calculator, Percent, DollarSign } from 'lucide-react';

interface PricingCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCalculate: (data: PricingCalculation) => void;
}

interface PricingCalculation {
  devicePrice: number;
  discountPercent: number;
  discountAmount: number;
  finalPrice: number;
  installments?: number;
  installmentAmount?: number;
}

export const PricingCalculatorModal: React.FC<PricingCalculatorModalProps> = ({
  isOpen,
  onClose,
  onCalculate,
}) => {
  const [devicePrice, setDevicePrice] = useState<number>(0);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [installments, setInstallments] = useState<number>(1);
  const [calculation, setCalculation] = useState<PricingCalculation>({
    devicePrice: 0,
    discountPercent: 0,
    discountAmount: 0,
    finalPrice: 0,
  });

  // Predefined device prices for quick selection
  const devicePrices = [
    { name: 'Temel Model', price: 15000 },
    { name: 'Orta Seviye', price: 25000 },
    { name: 'Premium Model', price: 45000 },
    { name: 'Lüks Model', price: 65000 },
  ];

  // Calculate pricing whenever inputs change
  useEffect(() => {
    const finalPrice = devicePrice - discountAmount;
    const installmentAmount = installments > 1 ? finalPrice / installments : finalPrice;
    
    setCalculation({
      devicePrice,
      discountPercent,
      discountAmount,
      finalPrice: Math.max(0, finalPrice),
      installments: installments > 1 ? installments : undefined,
      installmentAmount: installments > 1 ? installmentAmount : undefined,
    });
  }, [devicePrice, discountPercent, discountAmount, installments]);

  // Handle discount percent change
  const handleDiscountPercentChange = (percent: number) => {
    setDiscountPercent(percent);
    setDiscountAmount((devicePrice * percent) / 100);
  };

  // Handle discount amount change
  const handleDiscountAmountChange = (amount: number) => {
    setDiscountAmount(amount);
    setDiscountPercent(devicePrice > 0 ? (amount / devicePrice) * 100 : 0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (devicePrice <= 0) {
      alert('Lütfen geçerli bir cihaz fiyatı giriniz');
      return;
    }
    onCalculate(calculation);
    onClose();
  };

  const resetForm = () => {
    setDevicePrice(0);
    setDiscountPercent(0);
    setDiscountAmount(0);
    setInstallments(1);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <Calculator className="w-6 h-6 mr-2 text-blue-600" />
            Fiyat Hesaplama
          </h2>
          <Button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            variant='default'>
            <X className="w-6 h-6" />
          </Button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Quick Device Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Hızlı Cihaz Seçimi
            </label>
            <div className="grid grid-cols-2 gap-2">
              {devicePrices.map((device) => (
                <Button
                  key={device.name}
                  type="button"
                  onClick={() => setDevicePrice(device.price)}
                  className="p-2 text-sm border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                  variant='default'>
                  <div className="font-medium">{device.name}</div>
                  <div className="text-gray-600">{device.price.toLocaleString('tr-TR')} ₺</div>
                </Button>
              ))}
            </div>
          </div>

          {/* Device Price */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <DollarSign className="w-4 h-4 inline mr-1" />
              Cihaz Fiyatı (₺)
            </label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={devicePrice}
              onChange={(e) => setDevicePrice(parseFloat(e.target.value) || 0)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0.00"
              required
            />
          </div>

          {/* Discount Section */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Percent className="w-4 h-4 inline mr-1" />
                İndirim (%)
              </label>
              <Input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={discountPercent}
                onChange={(e) => handleDiscountPercentChange(parseFloat(e.target.value) || 0)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                İndirim Tutarı (₺)
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={discountAmount}
                onChange={(e) => handleDiscountAmountChange(parseFloat(e.target.value) || 0)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Installments */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Taksit Sayısı
            </label>
            <Select
              value={installments}
              onChange={(e) => setInstallments(parseInt(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value={1}>Peşin</option>
              <option value={2}>2 Taksit</option>
              <option value={3}>3 Taksit</option>
              <option value={6}>6 Taksit</option>
              <option value={9}>9 Taksit</option>
              <option value={12}>12 Taksit</option>
            </Select>
          </div>

          {/* Calculation Results */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <h3 className="font-medium text-gray-900 mb-3">Hesaplama Sonucu</h3>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Cihaz Fiyatı:</span>
              <span className="font-medium">{devicePrice.toLocaleString('tr-TR')} ₺</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">İndirim:</span>
              <span className="font-medium text-red-600">
                -{discountAmount.toLocaleString('tr-TR')} ₺ ({discountPercent.toFixed(1)}%)
              </span>
            </div>
            <div className="border-t border-gray-200 pt-2">
              <div className="flex justify-between text-lg font-semibold">
                <span>Toplam:</span>
                <span className="text-green-600">{calculation.finalPrice.toLocaleString('tr-TR')} ₺</span>
              </div>
              {calculation.installmentAmount && (
                <div className="flex justify-between text-sm text-gray-600 mt-1">
                  <span>Taksit Tutarı:</span>
                  <span>{calculation.installmentAmount.toLocaleString('tr-TR')} ₺ x {installments}</span>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-3 pt-4">
            <Button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              variant='default'>
              Temizle
            </Button>
            <Button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              variant='default'>
              İptal
            </Button>
            <Button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              variant='default'>
              Hesaplamayı Kaydet
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};