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
      className="bg-gradient-to-br from-teal-500 to-emerald-600 rounded-2xl p-8 cursor-pointer shadow-lg shadow-teal-100 transition-all duration-300 transform hover:scale-[1.02] hover:shadow-xl relative overflow-hidden group"
      onClick={onClick}
    >
      {/* Decorative */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-white/20 transition-all duration-500"></div>

      <div className="flex items-center justify-between relative z-10">
        <div className="flex-1">
          <div className="flex items-center space-x-5">
            <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-md shadow-inner border border-white/10">
              <Wallet className="w-8 h-8 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white tracking-tight">Kasa Kaydı</p>
              <div className="flex items-center space-x-2 mt-1">
                <span className="text-sm font-medium text-emerald-100 bg-emerald-700/30 px-2 py-0.5 rounded-md border border-emerald-500/30">Hızlı Giriş</span>
              </div>
              <p className="text-sm text-emerald-50/80 mt-2 font-medium">
                Gelir ve gider işlemlerinizi kolayca kaydedin
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-6 border-l border-white/20 pl-6">
          <div className="text-right">
            <p className="text-xs font-medium text-emerald-100 uppercase tracking-wider">Son işlem</p>
            <p className="text-xl font-bold text-white mt-0.5">
              {lastTransaction?.amount || '-'}
            </p>
            <p className="text-xs text-emerald-100/70 mt-0.5">
              {lastTransaction?.date || '-'}
            </p>
          </div>
          <div className="p-3 bg-white/20 rounded-full shadow-lg border border-white/20 group-hover:bg-white group-hover:text-emerald-600 text-white transition-colors duration-300">
            <Plus className="w-6 h-6" />
          </div>
        </div>
      </div>
    </div>
  );
};