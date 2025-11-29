import React from 'react';

interface Slice { label: string; value: number }

interface Props {
  data: Slice[];
  size?: number;
}

export const PieChartSimple: React.FC<Props> = ({ data = [], size = 200 }) => {
  const total = data.reduce((s, d) => s + Math.max(0, d.value), 0) || 1;
  let acc = 0;
  const center = size / 2;
  const radius = center - 2;

  const slices = data.map((d, i) => {
    const start = (acc / total) * 2 * Math.PI - Math.PI / 2;
    acc += Math.max(0, d.value);
    const end = (acc / total) * 2 * Math.PI - Math.PI / 2;

    const x1 = center + radius * Math.cos(start);
    const y1 = center + radius * Math.sin(start);
    const x2 = center + radius * Math.cos(end);
    const y2 = center + radius * Math.sin(end);
    const large = end - start > Math.PI ? 1 : 0;
    const path = `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2} Z`;

    return { path, label: d.label, value: d.value };
  });

  const palette = ['#60a5fa', '#34d399', '#f59e0b', '#f97316', '#ef4444', '#a78bfa'];

  return (
    <div className="flex items-start" style={{ gap: 8 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {slices.map((s, i) => (
          <path key={i} d={s.path} fill={palette[i % palette.length]} stroke="#fff" strokeWidth={1} />
        ))}
      </svg>
      <div className="text-sm" style={{ minWidth: 120 }}>
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-3 mb-2">
            <span style={{ width: 12, height: 12, background: palette[i % palette.length], display: 'inline-block', borderRadius: 2 }} />
            <div className="flex-1">
              <div className="font-medium">{d.label}</div>
              <div className="text-xs text-gray-500">{d.value} ({((d.value/total)*100).toFixed(1)}%)</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PieChartSimple;
