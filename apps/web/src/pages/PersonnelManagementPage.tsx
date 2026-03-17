import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BadgePercent,
  Briefcase,
  CalendarClock,
  Check,
  CheckCircle2,
  Download,
  Clock3,
  FileCheck2,
  Filter,
  Loader2,
  PiggyBank,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  SquareChartGantt,
  Users,
  X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';
import { Button, Card, DataTable, Input, Select } from '@x-ear/ui-web';
import type { Column } from '@x-ear/ui-web';

import { DesktopPageHeader } from '../components/layout/DesktopPageHeader';
import {
  useCreateLeaveRequest,
  useLeaveRequestAction,
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
import { Modal } from '@/components/ui/Modal';
import { PermissionGate } from '@/components/PermissionGate';
import { useIsMobile } from '@/hooks/useBreakpoint';
import { cn } from '@/lib/utils';

type MainTab = 'employees' | 'leave' | 'documents' | 'compensation';
type DetailTab = 'general' | 'leave' | 'documents' | 'compensation' | 'history';

const iconMap: Record<MainTab, React.ElementType[]> = {
  employees: [Users, ShieldCheck, Briefcase, BadgePercent],
  leave: [Clock3, CheckCircle2, CalendarClock, SquareChartGantt],
  documents: [FileCheck2, Clock3, CheckCircle2, Briefcase],
  compensation: [PiggyBank, BadgePercent, CheckCircle2, SquareChartGantt],
};

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

function LeaveStatusBadge({ status, t }: { status: string; t: (key: string) => string }) {
  const labelMap: Record<string, string> = {
    'Onay Bekliyor': t('leave.status_pending'),
    'Onaylandi': t('leave.status_approved'),
    'Reddedildi': t('leave.status_rejected'),
  };
  const config =
    status === 'Onaylandi'
      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
      : status === 'Reddedildi'
        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
  return (
    <span className={cn('rounded-full px-2 py-1 text-xs font-medium', config)}>
      {labelMap[status] || status}
    </span>
  );
}

function calculateWorkDays(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  let count = 0;
  const current = new Date(start);
  while (current <= end) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) count++;
    current.setDate(current.getDate() + 1);
  }
  return count || 1;
}

