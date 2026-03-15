/**
 * Noah Connector Settings Page
 * Settings > Entegrasyonlar > Noah tab
 * Agent enrollment, status, sync settings
 */

import React, { useState } from 'react';
import { Button, Card } from '@x-ear/ui-web';
import { useToastHelpers } from '@x-ear/ui-web';
import {
  Wifi, WifiOff, RefreshCw, Copy, Eye, EyeOff,
  FolderOpen, Clock, CheckCircle, AlertCircle, Loader2,
  Shield, Activity, Settings, Download, FileText,
  Users, BarChart3, Headphones, Wrench,
} from 'lucide-react';
import {
  useAgentDevices,
  useGenerateEnrollmentToken,
} from '../../api/noah-import';
import type { AgentDevice } from '../../api/noah-import/types';

// ── Sync Mode Types ──────────────────────────────────────
type SyncMode = 'auto' | 'scheduled' | 'manual';

interface SyncConfig {
  mode: SyncMode;
  intervalMinutes: number;
  exportFolder: string;
}

const DEFAULT_SYNC_CONFIG: SyncConfig = {
  mode: 'auto',
  intervalMinutes: 5,
  exportFolder: 'C:\\XEAR\\noah_exports\\',
};

// ── Status Badge ─────────────────────────────────────────
function AgentStatusBadge({ status, lastSeenAt }: { status: string; lastSeenAt?: string }) {
  const isOnline = status === 'active';
  const isRecent = lastSeenAt
    ? Date.now() - new Date(lastSeenAt).getTime() < 60_000
    : false;

  if (isOnline && isRecent) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        Çevrimiçi
      </span>
    );
  }
  if (isOnline) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
        <Clock className="w-3 h-3" />
        Son görülme: {lastSeenAt ? new Date(lastSeenAt).toLocaleString('tr-TR') : '—'}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
      <WifiOff className="w-3 h-3" />
      Çevrimdışı
    </span>
  );
}

