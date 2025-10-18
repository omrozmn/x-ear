import React from 'react';
import { Wallet, Plus } from 'lucide-react';

interface CashRegisterCardProps {
  lastTransaction?: {
    amount: string;
    date: string;
  };
  onClick: () => void;
}

export const CashRegisterCard: React.FC<CashRegisterCardProps> = ({
  lastTransaction,
  onClick
}) => {
  return (
    <div 
      className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg p-8 cursor-pointer hover:shadow-xl transition-all duration-300 transform hover:scale-105"
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-4">
            <div className="p-4 bg-green-100 rounded-full">
              <Wallet className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">Kasa Kaydı</p>
              <p className="text-lg text-green-700 font-medium">Hızlı Giriş</p>
              <p className="text-sm text-gray-600 mt-1">
                Gelir ve gider işlemlerinizi kolayca kaydedin
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <p className="text-sm text-gray-500">Son işlem</p>
            <p className="text-lg font-semibold text-gray-900">
              {lastTransaction?.amount || '-'}
            </p>
            <p className="text-xs text-gray-500">
              {lastTransaction?.date || '-'}
            </p>
          </div>
          <div className="p-3 bg-white rounded-full shadow-sm">
            <Plus className="w-6 h-6 text-green-600" />
          </div>
        </div>
      </div>
    </div>
  );
};