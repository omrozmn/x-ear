import React, { useState } from 'react';
import { Wallet } from 'lucide-react';
import { RemainingPaymentsTab } from './reports/tabs/RemainingPaymentsTab';
import { FilterState } from './reports/types';

export function PaymentsPage() {
    const [filters] = useState<FilterState>({
        dateRange: {
            start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
            end: new Date().toISOString().split('T')[0]
        },
        days: 30
    });

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
            <div className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="md:flex md:items-center md:justify-between">
                        <div className="flex-1 min-w-0">
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <Wallet className="w-7 h-7 text-blue-600" />
                                Ödeme Takibi
                            </h1>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                Tahsilat bekleyen ödemeler ve hasta bazlı borç takibi
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <RemainingPaymentsTab filters={filters} />
                </div>
            </div>
        </div>
    );
}

export default PaymentsPage;
