import React, { useState, useEffect } from 'react';
import { Button, Input, Alert } from '@x-ear/ui-web';
import { Calculator } from 'lucide-react';

interface InstallmentDetail {
  id: number;
  amount: number;
  dueDate: string;
}

interface InstallmentPlan {
  installmentCount: number;
  monthlyAmount: number;
  totalAmount: number;
  interestRate: number;
}

interface InstallmentCalculatorProps {
  grandTotal: number;
  installmentCount: number;
  saleDate: string;
  onInstallmentDetailsChange: (details: InstallmentDetail[]) => void;
}

export function InstallmentCalculator({ 
  grandTotal, 
  installmentCount, 
  saleDate, 
  onInstallmentDetailsChange 
}: InstallmentCalculatorProps) {
  const [installmentDetails, setInstallmentDetails] = useState<InstallmentDetail[]>([]);

  // Legacy'deki calculateInstallments fonksiyonu
  const calculateInstallments = (amount: number, count: number): InstallmentPlan => {
    const interestRate = count > 1 ? 2.5 : 0; // %2.5 faiz
    const totalAmount = amount * (1 + (interestRate / 100));
    const monthlyAmount = totalAmount / count;
    
    return {
      installmentCount: count,
      monthlyAmount: parseFloat(monthlyAmount.toFixed(2)),
      totalAmount: parseFloat(totalAmount.toFixed(2)),
      interestRate
    };
  };

  // Legacy'deki autoFillInstallments fonksiyonu
  const autoFillInstallments = () => {
    const amountPerInstallment = grandTotal / installmentCount;
    const newDetails = Array.from({ length: installmentCount }, (_, index) => ({
      id: index + 1,
      amount: parseFloat(amountPerInstallment.toFixed(2)),
      dueDate: calculateDueDate(index + 1)
    }));
    setInstallmentDetails(newDetails);
    onInstallmentDetailsChange(newDetails);
  };

  // Legacy'deki updateInstallmentTotal fonksiyonu
  const updateInstallmentTotal = () => {
    const total = installmentDetails.reduce((sum, detail) => sum + detail.amount, 0);
    return total;
  };

  // Vade tarihi hesaplama - legacy'deki logic
  const calculateDueDate = (installmentNumber: number) => {
    const baseDate = new Date(saleDate || new Date());
    const dueDate = new Date(baseDate);
    dueDate.setMonth(dueDate.getMonth() + installmentNumber);
    return dueDate.toISOString().split('T')[0]; // YYYY-MM-DD format
  };

  // Taksit detayını güncelleme
  const updateInstallmentDetail = (id: number, field: 'amount' | 'dueDate', value: number | string) => {
    const updatedDetails = installmentDetails.map(detail => 
      detail.id === id 
        ? { ...detail, [field]: field === 'amount' ? parseFloat(value as string) || 0 : value }
        : detail
    );
    setInstallmentDetails(updatedDetails);
    onInstallmentDetailsChange(updatedDetails);
  };

  // Taksit sayısı değiştiğinde otomatik doldur
  useEffect(() => {
    if (installmentCount > 1) {
      autoFillInstallments();
    } else {
      setInstallmentDetails([]);
      onInstallmentDetailsChange([]);
    }
  }, [installmentCount, grandTotal]);

  if (installmentCount <= 1) {
    return null;
  }

  const installmentPlan = calculateInstallments(grandTotal, installmentCount);

  return (
    <div className="bg-blue-50 p-4 rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h4 className="font-medium text-blue-900">Taksit Detayları</h4>
        <Button
          type="button"
          onClick={autoFillInstallments}
          size="sm"
          className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
        >
          <Calculator size={14} />
          Otomatik Doldur
        </Button>
      </div>
      
      {/* Taksit Listesi - Legacy'deki installmentList */}
      <div className="space-y-3 max-h-64 overflow-y-auto">
        {installmentDetails.map((detail) => (
          <div key={detail.id} className="grid grid-cols-12 gap-3 bg-white p-3 rounded-lg items-center border">
            <span className="col-span-2 font-medium text-gray-700">
              Taksit {detail.id}:
            </span>
            <div className="col-span-5 flex items-center gap-2">
              <Input
                type="number"
                step="0.01"
                value={detail.amount}
                onChange={(e) => updateInstallmentDetail(detail.id, 'amount', e.target.value)}
                className="flex-1"
              />
              <span className="text-gray-500 text-sm">TL</span>
            </div>
            <div className="col-span-5">
              <Input
                type="date"
                value={detail.dueDate}
                onChange={(e) => updateInstallmentDetail(detail.id, 'dueDate', e.target.value)}
                className="w-full"
              />
            </div>
          </div>
        ))}
      </div>
      
      {/* Taksit Toplamı - Legacy'deki installmentTotal */}
      <div className="mt-4 pt-4 border-t border-blue-200 flex justify-between items-center">
        <span className="font-semibold text-blue-900">Taksit Toplamı:</span>
        <span className="font-bold text-lg text-blue-600">
          {updateInstallmentTotal().toLocaleString('tr-TR')} TL
        </span>
      </div>
      
      {/* Toplam fark kontrolü */}
      {Math.abs(updateInstallmentTotal() - grandTotal) > 0.01 && (
        <Alert className="mt-2">
          <strong>Uyarı:</strong> Taksit toplamı ({updateInstallmentTotal().toLocaleString('tr-TR')} TL) 
          ile genel toplam ({grandTotal.toLocaleString('tr-TR')} TL) arasında fark var.
        </Alert>
      )}
      
      {/* Basit taksit özeti */}
      <div className="mt-4 space-y-1 text-sm text-blue-800">
        <div>Aylık Ödeme: <span className="font-bold">{installmentPlan.monthlyAmount.toLocaleString('tr-TR')} TL</span></div>
        <div>Toplam Tutar: <span className="font-bold">{installmentPlan.totalAmount.toLocaleString('tr-TR')} TL</span></div>
        <div>Faiz Oranı: <span className="font-bold">%{installmentPlan.interestRate}</span></div>
      </div>
    </div>
  );
}

export type { InstallmentDetail, InstallmentPlan };