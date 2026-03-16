import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/api/orval-mutator';
import toast from 'react-hot-toast';
import { useAdminResponsive } from '@/hooks/useAdminResponsive';
import { getCountryConfig } from '@/config/countryRegistry';

interface CountryData {
    code: string;
    name: string;
    nativeName?: string;
    enabled: boolean;
    creatable: boolean;
    currencyCode: string;
    locale: string;
    timezone: string;
    phonePrefix: string;
    flagEmoji?: string;
    dateFormat?: string;
    config?: Record<string, unknown>;
    sortOrder: number;
}

function useListAdminCountries() {
    return useQuery({
        queryKey: ['/api/admin/countries'],
        queryFn: async () => {
            const response = await adminApi<{ countries: CountryData[]; total: number }>({
                url: '/admin/countries',
                method: 'GET',
            });
            return response;
        },
    });
}

function useUpdateAdminCountry() {
    return useMutation({
        mutationFn: async ({ code, data }: { code: string; data: Partial<CountryData> }) => {
            const response = await adminApi<CountryData>({
                url: `/admin/countries/${code}`,
                method: 'PUT',
                data,
            });
            return response;
        },
    });
}

function useSeedAdminCountries() {
    return useMutation({
        mutationFn: async () => {
            const response = await adminApi<{ created: number }>({
                url: '/admin/countries/seed',
                method: 'POST',
            });
            return response;
        },
    });
}

function getCountries(data: unknown): CountryData[] {
    if (!data || typeof data !== 'object') return [];
    const record = data as Record<string, unknown>;
    if (Array.isArray(record.countries)) return record.countries as CountryData[];
    if (Array.isArray(record)) return record as CountryData[];
    return [];
}

const CountriesPage: React.FC = () => {
    const { isMobile } = useAdminResponsive();
    const queryClient = useQueryClient();
    const { data: countriesData, isLoading } = useListAdminCountries();
    const { mutateAsync: updateCountry } = useUpdateAdminCountry();
    const { mutateAsync: seedCountries } = useSeedAdminCountries();

    const countries = getCountries(countriesData);
    const enabledCount = countries.filter(c => c.enabled).length;

    const handleToggle = async (code: string, field: 'enabled' | 'creatable', value: boolean) => {
        try {
            await updateCountry({ code, data: { [field]: value } });
            toast.success(`${code} ${field === 'enabled' ? (value ? 'etkinlestirildi' : 'devre disi birakildi') : (value ? 'olusturulabilir' : 'olusturulamaz')}`);
            queryClient.invalidateQueries({ queryKey: ['/api/admin/countries'] });
        } catch {
            toast.error('Guncelleme basarisiz');
        }
    };

    const handleSeed = async () => {
        try {
            const result = await seedCountries();
            const created = (result as Record<string, unknown>)?.created ?? 0;
            toast.success(`${created} yeni ulke eklendi`);
            queryClient.invalidateQueries({ queryKey: ['/api/admin/countries'] });
        } catch {
            toast.error('Seed basarisiz');
        }
    };

    if (isLoading) return <div className={isMobile ? 'p-4' : 'p-6'}>Loading...</div>;

    return (
        <div className={isMobile ? 'p-4 pb-safe' : 'p-6'}>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className={`font-semibold text-gray-900 dark:text-white ${isMobile ? 'text-xl' : 'text-2xl'}`}>Countries</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Ulke pazarlarini yonetin ve yapilandirin</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                        {enabledCount} / {countries.length} aktif
                    </span>
                    <button
                        onClick={handleSeed}
                        className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                        Seed Countries
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {countries.map((country) => {
                    const registry = getCountryConfig(country.code);
                    return (
                        <div
                            key={country.code}
                            className={`p-4 border rounded-xl bg-white dark:bg-gray-800 shadow-sm transition-all ${
                                country.enabled
                                    ? 'border-green-200 dark:border-green-800'
                                    : 'border-gray-200 dark:border-gray-700 opacity-60'
                            }`}
                        >
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-2xl">{country.flagEmoji || registry.flag}</span>
                                    <div>
                                        <div className="font-semibold text-gray-900 dark:text-white">{country.name}</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">{country.nativeName}</div>
                                    </div>
                                </div>
                                <span className="text-sm font-mono text-gray-400">{country.code}</span>
                            </div>

                            <div className="flex flex-wrap gap-2 mb-3 text-xs">
                                <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                    {country.currencyCode}
                                </span>
                                <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                    {country.locale}
                                </span>
                                <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                                    {country.phonePrefix}
                                </span>
                            </div>

                            <div className="flex items-center justify-between pt-3 border-t dark:border-gray-700">
                                <div className="flex items-center gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <span className="text-xs text-gray-500 dark:text-gray-400">Enabled</span>
                                        <button
                                            onClick={() => handleToggle(country.code, 'enabled', !country.enabled)}
                                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                                country.enabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                                            }`}
                                        >
                                            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                                country.enabled ? 'translate-x-4' : 'translate-x-0.5'
                                            }`} />
                                        </button>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <span className="text-xs text-gray-500 dark:text-gray-400">Creatable</span>
                                        <button
                                            onClick={() => handleToggle(country.code, 'creatable', !country.creatable)}
                                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                                country.creatable ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                                            }`}
                                        >
                                            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                                country.creatable ? 'translate-x-4' : 'translate-x-0.5'
                                            }`} />
                                        </button>
                                    </label>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {countries.length === 0 && (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    <p className="mb-4">Henuz ulke eklenmemis</p>
                    <button
                        onClick={handleSeed}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Varsayilan Ulkeleri Ekle
                    </button>
                </div>
            )}
        </div>
    );
};

export default CountriesPage;
