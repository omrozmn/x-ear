import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Trash2,
  RefreshCw,
  X,
  Printer,
  TestTube,
  Wifi,
  WifiOff,
  AlertCircle,
  Clock,
  RotateCcw,
  Eye,
  CheckSquare,
  BarChart3,
  Search,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  printerService,
  type Printer as PrinterType,
  type PrintJob,
  type PrinterProtocol,
  type PrintJobStatus,
  type JobStats,
  type JobListFilters,
} from '@/services/printer.service';

const PROTOCOL_LABELS: Record<PrinterProtocol, string> = {
  tcp9100: 'TCP 9100 (Raw)',
  ipp: 'IPP',
  browser: 'Tarayici',
};

const STATUS_BADGES: Record<string, string> = {
  online: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  offline: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  error: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
};

const JOB_STATUS_BADGES: Record<PrintJobStatus, string> = {
  pending: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  processing: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

const JOB_STATUS_LABELS: Record<PrintJobStatus, string> = {
  pending: 'Bekliyor',
  processing: 'Isleniyor',
  completed: 'Tamamlandi',
  failed: 'Basarisiz',
};

type Tab = 'printers' | 'jobs';

export default function PrinterManagementPage() {
  const [tab, setTab] = useState<Tab>('printers');
  const [printers, setPrinters] = useState<PrinterType[]>([]);
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [jobsTotal, setJobsTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);

  // Add printer form state
  const [formName, setFormName] = useState('');
  const [formIp, setFormIp] = useState('');
  const [formPort, setFormPort] = useState(9100);
  const [formProtocol, setFormProtocol] = useState<PrinterProtocol>('tcp9100');

  // Job filtering state
  const [filterStatus, setFilterStatus] = useState<PrintJobStatus | ''>('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterUserSearch, setFilterUserSearch] = useState('');
  const [jobsPage, setJobsPage] = useState(1);
  const jobsLimit = 20;

  // Job detail modal
  const [detailJob, setDetailJob] = useState<PrintJob | null>(null);

  // Bulk reprint selection
  const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(new Set());

  // Job stats
  const [stats, setStats] = useState<JobStats | null>(null);

  // Reprint loading
  const [reprintingId, setReprintingId] = useState<string | null>(null);
  const [bulkReprinting, setBulkReprinting] = useState(false);

  const fetchPrinters = useCallback(async () => {
    try {
      const data = await printerService.listPrinters();
      setPrinters(data);
    } catch {
      toast.error('Yazicilar yuklenemedi');
    }
  }, []);

  const fetchJobs = useCallback(async () => {
    try {
      const filters: JobListFilters = {
        page: jobsPage,
        limit: jobsLimit,
      };
      if (filterStatus) filters.status = filterStatus;
      if (filterDateFrom) filters.from = filterDateFrom;
      if (filterDateTo) filters.to = filterDateTo;
      if (filterUserSearch) filters.userId = filterUserSearch;

      const result = await printerService.listJobs(filters);
      setJobs(result.jobs);
      setJobsTotal(result.total);
    } catch {
      toast.error('Yazdirma isleri yuklenemedi');
    }
  }, [jobsPage, filterStatus, filterDateFrom, filterDateTo, filterUserSearch]);

  const fetchStats = useCallback(async () => {
    try {
      const data = await printerService.getJobStats();
      setStats(data);
    } catch {
      // Stats are optional, don't show error
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchPrinters(), fetchJobs(), fetchStats()]).finally(() => setLoading(false));
  }, [fetchPrinters, fetchJobs, fetchStats]);

  const handleAddPrinter = useCallback(async () => {
    if (!formName.trim() || !formIp.trim()) {
      toast.error('Ad ve IP adresi zorunlu');
      return;
    }

    try {
      await printerService.createPrinter({
        name: formName.trim(),
        ipAddress: formIp.trim(),
        port: formPort,
        protocol: formProtocol,
      });
      toast.success('Yazici eklendi');
      setShowAddModal(false);
      setFormName('');
      setFormIp('');
      setFormPort(9100);
      setFormProtocol('tcp9100');
      await fetchPrinters();
    } catch {
      toast.error('Yazici eklenemedi');
    }
  }, [formName, formIp, formPort, formProtocol, fetchPrinters]);

  const handleDelete = useCallback(async (id: string) => {
    if (!window.confirm('Bu yaziciyi silmek istediginize emin misiniz?')) return;
    try {
      await printerService.deletePrinter(id);
      toast.success('Yazici silindi');
      setPrinters((prev) => prev.filter((p) => p.id !== id));
    } catch {
      toast.error('Yazici silinemedi');
    }
  }, []);

  const handleTest = useCallback(async (id: string) => {
    setTestingId(id);
    try {
      const result = await printerService.testPrinter(id);
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
      await fetchPrinters();
    } catch {
      toast.error('Test baglantisi basarisiz');
    } finally {
      setTestingId(null);
    }
  }, [fetchPrinters]);

  const handleRefreshStatus = useCallback(async (id: string) => {
    setRefreshingId(id);
    try {
      const result = await printerService.getPrinterStatus(id);
      setPrinters((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: result.status } : p)),
      );
    } catch {
      toast.error('Durum alinamadi');
    } finally {
      setRefreshingId(null);
    }
  }, []);

  const handleReprint = useCallback(async (jobId: string) => {
    setReprintingId(jobId);
    try {
      await printerService.reprintJob(jobId);
      toast.success('Tekrar yazdirma baslatildi');
      await fetchJobs();
      await fetchStats();
    } catch {
      toast.error('Tekrar yazdirma basarisiz');
    } finally {
      setReprintingId(null);
    }
  }, [fetchJobs, fetchStats]);

  const handleBulkReprint = useCallback(async () => {
    if (selectedJobIds.size === 0) {
      toast.error('Lutfen en az bir is secin');
      return;
    }
    setBulkReprinting(true);
    let successCount = 0;
    let failCount = 0;
    for (const jobId of selectedJobIds) {
      try {
        await printerService.reprintJob(jobId);
        successCount++;
      } catch {
        failCount++;
      }
    }
    if (successCount > 0) {
      toast.success(`${successCount} is tekrar yazdirildi`);
    }
    if (failCount > 0) {
      toast.error(`${failCount} is basarisiz oldu`);
    }
    setSelectedJobIds(new Set());
    setBulkReprinting(false);
    await fetchJobs();
    await fetchStats();
  }, [selectedJobIds, fetchJobs, fetchStats]);

  const toggleJobSelection = useCallback((jobId: string) => {
    setSelectedJobIds((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) {
        next.delete(jobId);
      } else {
        next.add(jobId);
      }
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    const completedJobs = jobs.filter((j) => j.status === 'completed' || j.status === 'failed');
    if (selectedJobIds.size === completedJobs.length && completedJobs.length > 0) {
      setSelectedJobIds(new Set());
    } else {
      setSelectedJobIds(new Set(completedJobs.map((j) => j.id)));
    }
  }, [jobs, selectedJobIds]);

  const handleApplyFilters = useCallback(() => {
    setJobsPage(1);
    void fetchJobs();
  }, [fetchJobs]);

  const StatusIcon = ({ status }: { status: string }) => {
    switch (status) {
      case 'online':
        return <Wifi className="w-4 h-4 text-green-500" />;
      case 'offline':
        return <WifiOff className="w-4 h-4 text-red-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const totalPages = Math.ceil(jobsTotal / jobsLimit);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Printer className="w-7 h-7" />
            Yazici Yonetimi
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Ag yazicilarini yonetin ve yazdirma islerini takip edin
          </p>
        </div>
        <button
          data-allow-raw="true"
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Yazici Ekle
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700">
        <button
          data-allow-raw="true"
          onClick={() => setTab('printers')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'printers'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Yazicilar ({printers.length})
        </button>
        <button
          data-allow-raw="true"
          onClick={() => { setTab('jobs'); void fetchJobs(); void fetchStats(); }}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'jobs'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Yazdirma Isleri ({jobsTotal})
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : tab === 'printers' ? (
        /* Printers Table */
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {printers.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              Henuz yazici eklenmedi
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ad</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Port</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Protokol</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durum</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Son Kontrol</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Islemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {printers.map((printer) => (
                    <tr key={printer.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
                        {printer.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 font-mono">
                        {printer.ipAddress}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 font-mono">
                        {printer.port}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {PROTOCOL_LABELS[printer.protocol] ?? printer.protocol}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGES[printer.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          <StatusIcon status={printer.status} />
                          {printer.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {printer.lastHealthCheck
                          ? new Date(printer.lastHealthCheck).toLocaleString('tr-TR')
                          : '-'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            data-allow-raw="true"
                            onClick={() => handleRefreshStatus(printer.id)}
                            disabled={refreshingId === printer.id}
                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                            title="Durumu yenile"
                          >
                            <RefreshCw className={`w-4 h-4 text-gray-500 ${refreshingId === printer.id ? 'animate-spin' : ''}`} />
                          </button>
                          <button
                            data-allow-raw="true"
                            onClick={() => handleTest(printer.id)}
                            disabled={testingId === printer.id}
                            className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors disabled:opacity-50"
                            title="Baglanti testi"
                          >
                            <TestTube className={`w-4 h-4 text-blue-500 ${testingId === printer.id ? 'animate-pulse' : ''}`} />
                          </button>
                          <button
                            data-allow-raw="true"
                            onClick={() => handleDelete(printer.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            title="Yaziciyi sil"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Jobs Tab */
        <div className="space-y-4">
          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <BarChart3 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Toplam Is</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.totalJobs}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <CheckSquare className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Basari Orani</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.successRate.toFixed(1)}%</p>
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <Printer className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Yazici Sayisi</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{Object.keys(stats.jobsByPrinter).length}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Filters Bar */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Durum</label>
                <select
                  data-allow-raw="true"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as PrintJobStatus | '')}
                  className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="">Tumu</option>
                  <option value="pending">Bekliyor</option>
                  <option value="processing">Isleniyor</option>
                  <option value="completed">Tamamlandi</option>
                  <option value="failed">Basarisiz</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Baslangic</label>
                <input
                  data-allow-raw="true"
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Bitis</label>
                <input
                  data-allow-raw="true"
                  type="date"
                  value={filterDateTo}
                  onChange={(e) => setFilterDateTo(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Kullanici</label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input
                    data-allow-raw="true"
                    type="text"
                    value={filterUserSearch}
                    onChange={(e) => setFilterUserSearch(e.target.value)}
                    placeholder="Kullanici ID"
                    className="pl-8 pr-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none w-40"
                  />
                </div>
              </div>
              <button
                data-allow-raw="true"
                onClick={handleApplyFilters}
                className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
              >
                Filtrele
              </button>
              {selectedJobIds.size > 0 && (
                <button
                  data-allow-raw="true"
                  onClick={handleBulkReprint}
                  disabled={bulkReprinting}
                  className="px-4 py-1.5 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${bulkReprinting ? 'animate-spin' : ''}`} />
                  Toplu Tekrar Yazdir ({selectedJobIds.size})
                </button>
              )}
            </div>
          </div>

          {/* Jobs Table */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {jobs.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                Henuz yazdirma isi yok
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-900/50">
                    <tr>
                      <th className="px-3 py-3 text-left">
                        <input
                          data-allow-raw="true"
                          type="checkbox"
                          checked={
                            jobs.filter((j) => j.status === 'completed' || j.status === 'failed').length > 0 &&
                            selectedJobIds.size === jobs.filter((j) => j.status === 'completed' || j.status === 'failed').length
                          }
                          onChange={toggleSelectAll}
                          className="rounded border-gray-300"
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kullanici</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sablon</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Yazici</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kopya</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durum</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tarih</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Islemler</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {jobs.map((job) => {
                      const canReprint = job.status === 'completed' || job.status === 'failed';
                      return (
                        <tr key={job.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30">
                          <td className="px-3 py-3">
                            {canReprint && (
                              <input
                                data-allow-raw="true"
                                type="checkbox"
                                checked={selectedJobIds.has(job.id)}
                                onChange={() => toggleJobSelection(job.id)}
                                className="rounded border-gray-300"
                              />
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm font-mono text-gray-500">
                            {job.id.slice(0, 8)}...
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {job.userEmail ?? job.userId ?? '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500 font-mono">
                            {job.templateId.slice(0, 8)}...
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500 font-mono">
                            {job.printerId.slice(0, 8)}...
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {job.copies ?? 1}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${JOB_STATUS_BADGES[job.status]}`}>
                              {JOB_STATUS_LABELS[job.status]}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {new Date(job.createdAt).toLocaleString('tr-TR')}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                data-allow-raw="true"
                                onClick={() => setDetailJob(job)}
                                className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                title="Detay"
                              >
                                <Eye className="w-4 h-4 text-gray-500" />
                              </button>
                              {canReprint && (
                                <button
                                  data-allow-raw="true"
                                  onClick={() => handleReprint(job.id)}
                                  disabled={reprintingId === job.id}
                                  className="p-1.5 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors disabled:opacity-50"
                                  title="Tekrar Yazdir"
                                >
                                  <RotateCcw className={`w-4 h-4 text-orange-500 ${reprintingId === job.id ? 'animate-spin' : ''}`} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-500">
                  Toplam {jobsTotal} is, Sayfa {jobsPage}/{totalPages}
                </p>
                <div className="flex gap-1">
                  <button
                    data-allow-raw="true"
                    onClick={() => { setJobsPage((p) => Math.max(1, p - 1)); }}
                    disabled={jobsPage <= 1}
                    className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Onceki
                  </button>
                  <button
                    data-allow-raw="true"
                    onClick={() => { setJobsPage((p) => Math.min(totalPages, p + 1)); }}
                    disabled={jobsPage >= totalPages}
                    className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Sonraki
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Printer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Yazici Ekle
              </h2>
              <button
                data-allow-raw="true"
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Yazici Adi
                </label>
                <input
                  data-allow-raw="true"
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ornek: Depo Yazicisi"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  IP Adresi
                </label>
                <input
                  data-allow-raw="true"
                  type="text"
                  value={formIp}
                  onChange={(e) => setFormIp(e.target.value)}
                  placeholder="192.168.1.100"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Port
                </label>
                <input
                  data-allow-raw="true"
                  type="number"
                  value={formPort}
                  onChange={(e) => setFormPort(Number(e.target.value))}
                  min={1}
                  max={65535}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Protokol
                </label>
                <select
                  data-allow-raw="true"
                  value={formProtocol}
                  onChange={(e) => setFormProtocol(e.target.value as PrinterProtocol)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                >
                  <option value="tcp9100">TCP 9100 (Raw)</option>
                  <option value="ipp">IPP</option>
                  <option value="browser">Tarayici (Browser Print)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                data-allow-raw="true"
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
              >
                Iptal
              </button>
              <button
                data-allow-raw="true"
                onClick={handleAddPrinter}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
              >
                Ekle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Job Detail Modal */}
      {detailJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Is Detayi
              </h2>
              <button
                data-allow-raw="true"
                onClick={() => setDetailJob(null)}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-3">
              <DetailRow label="ID" value={detailJob.id} />
              <DetailRow label="Durum" value={JOB_STATUS_LABELS[detailJob.status]} badge={JOB_STATUS_BADGES[detailJob.status]} />
              <DetailRow label="Sablon ID" value={detailJob.templateId} mono />
              <DetailRow label="Sablon Versiyon" value={detailJob.templateVersion != null ? String(detailJob.templateVersion) : '-'} />
              <DetailRow label="Yazici ID" value={detailJob.printerId} mono />
              <DetailRow label="Format" value={detailJob.outputFormat.toUpperCase()} />
              <DetailRow label="Kopya" value={String(detailJob.copies ?? 1)} />
              <DetailRow label="Kullanici" value={detailJob.userEmail ?? detailJob.userId ?? '-'} />
              <DetailRow label="IP Adresi" value={detailJob.ipAddress ?? '-'} mono />
              <DetailRow label="Olusturma" value={new Date(detailJob.createdAt).toLocaleString('tr-TR')} />
              {detailJob.completedAt && (
                <DetailRow label="Tamamlanma" value={new Date(detailJob.completedAt).toLocaleString('tr-TR')} />
              )}
              {detailJob.errorMessage && (
                <DetailRow label="Hata" value={detailJob.errorMessage} error />
              )}
              {detailJob.labelData && Object.keys(detailJob.labelData).length > 0 && (
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Etiket Verisi</p>
                  <pre className="text-xs bg-gray-50 dark:bg-gray-900 rounded-lg p-3 overflow-x-auto text-gray-700 dark:text-gray-300">
                    {JSON.stringify(detailJob.labelData, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-6">
              {(detailJob.status === 'completed' || detailJob.status === 'failed') && (
                <button
                  data-allow-raw="true"
                  onClick={() => { void handleReprint(detailJob.id); setDetailJob(null); }}
                  className="px-4 py-2 text-sm bg-orange-600 text-white rounded-xl hover:bg-orange-700 transition-colors flex items-center gap-1.5"
                >
                  <RotateCcw className="w-4 h-4" />
                  Tekrar Yazdir
                </button>
              )}
              <button
                data-allow-raw="true"
                onClick={() => setDetailJob(null)}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({
  label,
  value,
  mono,
  badge,
  error,
}: {
  label: string;
  value: string;
  mono?: boolean;
  badge?: string;
  error?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-sm text-gray-500 dark:text-gray-400 shrink-0">{label}</span>
      {badge ? (
        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${badge}`}>
          {value}
        </span>
      ) : (
        <span
          className={`text-sm text-right break-all ${
            error
              ? 'text-red-500'
              : mono
                ? 'font-mono text-gray-700 dark:text-gray-300'
                : 'text-gray-900 dark:text-white'
          }`}
        >
          {value}
        </span>
      )}
    </div>
  );
}
