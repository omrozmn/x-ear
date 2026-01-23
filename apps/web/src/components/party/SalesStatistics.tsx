import React from 'react';
import { DollarSign, CheckCircle, Clock, TrendingUp } from 'lucide-react';

interface SalesStatisticsProps {
  sales: any[];
  isVisible: boolean;
}

export const SalesStatistics: React.FC<SalesStatisticsProps> = ({ sales, isVisible }) => {
  // Calculate statistics
  const totalRevenue = sales.reduce((sum, sale) => sum + (sale.totalAmount || 0), 0);
  const totalPaid = sales.reduce((sum, sale) => sum + (sale.paidAmount || 0), 0);
  const totalPending = totalRevenue - totalPaid;
  const totalSGKSupport = sales.reduce((sum, sale) => sum + (sale.sgkSupport || 0), 0);

  // const completedSales = sales.filter(sale => sale.status === 'completed').length;
  // const pendingSales = sales.filter(sale => sale.status === 'pending').length;
  // const cancelledSales = sales.filter(sale => sale.status === 'cancelled').length;

  if (!isVisible) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <div className="bg-green-50 p-4 rounded-lg">
        <div className="flex items-center">
          <DollarSign className="w-5 h-5 text-green-500 mr-2" />
          <div>
            <p className="text-sm text-green-600">Toplam Gelir</p>
            <p className="text-lg font-semibold text-green-900">
              {new Intl.NumberFormat('tr-TR', {
                style: 'currency',
                currency: 'TRY'
              }).format(totalRevenue)}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-blue-50 p-4 rounded-lg">
        <div className="flex items-center">
          <CheckCircle className="w-5 h-5 text-blue-500 mr-2" />
          <div>
            <p className="text-sm text-blue-600">Tahsil Edilen</p>
            <p className="text-lg font-semibold text-blue-900">
              {new Intl.NumberFormat('tr-TR', {
                style: 'currency',
                currency: 'TRY'
              }).format(totalPaid)}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-yellow-50 p-4 rounded-lg">
        <div className="flex items-center">
          <Clock className="w-5 h-5 text-yellow-500 mr-2" />
          <div>
            <p className="text-sm text-yellow-600">Bekleyen Tahsilat</p>
            <p className="text-lg font-semibold text-yellow-900">
              {new Intl.NumberFormat('tr-TR', {
                style: 'currency',
                currency: 'TRY'
              }).format(totalPending)}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-purple-50 p-4 rounded-lg">
        <div className="flex items-center">
          <TrendingUp className="w-5 h-5 text-purple-500 mr-2" />
          <div>
            <p className="text-sm text-purple-600">SGK Desteği</p>
            <p className="text-lg font-semibold text-purple-900">
              {new Intl.NumberFormat('tr-TR', {
                style: 'currency',
                currency: 'TRY'
              }).format(totalSGKSupport)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};