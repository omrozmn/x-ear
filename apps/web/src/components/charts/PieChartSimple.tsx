import React from 'react';

interface Slice { label: string; value: number }

interface Props {
  data: Slice[];
  size?: number;
  centerLabel?: string;
  footerLabel?: string;
  valueFormatter?: (value: number) => string;
  detailFormatter?: (value: number) => string;
}

export const PieChartSimple: React.FC<Props> = ({
  data = [],
  size = 220,
  centerLabel = 'Toplam',
  footerLabel = 'Kayıt',
  valueFormatter = (value) => String(value),
  detailFormatter = (value) => String(value),
}) => {
  const normalizedData = data
    .map((item) => ({ ...item, value: Math.max(0, item.value) }))
    .filter((item) => item.value > 0);
  const total = normalizedData.reduce((sum, item) => sum + item.value, 0) || 1;
  const center = size / 2;
  const radius = center - 18;
  const strokeWidth = Math.max(18, Math.round(size * 0.12));
  const circumference = 2 * Math.PI * radius;
  const palette = ['#0ea5e9', '#14b8a6', '#f59e0b', '#f97316', '#f43f5e', '#8b5cf6', '#22c55e'];

  let offset = 0;
  const slices = normalizedData.map((item) => {
    const percentage = item.value / total;
    const segmentLength = circumference * percentage;
    const slice = {
      label: item.label,
      value: item.value,
      percentage: percentage * 100,
      dashArray: `${segmentLength} ${circumference - segmentLength}`,
      dashOffset: -offset,
    };
    offset += segmentLength;
    return slice;
  });

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
      <div className="relative mx-auto">
        <div className="absolute inset-4 rounded-full bg-gradient-to-br from-sky-200/40 via-white/20 to-emerald-200/30 blur-3xl dark:from-sky-500/20 dark:via-slate-900/10 dark:to-emerald-500/20" />
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="relative">
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="rgba(148, 163, 184, 0.16)"
            strokeWidth={strokeWidth}
          />
          {slices.map((slice, index) => (
            <circle
              key={slice.label}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={palette[index % palette.length]}
              strokeWidth={strokeWidth}
              strokeDasharray={slice.dashArray}
              strokeDashoffset={slice.dashOffset}
              strokeLinecap={slices.length === 1 ? 'butt' : 'round'}
              transform={`rotate(-90 ${center} ${center})`}
            />
          ))}
          <circle
            cx={center}
            cy={center}
            r={Math.max(0, radius - strokeWidth / 2 - 10)}
            fill="rgba(255,255,255,0.88)"
            className="dark:fill-slate-900/88"
          />
          <text x={center} y={center - 14} textAnchor="middle" className="fill-slate-400 dark:fill-slate-400 text-[11px] font-medium">
            {centerLabel}
          </text>
          <text x={center} y={center + 12} textAnchor="middle" className="fill-slate-900 dark:fill-white text-[28px] font-bold">
            {valueFormatter(normalizedData.reduce((sum, item) => sum + item.value, 0))}
          </text>
          <text x={center} y={center + 34} textAnchor="middle" className="fill-slate-500 dark:fill-slate-400 text-[10px] font-semibold uppercase tracking-[0.2em]">
            {footerLabel}
          </text>
        </svg>
      </div>

      <div className="min-w-[220px] space-y-2 text-sm">
        {slices.map((item, index) => (
          <div key={item.label} className="flex items-center gap-3 rounded-2xl border border-white/45 bg-white/45 px-3 py-3 backdrop-blur-md dark:border-white/10 dark:bg-slate-900/40">
            <span
              style={{ width: 12, height: 12, background: palette[index % palette.length], display: 'inline-block', borderRadius: 9999 }}
            />
            <div className="flex-1">
              <div className="font-medium text-slate-900 dark:text-white">{item.label}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">{detailFormatter(item.value)}</div>
            </div>
            <div className="rounded-full bg-slate-900/6 px-2 py-1 text-xs font-semibold text-slate-700 dark:bg-white/10 dark:text-slate-200">
              %{item.percentage.toFixed(0)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PieChartSimple;
