import React, { useState, useEffect, useRef } from 'react';
import { Search, Building } from 'lucide-react';
import { useGetAdminTenants } from '../../lib/api-client';

interface Tenant {
    id: string;
    name: string;
    domain?: string;
}

interface TenantAutocompleteProps {
    value?: string; // Tenant ID
    onSelect: (tenant: Tenant) => void;
    placeholder?: string;
    className?: string;
    error?: string;
}

export function TenantAutocomplete({
    value = '',
    onSelect,
    placeholder = 'Abone Seçin',
    className = '',
    error
}: TenantAutocompleteProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Fetch tenants with search query
    const { data: tenantsData, isLoading } = useGetAdminTenants({
        search: searchQuery,
        limit: 10
    }, {
        query: {
            enabled: isOpen // Only fetch when dropdown is open
        }
    });

    const tenants = (tenantsData as any)?.data?.tenants || [];

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (tenant: Tenant) => {
        setSearchQuery(tenant.name);
        setIsOpen(false);
        onSelect(tenant);
    };

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            <div className="relative">
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)}
                    placeholder={placeholder}
                    className={`block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm border p-2 pr-10 ${error ? 'border-red-500' : ''}`}
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    {isLoading ? (
                        <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-blue-600 rounded-full" />
                    ) : (
                        <Search className="h-4 w-4 text-gray-400" />
                    )}
                </div>
            </div>

            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}

            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {isLoading ? (
                        <div className="p-3 text-sm text-gray-500">Yükleniyor...</div>
                    ) : tenants.length === 0 ? (
                        <div className="p-3 text-sm text-gray-500 text-center">
                            Sonuç bulunamadı
                        </div>
                    ) : (
                        tenants.map((tenant: any) => (
                            <div
                                key={tenant.id}
                                className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0 flex items-center space-x-3"
                                onClick={() => handleSelect(tenant)}
                            >
                                <div className="flex-shrink-0">
                                    <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                                        <Building className="h-4 w-4 text-indigo-600" />
                                    </div>
                                </div>
                                <div>
                                    <div className="font-medium text-gray-900">{tenant.name}</div>
                                    {tenant.domain && (
                                        <div className="text-xs text-gray-500">{tenant.domain}</div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
