/**
 * CashflowStats Component
 * Displays income, expense, and net balance statistics
 */
import React from 'react';
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import type { CashflowStats } from '../../types/cashflow';

interface CashflowStatsProps {
  stats: CashflowStats;
}

export function CashflowStats({ stats }: CashflowStatsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
    }).format(amount);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Total Income */}
      <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/20 p-6 rounded-xl shadow-sm border border-green-200 dark:border-green-900/50">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-green-600 dark:text-green-400 mb-1">Toplam Gelir</p>
            <p className="text-3xl font-bold text-green-900 dark:text-green-300">
              {formatCurrency(stats.totalIncome)}
            </p>
          </div>
          <div className="bg-green-500 p-3 rounded-lg">
            <TrendingUp className="h-8 w-8 text-white" />
          </div>
        </div>
      </div>

      {/* Total Expense */}
      <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/20 p-6 rounded-xl shadow-sm border border-red-200 dark:border-red-900/50">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-red-600 dark:text-red-400 mb-1">Toplam Gider</p>
            <p className="text-3xl font-bold text-red-900 dark:text-red-300">
              {formatCurrency(stats.totalExpense)}
            </p>
          </div>
          <div className="bg-red-500 p-3 rounded-lg">
            <TrendingDown className="h-8 w-8 text-white" />
          </div>
        </div>
      </div>

      {/* Net Balance */}
      <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20 p-6 rounded-xl shadow-sm border border-blue-200 dark:border-blue-900/50">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">Net Bakiye</p>
            <p className={`text-3xl font-bold ${stats.netCashFlow >= 0 ? 'text-green-900 dark:text-green-300' : 'text-red-900 dark:text-red-300'
              }`}>
              {formatCurrency(stats.netCashFlow)}
            </p>
          </div>
          <div className="bg-blue-500 p-3 rounded-lg">
            <DollarSign className="h-8 w-8 text-white" />
          </div>
        </div>
      </div>
    </div>
  );
}