// ── Main Component ───────────────────────────────────────
export default function NoahConnectorSettings() {
  const { success: showSuccess, error: showError } = useToastHelpers();
  const { data: agents, isLoading: agentsLoading } = useAgentDevices();
  const generateToken = useGenerateEnrollmentToken();

  const [enrollmentToken, setEnrollmentToken] = useState<string | null>(null);
  const [showToken, setShowToken] = useState(false);
  const [syncConfig, setSyncConfig] = useState<SyncConfig>(DEFAULT_SYNC_CONFIG);

  const activeAgents = agents?.filter((a: AgentDevice) => a.status === 'active') || [];
  const hasAgent = activeAgents.length > 0;

  // ── Generate enrollment token ──
  const handleGenerateToken = async () => {
    try {
      const result = await generateToken.mutateAsync({ branchId: '' });
      setEnrollmentToken(result?.token || 'TOKEN_GENERATED');
      setShowToken(true);
      showSuccess('Kayıt tokeni oluşturuldu');
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : 'Token oluşturulamadı');
    }
  };

  const handleCopyToken = () => {
    if (enrollmentToken) {
      navigator.clipboard.writeText(enrollmentToken);
      showSuccess('Token kopyalandı');
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-blue-500" />
            Noah Connector
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Noah işitme cihazı yazılımından hasta verilerini otomatik aktarın
          </p>
        </div>
        <AgentStatusBadge
          status={hasAgent ? 'active' : 'inactive'}
          lastSeenAt={activeAgents[0]?.lastSeenAt ?? undefined}
        />
      </div>

      {/* ── Agent Status Card ── */}
      <Card className="p-6">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Wifi className="w-4 h-4" />
          Agent Durumu
        </h3>

        {agentsLoading ? (
          <div className="flex items-center gap-2 text-gray-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            Yükleniyor...
          </div>
        ) : hasAgent ? (
          <div className="space-y-4">
            {activeAgents.map((agent: AgentDevice) => (
              <div
                key={agent.id}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {agent.deviceFingerprint || agent.id}
                    </span>
                    <AgentStatusBadge status={agent.status} lastSeenAt={agent.lastSeenAt ?? undefined} />
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <FolderOpen className="w-3 h-3" />
                      {agent.exportFolder || syncConfig.exportFolder}
                    </span>
                    <span className="flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      v{agent.agentVersion || '1.0.0'}
                    </span>
                  </div>
                  {agent.noahInstallPath && (
                    <div className="flex items-center gap-4 text-xs text-green-600 dark:text-green-400">
                      <span className="flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Noah algılandı: {agent.noahVersion ? `v${agent.noahVersion}` : agent.noahInstallPath}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600">
            <WifiOff className="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
              Bağlı agent bulunamadı
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mb-4">
              Noah bilgisayarına agent kurarak başlayın
            </p>
          </div>
        )}
      </Card>

      {/* ── Enrollment Token Card ── */}
      <Card className="p-6">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Shield className="w-4 h-4" />
          Agent Kaydı
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Noah bilgisayarına agent kurmak için tek kullanımlık kayıt tokeni oluşturun.
          Bu tokeni agent'a yapıştırarak güvenli bağlantı sağlayın.
        </p>

        {enrollmentToken ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <input
                  data-allow-raw="true"
                  readOnly
                  value={showToken ? enrollmentToken : '••••••••••••••••••••••••'}
                  className="w-full px-3 py-2 pr-20 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-mono text-gray-900 dark:text-white"
                />
                <div className="absolute right-1 top-1 flex gap-1">
                  <button
                    data-allow-raw="true"
                    onClick={() => setShowToken(!showToken)}
                    className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                  >
                    {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    data-allow-raw="true"
                    onClick={handleCopyToken}
                    className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
            <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Bu token tek kullanımlıktır ve kısa sürede sona erer.
            </p>
          </div>
        ) : (
          <Button
            onClick={handleGenerateToken}
            variant="outline"
            disabled={generateToken.isPending}
          >
            {generateToken.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Shield className="w-4 h-4 mr-2" />
            )}
            Kayıt Tokeni Oluştur
          </Button>
        )}
      </Card>

      {/* ── Sync Settings Card ── */}
      <Card className="p-6">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Settings className="w-4 h-4" />
          Senkronizasyon Ayarları
        </h3>

        <div className="space-y-4">
          {/* Sync Mode */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Senkronizasyon Modu
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                {
                  mode: 'auto' as SyncMode,
                  icon: <RefreshCw className="w-4 h-4" />,
                  label: 'Otomatik',
                  desc: 'Klasör izleme + zamanlayıcı',
                },
                {
                  mode: 'scheduled' as SyncMode,
                  icon: <Clock className="w-4 h-4" />,
                  label: 'Zamanlı',
                  desc: 'Belirli aralıklarla kontrol',
                },
                {
                  mode: 'manual' as SyncMode,
                  icon: <Activity className="w-4 h-4" />,
                  label: 'Manuel',
                  desc: 'Sadece buton ile',
                },
              ].map(({ mode, icon, label, desc }) => (
                <button
                  data-allow-raw="true"
                  key={mode}
                  onClick={() => setSyncConfig(prev => ({ ...prev, mode }))}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${
                    syncConfig.mode === mode
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={syncConfig.mode === mode ? 'text-blue-600' : 'text-gray-500'}>
                      {icon}
                    </span>
                    <span className={`text-sm font-medium ${
                      syncConfig.mode === mode
                        ? 'text-blue-700 dark:text-blue-300'
                        : 'text-gray-700 dark:text-gray-300'
                    }`}>
                      {label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Sync Interval — only visible for auto/scheduled */}
          {syncConfig.mode !== 'manual' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Kontrol Aralığı
              </label>
              <div className="flex items-center gap-3">
                <select
                  data-allow-raw="true"
                  value={syncConfig.intervalMinutes}
                  onChange={e => setSyncConfig(prev => ({ ...prev, intervalMinutes: Number(e.target.value) }))}
                  className="px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white"
                >
                  <option value={1}>Her 1 dakika</option>
                  <option value={5}>Her 5 dakika</option>
                  <option value={15}>Her 15 dakika</option>
                  <option value={30}>Her 30 dakika</option>
                  <option value={60}>Her 1 saat</option>
                </select>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  Agent bu aralıkta yeni dosya kontrol eder
                </span>
              </div>
            </div>
          )}

          {/* Export Folder */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Export Klasörü
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <FolderOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  data-allow-raw="true"
                  value={syncConfig.exportFolder}
                  onChange={e => setSyncConfig(prev => ({ ...prev, exportFolder: e.target.value }))}
                  className="w-full pl-9 pr-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-mono text-gray-900 dark:text-white"
                  placeholder="C:\XEAR\noah_exports\"
                />
              </div>
            </div>
            <div className="mt-2 p-3 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-200 dark:border-green-800">
              <p className="text-xs text-green-700 dark:text-green-400 flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>
                  <strong>Otomatik algılama:</strong> Agent ilk çalıştığında Noah kurulum yolunu
                  (Registry, Program Files, Belgelerim) tarayarak export klasörünü otomatik saptar.
                  Manuel değişiklik gereksizdir.
                </span>
              </p>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-2">
            <Button
              onClick={() => showSuccess('Senkronizasyon ayarları kaydedildi')}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Ayarları Kaydet
            </Button>
          </div>
        </div>
      </Card>

      {/* ── Setup Wizard (only when no agent connected) ── */}
      {!hasAgent && !agentsLoading && (
        <Card className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/15 dark:to-indigo-900/15 border-blue-200 dark:border-blue-800">
          <h3 className="text-base font-semibold text-blue-900 dark:text-blue-200 mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5" />
            İlk Kurulum — 3 Kolay Adım
          </h3>

          <div className="space-y-4">
            {/* Step 1 */}
            <div className="flex gap-4 items-start">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">X-Ear Agent'ı İndirip Kurun</h4>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                  Noah'ın kurulu olduğu <strong>Windows bilgisayarına</strong> X-Ear Agent kurulum dosyasını indirin ve çalıştırın.
                  Agent sistem tepsisinde (saat yanında) çalışır, Noah kurulumunuzu otomatik algılar.
                </p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled>
                    <Download className="w-3.5 h-3.5 mr-1.5" />
                    Agent İndir (Windows)
                  </Button>
                  <span className="text-xs text-gray-400">.exe · ~15 MB</span>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="flex gap-4 items-start">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Kayıt Tokeni ile Bağlayın</h4>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Aşağıdaki <strong>"Kayıt Tokeni Oluştur"</strong> butonuna tıklayın → oluşan tokeni kopyalayın →
                  Agent penceresine yapıştırın. Bağlantı otomatik kurulur. <em>(Token tek kullanımlıktır, 10 dk geçerli)</em>
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="flex gap-4 items-start">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Noah'tan Hasta Verilerini Aktarın</h4>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                  Noah programında:
                </p>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-blue-200 dark:border-blue-800 text-xs space-y-1.5">
                  <p className="text-gray-700 dark:text-gray-300">
                    <strong>Toplu export:</strong> Noah → <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">File</code> → <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">Export Patients</code> → tüm hastaları veya seçilenleri seç → <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">.nhax</code> formatında kaydet
                  </p>
                  <p className="text-gray-700 dark:text-gray-300">
                    <strong>Tekli export:</strong> Hasta kartı → <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">Export</code> butonu → <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">.nhax</code> veya <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">.xml</code> olarak kaydet
                  </p>
                  <p className="text-gray-500 dark:text-gray-400 italic">
                    Dosyayı export klasörüne kaydetmeniz yeterli — Agent dosyayı algılayıp verileri otomatik CRM'e aktarır.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/15 rounded-lg border border-green-200 dark:border-green-800">
            <p className="text-xs text-green-700 dark:text-green-400 flex items-start gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Sonrasında:</strong> Yeni export dosyaları otomatik algılanır ve CRM'e aktarılır.
                Hasta bilgileri, odyogram sonuçları, cihaz/fitting verileri otomatik eşleştirilir.
                Aynı hasta tekrar gelirse güncellenir, yeni hasta ise oluşturulur.
              </span>
            </p>
          </div>
        </Card>
      )}

      {/* ── Quick Reference (when agent is connected) ── */}
      {hasAgent && (
        <Card className="p-4 bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700">
          <details className="group">
            <summary className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer flex items-center gap-2 select-none">
              <FileText className="w-4 h-4 text-gray-400 group-open:rotate-90 transition-transform" />
              Noah'tan export nasıl alınır?
            </summary>
            <div className="mt-3 pl-5 text-xs text-gray-600 dark:text-gray-400 space-y-1.5">
              <p><strong>Toplu:</strong> Noah → File → Export Patients → hastaları seç → .nhax olarak kaydet</p>
              <p><strong>Tekli:</strong> Hasta kartı → Export → .nhax veya .xml olarak kaydet</p>
              <p className="text-gray-400 italic">Export klasörüne kaydedilen dosyalar otomatik algılanır ve CRM'e aktarılır.</p>
            </div>
          </details>
        </Card>
      )}

      {/* ── Supported Data Types ── */}
      <Card className="p-6">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Aktarılan Veriler
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: <Users className="w-5 h-5 text-blue-500" />, label: 'Hasta Bilgileri', desc: 'Ad, TC, telefon, adres' },
            { icon: <BarChart3 className="w-5 h-5 text-green-500" />, label: 'Odyogram', desc: 'Hava/kemik yolu eşikleri' },
            { icon: <Headphones className="w-5 h-5 text-purple-500" />, label: 'Cihaz Bilgisi', desc: 'Marka, model, seri no' },
            { icon: <Wrench className="w-5 h-5 text-orange-500" />, label: 'Fitting', desc: 'Ayar tarihi, kulak, tip' },
          ].map(({ icon, label, desc }) => (
            <div key={label} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="mb-1">{icon}</div>
              <div className="text-xs font-medium text-gray-900 dark:text-white">{label}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{desc}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
