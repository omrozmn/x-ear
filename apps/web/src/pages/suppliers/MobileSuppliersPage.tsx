import React, { useState } from 'react';
import { Truck, Search, Phone, MapPin, Mail } from 'lucide-react';
import { MobileLayout } from '@/components/mobile/MobileLayout';
import { MobileHeader } from '@/components/mobile/MobileHeader';
import { PullToRefresh } from '@/components/mobile/PullToRefresh';
import { useSuppliers } from '@/hooks/useSuppliers';
import { unwrapArray } from '@/utils/response-unwrap';
import { cn } from '@/lib/utils';
import { useHaptic } from '@/hooks/useHaptic';

export const MobileSuppliersPage: React.FC = () => {
    const [searchValue, setSearchValue] = useState('');
    const { triggerSelection } = useHaptic();
    const { data, isLoading, refetch } = useSuppliers({
        search: searchValue,
        per_page: 50
    });

    const handleRefresh = async () => {
        await refetch();
    };

    const suppliers = unwrapArray<any>(data) || [];

    const handleCall = (e: React.MouseEvent, phone: string) => {
        e.stopPropagation();
        triggerSelection();
        window.location.href = `tel:${phone}`;
    };

    return (
        <MobileLayout>
            <MobileHeader
                title="Tedarikçiler"
                showBack={false}
            />

            {/* Search Bar */}
            <div className="px-4 pb-4 bg-white border-b border-gray-100 sticky top-14 z-20">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Şirket ara..."
                        value={searchValue}
                        onChange={(e) => setSearchValue(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:bg-white transition-all border border-transparent focus:border-primary-100"
                    />
                </div>
            </div>

            <PullToRefresh onRefresh={handleRefresh}>
                <div className="p-4 space-y-3 min-h-[calc(100vh-140px)] bg-gray-50">
                    {isLoading ? (
                        <div className="flex justify-center py-10">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
                        </div>
                    ) : suppliers.length > 0 ? (
                        suppliers.map((supplier: any) => (
                            <div
                                key={supplier.id}
                                onClick={() => triggerSelection()}
                                className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm active:scale-[0.99] transition-transform"
                            >
                                <div className="flex gap-4">
                                    <div className="h-12 w-12 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0 text-blue-600">
                                        <Truck className="h-6 w-6" />
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-gray-900 truncate">
                                            {supplier.companyName}
                                        </h3>

                                        <div className="text-xs text-gray-500 mt-1 space-y-1">
                                            {supplier.contactName && (
                                                <div className="flex items-center gap-1.5">
                                                    <span className="font-medium text-gray-700">{supplier.contactName}</span>
                                                </div>
                                            )}
                                            {supplier.city && (
                                                <div className="flex items-center gap-1.5">
                                                    <MapPin className="h-3 w-3" />
                                                    <span>{supplier.city}</span>
                                                </div>
                                            )}
                                            {supplier.phone && (
                                                <div className="flex items-center gap-1.5 font-medium text-gray-600">
                                                    <Phone className="h-3 w-3" />
                                                    <span>{supplier.phone}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {supplier.phone && (
                                        <button
                                            onClick={(e) => handleCall(e, supplier.phone)}
                                            className="h-10 w-10 bg-green-50 rounded-full flex items-center justify-center text-green-600 self-center active:bg-green-100"
                                        >
                                            <Phone className="h-5 w-5" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="bg-white p-4 rounded-full shadow-sm mb-4">
                                <Truck className="h-8 w-8 text-gray-300" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900">Tedarikçi Bulunamadı</h3>
                        </div>
                    )}
                </div>
            </PullToRefresh>
        </MobileLayout>
    );
};
