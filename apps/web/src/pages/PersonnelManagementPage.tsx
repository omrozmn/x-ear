import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BadgePercent,
  Briefcase,
  CalendarClock,
  CheckCircle2,
  Download,
  Clock3,
  FileCheck2,
  Filter,
  PiggyBank,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  SquareChartGantt,
  Users,
} from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';
import { Button, Card, DataTable, Input, Select } from '@x-ear/ui-web';
import type { Column } from '@x-ear/ui-web';

import { DesktopPageHeader } from '../components/layout/DesktopPageHeader';
import {
  usePersonnelCompensation,
  usePersonnelDocuments,
  usePersonnelEmployees,
  usePersonnelLeave,
  usePersonnelOverview,
  usePersonnelSettings,
  type PersonnelCompensationRecord,
  type PersonnelDocumentRecord,
  type PersonnelEmployee,
  type PersonnelLeaveRecord,
  type PersonnelOverviewKpi,
} from '@/api/client/personnel.client';
import { useIsMobile } from '@/hooks/useBreakpoint';
import { cn } from '@/lib/utils';

type MainTab = 'employees' | 'leave' | 'documents' | 'compensation';
type DetailTab = 'general' | 'leave' | 'documents' | 'compensation' | 'history';

const mainTabs: Array<{ id: MainTab; label: string }> = [
  { id: 'employees', label: 'Personeller' },
  { id: 'leave', label: 'Izinler' },
  { id: 'documents', label: 'Evraklar' },
  { id: 'compensation', label: 'Maas & Prim' },
];

const detailTabs: Array<{ id: DetailTab; label: string }> = [
  { id: 'general', label: 'Genel' },
  { id: 'leave', label: 'Izin' },
  { id: 'documents', label: 'Evrak' },
  { id: 'compensation', label: 'Maas & Prim' },
  { id: 'history', label: 'Gecmis' },
];

const iconMap: Record<MainTab, React.ElementType[]> = {
  employees: [Users, ShieldCheck, Briefcase, BadgePercent],
  leave: [Clock3, CheckCircle2, CalendarClock, SquareChartGantt],
  documents: [FileCheck2, Clock3, CheckCircle2, Briefcase],
  compensation: [PiggyBank, BadgePercent, CheckCircle2, SquareChartGantt],
};

const filterOptionsByTab: Record<MainTab, Array<{ value: string; label: string }>> = {
  employees: [
    { value: 'all', label: 'Tum roller' },
    { value: 'admin', label: 'Admin' },
    { value: 'manager', label: 'Manager' },
    { value: 'user', label: 'Kullanici' },
  ],
  leave: [
    { value: 'all', label: 'Tum durumlar' },
    { value: 'Onay Bekliyor', label: 'Onay Bekliyor' },
    { value: 'Onaylandi', label: 'Onaylandi' },
    { value: 'Reddedildi', label: 'Reddedildi' },
  ],
  documents: [
    { value: 'all', label: 'Tum evraklar' },
    { value: 'Eksik', label: 'Eksik' },
    { value: 'Suresi Yaklasiyor', label: 'Suresi Yaklasiyor' },
    { value: 'Tamam', label: 'Tamam' },
  ],
  compensation: [
    { value: 'all', label: 'Tum modeller' },
    { value: 'fixed_rate', label: 'Sabit Yuzde' },
    { value: 'tiered', label: 'Kademeli' },
    { value: 'target', label: 'Hedefli' },
  ],
};

const branchFilterOptions = [
  { value: 'all', label: 'Tum subeler' },
  { value: 'Merkez', label: 'Merkez' },
  { value: 'Kadikoy', label: 'Kadikoy' },
  { value: 'Besiktas', label: 'Besiktas' },
];

function formatDate(value?: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('tr-TR').format(date);
}

function formatCurrency(value?: number | null) {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}

function formatModelLabel(value?: string | null) {
  switch (value) {
    case 'fixed_rate':
      return 'Sabit Yuzde';
    case 'tiered':
      return 'Kademeli';
    case 'target':
      return 'Hedefli';
    case 'target_tiered':
      return 'Hedef + Kademeli';
    default:
      return value || '-';
  }
}

