/**
 * Noah Duplicates Center
 * Mükerrer kayıtları görüntüle, birleştir veya reddet
 */

import React, { useState } from 'react';
import { Button, Card } from '@x-ear/ui-web';
import { useToastHelpers } from '@x-ear/ui-web';
import {
  Users, Merge, XCircle, ChevronLeft, ChevronRight,
  AlertTriangle, CheckCircle, Clock,
  Phone, Mail, Calendar, Hash, Loader2,
} from 'lucide-react';
import {
  useDuplicates,
  useResolveDuplicate,
} from '../../api/noah-import';
import type { PossibleDuplicate } from '../../api/noah-import/types';

// ── Status Badge ─────────────────────────────────────────
function DuplicateStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    pending: {
      label: 'Bekliyor',
      color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      icon: <Clock className="w-3 h-3" />,
    },
    merged: {
      label: 'Birleştirildi',
      color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      icon: <CheckCircle className="w-3 h-3" />,
    },
    dismissed: {
      label: 'Reddedildi',
      color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
      icon: <XCircle className="w-3 h-3" />,
    },
  };

  const c = config[status] || config.pending;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${c.color}`}>
      {c.icon}
      {c.label}
    </span>
  );
}

// ── Match Score Bar ──────────────────────────────────────
function MatchScoreBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium text-gray-600 dark:text-gray-400 w-8">{pct}%</span>
    </div>
  );
}

// ── Patient Compare Card ─────────────────────────────────
function PatientCompareCard({
  title,
  patient,
  highlight,
}: {
  title: string;
  patient: Record<string, unknown>;
  highlight?: boolean;
}) {
  const fields = [
    { key: 'firstName', label: 'Ad', icon: <Users className="w-3 h-3" /> },
    { key: 'lastName', label: 'Soyad', icon: <Users className="w-3 h-3" /> },
    { key: 'phone', label: 'Telefon', icon: <Phone className="w-3 h-3" /> },
    { key: 'email', label: 'E-posta', icon: <Mail className="w-3 h-3" /> },
    { key: 'dob', label: 'Doğum Tarihi', icon: <Calendar className="w-3 h-3" /> },
    { key: 'nationalId', label: 'TC Kimlik No', icon: <Hash className="w-3 h-3" /> },
  ];

  return (
    <div className={`p-4 rounded-xl border ${
      highlight
        ? 'border-blue-300 bg-blue-50/50 dark:border-blue-700 dark:bg-blue-900/10'
        : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
    }`}>
      <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3">
        {title}
      </h4>
      <div className="space-y-2">
        {fields.map(({ key, label, icon }) => {
          const value = patient?.[key];
          if (!value) return null;
          return (
            <div key={key} className="flex items-center gap-2 text-sm">
              <span className="text-gray-400">{icon}</span>
              <span className="text-gray-500 dark:text-gray-400 w-24">{label}:</span>
              <span className="font-medium text-gray-900 dark:text-white">{String(value)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Duplicate Row ────────────────────────────────────────
function DuplicateRow({
  duplicate,
  onMerge,
  onDismiss,
  isResolving,
}: {
  duplicate: PossibleDuplicate;
  onMerge: (id: string) => void;
  onDismiss: (id: string) => void;
  isResolving: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      {/* Summary Row */}
      <button
        data-allow-raw="true"
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-4">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <div className="text-left">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {duplicate.existingPatient?.firstName} {duplicate.existingPatient?.lastName}
              <span className="text-gray-400 mx-2">↔</span>
              {duplicate.importedPatient?.firstName} {duplicate.importedPatient?.lastName}
            </p>
            <div className="flex items-center gap-3 mt-1">
              <MatchScoreBar score={duplicate.matchScore || 0} />
              <span className="text-xs text-gray-500">
                {duplicate.matchReason || 'Benzer kayıt'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <DuplicateStatusBadge status={duplicate.status} />
          <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`} />
        </div>
      </button>

      {/* Expanded Details */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-gray-100 dark:border-gray-700">
          <div className="grid grid-cols-2 gap-4 pt-4">
            <PatientCompareCard
              title="Mevcut Kayıt (CRM)"
              patient={duplicate.existingPatient || {}}
            />
            <PatientCompareCard
              title="Yeni Kayıt (Noah)"
              patient={duplicate.importedPatient || {}}
              highlight
            />
          </div>

          {duplicate.status === 'pending' && (
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDismiss(duplicate.id)}
                disabled={isResolving}
              >
                <XCircle className="w-4 h-4 mr-1" />
                Ayrı Tut
              </Button>
              <Button
                size="sm"
                onClick={() => onMerge(duplicate.id)}
                disabled={isResolving}
              >
                {isResolving ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <Merge className="w-4 h-4 mr-1" />
                )}
                Birleştir
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────
export default function NoahDuplicatesCenter() {
  const { success: showSuccess, error: showError } = useToastHelpers();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string | undefined>('pending');

  const { data, isLoading } = useDuplicates(page, statusFilter);
  const duplicates = data?.data || [];
  const meta = data?.meta;

  const resolveMutation = useResolveDuplicate();

  const handleMerge = async (id: string) => {
    try {
      await resolveMutation.mutateAsync({ id, action: 'merge', keepExisting: true });
      showSuccess('Kayıtlar birleştirildi');
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : 'Birleştirme hatası');
    }
  };

  const handleDismiss = async (id: string) => {
    try {
      await resolveMutation.mutateAsync({ id, action: 'dismiss' });
      showSuccess('Kayıt ayrı tutuldu');
    } catch (err: unknown) {
      showError(err instanceof Error ? err.message : 'İşlem hatası');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-500" />
            Mükerrer Kayıt Merkezi
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Noah içe aktarımından gelen olası mükerrer kayıtları inceleyin
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          {[
            { value: 'pending', label: 'Bekleyen' },
            { value: undefined, label: 'Tümü' },
            { value: 'merged', label: 'Birleştirilen' },
            { value: 'dismissed', label: 'Reddedilen' },
          ].map(({ value, label }) => (
            <button
              data-allow-raw="true"
              key={label}
              onClick={() => { setStatusFilter(value); setPage(1); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                statusFilter === value
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-gray-500">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Yükleniyor...
        </div>
      ) : duplicates.length === 0 ? (
        <Card className="p-12 text-center">
          <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
          <h3 className="text-base font-medium text-gray-900 dark:text-white mb-1">
            {statusFilter === 'pending' ? 'Bekleyen mükerrer kayıt yok' : 'Kayıt bulunamadı'}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {statusFilter === 'pending'
              ? 'Tüm mükerrer kayıtlar çözümlendi.'
              : 'Seçilen filtreye uygun kayıt yok.'}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {duplicates.map((dup: PossibleDuplicate) => (
            <DuplicateRow
              key={dup.id}
              duplicate={dup}
              onMerge={handleMerge}
              onDismiss={handleDismiss}
              isResolving={resolveMutation.isPending}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {meta && (meta.totalPages || 0) > 1 && (
        <div className="flex items-center justify-between pt-4">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Toplam {meta.total || 0} kayıt
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {page} / {meta.totalPages || 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => p + 1)}
              disabled={page >= (meta.totalPages || 1)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
