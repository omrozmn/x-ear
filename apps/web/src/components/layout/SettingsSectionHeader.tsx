import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SettingsSectionHeaderProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function SettingsSectionHeader({
  title,
  description,
  icon,
  actions,
  className,
}: SettingsSectionHeaderProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[24px] border border-white/60 bg-white/80 p-5 shadow-[0_18px_60px_-30px_rgba(15,23,42,0.35)] ring-1 ring-black/5 backdrop-blur-xl dark:border-white/10 dark:bg-gray-900/70 dark:ring-white/10',
        className,
      )}
    >
      <div className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-blue-500/10 blur-3xl dark:bg-blue-400/10" />

      <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0 flex items-start gap-4">
          {icon ? (
            <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/70 bg-white/75 text-primary shadow-sm sm:flex dark:border-white/10 dark:bg-white/10">
              {icon}
            </div>
          ) : null}

          <div className="min-w-0">
            <h2 className="text-xl font-semibold tracking-tight text-gray-900 dark:text-white">
              {title}
            </h2>
            {description ? (
              <p className="mt-1 text-sm text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
        </div>

        {actions ? (
          <div className="flex flex-wrap items-center gap-2">
            {actions}
          </div>
        ) : null}
      </div>
    </div>
  );
}