function formatCollectionRule(value?: string | null) {
  switch (value) {
    case 'full_collection_only':
      return 'Tam Tahsilat';
    case 'down_payment_only':
      return 'On Odeme Kadar';
    case 'down_payment_full_credit':
      return 'On Odeme Varsa Tam Prim';
    default:
      return value || '-';
  }
}

export default function PersonnelManagementPage() {
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<MainTab>('employees');
  const [detailTab, setDetailTab] = useState<DetailTab>('general');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterValue, setFilterValue] = useState('all');
  const [branchValue, setBranchValue] = useState('all');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showDetailPanel, setShowDetailPanel] = useState(false);

  const overviewQuery = usePersonnelOverview();
  const employeesQuery = usePersonnelEmployees();
  const leaveQuery = usePersonnelLeave();
  const documentsQuery = usePersonnelDocuments();
  const compensationQuery = usePersonnelCompensation();
  const settingsQuery = usePersonnelSettings();

  const employees = employeesQuery.data ?? [];
  const leaveRecords = leaveQuery.data ?? [];
  const documentRecords = documentsQuery.data ?? [];
  const compensationRecords = compensationQuery.data ?? [];
  const personnelSettings = settingsQuery.data;

  useEffect(() => {
    if (!selectedEmployeeId && employees[0]?.id) {
      setSelectedEmployeeId(employees[0].id);
    }
  }, [employees, selectedEmployeeId]);

  const goToPersonnelSettings = () => {
    navigate({ to: '/settings', search: { tab: 'team' }, hash: 'personnel-settings' });
  };

  const selectedEmployee = useMemo(
    () => employees.find((employee) => employee.id === selectedEmployeeId) ?? employees[0] ?? null,
    [employees, selectedEmployeeId]
  );

  const filteredEmployees = useMemo(() => {
    return employees.filter((employee) => {
      const matchesSearch = !searchTerm || [
        employee.fullName,
        employee.linkedUser,
        employee.role,
        employee.branchNames.join(' '),
      ].some((value) => (value || '').toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesRole = filterValue === 'all' || (employee.role || '').toLowerCase() === filterValue.toLowerCase();
      const matchesBranch = branchValue === 'all' || employee.branchNames.includes(branchValue);
      return matchesSearch && matchesRole && matchesBranch;
    });
  }, [branchValue, employees, filterValue, searchTerm]);

  const filteredLeaveRecords = useMemo(() => {
    return leaveRecords.filter((record) => {
      const matchesSearch = !searchTerm || [
        record.employeeName,
        record.leaveType,
        record.status,
      ].some((value) => (value || '').toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = filterValue === 'all' || record.status === filterValue;
      const employee = employees.find((item) => item.id === record.employeeId);
      const matchesBranch = branchValue === 'all' || employee?.branchNames.includes(branchValue);
      return matchesSearch && matchesStatus && matchesBranch;
    });
  }, [branchValue, employees, filterValue, leaveRecords, searchTerm]);

  const filteredDocumentRecords = useMemo(() => {
    return documentRecords.filter((record) => {
      const matchesSearch = !searchTerm || [
        record.employeeName,
        record.documentType,
        record.status,
      ].some((value) => (value || '').toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesStatus = filterValue === 'all' || record.status === filterValue;
      const matchesBranch = branchValue === 'all' || record.branchName === branchValue;
      return matchesSearch && matchesStatus && matchesBranch;
    });
  }, [branchValue, documentRecords, filterValue, searchTerm]);

  const filteredCompensationRecords = useMemo(() => {
    return compensationRecords.filter((record) => {
      const matchesSearch = !searchTerm || [
        record.employeeName,
        record.linkedUser,
        record.periodLabel,
      ].some((value) => (value || '').toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesModel = filterValue === 'all' || record.modelType === filterValue;
      const employee = employees.find((item) => item.id === record.employeeId);
      const matchesBranch = branchValue === 'all' || employee?.branchNames.includes(branchValue);
      return matchesSearch && matchesModel && matchesBranch;
    });
  }, [branchValue, compensationRecords, employees, filterValue, searchTerm]);

  const employeeColumns: Column<PersonnelEmployee>[] = useMemo(() => {
    const allColumns: Column<PersonnelEmployee>[] = [
      {
        key: 'fullName',
        title: 'Personel',
        render: (_, row) => (
          <div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">{row.fullName}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {row.linkedUser ? `@${row.linkedUser}` : 'Bagli kullanici yok'}
            </div>
          </div>
        ),
      },
      { key: 'role', title: 'Rol', render: (_, row) => row.role || '-' },
      ...(!isMobile ? [
        { key: 'branchNames' as const, title: 'Sube', render: (_: unknown, row: PersonnelEmployee) => row.branchNames.join(', ') || '-' },
        { key: 'hiredAt' as const, title: 'Ise Giris', render: (_: unknown, row: PersonnelEmployee) => formatDate(row.hiredAt) },
        { key: 'lastLogin' as const, title: 'Son Giris', render: (_: unknown, row: PersonnelEmployee) => formatDate(row.lastLogin) },
      ] : []),
      {
        key: 'status',
        title: 'Durum',
        render: (_, row) => (
          <span className={cn(
            'rounded-full px-2 py-1 text-xs font-medium',
            row.status === 'active'
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
              : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
          )}>
            {row.status === 'active' ? 'Aktif' : 'Pasif'}
          </span>
        ),
      },
      {
        key: '_actions',
        title: '',
        render: (_, row) => (
          <Button variant="ghost" size="sm" onClick={() => { setSelectedEmployeeId(row.id); if (isMobile) setShowDetailPanel(true); }}>
            Ac
          </Button>
        ),
      },
    ];
    return allColumns;
  }, [isMobile]);

  const leaveColumns: Column<PersonnelLeaveRecord>[] = useMemo(() => [
    { key: 'employeeName', title: 'Personel', render: (_: unknown, row: PersonnelLeaveRecord) => row.employeeName },
    { key: 'leaveType', title: 'Izin Turu', render: (_: unknown, row: PersonnelLeaveRecord) => row.leaveType },
    ...(!isMobile ? [
      { key: 'dateRange' as const, title: 'Tarih', render: (_: unknown, row: PersonnelLeaveRecord) => `${formatDate(row.startDate)} - ${formatDate(row.endDate)}` },
      { key: 'dayCount' as const, title: 'Sure', render: (_: unknown, row: PersonnelLeaveRecord) => `${row.dayCount} gun` },
    ] : []),
    { key: 'status', title: 'Durum', render: (_: unknown, row: PersonnelLeaveRecord) => row.status },
    ...(!isMobile ? [
      { key: 'approver' as const, title: 'Onaylayan', render: (_: unknown, row: PersonnelLeaveRecord) => row.approver || '-' },
    ] : []),
  ], [isMobile]);

  const documentColumns: Column<PersonnelDocumentRecord>[] = useMemo(() => [
    { key: 'employeeName', title: 'Personel', render: (_: unknown, row: PersonnelDocumentRecord) => row.employeeName },
    { key: 'documentType', title: 'Evrak', render: (_: unknown, row: PersonnelDocumentRecord) => row.documentType },
    { key: 'status', title: 'Durum', render: (_: unknown, row: PersonnelDocumentRecord) => row.status },
    ...(!isMobile ? [
      { key: 'validUntil' as const, title: 'Gecerlilik', render: (_: unknown, row: PersonnelDocumentRecord) => formatDate(row.validUntil) },
      { key: 'branchName' as const, title: 'Sube', render: (_: unknown, row: PersonnelDocumentRecord) => row.branchName || '-' },
    ] : []),
  ], [isMobile]);

  const compensationColumns: Column<PersonnelCompensationRecord>[] = useMemo(() => [
    {
      key: 'employeeName',
      title: 'Personel',
      render: (_: unknown, row: PersonnelCompensationRecord) => (
        <div>
          <div className="text-sm font-medium text-gray-900 dark:text-white">{row.employeeName}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {row.linkedUser ? `@${row.linkedUser}` : 'Bagli kullanici yok'}
          </div>
        </div>
      ),
    },
    ...(!isMobile ? [
      { key: 'periodLabel' as const, title: 'Donem', render: (_: unknown, row: PersonnelCompensationRecord) => row.periodLabel },
      { key: 'modelType' as const, title: 'Model', render: (_: unknown, row: PersonnelCompensationRecord) => formatModelLabel(row.modelType) },
      { key: 'collectionRule' as const, title: 'Tahsilat Kurali', render: (_: unknown, row: PersonnelCompensationRecord) => formatCollectionRule(row.collectionRule) },
    ] : []),
    { key: 'salesTotal', title: 'Satis', render: (_: unknown, row: PersonnelCompensationRecord) => formatCurrency(row.salesTotal) },
    { key: 'accruedPremium', title: 'Hakedis', render: (_: unknown, row: PersonnelCompensationRecord) => formatCurrency(row.accruedPremium) },
    { key: 'payrollStatus', title: 'Durum', render: (_: unknown, row: PersonnelCompensationRecord) => row.payrollStatus },
  ], [isMobile]);

  const activeKpis = useMemo(() => {
    const data = overviewQuery.data;
    const values: PersonnelOverviewKpi[] =
      activeTab === 'employees' ? data?.employees ?? []
      : activeTab === 'leave' ? data?.leave ?? []
      : activeTab === 'documents' ? data?.documents ?? []
      : data?.compensation ?? [];

    return values.map((item, index) => ({
      ...item,
      icon: iconMap[activeTab][index] ?? Briefcase,
    }));
  }, [activeTab, overviewQuery.data]);

  const activeLoading =
    overviewQuery.isLoading ||
    (activeTab === 'employees' && employeesQuery.isLoading) ||
    (activeTab === 'leave' && leaveQuery.isLoading) ||
    (activeTab === 'documents' && documentsQuery.isLoading) ||
    (activeTab === 'compensation' && compensationQuery.isLoading);

  const clearFilters = () => {
    setSearchTerm('');
    setFilterValue('all');
    setBranchValue('all');
  };

  const handleTabChange = (tab: MainTab) => {
    setActiveTab(tab);
    clearFilters();
  };

  const exportCsv = useCallback(() => {
    let csvContent = '';
    if (activeTab === 'employees') {
      csvContent = 'Ad Soyad,Rol,Sube,Ise Giris,Durum\n';
      for (const emp of filteredEmployees) {
        csvContent += `"${emp.fullName}","${emp.role || ''}","${emp.branchNames.join(', ')}","${emp.hiredAt || ''}","${emp.status}"\n`;
      }
    } else if (activeTab === 'leave') {
      csvContent = 'Personel,Izin Turu,Baslangic,Bitis,Gun,Durum,Onaylayan\n';
      for (const rec of filteredLeaveRecords) {
        csvContent += `"${rec.employeeName}","${rec.leaveType}","${rec.startDate}","${rec.endDate}",${rec.dayCount},"${rec.status}","${rec.approver || ''}"\n`;
      }
    } else if (activeTab === 'documents') {
      csvContent = 'Personel,Evrak,Durum,Gecerlilik,Sube\n';
      for (const rec of filteredDocumentRecords) {
        csvContent += `"${rec.employeeName}","${rec.documentType}","${rec.status}","${rec.validUntil || ''}","${rec.branchName || ''}"\n`;
      }
    } else {
      csvContent = 'Personel,Donem,Model,Tahsilat,Satis Hacmi,Hakedis,Durum\n';
      for (const rec of filteredCompensationRecords) {
        csvContent += `"${rec.employeeName}","${rec.periodLabel}","${rec.modelType}","${rec.collectionRule}",${rec.salesTotal},${rec.accruedPremium},"${rec.payrollStatus}"\n`;
      }
    }

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `personel_${activeTab}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [activeTab, filteredEmployees, filteredLeaveRecords, filteredDocumentRecords, filteredCompensationRecords]);

  const renderDetailContent = () => {
    if (!selectedEmployee) return null;

    const employeeLeaves = leaveRecords.filter((record) => record.employeeId === selectedEmployee.id);
    const employeeDocuments = documentRecords.filter((record) => record.employeeId === selectedEmployee.id);
    const employeeCompensation = compensationRecords.find((record) => record.employeeId === selectedEmployee.id);
    const leavePolicy = personnelSettings?.leavePolicy;
    const compensation = personnelSettings?.compensation;

    if (detailTab === 'general') {
      return (
        <div className="grid gap-4 md:grid-cols-2">
          <InfoCard label="Bagli Kullanici" value={selectedEmployee.linkedUser ? `@${selectedEmployee.linkedUser}` : 'Eslesme bekleniyor'} />
          <InfoCard label="Rol" value={selectedEmployee.role || '-'} />
          <InfoCard label="Sube" value={selectedEmployee.branchNames.join(', ') || '-'} />
          <InfoCard label="Ise Giris" value={formatDate(selectedEmployee.hiredAt)} />
          <InfoCard label="Son Giris" value={formatDate(selectedEmployee.lastLogin)} />
          <InfoCard label="Prim Modeli" value={selectedEmployee.premiumProfile} />
        </div>
      );
    }

    if (detailTab === 'leave') {
      const pendingLeave = employeeLeaves[0];
      return (
        <div className="space-y-3">
          <InfoCard label="Yillik Izin Hakki" value={`${leavePolicy?.annualEntitlementDays ?? 0} gun`} />
          <InfoCard label="Devreden Izin" value={leavePolicy?.carryOverEnabled ? 'Acilmis' : 'Kapali'} />
          <InfoCard label="Son Talep" value={pendingLeave ? `${formatDate(pendingLeave.startDate)} - ${formatDate(pendingLeave.endDate)} / ${pendingLeave.status}` : 'Talep yok'} />
        </div>
      );
    }

    if (detailTab === 'documents') {
      const expiringDocument = employeeDocuments.find((record) => record.status === 'Suresi Yaklasiyor');
      const missingDocument = employeeDocuments.find((record) => record.status === 'Eksik');
      return (
        <div className="space-y-3">
          <InfoCard label="Eksik Evrak" value={missingDocument?.documentType || 'Eksik yok'} />
          <InfoCard label="Suresi Yaklasan" value={expiringDocument ? `${expiringDocument.documentType} / ${formatDate(expiringDocument.validUntil)}` : 'Yok'} />
          <InfoCard label="Toplam Evrak" value={`${employeeDocuments.length} kayit`} />
        </div>
      );
    }

    if (detailTab === 'compensation') {
      return (
        <div className="space-y-4">
          <div className="break-words rounded-2xl border border-gray-200 p-3 dark:border-gray-700 md:p-4">
            <p className="text-sm font-medium text-gray-900 dark:text-white">Prim kurali</p>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              Donem: {compensation?.periodMode || '-'}.
              Hesap tarihi: donem bitisinden {compensation?.calculationOffsetDays ?? 0} gun sonra.
            </p>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
              Model: {formatModelLabel(compensation?.modelType)}.
              Tahsilat secenegi: {formatCollectionRule(compensation?.collectionRule)}.
            </p>
          </div>
          <div className="grid gap-3">
            <InfoCard label="Hedef" value={compensation?.targetEnabled ? formatCurrency(compensation.targetAmount) : 'Kullanilmiyor'} />
            <InfoCard label="Tahsilat Kurali" value={formatCollectionRule(compensation?.collectionRule)} />
            <InfoCard label="Son Hakedis" value={employeeCompensation ? formatCurrency(employeeCompensation.accruedPremium) : '-'} />
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <InfoCard label="Bagli Kullanici Zorunlu" value={personnelSettings?.linkedUserRequired ? 'Evet' : 'Hayir'} />
        <InfoCard label="Son Hesap Donemi" value={employeeCompensation?.periodLabel || '-'} />
        <InfoCard label="Bordro Durumu" value={employeeCompensation?.payrollStatus || 'Hazir degil'} />
      </div>
    );
  };

  return (
    <div className="space-y-4 p-3 md:space-y-6 md:p-6">
      <DesktopPageHeader
        title="Personel Yonetimi"
        description={isMobile ? undefined : "Personel, izin, evrak ve maas-prim sureclerini yonetin"}
        icon={<Briefcase className="h-6 w-6" />}
        eyebrow={{ tr: 'Operasyon', en: 'Operations' }}
        actions={(
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="flex items-center gap-2" onClick={goToPersonnelSettings}>
              <Settings2 size={18} />
              {!isMobile && 'Personel Ayarlari'}
            </Button>
            <Button variant="outline" className="flex items-center gap-2" onClick={exportCsv}>
              <Download size={18} />
              {!isMobile && 'Disa Aktar'}
            </Button>
            <Button className="flex items-center gap-2" onClick={() => navigate({ to: '/settings', search: { tab: 'team' } })}>
              <Plus size={18} />
              {!isMobile && 'Yeni Personel'}
            </Button>
          </div>
        )}
      />

      <div className="flex flex-wrap gap-2">
        {mainTabs.map((tab) => (
          <Button
            key={tab.id}
            variant={tab.id === activeTab ? 'default' : 'outline'}
            onClick={() => handleTabChange(tab.id)}
            className="rounded-full"
          >
            {tab.label}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-6">
        {activeKpis.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.key} className="min-w-0 p-4 md:p-6">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs text-gray-500 dark:text-gray-400 md:text-sm">{item.label}</p>
                  <p className="mt-1 truncate text-lg font-bold text-gray-900 dark:text-white md:mt-2 md:text-2xl">{item.value}</p>
                </div>
                <div className="shrink-0 rounded-2xl bg-gray-100 p-2 dark:bg-gray-800 md:p-3">
                  <Icon className="h-4 w-4 text-gray-700 dark:text-gray-200 md:h-5 md:w-5" />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="p-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder={
                  activeTab === 'employees'
                    ? 'Personel veya bagli kullanici ara...'
                    : activeTab === 'leave'
                      ? 'Personel veya izin turu ara...'
                      : activeTab === 'documents'
                        ? 'Personel veya evrak tipi ara...'
                        : 'Personel veya donem ara...'
                }
                className="pl-10"
                fullWidth
              />
            </div>
            <Button variant="outline" className="flex items-center gap-2" onClick={() => setShowFilters((prev) => !prev)}>
              <Filter size={18} />
              {!isMobile && 'Filtreler'}
            </Button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[220px_220px_auto]">
              <Select
                value={filterValue}
                onChange={(event) => setFilterValue(event.target.value)}
                options={filterOptionsByTab[activeTab]}
              />
              <Select
                value={branchValue}
                onChange={(event) => setBranchValue(event.target.value)}
                options={branchFilterOptions}
              />
              <div className="flex items-center justify-end gap-2">
                <Button variant="outline" onClick={clearFilters}>Temizle</Button>
                <Button onClick={() => setShowFilters(false)}>Uygula</Button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {activeTab === 'employees' && (
        <>
          <div className={cn('grid gap-6', isMobile ? 'grid-cols-1' : 'grid-cols-[1.4fr_0.9fr]')}>
            <Card className="overflow-hidden">
              <DataTable<PersonnelEmployee>
                data={filteredEmployees}
                rowKey={(row) => row.id}
                loading={activeLoading}
                emptyText="Personel kaydi bulunamadi"
                hoverable
                striped
                columns={employeeColumns}
                onRowClick={(row) => { setSelectedEmployeeId(row.id); if (isMobile) setShowDetailPanel(true); }}
              />
            </Card>

            {!isMobile && (
              <Card className="p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Personel Detayi</p>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{selectedEmployee?.fullName || 'Secim yok'}</h3>
                  </div>
                  {selectedEmployee && (
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                      {selectedEmployee.linkedUser ? `@${selectedEmployee.linkedUser}` : 'Eslesme yok'}
                    </span>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {detailTabs.map((tab) => (
                    <Button
                      key={tab.id}
                      variant={tab.id === detailTab ? 'default' : 'outline'}
                      onClick={() => setDetailTab(tab.id)}
                      className="rounded-full"
                    >
                      {tab.label}
                    </Button>
                  ))}
                </div>

                <div className="mt-5">{renderDetailContent()}</div>
              </Card>
            )}
          </div>

          {/* Mobile detail bottom sheet */}
          {isMobile && showDetailPanel && selectedEmployee && (
            <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50" onClick={() => setShowDetailPanel(false)}>
              <div
                className="max-h-[80vh] overflow-y-auto rounded-t-2xl bg-white p-5 dark:bg-gray-900"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Personel Detayi</p>
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">{selectedEmployee.fullName}</h3>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setShowDetailPanel(false)}>
                    Kapat
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {detailTabs.map((tab) => (
                    <Button
                      key={tab.id}
                      variant={tab.id === detailTab ? 'default' : 'outline'}
                      onClick={() => setDetailTab(tab.id)}
                      className="rounded-full text-xs"
                      size="sm"
                    >
                      {tab.label}
                    </Button>
                  ))}
                </div>

                <div className="mt-4">{renderDetailContent()}</div>
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === 'leave' && (
        <Card className="overflow-hidden">
          <DataTable<PersonnelLeaveRecord>
            data={filteredLeaveRecords}
            rowKey={(row) => row.id}
            loading={activeLoading}
            emptyText="Izin kaydi bulunamadi"
            hoverable
            striped
            columns={leaveColumns}
          />
        </Card>
      )}

      {activeTab === 'documents' && (
        <Card className="overflow-hidden">
          <DataTable<PersonnelDocumentRecord>
            data={filteredDocumentRecords}
            rowKey={(row) => row.id}
            loading={activeLoading}
            emptyText="Evrak kaydi bulunamadi"
            hoverable
            striped
            columns={documentColumns}
          />
        </Card>
      )}

      {activeTab === 'compensation' && (
        <div className="space-y-6">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <Card className="p-4 md:p-5">
              <p className="text-sm font-medium text-gray-900 dark:text-white">Donem ayari</p>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                Donem modu: {personnelSettings?.compensation.periodMode || '-'}.
                Hesap tarihi donem bitisinden {personnelSettings?.compensation.calculationOffsetDays ?? 0} gun sonra.
              </p>
            </Card>
            <Card className="p-4 md:p-5">
              <p className="text-sm font-medium text-gray-900 dark:text-white">Model secenekleri</p>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                Aktif model: {formatModelLabel(personnelSettings?.compensation.modelType)}.
                Hedef kullanimi: {personnelSettings?.compensation.targetEnabled ? 'Acik' : 'Kapali'}.
              </p>
            </Card>
            <Card className="p-4 md:p-5">
              <p className="text-sm font-medium text-gray-900 dark:text-white">Tahsilat kurali</p>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                {formatCollectionRule(personnelSettings?.compensation.collectionRule)} secenegi aktif.
              </p>
            </Card>
          </div>

          <Card className="overflow-hidden">
            <DataTable<PersonnelCompensationRecord>
              data={filteredCompensationRecords}
              rowKey={(row) => row.id}
              loading={activeLoading}
              emptyText="Maas ve prim kaydi bulunamadi"
              hoverable
              striped
              columns={compensationColumns}
            />
          </Card>
        </div>
      )}
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-gray-200 p-3 dark:border-gray-700 md:p-4">
      <p className="truncate text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-1 break-words text-sm font-medium text-gray-900 dark:text-white md:mt-2">{value}</p>
    </div>
  );
}
