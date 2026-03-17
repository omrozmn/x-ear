/**
 * Noah Import Modal
 * "Noah'tan İçe Aktar" button click → shows import session status
 * Used in Patients (Parties) page
 */

import React, { useState, useEffect } from 'react';
import { Button, Modal } from '@x-ear/ui-web';
import { useToastHelpers } from '@x-ear/ui-web';
import {
  Download, CheckCircle, AlertCircle, Loader2, Clock,
  Users, RefreshCw, AlertTriangle, XCircle,
  ArrowRight, FileText, WifiOff,
} from 'lucide-react';
import {
  useCreateImportSession,
  useImportSession,
  useAgentDevices,
} from '../../api/noah-import';
import type { ImportSession, ImportSessionStatus } from '../../api/noah-import/types';

interface NoahImportModalProps {
  open: boolean;
  onClose: () => void;
  onImportComplete?: () => void;
}

const STATUS_CONFIG: Record<ImportSessionStatus, {
  icon: React.ReactNode;
  label: string;
  color: string;
  bgColor: string;
}> = {
  pending: {
    icon: <Clock className="w-6 h-6" />,
    label: 'Bekliyor',
    color: 'text-yellow-600',
    bgColor: 'bg-warning/10',
  },
  uploading: {
    icon: <Loader2 className="w-6 h-6 animate-spin" />,
    label: 'Yükleniyor',
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
  processing: {
    icon: <Loader2 className="w-6 h-6 animate-spin" />,
    label: 'İşleniyor',
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
  completed: {
    icon: <CheckCircle className="w-6 h-6" />,
    label: 'Tamamlandı',
    color: 'text-success',
    bgColor: 'bg-success/10',
  },
  completed_with_warnings: {
    icon: <AlertTriangle className="w-6 h-6" />,
    label: 'Uyarılarla Tamamlandı',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 dark:bg-amber-900/20',
  },
  failed: {
    icon: <XCircle className="w-6 h-6" />,
    label: 'Başarısız',
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
  },
  expired: {
    icon: <Clock className="w-6 h-6" />,
    label: 'Süresi Doldu',
    color: 'text-muted-foreground',
    bgColor: 'bg-gray-50 dark:bg-gray-800',
  },
};

function ProgressBar({ percent, stage }: { percent: number; stage?: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{stage || 'İşleniyor...'}</span>
        <span>{Math.round(percent)}%</span>
      </div>
      <div className="h-2 bg-accent rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${Math.min(100, percent)}%` }}
        />
      </div>
    </div>
  );
}

function ImportSummary({ summary }: { summary: ImportSession['summary'] }) {
  if (!summary) return null;

  const stats = [
    { label: 'Oluşturulan', value: summary.created || 0, icon: <Users className="w-4 h-4" />, color: 'text-success' },
    { label: 'Güncellenen', value: summary.updated || 0, icon: <RefreshCw className="w-4 h-4" />, color: 'text-primary' },
    { label: 'Atlanan', value: summary.skipped || 0, icon: <ArrowRight className="w-4 h-4" />, color: 'text-muted-foreground' },
    { label: 'Mükerrer', value: summary.duplicates || 0, icon: <AlertTriangle className="w-4 h-4" />, color: 'text-amber-600' },
  ];

  return (
    <div className="grid grid-cols-4 gap-3">
      {stats.map(({ label, value, icon, color }) => (
        <div
          key={label}
          className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-border"
        >
          <div className={`flex justify-center mb-1 ${color}`}>{icon}</div>
          <div className="text-xl font-bold text-gray-900 dark:text-white">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      ))}
    </div>
  );
}

function ErrorList({ errors }: { errors: Array<{ code: string; message: string }> }) {
  if (!errors?.length) return null;
  return (
    <div className="mt-4 p-3 bg-destructive/10 rounded-xl border border-red-200 dark:border-red-800">
      <h4 className="text-sm font-medium text-red-800 dark:text-red-300 mb-2 flex items-center gap-1">
        <AlertCircle className="w-4 h-4" />
        Hatalar ({errors.length})
      </h4>
      <ul className="space-y-1 text-xs text-destructive">
        {errors.slice(0, 10).map((err, i) => (
          <li key={i} className="flex items-start gap-1">
            <span className="mt-0.5">•</span>
            <span><strong>{err.code}:</strong> {err.message}</span>
          </li>
        ))}
        {errors.length > 10 && (
          <li className="text-destructive font-medium">... ve {errors.length - 10} hata daha</li>
        )}
      </ul>
    </div>
  );
}

export default function NoahImportModal({ open, onClose, onImportComplete }: NoahImportModalProps) {
  const { error: showError } = useToastHelpers();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [step, setStep] = useState<'idle' | 'active' | 'done'>('idle');

  const createSession = useCreateImportSession();
  const { data: session } = useImportSession(sessionId, {
    enabled: step === 'active',
  });
  const { data: agents } = useAgentDevices();

  const hasActiveAgent = agents?.some((a) => a.status === 'active');

  useEffect(() => {
    if (!session) return;
    const terminal = ['completed', 'completed_with_warnings', 'failed', 'expired'];
    if (terminal.includes(session.status)) {
      setStep('done');
      if (session.status === 'completed' || session.status === 'completed_with_warnings') {
        onImportComplete?.();
      }
    }
  }, [onImportComplete, session]);

  useEffect(() => {
    if (!open) {
      setSessionId(null);
      setStep('idle');
    }
  }, [open]);

  const handleStartImport = async () => {
    try {
      const result = await createSession.mutateAsync({ branchId: '' });
      if (result) {
        setSessionId(result.id);
        setStep('active');
      }
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : 'Import başlatılamadı');
    }
  };

  const statusConfig = session?.status ? STATUS_CONFIG[session.status] : null;

  return (
    <Modal isOpen={open} onClose={onClose} title="Noah'tan İçe Aktar" size="lg">
      <div className="p-6 space-y-6">

        {/* ── Step: Idle — Start Import ── */}
        {step === 'idle' && (
          <>
            {!hasActiveAgent && (
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800 flex items-start gap-3">
                <WifiOff className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                    Agent bağlı değil
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                    Noah bilgisayarında X-Ear Agent'ın çalıştığından emin olun.
                    Ayarlar &gt; Noah Connector'dan agent kurulumu yapabilirsiniz.
                  </p>
                </div>
              </div>
            )}

            <div className="text-center py-4">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Download className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Noah Verilerini İçe Aktar
              </h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Hasta, odyogram ve cihaz verilerini Noah'tan CRM'e aktarın.
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
                <span className="text-foreground">
                  Noah'ta <strong>Dosya → Export</strong> ile hasta verilerini export alın
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
                <span className="text-foreground">
                  Dosyayı <code className="px-1 py-0.5 bg-accent rounded text-xs">C:\XEAR\noah_exports\</code> klasörüne kaydedin
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
                <span className="text-foreground">
                  <strong>İçe Aktarımı Başlat</strong> butonuna basın
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={onClose}>İptal</Button>
              <Button onClick={handleStartImport} disabled={createSession.isPending}>
                {createSession.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                İçe Aktarımı Başlat
              </Button>
            </div>
          </>
        )}

        {/* ── Step: Active — Processing ── */}
        {step === 'active' && session && statusConfig && (
          <>
            <div className={`text-center py-6 rounded-xl ${statusConfig.bgColor}`}>
              <div className={`flex justify-center mb-3 ${statusConfig.color}`}>
                {statusConfig.icon}
              </div>
              <h3 className={`text-lg font-semibold ${statusConfig.color}`}>
                {statusConfig.label}
              </h3>
              {session.progress?.stage && (
                <p className="text-sm text-muted-foreground mt-1">
                  {session.progress.stage}
                </p>
              )}
            </div>

            {session.progress && (
              <ProgressBar
                percent={session.progress.percent || 0}
                stage={session.progress.stage ?? undefined}
              />
            )}

            {session.fileMeta && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground bg-gray-50 dark:bg-gray-800 px-3 py-2 rounded-lg">
                <FileText className="w-4 h-4" />
                <span>{session.fileMeta.name}</span>
                {session.fileMeta.size && (
                  <span className="text-xs">({(session.fileMeta.size / 1024).toFixed(1)} KB)</span>
                )}
              </div>
            )}
          </>
        )}

        {/* ── Step: Done — Results ── */}
        {step === 'done' && session && statusConfig && (
          <>
            <div className={`text-center py-6 rounded-xl ${statusConfig.bgColor}`}>
              <div className={`flex justify-center mb-3 ${statusConfig.color}`}>
                {statusConfig.icon}
              </div>
              <h3 className={`text-lg font-semibold ${statusConfig.color}`}>
                {statusConfig.label}
              </h3>
            </div>

            {session.summary && <ImportSummary summary={session.summary} />}
            {session.summary?.errors && <ErrorList errors={session.summary.errors} />}

            {session.summary?.duplicates && session.summary.duplicates > 0 && (
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-amber-800 dark:text-amber-300">
                    <strong>{session.summary.duplicates}</strong> olası mükerrer kayıt bulundu.
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    Mükerrer Merkezi'nden inceleyip birleştirebilirsiniz.
                  </p>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={onClose}>Kapat</Button>
              {session.summary?.duplicates && session.summary.duplicates > 0 && (
                <Button onClick={onClose}>
                  <Users className="w-4 h-4 mr-2" />
                  Mükerrerleri İncele
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
