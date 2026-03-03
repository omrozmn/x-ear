import React, { useState } from 'react';

interface Point { x: string | number; y: number }

interface Props {
  data: Point[];
  width?: number;
  height?: number;
  stroke?: string;
}

export const LineChartSimple: React.FC<Props> = ({ data = [], width = 560, height = 200, stroke = '#3b82f6' }) => {
  const [hover, setHover] = useState<{ x: number, y: number, index: number } | null>(null);

  // Early return after hooks
  if (!data || data.length === 0) return <div className="text-gray-500">No data</div>;

  const left = 60; // increased space for Y axis labels
  const bottom = 32; // space for X labels
  const top = 10;
  const right = 20;

  const innerW = width - left - right;
  const innerH = height - top - bottom;

  const ys = data.map(d => Number(d.y || 0));
  const minY = Math.min(...ys, 0);
  const maxY = Math.max(...ys, 1);

  const scaleX = (i: number) => left + (i / (data.length - 1 || 1)) * innerW;
  const scaleY = (y: number) => top + innerH - ((y - minY) / (maxY - minY || 1)) * innerH;

  const points = data.map((d, i) => `${scaleX(i)},${scaleY(Number(d.y || 0))}`).join(' ');

  const yTicks = 4;
  const yValues = Array.from({ length: yTicks + 1 }, (_, i) => minY + (i / yTicks) * (maxY - minY));

  const formatYAxis = (v: number) => {
    return new Intl.NumberFormat('tr-TR', { notation: 'compact', maximumFractionDigits: 1 }).format(v);
  };

  return (
    <div className="relative" style={{ width, height }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}
        onMouseLeave={() => setHover(null)}>
        {/* grid and Y axis labels */}
        {yValues.map((v, idx) => {
          const y = scaleY(v);
          return (
            <g key={idx}>
              <line x1={left} x2={width - right} y1={y} y2={y} stroke="#f3f4f6" strokeWidth={1} />
              <text x={left - 8} y={y + 4} fontSize={11} textAnchor="end" fill="#6b7280">{formatYAxis(v)}</text>
            </g>
          );
        })}

        {/* X axis labels */}
        {data.map((d, i) => {
          // If too many points, only show a subset to prevent overlap
          const step = Math.ceil(data.length / 8);
          // Always show the first and last, and evenly spaced labels in between
          if (data.length > 8 && i !== 0 && i !== data.length - 1 && i % step !== 0) return null;

          const x = scaleX(i);
          const label = String(d.x ?? i);

          // Format label if it's too long
          const formattedLabel = label.length > 10 ? label.substring(0, 8) + '...' : label;

          return (
            <text key={i} x={x} y={height - 8} fontSize={11} textAnchor="middle" fill="#9ca3af">{formattedLabel}</text>
          );
        })}

        {/* polyline */}
        <polyline
          fill="none"
          stroke={stroke}
          strokeWidth={2}
          points={points}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* circles with hover handlers */}
        {data.map((d, i) => {
          const x = scaleX(i);
          const y = scaleY(Number(d.y || 0));
          return (
            <circle key={i}
              cx={x}
              cy={y}
              r={4}
              fill={stroke}
              onMouseEnter={(e) => {
                const rect = (e.target as SVGCircleElement).parentElement?.getBoundingClientRect();
                if (rect) {
                  setHover({ x: e.clientX - rect.left, y: e.clientY - rect.top, index: i });
                }
              }}
              onMouseMove={(e) => {
                const rect = (e.target as SVGCircleElement).parentElement?.getBoundingClientRect();
                if (rect) {
                  setHover({ x: e.clientX - rect.left, y: e.clientY - rect.top, index: i });
                }
              }}
            />
          );
        })}
      </svg>

      {/* Tooltip overlay */}
      {hover && hover.index < data.length && (
        <div style={{ position: 'absolute', left: hover.x + 10, top: hover.y - 30, pointerEvents: 'none', zIndex: 50 }}>
          <div className="bg-white border rounded-md px-3 py-2 text-xs shadow-lg">
            <div className="font-semibold text-gray-900 mb-1">{String(data[hover.index].x)}</div>
            <div className="text-blue-600 font-medium whitespace-nowrap">
              {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(Number(data[hover.index].y))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LineChartSimple;
