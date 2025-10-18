import React from 'react';
import { Calculator, Clock } from 'lucide-react';

interface PricingCalculatorCardProps {
  lastCalculation?: {
    amount: string;
    date: string;
  };
  onClick: () => void;
}

export const PricingCalculatorCard: React.FC<PricingCalculatorCardProps> = ({
  lastCalculation,
  onClick
}) => {
  return (
    <div 
      className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-8 cursor-pointer hover:shadow-xl transition-all duration-300 transform hover:scale-105"
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-4">
            <div className="p-4 bg-blue-100 rounded-full">
              <Calculator className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">Fiyat Hesapla</p>
              <p className="text-lg text-blue-700 font-medium">SGK Desteği</p>
              <p className="text-sm text-gray-600 mt-1">
                Cihaz fiyatlarını SGK destekleriyle hesaplayın
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <p className="text-sm text-gray-500">Son hesaplama</p>
            <p className="text-lg font-semibold text-gray-900">
              {lastCalculation?.amount || '-'}
            </p>
            <p className="text-xs text-gray-500">
              {lastCalculation?.date || '-'}
            </p>
          </div>
          <div className="p-3 bg-white rounded-full shadow-sm">
            <Clock className="w-6 h-6 text-blue-600" />
          </div>
        </div>
      </div>
    </div>
  );
};