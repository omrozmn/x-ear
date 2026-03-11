import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface DesktopPageHeaderProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  eyebrow?: string;
  className?: string;
  children?: ReactNode;
}

export function DesktopPageHeader({
  title,
  description,
  icon,
  actions,
  eyebrow,
  className,
  children,
}: DesktopPageHeaderProps) {
  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-[28px] border border-white/60 bg-white/75 shadow-[0_24px_80px_-32px_rgba(15,23,42,0.35)] ring-1 ring-black/5 backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/70 dark:ring-white/10',
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/70 to-transparent" />
      <div className="pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full bg-blue-500/15 blur-3xl dark:bg-blue-400/10" />
      <div className="pointer-events-none absolute left-1/3 top-1/2 h-32 w-32 -translate-y-1/2 rounded-full bg-cyan-400/10 blur-3xl dark:bg-cyan-300/10" />

      <div className="relative flex flex-col gap-4 px-5 py-5 md:px-6 md:py-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0 flex items-start gap-4">
            {icon ? (
              <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/70 bg-white/70 text-blue-600 shadow-sm sm:flex dark:border-white/10 dark:bg-white/10 dark:text-blue-300">
                {icon}
              </div>
            ) : null}

            <div className="min-w-0">
              {eyebrow ? (
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-blue-600/80 dark:text-blue-300/80">
                  {eyebrow}
                </div>
              ) : null}

              <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white md:text-3xl">
                {title}
              </h1>

              {description ? (
                <p className="mt-1.5 max-w-3xl text-sm text-slate-600 dark:text-slate-300 md:text-[15px]">
                  {description}
                </p>
              ) : null}
            </div>
          </div>

          {actions ? (
            <div className="flex flex-wrap items-center gap-2 md:gap-3">
              {actions}
            </div>
          ) : null}
        </div>

        {children}
      </div>
    </section>
  );
}
