import { useMemo, useState } from 'react';
import { BadgePercent, Building2, Filter, Link2, Search, ShieldCheck, Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

import { adminApi } from '@/lib/api-client';
import { useAdminResponsive } from '@/hooks';

interface AdminPersonnelTenantSummary {
  tenantId: string;
  tenantName: string;
  personnelEnabled: boolean;
  linkedUserRequired: boolean;
  userCount: number;
  branchCount: number;
  compensationModel: string;
  collectionRule: string;
  calculationOffsetDays: number;
}

interface AdminPersonnelOverviewResponse {
  totalTenants: number;
  activeRules: number;
  linkedUserRequiredCount: number;
  tenants: AdminPersonnelTenantSummary[];
}

function formatModelLabel(value?: string) {
  switch (value) {
    case 'fixed_rate':
      return 'Sabit yuzde';
    case 'tiered':
      return 'Kademeli';
    case 'target':
      return 'Hedef bazli';
    case 'target_tiered':
      return 'Hedef + kademeli';
    default:
      return value || '-';
  }
}

function formatCollectionRule(value?: string) {
  switch (value) {
    case 'full_collection_only':
      return 'Tam tahsilat';
    case 'down_payment_only':
      return 'On odeme kadar';
    case 'down_payment_full_credit':
      return 'On odeme varsa tam prim';
    default:
      return value || '-';
  }
}

export default function AdminPersonnelPage() {
  const { isMobile } = useAdminResponsive();
  const [searchTerm, setSearchTerm] = useState('');
  const [onlyConfigured, setOnlyConfigured] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['/api/admin/personnel/overview'],
    queryFn: async () => adminApi<AdminPersonnelOverviewResponse>({
      url: '/admin/personnel/overview',
      method: 'GET',
    }),
  });

  const tenants = useMemo(() => {
    const rows = data?.tenants ?? [];
    return rows.filter((row) => {
      const matchesSearch = !searchTerm || row.tenantName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesConfigured = !onlyConfigured || row.personnelEnabled;
      return matchesSearch && matchesConfigured;
    });
  }, [data?.tenants, onlyConfigured, searchTerm]);

  const stats = [
    { label: 'Toplam Tenant', value: data?.totalTenants ?? 0, icon: Building2 },
    { label: 'Kurali Aktif Tenant', value: data?.activeRules ?? 0, icon: BadgePercent },
    { label: 'Bagli Kullanici Zorunlu', value: data?.linkedUserRequiredCount ?? 0, icon: Link2 },
    { label: 'Gorunen Kayit', value: tenants.length, icon: Users },
  ];

  return (
    <div className={isMobile ? 'space-y-6 p-4 pb-safe' : 'space-y-6 p-6'}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className={`font-bold text-gray-900 dark:text-white ${isMobile ? 'text-xl' : 'text-2xl'}`}>
            Personel Yonetimi
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Tenant bazli personel kurali, bagli kullanici zorunlulugu ve prim modeli ozetini izleyin
          </p>
        </div>
      </div>

      <div className={`grid gap-4 ${isMobile ? 'grid-cols-2' : 'grid-cols-4'}`}>
        {stats.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{item.label}</p>
                  <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{item.value}</p>
                </div>
                <div className="rounded-2xl bg-gray-100 p-3 dark:bg-gray-700">
                  <Icon className="h-5 w-5 text-gray-700 dark:text-gray-200" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className={`flex gap-3 ${isMobile ? 'flex-col' : 'items-center'}`}>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Tenant ara..."
              className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-10 pr-3 text-sm text-gray-900 outline-none focus:border-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
            />
          </div>
          <button
            onClick={() => setOnlyConfigured((prev) => !prev)}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-colors ${
              onlyConfigured
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'border border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            <Filter className="h-4 w-4" />
            Sadece aktif kurallar
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/40">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Tenant</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Durum</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Kullanici</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Prim Modeli</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Tahsilat</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Hesap Gunu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {tenants.map((tenant) => (
                <tr key={tenant.tenantId} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="px-4 py-4">
                    <div className="font-medium text-gray-900 dark:text-white">{tenant.tenantName}</div>
                    <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {tenant.branchCount} sube, {tenant.userCount} kullanici
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-col gap-2">
                      <span className={`inline-flex w-fit rounded-full px-2 py-1 text-xs font-medium ${tenant.personnelEnabled ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200'}`}>
                        {tenant.personnelEnabled ? 'Aktif' : 'Taslak'}
                      </span>
                      <span className={`inline-flex w-fit rounded-full px-2 py-1 text-xs font-medium ${tenant.linkedUserRequired ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'}`}>
                        {tenant.linkedUserRequired ? 'Bagli kullanici zorunlu' : 'Opsiyonel'}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-200">{tenant.userCount}</td>
                  <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-200">{formatModelLabel(tenant.compensationModel)}</td>
                  <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-200">{formatCollectionRule(tenant.collectionRule)}</td>
                  <td className="px-4 py-4 text-sm text-gray-700 dark:text-gray-200">
                    Donem bitisinden {tenant.calculationOffsetDays} gun sonra
                  </td>
                </tr>
              ))}
              {!isLoading && tenants.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                    Gosterilecek tenant bulunamadi
                  </td>
                </tr>
              )}
              {isLoading && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                    Yukleniyor...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center gap-3">
            <BadgePercent className="h-5 w-5 text-blue-600 dark:text-blue-300" />
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Prim Kurali Denetimi</p>
          </div>
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
            Hangi tenantin sabit, kademeli veya hedef bazli model kullandigini tek bakista izleyin.
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-blue-600 dark:text-blue-300" />
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Bagli Kullanici Kontrolu</p>
          </div>
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
            Personel ve kullanici baginin zorunlu olup olmadigini tenant bazinda izleyin.
          </p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-blue-600 dark:text-blue-300" />
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Operasyon Hazirligi</p>
          </div>
          <p className="mt-3 text-sm text-gray-600 dark:text-gray-300">
            Kurali aktif olmayan tenantlari kolayca ayiklayip onboarding veya destek surecine alin.
          </p>
        </div>
      </div>
    </div>
  );
}
