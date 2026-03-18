import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '@/api/orval-mutator';
import toast from 'react-hot-toast';
import {
  Plus, Play, Pause, Trash2, Copy, Settings2, RefreshCw,
  Rss, Globe, Share2, Palette, BarChart3, CheckCircle,
  XCircle, Clock, AlertTriangle, ChevronRight, Eye,
  ExternalLink, Image as ImageIcon, Languages, Zap,
  Linkedin, Twitter, Facebook, Instagram, Search, X,
} from 'lucide-react';

// ── Types ────────────────────────────────

interface BlogAutomation {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  sector: string;
  targetCategory?: string;
  scheduleType: string;
  scheduleIntervalHours: number;
  keywords: string[];
  negativeKeywords: string[];
  contentTypes: string[];
  primaryLanguage: string;
  targetLanguages: string[];
  imageSource: string;
  imageFallback: string;
  autoShareEnabled: boolean;
  socialPlatforms: Record<string, boolean>;
  approvalMode: string;
  confidenceThreshold: number;
  summaryDepth: string;
  citationStyle: string;
  toneTemplateId?: string;
  targetAudience?: string;
  ctaText?: string;
  dedupWindowDays: number;
  totalRuns: number;
  totalPostsGenerated: number;
  totalPostsPublished: number;
  lastRunAt?: string;
  sourcesCount: number;
  createdAt?: string;
}

interface BlogSource {
  id: string;
  automationId: string;
  name: string;
  url: string;
  sourceType: string;
  isActive: boolean;
  priority: number;
  trustScore: number;
  lastFetchedAt?: string;
  lastError?: string;
  consecutiveFailures: number;
  totalItemsFetched: number;
}

interface BlogAutomationRun {
  id: string;
  automationId: string;
  status: string;
  startedAt?: string;
  completedAt?: string;
  triggerType: string;
  sourcesScanned: number;
  itemsDiscovered: number;
  postsGenerated: number;
  postsPublished: number;
  postsPendingApproval: number;
  errorMessage?: string;
}

interface BlogContentCandidate {
  id: string;
  runId: string;
  sourceUrl: string;
  sourceTitle?: string;
  sourceName?: string;
  relevanceScore: number;
  qualityScore: number;
  digestWorthiness: number;
  status: string;
  rewrittenTitle?: string;
  rewrittenContent?: string;
  rewrittenExcerpt?: string;
  citations: { title: string; url: string }[];
  imageUrl?: string;
  imageSource?: string;
  translations: Record<string, any>;
  postId?: string;
}

interface BlogSocialConnection {
  id: string;
  platform: string;
  isActive: boolean;
  displayName?: string;
  hasApiKey: boolean;
  hasAccessToken: boolean;
  defaultHashtags: string[];
  postTemplate?: string;
  totalPostsShared: number;
  lastError?: string;
}

interface BlogToneTemplate {
  id: string;
  name: string;
  description?: string;
  sector?: string;
  tone: string;
  voice: string;
  formalityLevel: number;
  kolStyleReference?: string;
  maxWordCount: number;
}

interface BlogAutomationStats {
  totalAutomations: number;
  activeAutomations: number;
  totalPostsGenerated: number;
  totalPostsPublished: number;
  pendingApproval: number;
  totalSources: number;
  activeSocialConnections: number;
  postsBySector: Record<string, number>;
}

// ── Sector labels ────────────────────────────────

const SECTOR_MAP: Record<string, { label: string; bg: string; text: string; darkBg: string; darkText: string }> = {
  hearing: { label: 'İşitme', bg: 'bg-blue-100', text: 'text-blue-700', darkBg: 'dark:bg-blue-900/30', darkText: 'dark:text-blue-400' },
  pharmacy: { label: 'Eczane', bg: 'bg-green-100', text: 'text-green-700', darkBg: 'dark:bg-green-900/30', darkText: 'dark:text-green-400' },
  hospital: { label: 'Hastane', bg: 'bg-red-100', text: 'text-red-700', darkBg: 'dark:bg-red-900/30', darkText: 'dark:text-red-400' },
  hotel: { label: 'Otel', bg: 'bg-orange-100', text: 'text-orange-700', darkBg: 'dark:bg-orange-900/30', darkText: 'dark:text-orange-400' },
  medical: { label: 'Medikal', bg: 'bg-teal-100', text: 'text-teal-700', darkBg: 'dark:bg-teal-900/30', darkText: 'dark:text-teal-400' },
  optic: { label: 'Optik', bg: 'bg-violet-100', text: 'text-violet-700', darkBg: 'dark:bg-violet-900/30', darkText: 'dark:text-violet-400' },
  beauty: { label: 'Güzellik', bg: 'bg-pink-100', text: 'text-pink-700', darkBg: 'dark:bg-pink-900/30', darkText: 'dark:text-pink-400' },
  general: { label: 'Genel', bg: 'bg-gray-100', text: 'text-gray-700', darkBg: 'dark:bg-gray-900/30', darkText: 'dark:text-gray-400' },
};

