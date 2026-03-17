import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

type LocalizedLabel = string | {
  tr?: string;
  en?: string;
  [key: string]: string | undefined;
};

interface DesktopPageHeaderProps {
  leading?: ReactNode;
  title: string;
  description?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  eyebrow?: LocalizedLabel;
  className?: string;
  children?: ReactNode;
}

export function DesktopPageHeader({
  leading,
  title,
  description,
  icon,
  actions,
  eyebrow,
  className,
  children,
}: DesktopPageHeaderProps) {
  const { i18n } = useTranslation();
  const language = (i18n.resolvedLanguage || i18n.language || 'en').split('-')[0];
  const resolvedEyebrow = typeof eyebrow === 'string'
    ? eyebrow
    : eyebrow?.[language] ?? eyebrow?.tr ?? eyebrow?.en ?? Object.values(eyebrow ?? {}).find(Boolean);

  return (
    <section
      className={cn(
        'relative overflow-hidden rounded-[28px] border border-white/60 bg-white/75 shadow-[0_24px_80px_-32px_rgba(15,23,42,0.35)] ring-1 ring-black/5 backdrop-blur-xl dark:border-white/10 dark:bg-gray-900/70 dark:ring-white/10',
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/70 to-transparent" />
      <div className="pointer-events-none absolute -right-10 -top-16 h-40 w-40 rounded-full bg-blue-500/15 blur-3xl dark:bg-blue-400/10" />
      <div className="pointer-events-none absolute left-1/3 top-1/2 h-32 w-32 -trangray-y-1/2 rounded-full bg-cyan-400/10 blur-3xl dark:bg-cyan-300/10" />

      <div className="relative flex flex-col gap-4 px-5 py-5 md:px-6 md:py-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0 flex items-start gap-4">
            {icon ? (
              <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/70 bg-white/70 text-primary shadow-sm sm:flex dark:border-white/10 dark:bg-white/10">
                {icon}
              </div>
            ) : null}

            <div className="min-w-0">
              {leading ? (
                <div className="mb-3">
                  {leading}
                </div>
              ) : null}

              {resolvedEyebrow ? (
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/80/80">
                  {resolvedEyebrow}
                </div>
              ) : null}

              <h1 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-white md:text-3xl">
                {title}
              </h1>

              {description ? (
                <p className="mt-1.5 max-w-3xl text-sm text-muted-foreground md:text-[15px]">
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
