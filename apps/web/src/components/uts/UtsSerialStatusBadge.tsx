import { ShieldCheck, ShieldAlert, ShieldQuestion, Clock, ShieldOff } from 'lucide-react';
import type { UtsSerialStatus } from '@/services/uts/uts.service';

export type UtsDisplayStatus = UtsSerialStatus | 'unverified' | 'unregistered';

const statusMap: Record<UtsDisplayStatus, { label: string; className: string; icon: typeof ShieldCheck }> = {
  owned: {
    label: 'UTS Bizde',
    className: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    icon: ShieldCheck,
  },
  pending_receipt: {
    label: 'UTS Alma Bekliyor',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: Clock,
  },
  not_owned: {
    label: 'UTS Bizde Degil',
    className: 'bg-rose-100 text-rose-700 border-rose-200',
    icon: ShieldAlert,
  },
  unregistered: {
    label: 'UTS Kayıt Yok',
    className: 'bg-orange-50 text-orange-600 border-orange-200',
    icon: ShieldOff,
  },
  unverified: {
    label: 'UTS Sorgulanmadi',
    className: 'bg-slate-50 text-slate-500 border-slate-200',
    icon: ShieldQuestion,
  },
};

interface UtsSerialStatusBadgeProps {
  status: UtsDisplayStatus;
  onClick?: () => void;
}

export function UtsSerialStatusBadge({ status, onClick }: UtsSerialStatusBadgeProps) {
  const config = statusMap[status];
  const Icon = config.icon;

  if (onClick) {
    return (
      <button
        data-allow-raw="true"
        type="button"
        onClick={onClick}
        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold transition hover:opacity-85 ${config.className}`}
      >
        <Icon className="h-3 w-3" />
        {config.label}
      </button>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${config.className}`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}

export default UtsSerialStatusBadge;