function SectorBadge({ sector }: { sector: string }) {
  const s = SECTOR_MAP[sector] || SECTOR_MAP.general;
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.darkBg} ${s.text} ${s.darkText}`}>
      {s.label}
    </span>
  );
}

function sectorLabel(sector: string): string {
  return SECTOR_MAP[sector]?.label || sector;
}

const CONTENT_TYPES = [
  { value: 'trend', label: 'Trendler' },
  { value: 'innovation', label: 'Yenilikler' },
  { value: 'how-to', label: 'Nasıl Yapılır' },
  { value: 'education', label: 'Eğitim' },
  { value: 'news', label: 'Haberler' },
  { value: 'regulation', label: 'Mevzuat' },
  { value: 'guide', label: 'Rehberler' },
  { value: 'comparison', label: 'Karşılaştırma' },
  { value: 'digest', label: 'Özet/Digest' },
];

const PLATFORM_ICONS: Record<string, React.ElementType> = {
  linkedin: Linkedin,
  twitter: Twitter,
  facebook: Facebook,
  instagram: Instagram,
};

type TabId = 'overview' | 'automations' | 'approval' | 'social' | 'templates' | 'analytics';

// ── API Hooks ────────────────────────────────

function useAutomations() {
  return useQuery({
    queryKey: ['blog-automations'],
    queryFn: () => adminApi<BlogAutomation[]>({ url: '/admin/blog-automation/', method: 'GET' }),
  });
}

function useStats() {
  return useQuery({
    queryKey: ['blog-automation-stats'],
    queryFn: () => adminApi<BlogAutomationStats>({ url: '/admin/blog-automation/stats', method: 'GET' }),
  });
}

function useSocialConnections() {
  return useQuery({
    queryKey: ['blog-social-connections'],
    queryFn: () => adminApi<BlogSocialConnection[]>({ url: '/admin/blog-automation/social-connections', method: 'GET' }),
  });
}

function useToneTemplates() {
  return useQuery({
    queryKey: ['blog-tone-templates'],
    queryFn: () => adminApi<BlogToneTemplate[]>({ url: '/admin/blog-automation/tone-templates', method: 'GET' }),
  });
}

function usePendingApproval() {
  return useQuery({
    queryKey: ['blog-pending-approval'],
    queryFn: () => adminApi<BlogContentCandidate[]>({ url: '/admin/blog-automation/approval-queue', method: 'GET' }),
  });
}

function useAutomationRuns(automationId: string | null) {
  return useQuery({
    queryKey: ['blog-automation-runs', automationId],
    queryFn: () => adminApi<BlogAutomationRun[]>({ url: `/admin/blog-automation/${automationId}/runs`, method: 'GET' }),
    enabled: !!automationId,
  });
}

function useAutomationSources(automationId: string | null) {
  return useQuery({
    queryKey: ['blog-automation-sources', automationId],
    queryFn: () => adminApi<BlogSource[]>({ url: `/admin/blog-automation/${automationId}/sources`, method: 'GET' }),
    enabled: !!automationId,
  });
}

// ── Status badge ────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string; icon: React.ElementType }> = {
    completed: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', icon: CheckCircle },
    running: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', icon: RefreshCw },
    pending: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400', icon: Clock },
    failed: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', icon: XCircle },
    rewritten: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400', icon: Eye },
    approved: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-400', icon: CheckCircle },
    rejected: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', icon: XCircle },
    published: { bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-700 dark:text-indigo-400', icon: Globe },
    discovered: { bg: 'bg-gray-100 dark:bg-gray-900/30', text: 'text-gray-700 dark:text-gray-400', icon: Search },
  };
  const s = map[status] || map.pending;
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
      <Icon className="w-3 h-3" />
      {status}
    </span>
  );
}

// ── Main Page ────────────────────────────────

const BlogAutomationPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [selectedAutomation, setSelectedAutomation] = useState<BlogAutomation | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSourceModal, setShowSourceModal] = useState(false);
  const [showSocialModal, setShowSocialModal] = useState<BlogSocialConnection | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showDetailPanel, setShowDetailPanel] = useState(false);

  const qc = useQueryClient();
  const { data: automations = [], isLoading, isError: autoError } = useAutomations();
  const { data: stats } = useStats();
  const { data: pending = [] } = usePendingApproval();
  const { data: socialConnections = [] } = useSocialConnections();
  const { data: toneTemplates = [] } = useToneTemplates();

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['blog-automations'] });
    qc.invalidateQueries({ queryKey: ['blog-automation-stats'] });
  };

  const toggleMutation = useMutation({
    mutationFn: (id: string) => adminApi({ url: `/admin/blog-automation/${id}/toggle`, method: 'POST' }),
    onSuccess: () => { invalidateAll(); toast.success('Otomasyon durumu güncellendi'); },
    onError: () => toast.error('Durum güncellenemedi'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi({ url: `/admin/blog-automation/${id}`, method: 'DELETE' }),
    onSuccess: () => { invalidateAll(); toast.success('Otomasyon silindi'); },
    onError: () => toast.error('Otomasyon silinemedi'),
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => adminApi({ url: `/admin/blog-automation/${id}/duplicate`, method: 'POST' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['blog-automations'] }); toast.success('Otomasyon kopyalandı'); },
    onError: () => toast.error('Kopyalama başarısız'),
  });

  const triggerRunMutation = useMutation({
    mutationFn: (id: string) => adminApi({ url: `/admin/blog-automation/${id}/run`, method: 'POST' }),
    onSuccess: () => { invalidateAll(); toast.success('Otomasyon çalıştırıldı'); },
    onError: () => toast.error('Çalıştırma başarısız'),
  });

  const approveRejectMutation = useMutation({
    mutationFn: ({ candidateId, action }: { candidateId: string; action: string }) =>
      adminApi({ url: `/admin/blog-automation/candidates/${candidateId}/action`, method: 'POST', data: { action } }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['blog-pending-approval'] });
      qc.invalidateQueries({ queryKey: ['blog-automation-stats'] });
      toast.success(vars.action === 'approve' ? 'İçerik onaylandı' : 'İçerik reddedildi');
    },
    onError: () => toast.error('İşlem başarısız'),
  });

  const toggleSocialMutation = useMutation({
    mutationFn: (id: string) => adminApi({ url: `/admin/blog-automation/social-connections/${id}/toggle`, method: 'POST' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['blog-social-connections'] }); toast.success('Platform durumu güncellendi'); },
    onError: () => toast.error('Platform güncellenemedi'),
  });

  const tabs: { id: TabId; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: 'overview', label: 'Genel Bakış', icon: BarChart3 },
    { id: 'automations', label: 'Otomasyonlar', icon: Zap, badge: automations.length },
    { id: 'approval', label: 'Onay Kuyruğu', icon: CheckCircle, badge: pending.length },
    { id: 'social', label: 'Sosyal Medya', icon: Share2 },
    { id: 'templates', label: 'Ton Şablonları', icon: Palette },
    { id: 'analytics', label: 'Analitik', icon: BarChart3 },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Blog Otomasyonu</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Sektöre göre otomatik içerik keşfi, özet yazımı ve paylaşım yönetimi
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Yeni Otomasyon
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex gap-1 overflow-x-auto hide-scrollbar -mb-px">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {tab.badge != null && tab.badge > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-full text-xs">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Error Banner */}
      {autoError && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <span className="text-sm text-red-700 dark:text-red-300">Veriler yüklenirken bir hata oluştu. Lütfen sayfayı yenileyin.</span>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'overview' && <OverviewTab stats={stats} automations={automations} pending={pending} />}
      {activeTab === 'automations' && (
        <AutomationsTab
          automations={automations}
          isLoading={isLoading}
          onToggle={(id) => toggleMutation.mutate(id)}
          onDelete={(id) => { if (confirm('Bu otomasyonu silmek istediğinize emin misiniz?')) deleteMutation.mutate(id); }}
          onDuplicate={(id) => duplicateMutation.mutate(id)}
          onTriggerRun={(id) => triggerRunMutation.mutate(id)}
          onSelect={(a) => { setSelectedAutomation(a); setShowDetailPanel(true); }}
          onCreate={() => setShowCreateModal(true)}
        />
      )}
      {activeTab === 'approval' && (
        <ApprovalTab
          candidates={pending}
          onApprove={(id) => approveRejectMutation.mutate({ candidateId: id, action: 'approve' })}
          onReject={(id) => approveRejectMutation.mutate({ candidateId: id, action: 'reject' })}
        />
      )}
      {activeTab === 'social' && (
        <SocialTab
          connections={socialConnections}
          onToggle={(id) => toggleSocialMutation.mutate(id)}
          onConfigure={(c) => setShowSocialModal(c)}
        />
      )}
      {activeTab === 'templates' && <TemplatesTab templates={toneTemplates} onCreate={() => setShowTemplateModal(true)} />}
      {activeTab === 'analytics' && <AnalyticsTab stats={stats} automations={automations} />}

      {/* Create Automation Modal */}
      {showCreateModal && (
        <CreateAutomationModal
          toneTemplates={toneTemplates}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => { setShowCreateModal(false); qc.invalidateQueries({ queryKey: ['blog-automations'] }); }}
        />
      )}

      {/* Detail Panel */}
      {showDetailPanel && selectedAutomation && (
        <AutomationDetailPanel
          automation={selectedAutomation}
          onClose={() => setShowDetailPanel(false)}
          onAddSource={() => setShowSourceModal(true)}
        />
      )}

      {/* Source Modal */}
      {showSourceModal && selectedAutomation && (
        <AddSourceModal
          automationId={selectedAutomation.id}
          onClose={() => setShowSourceModal(false)}
          onCreated={() => { setShowSourceModal(false); qc.invalidateQueries({ queryKey: ['blog-automation-sources', selectedAutomation.id] }); }}
        />
      )}

      {/* Social Config Modal */}
      {showSocialModal && (
        <SocialConfigModal
          connection={showSocialModal}
          onClose={() => setShowSocialModal(null)}
          onSaved={() => { setShowSocialModal(null); qc.invalidateQueries({ queryKey: ['blog-social-connections'] }); }}
        />
      )}

      {/* Tone Template Modal */}
      {showTemplateModal && (
        <CreateToneTemplateModal
          onClose={() => setShowTemplateModal(false)}
          onCreated={() => { setShowTemplateModal(false); qc.invalidateQueries({ queryKey: ['blog-tone-templates'] }); }}
        />
      )}
    </div>
  );
};

// ── Overview Tab ────────────────────────────────

function OverviewTab({ stats, automations, pending }: { stats?: BlogAutomationStats; automations: BlogAutomation[]; pending: BlogContentCandidate[] }) {
  const statCards = [
    { label: 'Aktif Otomasyon', value: stats?.activeAutomations ?? 0, total: stats?.totalAutomations ?? 0, icon: Zap, iconClass: 'text-indigo-500' },
    { label: 'Üretilen Yazı', value: stats?.totalPostsGenerated ?? 0, icon: Globe, iconClass: 'text-blue-500' },
    { label: 'Yayınlanan', value: stats?.totalPostsPublished ?? 0, icon: CheckCircle, iconClass: 'text-green-500' },
    { label: 'Onay Bekleyen', value: stats?.pendingApproval ?? 0, icon: Clock, iconClass: 'text-yellow-500' },
    { label: 'Toplam Kaynak', value: stats?.totalSources ?? 0, icon: Rss, iconClass: 'text-purple-500' },
    { label: 'Sosyal Bağlantı', value: stats?.activeSocialConnections ?? 0, icon: Share2, iconClass: 'text-pink-500' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`w-5 h-5 ${card.iconClass}`} />
                <span className="text-xs text-gray-500 dark:text-gray-400">{card.label}</span>
              </div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {card.value}
                {'total' in card && card.total != null && (
                  <span className="text-sm font-normal text-gray-400">/{card.total}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent automations */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Son Çalışan Otomasyonlar</h3>
        {automations.filter(a => a.lastRunAt).slice(0, 5).map((a) => (
          <div key={a.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${a.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
              <span className="text-sm text-gray-900 dark:text-white">{a.name}</span>
              <SectorBadge sector={a.sector} />
            </div>
            <div className="text-xs text-gray-500">
              {a.lastRunAt ? new Date(a.lastRunAt).toLocaleString('tr-TR') : '-'}
            </div>
          </div>
        ))}
        {automations.filter(a => a.lastRunAt).length === 0 && (
          <p className="text-sm text-gray-400 py-4 text-center">Henüz çalıştırılmış otomasyon yok</p>
        )}
      </div>

      {/* Pending approvals preview */}
      {pending.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-2xl border border-yellow-200 dark:border-yellow-800 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            <h3 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">
              {pending.length} içerik onay bekliyor
            </h3>
          </div>
          <div className="space-y-2">
            {pending.slice(0, 3).map((c) => (
              <div key={c.id} className="text-sm text-yellow-700 dark:text-yellow-300">
                {c.rewrittenTitle || c.sourceTitle || 'Başlıksız'}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Automations Tab ────────────────────────────────

function AutomationsTab({
  automations, isLoading, onToggle, onDelete, onDuplicate, onTriggerRun, onSelect, onCreate,
}: {
  automations: BlogAutomation[];
  isLoading: boolean;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onTriggerRun: (id: string) => void;
  onSelect: (a: BlogAutomation) => void;
  onCreate: () => void;
}) {
  const [filter, setFilter] = useState('');

  const filtered = automations.filter(
    (a) => !filter || a.name.toLowerCase().includes(filter.toLowerCase()) || a.sector.includes(filter.toLowerCase())
  );

  if (isLoading) {
    return <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Otomasyon ara..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
          <Zap className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 mb-4">Henüz otomasyon oluşturulmamış</p>
          <button
            onClick={onCreate}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4" /> İlk Otomasyonu Oluştur
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map((a) => (
            <div
              key={a.id}
              className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onSelect(a)}>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{a.name}</h3>
                    <SectorBadge sector={a.sector} />
                    {a.isActive ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">Aktif</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">Pasif</span>
                    )}
                  </div>
                  {a.description && <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 truncate">{a.description}</p>}
                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    <span className="flex items-center gap-1"><Rss className="w-3 h-3" /> {a.sourcesCount} kaynak</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Her {a.scheduleIntervalHours}s</span>
                    <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> {a.totalPostsPublished} yayın</span>
                    <span className="flex items-center gap-1"><RefreshCw className="w-3 h-3" /> {a.totalRuns} çalışma</span>
                    {a.autoShareEnabled && <span className="flex items-center gap-1"><Share2 className="w-3 h-3" /> Sosyal</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => onTriggerRun(a.id)}
                    className="p-1.5 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600 transition-colors"
                    title="Şimdi Çalıştır"
                  >
                    <Play className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onToggle(a.id)}
                    className={`p-1.5 rounded-lg transition-colors ${a.isActive ? 'hover:bg-yellow-100 dark:hover:bg-yellow-900/30 text-yellow-600' : 'hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600'}`}
                    title={a.isActive ? 'Duraklat' : 'Etkinleştir'}
                  >
                    {a.isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => onDuplicate(a.id)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 transition-colors"
                    title="Kopyala"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDelete(a.id)}
                    className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-400 transition-colors"
                    title="Sil"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Approval Tab ────────────────────────────────

function ApprovalTab({
  candidates, onApprove, onReject,
}: {
  candidates: BlogContentCandidate[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const [previewId, setPreviewId] = useState<string | null>(null);
  const preview = candidates.find((c) => c.id === previewId);

  if (candidates.length === 0) {
    return (
      <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
        <CheckCircle className="w-12 h-12 text-green-300 dark:text-green-700 mx-auto mb-3" />
        <p className="text-gray-500 dark:text-gray-400">Onay bekleyen içerik yok</p>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="space-y-3">
        {candidates.map((c) => (
          <div
            key={c.id}
            className={`bg-white dark:bg-gray-800 rounded-2xl border p-4 cursor-pointer transition-colors ${
              previewId === c.id ? 'border-indigo-500' : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300'
            }`}
            onClick={() => setPreviewId(c.id)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {c.rewrittenTitle || c.sourceTitle || 'Başlıksız'}
                </h4>
                <p className="text-xs text-gray-500 mt-1 truncate">{c.rewrittenExcerpt || ''}</p>
                <div className="flex items-center gap-2 mt-2">
                  <StatusBadge status={c.status} />
                  <span className="text-xs text-gray-400">Skor: {(c.digestWorthiness * 100).toFixed(0)}%</span>
                  {c.sourceName && <span className="text-xs text-gray-400">via {c.sourceName}</span>}
                </div>
              </div>
              {c.imageUrl && (
                <img src={c.imageUrl} alt="" className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
              )}
            </div>
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={(e) => { e.stopPropagation(); onApprove(c.id); }}
                className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700"
              >
                <CheckCircle className="w-3 h-3" /> Onayla
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onReject(c.id); }}
                className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700"
              >
                <XCircle className="w-3 h-3" /> Reddet
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Preview panel */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 sticky top-4">
        {preview ? (
          <div className="space-y-4">
            {preview.imageUrl && (
              <img src={preview.imageUrl} alt="" className="w-full h-48 object-cover rounded-xl" />
            )}
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">{preview.rewrittenTitle}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 italic">{preview.rewrittenExcerpt}</p>
            <div
              className="prose prose-sm dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: preview.rewrittenContent || '' }}
            />
            {preview.citations && preview.citations.length > 0 && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Kaynaklar</h4>
                {preview.citations.map((cite, i) => (
                  <a
                    key={i}
                    href={cite.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 mb-1"
                  >
                    <ExternalLink className="w-3 h-3" /> {cite.title || cite.url}
                  </a>
                ))}
              </div>
            )}
            {preview.translations && Object.keys(preview.translations).length > 0 && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center gap-1">
                  <Languages className="w-3 h-3" /> Çeviriler
                </h4>
                <div className="flex gap-2">
                  {Object.keys(preview.translations).map((lang) => (
                    <span key={lang} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs font-medium">
                      {lang.toUpperCase()}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-16 text-gray-400">
            <Eye className="w-10 h-10 mx-auto mb-2" />
            <p className="text-sm">Önizleme için bir içerik seçin</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Social Tab ────────────────────────────────

function SocialTab({
  connections, onToggle, onConfigure,
}: {
  connections: BlogSocialConnection[];
  onToggle: (id: string) => void;
  onConfigure: (c: BlogSocialConnection) => void;
}) {
  const qc = useQueryClient();
  const platforms = [
    { key: 'linkedin', label: 'LinkedIn', icon: Linkedin, iconBg: 'bg-blue-100 dark:bg-blue-900/30', iconText: 'text-blue-600 dark:text-blue-400' },
    { key: 'twitter', label: 'X / Twitter', icon: Twitter, iconBg: 'bg-gray-100 dark:bg-gray-800', iconText: 'text-gray-600 dark:text-gray-400' },
    { key: 'facebook', label: 'Facebook', icon: Facebook, iconBg: 'bg-blue-100 dark:bg-blue-900/30', iconText: 'text-blue-600 dark:text-blue-400' },
    { key: 'instagram', label: 'Instagram', icon: Instagram, iconBg: 'bg-pink-100 dark:bg-pink-900/30', iconText: 'text-pink-600 dark:text-pink-400' },
  ];

  const createMutation = useMutation({
    mutationFn: (platform: string) =>
      adminApi({ url: '/admin/blog-automation/social-connections', method: 'POST', data: { platform, isActive: false } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['blog-social-connections'] }); toast.success('Platform bağlantısı oluşturuldu'); },
    onError: () => toast.error('Bağlantı oluşturulamadı'),
  });

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Blog yazıları otomatik olarak bağlı sosyal medya platformlarına paylaşılır. Switch ile açıp kapatın, ayar ikonuna tıklayarak API anahtarlarını girin.
      </p>
      <div className="grid md:grid-cols-2 gap-4">
        {platforms.map((p) => {
          const conn = connections.find((c) => c.platform === p.key);
          const Icon = p.icon;
          return (
            <div
              key={p.key}
              className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${p.iconBg}`}>
                    <Icon className={`w-5 h-5 ${p.iconText}`} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{p.label}</h3>
                    {conn ? (
                      <div className="flex items-center gap-2 mt-0.5">
                        {conn.hasApiKey || conn.hasAccessToken ? (
                          <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Bağlı</span>
                        ) : (
                          <span className="text-xs text-yellow-600 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> API anahtarı gerekli</span>
                        )}
                        <span className="text-xs text-gray-400">{conn.totalPostsShared} paylaşım</span>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">Bağlı değil</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {conn ? (
                    <>
                      <button
                        onClick={() => onConfigure(conn)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 transition-colors"
                        title="Ayarlar"
                      >
                        <Settings2 className="w-4 h-4" />
                      </button>
                      {/* Toggle Switch */}
                      <button
                        onClick={() => onToggle(conn.id)}
                        className={`relative w-11 h-6 rounded-full transition-colors ${conn.isActive ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                      >
                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${conn.isActive ? 'translate-x-5' : ''}`} />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => createMutation.mutate(p.key)}
                      disabled={createMutation.isPending}
                      className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {createMutation.isPending ? '...' : 'Bağla'}
                    </button>
                  )}
                </div>
              </div>
              {conn?.lastError && (
                <div className="mt-2 text-xs text-red-500 bg-red-50 dark:bg-red-900/20 rounded p-2">
                  {conn.lastError}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Templates Tab ────────────────────────────────

function TemplatesTab({ templates, onCreate }: { templates: BlogToneTemplate[]; onCreate: () => void }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          KOL-tarzı iletişim stili şablonları. Sektöre göre ton, ses ve format ayarlayın.
        </p>
        <button
          onClick={onCreate}
          className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-medium hover:bg-indigo-700"
        >
          <Plus className="w-3 h-3" /> Yeni Şablon
        </button>
      </div>

      {templates.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
          <Palette className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">Henüz ton şablonu yok</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((t) => (
            <div key={t.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{t.name}</h3>
              {t.description && <p className="text-xs text-gray-500 mb-2">{t.description}</p>}
              <div className="flex flex-wrap gap-1.5">
                <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded text-xs">{t.tone}</span>
                <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-xs">{t.voice}</span>
                <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded text-xs">Resmiyet: {t.formalityLevel}/10</span>
                <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded text-xs">Max {t.maxWordCount} kelime</span>
                {t.sector && <SectorBadge sector={t.sector} />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Analytics Tab ────────────────────────────────

function AnalyticsTab({ stats, automations }: { stats?: BlogAutomationStats; automations: BlogAutomation[] }) {
  const sectors = Object.entries(stats?.postsBySector || {}).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-4">
        {/* Posts by sector */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Sektöre Göre Yayınlar</h3>
          {sectors.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">Henüz veri yok</p>
          ) : (
            <div className="space-y-2">
              {sectors.map(([sector, count]) => {
                const maxCount = sectors[0]?.[1] || 1;
                return (
                  <div key={sector}>
                    <div className="flex justify-between text-xs mb-0.5">
                      <span className="text-gray-700 dark:text-gray-300">{sectorLabel(sector)}</span>
                      <span className="text-gray-500">{count}</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-indigo-500 h-2 rounded-full transition-all"
                        style={{ width: `${(count / maxCount) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top automations */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">En Verimli Otomasyonlar</h3>
          {automations
            .sort((a, b) => b.totalPostsPublished - a.totalPostsPublished)
            .slice(0, 5)
            .map((a) => (
              <div key={a.id} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                <span className="text-sm text-gray-900 dark:text-white">{a.name}</span>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span>{a.totalPostsGenerated} üretim</span>
                  <span className="text-green-600">{a.totalPostsPublished} yayın</span>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

// ── Create Automation Modal ────────────────────────────────

function CreateAutomationModal({
  toneTemplates, onClose, onCreated,
}: {
  toneTemplates: BlogToneTemplate[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    name: '', description: '', sector: 'hearing', targetCategory: '',
    scheduleIntervalHours: 24, keywords: '', negativeKeywords: '',
    contentTypes: ['trend', 'news'],
    primaryLanguage: 'tr', targetLanguages: [] as string[],
    imageSource: 'unsplash', approvalMode: 'manual',
    summaryDepth: 'medium', toneTemplateId: '',
    targetAudience: '', autoShareEnabled: false,
  });

  const mutation = useMutation({
    mutationFn: (data: any) => adminApi({ url: '/admin/blog-automation/', method: 'POST', data }),
    onSuccess: () => { toast.success('Otomasyon oluşturuldu'); onCreated(); },
    onError: () => toast.error('Otomasyon oluşturulamadı'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      ...form,
      keywords: form.keywords.split(',').map((k) => k.trim()).filter(Boolean),
      negativeKeywords: form.negativeKeywords.split(',').map((k) => k.trim()).filter(Boolean),
      toneTemplateId: form.toneTemplateId || undefined,
      isActive: false,
    });
  };

  const set = (key: string, value: any) => setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center pt-10 z-50 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl mx-4 mb-10 shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Yeni Otomasyon Oluştur</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Name & Sector */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Otomasyon Adı *</label>
              <input value={form.name} onChange={(e) => set('name', e.target.value)} required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Sektör *</label>
              <select value={form.sector} onChange={(e) => set('sector', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
                {Object.entries(SECTOR_MAP).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Açıklama</label>
            <textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white" />
          </div>

          {/* Schedule & Depth */}
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Tarama Sıklığı (saat)</label>
              <input type="number" value={form.scheduleIntervalHours} onChange={(e) => set('scheduleIntervalHours', parseInt(e.target.value))} min={1}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Özet Derinliği</label>
              <select value={form.summaryDepth} onChange={(e) => set('summaryDepth', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
                <option value="short">Kısa (150-200 kelime)</option>
                <option value="medium">Orta (400-600 kelime)</option>
                <option value="deep">Detaylı (800-1200 kelime)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Onay Modu</label>
              <select value={form.approvalMode} onChange={(e) => set('approvalMode', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
                <option value="manual">Manuel Onay</option>
                <option value="semi_auto">Yarı Otomatik</option>
                <option value="full_auto">Tam Otomatik</option>
              </select>
            </div>
          </div>

          {/* Keywords */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Anahtar Kelimeler (virgülle)</label>
              <input value={form.keywords} onChange={(e) => set('keywords', e.target.value)} placeholder="işitme cihazı, odyoloji, hearing aid"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Negatif Kelimeler (virgülle)</label>
              <input value={form.negativeKeywords} onChange={(e) => set('negativeKeywords', e.target.value)} placeholder="reklam, spam"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white" />
            </div>
          </div>

          {/* Content Types */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">İçerik Türleri</label>
            <div className="flex flex-wrap gap-2">
              {CONTENT_TYPES.map((ct) => (
                <button
                  key={ct.value}
                  type="button"
                  onClick={() => set('contentTypes', form.contentTypes.includes(ct.value)
                    ? form.contentTypes.filter((t) => t !== ct.value)
                    : [...form.contentTypes, ct.value]
                  )}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    form.contentTypes.includes(ct.value)
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  {ct.label}
                </button>
              ))}
            </div>
          </div>

          {/* Language & Image */}
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Ana Dil</label>
              <select value={form.primaryLanguage} onChange={(e) => set('primaryLanguage', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
                <option value="tr">Türkçe</option>
                <option value="en">English</option>
                <option value="de">Deutsch</option>
                <option value="ar">العربية</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Görsel Kaynağı</label>
              <select value={form.imageSource} onChange={(e) => set('imageSource', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
                <option value="unsplash">Unsplash</option>
                <option value="pexels">Pexels</option>
                <option value="ai">AI Üretim</option>
                <option value="mixed">Karma</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Ton Şablonu</label>
              <select value={form.toneTemplateId} onChange={(e) => set('toneTemplateId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
                <option value="">Varsayılan</option>
                {toneTemplates.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Hedef Kitle</label>
            <input value={form.targetAudience} onChange={(e) => set('targetAudience', e.target.value)}
              placeholder="Odyologlar, işitme merkezi sahipleri"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white" />
          </div>

          {/* Translation Languages */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Çeviri Dilleri</label>
            <div className="flex flex-wrap gap-2">
              {[{ code: 'en', label: 'English' }, { code: 'de', label: 'Deutsch' }, { code: 'ar', label: 'العربية' }, { code: 'fr', label: 'Français' }, { code: 'es', label: 'Español' }].map((lang) => (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => set('targetLanguages', form.targetLanguages.includes(lang.code)
                    ? form.targetLanguages.filter((l) => l !== lang.code)
                    : [...form.targetLanguages, lang.code]
                  )}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    form.targetLanguages.includes(lang.code)
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>

          {/* Social sharing toggle */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => set('autoShareEnabled', !form.autoShareEnabled)}
              className={`relative w-11 h-6 rounded-full transition-colors ${form.autoShareEnabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.autoShareEnabled ? 'translate-x-5' : ''}`} />
            </button>
            <span className="text-sm text-gray-700 dark:text-gray-300">Otomatik sosyal medya paylaşımı</span>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl">
              İptal
            </button>
            <button type="submit" disabled={mutation.isPending || !form.name}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50">
              {mutation.isPending ? 'Oluşturuluyor...' : 'Oluştur'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Automation Detail Panel ────────────────────────────────

function AutomationDetailPanel({
  automation, onClose, onAddSource,
}: {
  automation: BlogAutomation;
  onClose: () => void;
  onAddSource: () => void;
}) {
  const { data: sources = [] } = useAutomationSources(automation.id);
  const { data: runs = [] } = useAutomationRuns(automation.id);
  const [subTab, setSubTab] = useState<'sources' | 'runs'>('sources');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-end z-50">
      <div className="bg-white dark:bg-gray-800 w-full max-w-lg h-full overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">{automation.name}</h2>
            <SectorBadge sector={automation.sector} />
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        <div className="p-4 space-y-4">
          {/* Sub tabs */}
          <div className="flex gap-2">
            <button onClick={() => setSubTab('sources')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium ${subTab === 'sources' ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600' : 'text-gray-500'}`}>
              <Rss className="w-3 h-3 inline mr-1" />Kaynaklar ({sources.length})
            </button>
            <button onClick={() => setSubTab('runs')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium ${subTab === 'runs' ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600' : 'text-gray-500'}`}>
              <RefreshCw className="w-3 h-3 inline mr-1" />Çalışmalar ({runs.length})
            </button>
          </div>

          {subTab === 'sources' && (
            <div className="space-y-3">
              <button onClick={onAddSource}
                className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-sm text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors">
                <Plus className="w-4 h-4" /> Kaynak Ekle
              </button>
              {sources.map((s) => (
                <div key={s.id} className="bg-gray-50 dark:bg-gray-900 rounded-xl p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Rss className="w-4 h-4 text-orange-500" />
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{s.name}</span>
                    </div>
                    <span className={`w-2 h-2 rounded-full ${s.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                  </div>
                  <p className="text-xs text-gray-500 truncate mt-1">{s.url}</p>
                  <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                    <span>Öncelik: {s.priority}</span>
                    <span>Güven: {(s.trustScore * 100).toFixed(0)}%</span>
                    <span>{s.totalItemsFetched} öğe</span>
                    {s.consecutiveFailures > 0 && <span className="text-red-500">{s.consecutiveFailures} hata</span>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {subTab === 'runs' && (
            <div className="space-y-3">
              {runs.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">Henüz çalışma yok</p>
              ) : runs.map((r) => (
                <div key={r.id} className="bg-gray-50 dark:bg-gray-900 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1">
                    <StatusBadge status={r.status} />
                    <span className="text-xs text-gray-400">{r.triggerType}</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-xs text-center mt-2">
                    <div><div className="font-bold text-gray-900 dark:text-white">{r.sourcesScanned}</div><div className="text-gray-400">Kaynak</div></div>
                    <div><div className="font-bold text-gray-900 dark:text-white">{r.itemsDiscovered}</div><div className="text-gray-400">Keşif</div></div>
                    <div><div className="font-bold text-gray-900 dark:text-white">{r.postsGenerated}</div><div className="text-gray-400">Üretim</div></div>
                    <div><div className="font-bold text-green-600">{r.postsPublished}</div><div className="text-gray-400">Yayın</div></div>
                  </div>
                  {r.errorMessage && <p className="text-xs text-red-500 mt-2">{r.errorMessage}</p>}
                  <div className="text-xs text-gray-400 mt-2">
                    {r.startedAt ? new Date(r.startedAt).toLocaleString('tr-TR') : ''} — {r.completedAt ? new Date(r.completedAt).toLocaleString('tr-TR') : 'devam ediyor'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Add Source Modal ────────────────────────────────

function AddSourceModal({
  automationId, onClose, onCreated,
}: {
  automationId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({ name: '', url: '', sourceType: 'rss', priority: 5, trustScore: 0.7 });

  const mutation = useMutation({
    mutationFn: (data: any) => adminApi({ url: '/admin/blog-automation/sources', method: 'POST', data }),
    onSuccess: () => { toast.success('Kaynak eklendi'); onCreated(); },
    onError: () => toast.error('Kaynak eklenemedi'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({ ...form, automationId, isActive: true });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md mx-4 shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Kaynak Ekle</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Kaynak Adı *</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              placeholder="Audiology Online Blog" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Feed URL *</label>
            <input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              placeholder="https://example.com/feed.xml" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Tür</label>
              <select value={form.sourceType} onChange={(e) => setForm({ ...form, sourceType: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
                <option value="rss">RSS</option>
                <option value="blog">Blog</option>
                <option value="sitemap">Sitemap</option>
                <option value="manual">Manuel</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Öncelik</label>
              <input type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value) })} min={1} max={10}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Güven</label>
              <input type="number" value={form.trustScore} onChange={(e) => setForm({ ...form, trustScore: parseFloat(e.target.value) })} min={0} max={1} step={0.1}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white" />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl">İptal</button>
            <button type="submit" disabled={mutation.isPending} className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50">
              {mutation.isPending ? 'Ekleniyor...' : 'Ekle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Social Config Modal ────────────────────────────────

function SocialConfigModal({
  connection, onClose, onSaved,
}: {
  connection: BlogSocialConnection;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    apiKey: '', apiSecret: '', accessToken: '',
    defaultHashtags: connection.defaultHashtags?.join(', ') || '',
    postTemplate: connection.postTemplate || '',
  });

  const mutation = useMutation({
    mutationFn: (data: any) => adminApi({ url: `/admin/blog-automation/social-connections/${connection.id}`, method: 'PUT', data }),
    onSuccess: () => { toast.success('Platform ayarları kaydedildi'); onSaved(); },
    onError: () => toast.error('Ayarlar kaydedilemedi'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {};
    if (form.apiKey) payload.apiKey = form.apiKey;
    if (form.apiSecret) payload.apiSecret = form.apiSecret;
    if (form.accessToken) payload.accessToken = form.accessToken;
    payload.defaultHashtags = form.defaultHashtags.split(',').map((h) => h.trim()).filter(Boolean);
    payload.postTemplate = form.postTemplate;
    mutation.mutate(payload);
  };

  const PlatformIcon = PLATFORM_ICONS[connection.platform] || Globe;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md mx-4 shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <PlatformIcon className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">{connection.platform} Ayarları</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">API Key</label>
            <input type="password" value={form.apiKey} onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
              placeholder={connection.hasApiKey ? '••••••••' : 'API anahtarını girin'}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">API Secret</label>
            <input type="password" value={form.apiSecret} onChange={(e) => setForm({ ...form, apiSecret: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Access Token</label>
            <input type="password" value={form.accessToken} onChange={(e) => setForm({ ...form, accessToken: e.target.value })}
              placeholder={connection.hasAccessToken ? '••••••••' : 'Token girin'}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Varsayılan Hashtagler (virgülle)</label>
            <input value={form.defaultHashtags} onChange={(e) => setForm({ ...form, defaultHashtags: e.target.value })}
              placeholder="#xear, #hearing, #audiology"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Post Şablonu</label>
            <textarea value={form.postTemplate} onChange={(e) => setForm({ ...form, postTemplate: e.target.value })} rows={3}
              placeholder="{{title}}\n\n{{excerpt}}\n\n{{url}}\n\n{{hashtags}}"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white" />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl">İptal</button>
            <button type="submit" disabled={mutation.isPending} className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50">
              {mutation.isPending ? 'Kaydediliyor...' : 'Kaydet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Create Tone Template Modal ────────────────────────────────

function CreateToneTemplateModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    name: '', description: '', sector: '', tone: 'professional', voice: 'authoritative',
    formalityLevel: 7, kolStyleReference: '', maxWordCount: 800, systemPrompt: '',
  });

  const mutation = useMutation({
    mutationFn: (data: any) => adminApi({ url: '/admin/blog-automation/tone-templates', method: 'POST', data }),
    onSuccess: () => { toast.success('Ton şablonu oluşturuldu'); onCreated(); },
    onError: () => toast.error('Şablon oluşturulamadı'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({ ...form, sector: form.sector || undefined });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md mx-4 my-10 shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Yeni Ton Şablonu</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Şablon Adı *</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              placeholder="Profesyonel Odyoloji" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Ton</label>
              <select value={form.tone} onChange={(e) => setForm({ ...form, tone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
                <option value="professional">Profesyonel</option>
                <option value="casual">Günlük</option>
                <option value="academic">Akademik</option>
                <option value="conversational">Sohbet</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Ses</label>
              <select value={form.voice} onChange={(e) => setForm({ ...form, voice: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
                <option value="authoritative">Otoriter</option>
                <option value="friendly">Samimi</option>
                <option value="expert">Uzman</option>
                <option value="neutral">Nötr</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Resmiyet (1-10)</label>
              <input type="number" value={form.formalityLevel} onChange={(e) => setForm({ ...form, formalityLevel: parseInt(e.target.value) })} min={1} max={10}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Max Kelime</label>
              <input type="number" value={form.maxWordCount} onChange={(e) => setForm({ ...form, maxWordCount: parseInt(e.target.value) })} min={100} max={3000}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Sektör (opsiyonel)</label>
            <select value={form.sector} onChange={(e) => setForm({ ...form, sector: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
              <option value="">Tüm Sektörler</option>
              {Object.entries(SECTOR_MAP).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">KOL Stil İlhamı</label>
            <textarea value={form.kolStyleReference} onChange={(e) => setForm({ ...form, kolStyleReference: e.target.value })} rows={2}
              placeholder="Kıdemli bir odyolog gibi, meslektaşlarına açıklayan profesyonel ama samimi bir üslup"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Özel Sistem Prompt (opsiyonel)</label>
            <textarea value={form.systemPrompt} onChange={(e) => setForm({ ...form, systemPrompt: e.target.value })} rows={3}
              placeholder="Bu şablona özel AI talimatları..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-white" />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl">İptal</button>
            <button type="submit" disabled={mutation.isPending || !form.name} className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50">
              {mutation.isPending ? 'Oluşturuluyor...' : 'Oluştur'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default BlogAutomationPage;
