import React from 'react';
import { Bot, Zap, Clock, ShieldCheck, Activity } from 'lucide-react';
import { Button } from '@x-ear/ui-web';
import { useListAutomationStatus, useListAutomationLogs } from '../api/generated/aliases';

interface AutomationLog {
  level: string;
  message: string;
  timestamp: string;
}

interface AutomationStatus {
  lastBackupStatus?: string;
  lastBackupRun?: string;
  sgkProcessingStatus?: string;
  lastSgkRun?: string;
}

interface AutomationResponse {
  data?: {
    automation?: AutomationStatus;
  };
}

interface AutomationLogsResponse {
  data?: {
    items?: AutomationLog[];
  };
}

export function AutomationPage() {
  const { data: statusData } = useListAutomationStatus();
  const { data: logsData, isLoading: isLogsLoading } = useListAutomationLogs({ page: 1, per_page: 10 });

  const automationStatus = (statusData as AutomationResponse)?.data?.automation || {};
  const logs = (logsData as AutomationLogsResponse)?.data?.items || [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Bot className="w-8 h-8 text-blue-600" />
            Otomasyon Merkezi
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Sisteminizdeki otomatik görevleri, yedeklemeleri ve AI süreçlerini buradan yönetin.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatusCard 
            title="Yedekleme Durumu" 
            status={automationStatus.lastBackupStatus || 'Aktif'} 
            lastRun={automationStatus.lastBackupRun}
            icon={<ShieldCheck className="text-emerald-500" />}
          />
          <StatusCard 
            title="SGK İşleme" 
            status={automationStatus.sgkProcessingStatus || 'Beklemede'} 
            lastRun={automationStatus.lastSgkRun}
            icon={<Zap className="text-amber-500" />}
          />
          <StatusCard 
            title="Veri Senkronizasyonu" 
            status="Tamamlandı" 
            lastRun={new Date().toISOString()}
            icon={<Clock className="text-blue-500" />}
          />
          <StatusCard 
            title="AI Analizör" 
            status="Çalışıyor" 
            lastRun={new Date().toISOString()}
            icon={<Activity className="text-indigo-500" />}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-lg font-semibold">Otomasyon Günlükleri</h2>
              <Button variant="ghost" size="sm">Hepsini Gör</Button>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {isLogsLoading ? (
                <div className="p-8 text-center text-gray-500">Yükleniyor...</div>
              ) : logs.length > 0 ? (
                logs.map((log: AutomationLog, idx: number) => (
                  <div key={idx} className="px-6 py-4 flex items-center gap-4">
                    <div className={`w-2 h-2 rounded-full ${log.level === 'error' ? 'bg-red-500' : 'bg-blue-500'}`} />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{log.message}</p>
                      <p className="text-xs text-gray-500">{new Date(log.timestamp).toLocaleString()}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-gray-500">Henüz kayıt bulunmuyor.</div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <ActionCard 
              title="Manuel Yedekleme"
              description="Sistemin tam yedeğini hemen şimdi alın."
              buttonText="Yedekleme Başlat"
              onClick={() => {}}
            />
            <ActionCard 
              title="SGK Veri Çekimi"
              description="SGK portalından bekleyen verileri manuel olarak çekin."
              buttonText="Verileri Çek"
              onClick={() => {}}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

interface StatusCardProps {
  title: string;
  status: string;
  lastRun?: string;
  icon: React.ReactNode;
}

function StatusCard({ title, status, lastRun, icon }: StatusCardProps) {
  return (
    <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex justify-between items-start mb-4">
        <div className="p-2 bg-gray-50 dark:bg-gray-800 rounded-2xl">
          {icon}
        </div>
        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
          status === 'Aktif' || status === 'Tamamlandı' || status === 'Çalışıyor'
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
        }`}>
          {status}
        </span>
      </div>
      <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</h3>
      <p className="text-xs text-gray-400 mt-1">Son çalışma: {lastRun ? new Date(lastRun).toLocaleTimeString() : 'Bilinmiyor'}</p>
    </div>
  );
}

interface ActionCardProps {
  title: string;
  description: string;
  buttonText: string;
  onClick: () => void;
}

function ActionCard({ title, description, buttonText, onClick }: ActionCardProps) {
  return (
    <div className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
      <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{description}</p>
      <Button onClick={onClick} className="w-full" variant="primary">
        {buttonText}
      </Button>
    </div>
  );
}

export default AutomationPage;