export default function PersonnelManagementPage() {
  const { t } = useTranslation('personnel');
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

  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    employeeId: '',
    leaveType: '',
    startDate: '',
    endDate: '',
    note: '',
  });
  const [leaveFormError, setLeaveFormError] = useState('');

  const [rejectingLeaveId, setRejectingLeaveId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const overviewQuery = usePersonnelOverview();
  const employeesQuery = usePersonnelEmployees();
  const leaveQuery = usePersonnelLeave();
  const documentsQuery = usePersonnelDocuments();
  const compensationQuery = usePersonnelCompensation();
  const settingsQuery = usePersonnelSettings();
  const createLeaveMutation = useCreateLeaveRequest();
  const leaveActionMutation = useLeaveRequestAction();

  const employees = employeesQuery.data ?? [];
  const leaveRecords = leaveQuery.data ?? [];
  const documentRecords = documentsQuery.data ?? [];
  const compensationRecords = compensationQuery.data ?? [];
  const personnelSettings = settingsQuery.data;

  const mainTabs: Array<{ id: MainTab; label: string }> = useMemo(() => [
    { id: 'employees', label: t('tabs.employees') },
    { id: 'leave', label: t('tabs.leave') },
    { id: 'documents', label: t('tabs.documents') },
    { id: 'compensation', label: t('tabs.compensation') },
  ], [t]);

  const detailTabs: Array<{ id: DetailTab; label: string }> = useMemo(() => [
    { id: 'general', label: t('detail_tabs.general') },
    { id: 'leave', label: t('detail_tabs.leave') },
    { id: 'documents', label: t('detail_tabs.documents') },
    { id: 'compensation', label: t('detail_tabs.compensation') },
    { id: 'history', label: t('detail_tabs.history') },
  ], [t]);

  const filterOptionsByTab: Record<MainTab, Array<{ value: string; label: string }>> = useMemo(() => ({
    employees: [
      { value: 'all', label: t('filters.all_roles') },
      { value: 'admin', label: 'Admin' },
      { value: 'manager', label: 'Manager' },
      { value: 'user', label: t('filters.all_roles').includes('roller') ? 'Kullanıcı' : 'User' },
    ],
    leave: [
      { value: 'all', label: t('filters.all_statuses') },
      { value: 'Onay Bekliyor', label: t('leave.status_pending') },
      { value: 'Onaylandi', label: t('leave.status_approved') },
      { value: 'Reddedildi', label: t('leave.status_rejected') },
    ],
    documents: [
      { value: 'all', label: t('filters.all_documents') },
      { value: 'Eksik', label: 'Eksik' },
      { value: 'Suresi Yaklasiyor', label: 'Süresi Yaklaşıyor' },
      { value: 'Tamam', label: 'Tamam' },
    ],
    compensation: [
      { value: 'all', label: t('filters.all_models') },
      { value: 'fixed_rate', label: t('models.fixed_rate') },
      { value: 'tiered', label: t('models.tiered') },
      { value: 'target', label: t('models.target') },
    ],
  }), [t]);

  const formatModelLabel = useCallback((value?: string | null) => {
    if (!value) return '-';
    return t(`models.${value}`, { defaultValue: value });
  }, [t]);

  const formatCollectionRule = useCallback((value?: string | null) => {
    if (!value) return '-';
    return t(`collection_rules.${value}`, { defaultValue: value });
  }, [t]);

  const branchFilterOptions = useMemo(() => {
    const branches = new Set<string>();
    for (const emp of employees) {
      for (const b of emp.branchNames) branches.add(b);
    }
    return [
      { value: 'all', label: t('filters.all_branches') },
      ...Array.from(branches).sort().map((b) => ({ value: b, label: b })),
    ];
  }, [employees, t]);

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
        (employee.branchNames || []).join(' '),
      ].some((value) => (value || '').toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesRole = filterValue === 'all' || (employee.role || '').toLowerCase() === filterValue.toLowerCase();
      const matchesBranch = branchValue === 'all' || (employee.branchNames || []).includes(branchValue);
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

  const employeeColumns: Column<PersonnelEmployee>[] = useMemo(() => [
    {
      key: 'fullName',
      title: t('employees.column_name'),
      render: (_, row) => (
        <div>
          <div className="text-sm font-medium text-gray-900 dark:text-white">{row.fullName}</div>
          <div className="text-xs text-muted-foreground">
            {row.linkedUser ? `@${row.linkedUser}` : t('employees.no_linked_user')}
          </div>
        </div>
      ),
    },
    { key: 'role', title: t('employees.column_role'), render: (_, row) => row.role || '-' },
    ...(!isMobile ? [
      { key: 'branchNames' as const, title: t('employees.column_branch'), render: (_: unknown, row: PersonnelEmployee) => (row.branchNames || []).join(', ') || '-' },
      { key: 'hiredAt' as const, title: t('employees.column_hired_at'), render: (_: unknown, row: PersonnelEmployee) => formatDate(row.hiredAt) },
      { key: 'lastLogin' as const, title: t('employees.column_last_login'), render: (_: unknown, row: PersonnelEmployee) => formatDate(row.lastLogin) },
    ] : []),
    {
      key: 'status',
      title: t('employees.column_status'),
      render: (_, row) => (
        <span className={cn(
          'rounded-full px-2 py-1 text-xs font-medium',
          row.status === 'active'
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
            : 'bg-muted text-foreground'
        )}>
          {row.status === 'active' ? t('employees.status_active') : t('employees.status_passive')}
        </span>
      ),
    },
    {
      key: '_actions',
      title: '',
      render: (_, row) => (
        <Button variant="ghost" size="sm" onClick={() => { setSelectedEmployeeId(row.id); if (isMobile) setShowDetailPanel(true); }}>
          {t('actions.open')}
        </Button>
      ),
    },
  ], [isMobile, t]);

  const leaveColumns: Column<PersonnelLeaveRecord>[] = useMemo(() => [
    { key: 'employeeName', title: t('leave.column_name'), render: (_: unknown, row: PersonnelLeaveRecord) => row.employeeName },
    { key: 'leaveType', title: t('leave.column_type'), render: (_: unknown, row: PersonnelLeaveRecord) => row.leaveType },
    ...(!isMobile ? [
      { key: 'dateRange' as const, title: t('leave.column_date'), render: (_: unknown, row: PersonnelLeaveRecord) => `${formatDate(row.startDate)} - ${formatDate(row.endDate)}` },
      { key: 'dayCount' as const, title: t('leave.column_duration'), render: (_: unknown, row: PersonnelLeaveRecord) => t('leave.days_unit', { count: row.dayCount }) },
    ] : []),
    {
      key: 'status',
      title: t('leave.column_status'),
      render: (_: unknown, row: PersonnelLeaveRecord) => <LeaveStatusBadge status={row.status} t={t} />,
    },
    ...(!isMobile ? [
      { key: 'approver' as const, title: t('leave.column_approver'), render: (_: unknown, row: PersonnelLeaveRecord) => row.approver || '-' },
    ] : []),
    {
      key: '_actions' as const,
      title: '',
      render: (_: unknown, row: PersonnelLeaveRecord) => {
        if (row.status !== 'Onay Bekliyor') return null;
        return (
          <PermissionGate permission="personnel.edit">
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="text-emerald-600 hover:text-emerald-700"
                onClick={(e: React.MouseEvent) => { e.stopPropagation(); handleApproveLeave(row.id); }}
                disabled={leaveActionMutation.isPending}
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-red-600 hover:text-red-700"
                onClick={(e: React.MouseEvent) => { e.stopPropagation(); setRejectingLeaveId(row.id); setRejectReason(''); }}
                disabled={leaveActionMutation.isPending}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </PermissionGate>
        );
      },
    },
  ], [isMobile, leaveActionMutation.isPending, t]);

  const documentColumns: Column<PersonnelDocumentRecord>[] = useMemo(() => [
    { key: 'employeeName', title: t('documents.column_name'), render: (_: unknown, row: PersonnelDocumentRecord) => row.employeeName },
    { key: 'documentType', title: t('documents.column_type'), render: (_: unknown, row: PersonnelDocumentRecord) => row.documentType },
    { key: 'status', title: t('documents.column_status'), render: (_: unknown, row: PersonnelDocumentRecord) => row.status },
    ...(!isMobile ? [
      { key: 'validUntil' as const, title: t('documents.column_valid_until'), render: (_: unknown, row: PersonnelDocumentRecord) => formatDate(row.validUntil) },
      { key: 'branchName' as const, title: t('documents.column_branch'), render: (_: unknown, row: PersonnelDocumentRecord) => row.branchName || '-' },
    ] : []),
  ], [isMobile, t]);

  const compensationColumns: Column<PersonnelCompensationRecord>[] = useMemo(() => [
    {
      key: 'employeeName',
      title: t('compensation.column_name'),
      render: (_: unknown, row: PersonnelCompensationRecord) => (
        <div>
          <div className="text-sm font-medium text-gray-900 dark:text-white">{row.employeeName}</div>
          <div className="text-xs text-muted-foreground">
            {row.linkedUser ? `@${row.linkedUser}` : t('compensation.no_linked_user')}
          </div>
        </div>
      ),
    },
    ...(!isMobile ? [
      { key: 'periodLabel' as const, title: t('compensation.column_period'), render: (_: unknown, row: PersonnelCompensationRecord) => row.periodLabel },
      { key: 'modelType' as const, title: t('compensation.column_model'), render: (_: unknown, row: PersonnelCompensationRecord) => formatModelLabel(row.modelType) },
      { key: 'collectionRule' as const, title: t('compensation.column_collection'), render: (_: unknown, row: PersonnelCompensationRecord) => formatCollectionRule(row.collectionRule) },
    ] : []),
    { key: 'salesTotal', title: t('compensation.column_sales'), render: (_: unknown, row: PersonnelCompensationRecord) => formatCurrency(row.salesTotal) },
    { key: 'accruedPremium', title: t('compensation.column_accrued'), render: (_: unknown, row: PersonnelCompensationRecord) => formatCurrency(row.accruedPremium) },
    { key: 'payrollStatus', title: t('compensation.column_status'), render: (_: unknown, row: PersonnelCompensationRecord) => row.payrollStatus },
  ], [isMobile, formatModelLabel, formatCollectionRule, t]);

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

  const activeError =
    (activeTab === 'employees' && employeesQuery.isError) ||
    (activeTab === 'leave' && leaveQuery.isError) ||
    (activeTab === 'documents' && documentsQuery.isError) ||
    (activeTab === 'compensation' && compensationQuery.isError);

  const clearFilters = () => { setSearchTerm(''); setFilterValue('all'); setBranchValue('all'); };
  const handleTabChange = (tab: MainTab) => { setActiveTab(tab); clearFilters(); };

  const openLeaveModal = () => {
    setLeaveForm({
      employeeId: employees[0]?.id || '',
      leaveType: personnelSettings?.leavePolicy.leaveTypes[0] || '',
      startDate: '', endDate: '', note: '',
    });
    setLeaveFormError('');
    setShowLeaveModal(true);
  };

  const validateLeaveForm = (): string | null => {
    if (!leaveForm.employeeId) return t('leave_form.validation.employee_required');
    if (!leaveForm.leaveType) return t('leave_form.validation.type_required');
    if (!leaveForm.startDate) return t('leave_form.validation.start_required');
    if (!leaveForm.endDate) return t('leave_form.validation.end_required');
    if (leaveForm.endDate < leaveForm.startDate) return t('leave_form.validation.end_before_start');
    return null;
  };

  const handleCreateLeave = () => {
    const error = validateLeaveForm();
    if (error) { setLeaveFormError(error); return; }
    const dayCount = calculateWorkDays(leaveForm.startDate, leaveForm.endDate);
    createLeaveMutation.mutate(
      { employeeId: leaveForm.employeeId, leaveType: leaveForm.leaveType, startDate: leaveForm.startDate, endDate: leaveForm.endDate, dayCount, note: leaveForm.note || undefined },
      {
        onSuccess: () => setShowLeaveModal(false),
        onError: (err: unknown) => {
          setLeaveFormError(err instanceof Error ? err.message : t('leave_form.error_generic'));
        },
      },
    );
  };

  const handleApproveLeave = (leaveId: string) => {
    leaveActionMutation.mutate({ leaveId, action: 'approve' });
  };

  const handleRejectLeave = () => {
    if (!rejectingLeaveId) return;
    leaveActionMutation.mutate(
      { leaveId: rejectingLeaveId, action: 'reject', reason: rejectReason || undefined },
      { onSuccess: () => setRejectingLeaveId(null) },
    );
  };

  const exportCsv = useCallback(() => {
    const dataMap = { employees: filteredEmployees, leave: filteredLeaveRecords, documents: filteredDocumentRecords, compensation: filteredCompensationRecords };
    if (dataMap[activeTab].length === 0) return;
    let csvContent = '';
    if (activeTab === 'employees') {
      csvContent = 'Ad Soyad,Rol,Sube,Ise Giris,Durum\n';
      for (const emp of filteredEmployees) csvContent += `"${emp.fullName}","${emp.role || ''}","${(emp.branchNames || []).join(', ')}","${emp.hiredAt || ''}","${emp.status}"\n`;
    } else if (activeTab === 'leave') {
      csvContent = 'Personel,Izin Turu,Baslangic,Bitis,Gun,Durum,Onaylayan\n';
      for (const rec of filteredLeaveRecords) csvContent += `"${rec.employeeName}","${rec.leaveType}","${rec.startDate}","${rec.endDate}",${rec.dayCount},"${rec.status}","${rec.approver || ''}"\n`;
    } else if (activeTab === 'documents') {
      csvContent = 'Personel,Evrak,Durum,Gecerlilik,Sube\n';
      for (const rec of filteredDocumentRecords) csvContent += `"${rec.employeeName}","${rec.documentType}","${rec.status}","${rec.validUntil || ''}","${rec.branchName || ''}"\n`;
    } else {
      csvContent = 'Personel,Donem,Model,Tahsilat,Satis Hacmi,Hakedis,Durum\n';
      for (const rec of filteredCompensationRecords) csvContent += `"${rec.employeeName}","${rec.periodLabel}","${rec.modelType}","${rec.collectionRule}",${rec.salesTotal},${rec.accruedPremium},"${rec.payrollStatus}"\n`;
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
          <InfoCard label={t('detail.linked_user')} value={selectedEmployee.linkedUser ? `@${selectedEmployee.linkedUser}` : t('employees.awaiting_match')} />
          <InfoCard label={t('detail.role')} value={selectedEmployee.role || '-'} />
          <InfoCard label={t('detail.branch')} value={(selectedEmployee.branchNames || []).join(', ') || '-'} />
          <InfoCard label={t('detail.hired_at')} value={formatDate(selectedEmployee.hiredAt)} />
          <InfoCard label={t('detail.last_login')} value={formatDate(selectedEmployee.lastLogin)} />
          <InfoCard label={t('detail.premium_model')} value={selectedEmployee.premiumProfile} />
        </div>
      );
    }
    if (detailTab === 'leave') {
      const pendingLeave = employeeLeaves[0];
      return (
        <div className="space-y-3">
          <InfoCard label={t('leave.annual_entitlement')} value={t('leave.days_unit', { count: leavePolicy?.annualEntitlementDays ?? 0 })} />
          <InfoCard label={t('leave.carry_over')} value={leavePolicy?.carryOverEnabled ? t('leave.carry_over_enabled') : t('leave.carry_over_disabled')} />
          <InfoCard label={t('leave.last_request')} value={pendingLeave ? `${formatDate(pendingLeave.startDate)} - ${formatDate(pendingLeave.endDate)} / ${pendingLeave.status}` : t('leave.no_request')} />
        </div>
      );
    }
    if (detailTab === 'documents') {
      const expiringDocument = employeeDocuments.find((record) => record.status === 'Suresi Yaklasiyor');
      const missingDocument = employeeDocuments.find((record) => record.status === 'Eksik');
      return (
        <div className="space-y-3">
          <InfoCard label={t('documents.missing')} value={missingDocument?.documentType || t('documents.no_missing')} />
          <InfoCard label={t('documents.expiring')} value={expiringDocument ? `${expiringDocument.documentType} / ${formatDate(expiringDocument.validUntil)}` : t('documents.no_expiring')} />
          <InfoCard label={t('documents.total')} value={t('documents.records_unit', { count: employeeDocuments.length })} />
        </div>
      );
    }
    if (detailTab === 'compensation') {
      return (
        <div className="space-y-4">
          <div className="break-words rounded-2xl border border-border p-3 md:p-4">
            <p className="text-sm font-medium text-gray-900 dark:text-white">{t('compensation.rule_title')}</p>
            <p className="mt-2 text-sm text-muted-foreground">
              {t('compensation.rule_period', { mode: compensation?.periodMode || '-', days: compensation?.calculationOffsetDays ?? 0 })}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {t('compensation.rule_model', { model: formatModelLabel(compensation?.modelType), rule: formatCollectionRule(compensation?.collectionRule) })}
            </p>
          </div>
          <div className="grid gap-3">
            <InfoCard label={t('compensation.target')} value={compensation?.targetEnabled ? formatCurrency(compensation.targetAmount) : t('compensation.target_not_used')} />
            <InfoCard label={t('compensation.column_collection')} value={formatCollectionRule(compensation?.collectionRule)} />
            <InfoCard label={t('compensation.last_accrual')} value={employeeCompensation ? formatCurrency(employeeCompensation.accruedPremium) : '-'} />
          </div>
        </div>
      );
    }
    return (
      <div className="space-y-3">
        <InfoCard label={t('detail.linked_user_required')} value={personnelSettings?.linkedUserRequired ? t('detail.yes') : t('detail.no')} />
        <InfoCard label={t('detail.last_period')} value={employeeCompensation?.periodLabel || '-'} />
        <InfoCard label={t('detail.payroll_status')} value={employeeCompensation?.payrollStatus || t('detail.not_ready')} />
      </div>
    );
  };

  const leaveTypeOptions = useMemo(() => (personnelSettings?.leavePolicy.leaveTypes ?? []).map((ty) => ({ value: ty, label: ty })), [personnelSettings]);
  const employeeOptions = useMemo(() => employees.map((e) => ({ value: e.id, label: e.fullName })), [employees]);

  const searchPlaceholder =
    activeTab === 'employees' ? t('filters.search_employees')
    : activeTab === 'leave' ? t('filters.search_leave')
    : activeTab === 'documents' ? t('filters.search_documents')
    : t('filters.search_compensation');

  return (
    <div className="space-y-4 p-3 md:space-y-6 md:p-6">
      <DesktopPageHeader
        title={t('page_title')}
        description={isMobile ? undefined : t('page_description')}
        icon={<Briefcase className="h-6 w-6" />}
        eyebrow={{ tr: 'Operasyon', en: 'Operations' }}
        actions={(
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="flex items-center gap-2" onClick={goToPersonnelSettings}>
              <Settings2 size={18} />
              {!isMobile && t('actions.settings')}
            </Button>
            <Button variant="outline" className="flex items-center gap-2" onClick={exportCsv}>
              <Download size={18} />
              {!isMobile && t('actions.export')}
            </Button>
            {activeTab === 'leave' ? (
              <PermissionGate permission="personnel.create">
                <Button className="flex items-center gap-2" onClick={openLeaveModal}>
                  <Plus size={18} />
                  {!isMobile && t('actions.new_leave')}
                </Button>
              </PermissionGate>
            ) : (
              <Button className="flex items-center gap-2" onClick={() => navigate({ to: '/settings', search: { tab: 'team' } })}>
                <Plus size={18} />
                {!isMobile && t('actions.new_employee')}
              </Button>
            )}
          </div>
        )}
      />

      <div className="flex flex-wrap gap-2">
        {mainTabs.map((tab) => (
          <Button key={tab.id} variant={tab.id === activeTab ? 'default' : 'outline'} onClick={() => handleTabChange(tab.id)} className="rounded-full">
            {tab.label}
          </Button>
        ))}
      </div>

      {activeError && (
        <Card className="border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-red-600" />
            <div>
              <p className="text-sm font-medium text-red-800 dark:text-red-300">{t('error.load_failed')}</p>
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{t('error.load_retry')}</p>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-6">
        {activeKpis.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.key} className="min-w-0 p-4 md:p-6">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs text-muted-foreground md:text-sm">{item.label}</p>
                  <p className="mt-1 truncate text-lg font-bold text-gray-900 dark:text-white md:mt-2 md:text-2xl">{item.value}</p>
                </div>
                <div className="shrink-0 rounded-2xl bg-muted p-2 md:p-3">
                  <Icon className="h-4 w-4 text-foreground md:h-5 md:w-5" />
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
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder={searchPlaceholder} className="pl-10" fullWidth />
            </div>
            <Button variant="outline" className="flex items-center gap-2" onClick={() => setShowFilters((prev) => !prev)}>
              <Filter size={18} />
              {!isMobile && t('actions.filters')}
            </Button>
          </div>
          {showFilters && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[220px_220px_auto]">
              <Select value={filterValue} onChange={(event) => setFilterValue(event.target.value)} options={filterOptionsByTab[activeTab]} />
              <Select value={branchValue} onChange={(event) => setBranchValue(event.target.value)} options={branchFilterOptions} />
              <div className="flex items-center justify-end gap-2">
                <Button variant="outline" onClick={clearFilters}>{t('actions.clear')}</Button>
                <Button onClick={() => setShowFilters(false)}>{t('actions.apply')}</Button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {activeTab === 'employees' && (
        <>
          <div className={cn('grid gap-6', isMobile ? 'grid-cols-1' : 'grid-cols-[1.4fr_0.9fr]')}>
            <Card className="overflow-hidden">
              <DataTable<PersonnelEmployee> data={filteredEmployees} rowKey={(row) => row.id} loading={activeLoading} emptyText={t('employees.empty')} hoverable striped columns={employeeColumns} onRowClick={(row) => { setSelectedEmployeeId(row.id); if (isMobile) setShowDetailPanel(true); }} />
            </Card>
            {!isMobile && (
              <Card className="p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm text-muted-foreground">{t('employees.detail_title')}</p>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{selectedEmployee?.fullName || t('employees.no_selection')}</h3>
                  </div>
                  {selectedEmployee && (
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                      {selectedEmployee.linkedUser ? `@${selectedEmployee.linkedUser}` : t('employees.no_match')}
                    </span>
                  )}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {detailTabs.map((tab) => (
                    <Button key={tab.id} variant={tab.id === detailTab ? 'default' : 'outline'} onClick={() => setDetailTab(tab.id)} className="rounded-full">{tab.label}</Button>
                  ))}
                </div>
                <div className="mt-5">{renderDetailContent()}</div>
              </Card>
            )}
          </div>
          {isMobile && showDetailPanel && selectedEmployee && (
            <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50" onClick={() => setShowDetailPanel(false)}>
              <div className="max-h-[80vh] overflow-y-auto rounded-t-2xl bg-white p-5 dark:bg-gray-900" onClick={(e) => e.stopPropagation()}>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">{t('employees.detail_title')}</p>
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">{selectedEmployee.fullName}</h3>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setShowDetailPanel(false)}>{t('actions.close')}</Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {detailTabs.map((tab) => (
                    <Button key={tab.id} variant={tab.id === detailTab ? 'default' : 'outline'} onClick={() => setDetailTab(tab.id)} className="rounded-full text-xs" size="sm">{tab.label}</Button>
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
          <DataTable<PersonnelLeaveRecord> data={filteredLeaveRecords} rowKey={(row) => row.id} loading={activeLoading} emptyText={t('leave.empty')} hoverable striped columns={leaveColumns} />
        </Card>
      )}

      {activeTab === 'documents' && (
        <Card className="overflow-hidden">
          <DataTable<PersonnelDocumentRecord> data={filteredDocumentRecords} rowKey={(row) => row.id} loading={activeLoading} emptyText={t('documents.empty')} hoverable striped columns={documentColumns} />
        </Card>
      )}

      {activeTab === 'compensation' && (
        <div className="space-y-6">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <Card className="p-4 md:p-5">
              <p className="text-sm font-medium text-gray-900 dark:text-white">{t('compensation.period_setting')}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {t('compensation.period_mode', { mode: personnelSettings?.compensation.periodMode || '-' })}
                {' '}{t('compensation.period_offset', { days: personnelSettings?.compensation.calculationOffsetDays ?? 0 })}
              </p>
            </Card>
            <Card className="p-4 md:p-5">
              <p className="text-sm font-medium text-gray-900 dark:text-white">{t('compensation.model_setting')}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {t('compensation.active_model', { model: formatModelLabel(personnelSettings?.compensation.modelType) })}
                {' '}{t('compensation.target_usage', { status: personnelSettings?.compensation.targetEnabled ? t('status.active') : t('status.inactive') })}
              </p>
            </Card>
            <Card className="p-4 md:p-5">
              <p className="text-sm font-medium text-gray-900 dark:text-white">{t('compensation.collection_setting')}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {t('compensation.active_option', { rule: formatCollectionRule(personnelSettings?.compensation.collectionRule) })}
              </p>
            </Card>
          </div>
          <Card className="overflow-hidden">
            <DataTable<PersonnelCompensationRecord> data={filteredCompensationRecords} rowKey={(row) => row.id} loading={activeLoading} emptyText={t('compensation.empty')} hoverable striped columns={compensationColumns} />
          </Card>
        </div>
      )}

      {/* Leave Request Modal */}
      <Modal open={showLeaveModal} onClose={() => setShowLeaveModal(false)} title={t('leave_form.title')} size="sm">
        <div className="space-y-4">
          <label className="block text-sm font-medium text-foreground">
            {t('leave_form.employee')}
            <div className="mt-1"><Select value={leaveForm.employeeId} onChange={(e) => setLeaveForm({ ...leaveForm, employeeId: e.target.value })} options={employeeOptions} /></div>
          </label>
          <label className="block text-sm font-medium text-foreground">
            {t('leave_form.type')}
            <div className="mt-1"><Select value={leaveForm.leaveType} onChange={(e) => setLeaveForm({ ...leaveForm, leaveType: e.target.value })} options={leaveTypeOptions} /></div>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm font-medium text-foreground">
              {t('leave_form.start_date')}
              <div className="mt-1"><Input type="date" value={leaveForm.startDate} onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })} fullWidth /></div>
            </label>
            <label className="block text-sm font-medium text-foreground">
              {t('leave_form.end_date')}
              <div className="mt-1"><Input type="date" value={leaveForm.endDate} min={leaveForm.startDate || undefined} onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })} fullWidth /></div>
            </label>
          </div>
          {leaveForm.startDate && leaveForm.endDate && leaveForm.endDate >= leaveForm.startDate && (
            <p className="text-sm text-muted-foreground">{t('leave_form.calculated_days', { count: calculateWorkDays(leaveForm.startDate, leaveForm.endDate) })}</p>
          )}
          <label className="block text-sm font-medium text-foreground">
            {t('leave_form.note')}
            <div className="mt-1"><Input value={leaveForm.note} onChange={(e) => setLeaveForm({ ...leaveForm, note: e.target.value })} placeholder={t('leave_form.note_placeholder')} fullWidth /></div>
          </label>
          {leaveFormError && <p className="text-sm text-red-600 dark:text-red-400">{leaveFormError}</p>}
          <div className="flex gap-2 pt-2">
            <Button className="flex flex-1 items-center justify-center gap-2" onClick={handleCreateLeave} disabled={createLeaveMutation.isPending}>
              {createLeaveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {t('leave_form.submit')}
            </Button>
            <Button variant="outline" onClick={() => setShowLeaveModal(false)} disabled={createLeaveMutation.isPending}>{t('common:cancel')}</Button>
          </div>
        </div>
      </Modal>

      {/* Reject Reason Modal */}
      <Modal open={!!rejectingLeaveId} onClose={() => setRejectingLeaveId(null)} title={t('leave_reject.title')} size="sm">
        <label className="block text-sm font-medium text-foreground">
          {t('leave_reject.reason_label')}
          <div className="mt-1"><Input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder={t('leave_reject.reason_placeholder')} fullWidth /></div>
        </label>
        <div className="mt-4 flex gap-2">
          <Button className="flex flex-1 items-center justify-center gap-2 bg-red-600 hover:bg-red-700" onClick={handleRejectLeave} disabled={leaveActionMutation.isPending}>
            {leaveActionMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
            {t('leave_reject.submit')}
          </Button>
          <Button variant="outline" onClick={() => setRejectingLeaveId(null)} disabled={leaveActionMutation.isPending}>{t('common:cancel')}</Button>
        </div>
      </Modal>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-2xl border border-border p-3 md:p-4">
      <p className="truncate text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-sm font-medium text-gray-900 dark:text-white md:mt-2">{value}</p>
    </div>
  );
}
