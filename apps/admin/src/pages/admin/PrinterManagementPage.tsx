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
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  printerService,
  type Printer as PrinterType,
  type PrintJob,
  type PrinterProtocol,
  type PrintJobStatus,
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
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);

  // Add printer form state
  const [formName, setFormName] = useState('');
  const [formIp, setFormIp] = useState('');
  const [formPort, setFormPort] = useState(9100);
  const [formProtocol, setFormProtocol] = useState<PrinterProtocol>('tcp9100');

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
      const data = await printerService.listJobs();
      setJobs(data);
    } catch {
      toast.error('Yazdirma isleri yuklenemedi');
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchPrinters(), fetchJobs()]).finally(() => setLoading(false));
  }, [fetchPrinters, fetchJobs]);

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
          onClick={() => { setTab('jobs'); fetchJobs(); }}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            tab === 'jobs'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Yazdirma Isleri ({jobs.length})
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
                            onClick={() => handleRefreshStatus(printer.id)}
                            disabled={refreshingId === printer.id}
                            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                            title="Durumu yenile"
                          >
                            <RefreshCw className={`w-4 h-4 text-gray-500 ${refreshingId === printer.id ? 'animate-spin' : ''}`} />
                          </button>
                          <button
                            onClick={() => handleTest(printer.id)}
                            disabled={testingId === printer.id}
                            className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors disabled:opacity-50"
                            title="Baglanti testi"
                          >
                            <TestTube className={`w-4 h-4 text-blue-500 ${testingId === printer.id ? 'animate-pulse' : ''}`} />
                          </button>
                          <button
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
        /* Jobs Table */
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
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sablon</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Yazici</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Format</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Durum</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tarih</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Hata</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {jobs.map((job) => (
                    <tr key={job.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30">
                      <td className="px-4 py-3 text-sm font-mono text-gray-500">
                        {job.id.slice(0, 8)}...
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 font-mono">
                        {job.templateId.slice(0, 8)}...
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 font-mono">
                        {job.printerId.slice(0, 8)}...
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 uppercase">
                        {job.outputFormat}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${JOB_STATUS_BADGES[job.status]}`}>
                          {JOB_STATUS_LABELS[job.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {new Date(job.createdAt).toLocaleString('tr-TR')}
                      </td>
                      <td className="px-4 py-3 text-sm text-red-500 max-w-xs truncate">
                        {job.errorMessage ?? '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
              >
                Iptal
              </button>
              <button
                onClick={handleAddPrinter}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
              >
                Ekle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
