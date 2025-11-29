import React, { useState } from 'react';

interface Point { x: string | number; y: number }

interface Props {
  data: Point[];
  width?: number;
  height?: number;
  stroke?: string;
}

export const LineChartSimple: React.FC<Props> = ({ data = [], width = 560, height = 200, stroke = '#3b82f6' }) => {
  if (!data || data.length === 0) return <div className="text-gray-500">No data</div>;

  const [hover, setHover] = useState<{x:number,y:number,index:number}|null>(null);

  const left = 40; // space for Y axis labels
  const bottom = 28; // space for X labels
  const top = 10;
  const right = 10;

  const innerW = width - left - right;
  const innerH = height - top - bottom;

  const ys = data.map(d => Number(d.y || 0));
  const minY = Math.min(...ys, 0);
  const maxY = Math.max(...ys, 1);

  const scaleX = (i: number) => left + (i / (data.length - 1 || 1)) * innerW;
  const scaleY = (y: number) => top + innerH - ((y - minY) / (maxY - minY || 1)) * innerH;

  const points = data.map((d, i) => `${scaleX(i)},${scaleY(Number(d.y || 0))}`).join(' ');

  const yTicks = 4;
  const yValues = Array.from({length: yTicks + 1}, (_, i) => minY + (i / yTicks) * (maxY - minY));

  return (
    <div className="relative" style={{ width, height }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}
        onMouseLeave={() => setHover(null)}>
        {/* grid and Y axis labels */}
        {yValues.map((v, idx) => {
          const y = scaleY(v);
          return (
            <g key={idx}>
              <line x1={left} x2={width-right} y1={y} y2={y} stroke="#f3f4f6" strokeWidth={1} />
              <text x={left-6} y={y+4} fontSize={11} textAnchor="end" fill="#6b7280">{Math.round(v)}</text>
            </g>
          );
        })}

        {/* X axis labels */}
        {data.map((d, i) => {
          const x = scaleX(i);
          const label = String(d.x ?? i);
          return (
            <text key={i} x={x} y={height-6} fontSize={11} textAnchor="middle" fill="#9ca3af">{label}</text>
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
              onMouseEnter={(e) => setHover({ x: e.clientX, y: e.clientY, index: i })}
              onMouseMove={(e) => setHover({ x: e.clientX, y: e.clientY, index: i })}
            />
          );
        })}
      </svg>

      {/* Tooltip overlay */}
      {hover && (
        <div style={{ position: 'absolute', left: hover.x - 8 - window.scrollX, top: hover.y - 48 - window.scrollY, pointerEvents: 'none' }}>
          <div className="bg-white border rounded-md px-2 py-1 text-xs shadow">
            <div className="font-medium">{String(data[hover.index].x)}</div>
            <div className="text-gray-600">{data[hover.index].y}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LineChartSimple;
