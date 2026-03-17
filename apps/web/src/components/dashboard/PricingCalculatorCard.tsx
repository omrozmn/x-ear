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
      className="group relative cursor-pointer overflow-hidden rounded-[28px] border border-white/20 p-8 shadow-[0_20px_56px_-36px_rgba(15,23,42,0.34)] backdrop-blur-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_26px_72px_-40px_rgba(15,23,42,0.4)] dark:border-white/10 dark:shadow-[0_24px_80px_-44px_rgba(2,6,23,0.85)]"
      style={{ background: 'linear-gradient(135deg, rgba(14,165,233,0.96) 0%, rgba(2,132,199,0.94) 50%, rgba(8,145,178,0.92) 100%)' }}
      onClick={onClick}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.28),transparent_34%)] opacity-90" />
      <div className="absolute top-0 right-0 h-32 w-32 -mr-10 -mt-10 rounded-full bg-card/10 blur-3xl group-hover:bg-card/20 transition-all duration-500" />

      <div className="flex items-center justify-between relative z-10">
        <div className="flex-1">
          <div className="flex items-center space-x-5">
            <div className="rounded-2xl border border-white/15 bg-white/18 p-4 backdrop-blur-md shadow-inner dark:bg-white/10">
              <Calculator className="w-8 h-8 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white tracking-tight">Fiyat Hesapla</p>
              <div className="flex items-center space-x-2 mt-1">
                <span className="text-sm font-medium text-sky-50 bg-card/16 px-2 py-0.5 rounded-xl border border-white/20">SGK Desteği</span>
              </div>
              <p className="text-sm text-sky-50/80 mt-2 font-medium">
                Cihaz fiyatlarını SGK destekleriyle hesaplayın
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-6 border-l border-white/20 pl-6">
          <div className="text-right">
            <p className="text-xs font-medium text-sky-100 uppercase tracking-wider">Son hesaplama</p>
            <p className="text-xl font-bold text-white mt-0.5">
              {lastCalculation?.amount || '-'}
            </p>
            <p className="text-xs text-sky-100/70 mt-0.5">
              {lastCalculation?.date || '-'}
            </p>
          </div>
          <div className="p-3 bg-card/20 rounded-full shadow-lg border border-white/20 group-hover:bg-card group-hover:text-sky-600 text-white transition-colors duration-300">
            <Clock className="w-6 h-6" />
          </div>
        </div>
      </div>
    </div>
  );
};
