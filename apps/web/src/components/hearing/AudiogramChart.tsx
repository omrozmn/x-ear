/**
 * Clinical-grade Audiogram Chart (SVG)
 *
 * Standards followed:
 * - ASHA (American Speech-Language-Hearing Association)
 * - BSA (British Society of Audiology)
 *
 * Symbols:
 *   Air conduction  — Right: O (red)   Left: X (blue)
 *   Bone conduction — Right: < (red)   Left: > (blue)
 *   Masked air      — Right: △ (red)   Left: □ (blue)
 *   Masked bone     — Right: [ (red)   Left: ] (blue)
 *   No response     — Arrow pointing down from symbol
 *
 * Axes:
 *   X = Frequency (Hz), logarithmic 125–8000
 *   Y = Hearing Level (dB HL), linear -10 to 120, top = better
 */
import React, { useMemo, useCallback, useRef } from 'react';

// ── Types ────────────────────────────────────────────────
export interface ThresholdData {
  [frequency: string]: number;
}

export interface AudiogramChartProps {
  rightEar?: ThresholdData;
  leftEar?: ThresholdData;
  rightBone?: ThresholdData;
  leftBone?: ThresholdData;
  /** Compact mode for list cards (smaller, no legend) */
  compact?: boolean;
  className?: string;
  /** Enable interactive mode — click to place/move threshold points */
  interactive?: boolean;
  /** Which ear/conduction is currently being edited */
  editingMode?: 'rightAir' | 'leftAir' | 'rightBone' | 'leftBone';
  /** Callback when a threshold is placed/moved via click */
  onThresholdChange?: (frequency: number, db: number, mode: 'rightAir' | 'leftAir' | 'rightBone' | 'leftBone') => void;
  /** Callback when a threshold is removed via right-click */
  onThresholdRemove?: (frequency: number, mode: 'rightAir' | 'leftAir' | 'rightBone' | 'leftBone') => void;
}

// ── Constants ────────────────────────────────────────────
const FREQUENCIES = [125, 250, 500, 1000, 2000, 3000, 4000, 6000, 8000];
const DB_MIN = -10;
const DB_MAX = 120;

const COLORS = {
  right: '#DC2626',    // red-600
  left: '#2563EB',     // blue-600
  grid: '#E5E7EB',     // gray-200
  gridMajor: '#D1D5DB', // gray-300
  zeroLine: '#9CA3AF', // gray-400
  text: '#6B7280',     // gray-500
  title: '#374151',    // gray-700
} as const;

// Hearing loss zones (dB HL ranges)
const ZONES = [
  { min: -10, max: 25,  color: '#DCFCE7', label: 'Normal' },
  { min: 25,  max: 40,  color: '#FEF9C3', label: 'Hafif' },
  { min: 40,  max: 55,  color: '#FED7AA', label: 'Orta' },
  { min: 55,  max: 70,  color: '#FDBA74', label: 'Orta-İleri' },
  { min: 70,  max: 90,  color: '#FECACA', label: 'İleri' },
  { min: 90,  max: 120, color: '#FCA5A5', label: 'Çok İleri' },
] as const;

// ── Component ────────────────────────────────────────────
const AudiogramChart: React.FC<AudiogramChartProps> = ({
  rightEar = {},
  leftEar = {},
  rightBone,
  leftBone,
  compact = false,
  className = '',
  interactive = false,
  editingMode = 'rightAir',
  onThresholdChange,
  onThresholdRemove,
}) => {
  const width = compact ? 320 : 600;
  const height = compact ? 220 : 500;
  const pad = compact
    ? { top: 20, right: 12, bottom: 20, left: 32 }
    : { top: 35, right: 30, bottom: 70, left: 50 };
  const chartW = width - pad.left - pad.right;
  const chartH = height - pad.top - pad.bottom;

  // Logarithmic X (frequency)
  const freqToX = (freq: number) => {
    const logMin = Math.log10(125);
    const logMax = Math.log10(8000);
    return pad.left + ((Math.log10(freq) - logMin) / (logMax - logMin)) * chartW;
  };

  // Linear Y (dB HL)
  const dbToY = (db: number) => {
    return pad.top + ((db - DB_MIN) / (DB_MAX - DB_MIN)) * chartH;
  };

  // Connect threshold points with a line
  const makePath = (thresholds: ThresholdData, color: string, dashed = false) => {
    const points = FREQUENCIES
      .filter(f => thresholds[String(f)] !== undefined)
      .map(f => ({ x: freqToX(f), y: dbToY(thresholds[String(f)]) }));
    if (points.length < 2) return null;
    const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
    return (
      <path
        d={d}
        stroke={color}
        strokeWidth={compact ? 1.5 : 2}
        fill="none"
        strokeDasharray={dashed ? '6,3' : undefined}
      />
    );
  };

  // Symbol size
  const r = compact ? 5 : 8;
  const fontSize = compact ? 6 : 9;

  // ── Render symbols at each frequency ───────────────────
  const renderAirSymbols = (thresholds: ThresholdData, ear: 'right' | 'left') => {
    const color = ear === 'right' ? COLORS.right : COLORS.left;
    return FREQUENCIES
      .filter(f => thresholds[String(f)] !== undefined)
      .map(f => {
        const cx = freqToX(f);
        const cy = dbToY(thresholds[String(f)]);
        if (ear === 'right') {
          // O symbol (circle)
          return (
            <circle
              key={`air-r-${f}`}
              cx={cx} cy={cy} r={r}
              stroke={color} strokeWidth={compact ? 1.5 : 2}
              fill="white"
            />
          );
        }
        // X symbol (cross)
        const s = r * 0.85;
        return (
          <g key={`air-l-${f}`}>
            <line x1={cx - s} y1={cy - s} x2={cx + s} y2={cy + s} stroke={color} strokeWidth={compact ? 1.5 : 2} />
            <line x1={cx + s} y1={cy - s} x2={cx - s} y2={cy + s} stroke={color} strokeWidth={compact ? 1.5 : 2} />
          </g>
        );
      });
  };

  const renderBoneSymbols = (thresholds: ThresholdData, ear: 'right' | 'left') => {
    const color = ear === 'right' ? COLORS.right : COLORS.left;
    return FREQUENCIES
      .filter(f => thresholds[String(f)] !== undefined)
      .map(f => {
        const cx = freqToX(f);
        const cy = dbToY(thresholds[String(f)]);
        const s = r * 0.7;
        if (ear === 'right') {
          // < bracket (right ear bone)
          return (
            <polyline
              key={`bone-r-${f}`}
              points={`${cx + s},${cy - s} ${cx - s},${cy} ${cx + s},${cy + s}`}
              stroke={color} strokeWidth={compact ? 1.5 : 2}
              fill="none"
            />
          );
        }
        // > bracket (left ear bone)
        return (
          <polyline
            key={`bone-l-${f}`}
            points={`${cx - s},${cy - s} ${cx + s},${cy} ${cx - s},${cy + s}`}
            stroke={color} strokeWidth={compact ? 1.5 : 2}
            fill="none"
          />
        );
      });
  };

  // ── PTA calculation ────────────────────────────────────
  const pta = useMemo(() => {
    const calc = (t: ThresholdData) => {
      const ptaFreqs = [500, 1000, 2000, 4000];
      const vals = ptaFreqs.map(f => t[String(f)]).filter((v): v is number => v !== undefined);
      return vals.length >= 1 ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
    };
    return { right: calc(rightEar), left: calc(leftEar) };
  }, [rightEar, leftEar]);

  // ── Interactive click handler ──────────────────────────
  const svgRef = useRef<SVGSVGElement>(null);

  const handleChartClick = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!interactive || !onThresholdChange || !svgRef.current) return;

    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;
    const svgX = (e.clientX - rect.left) * scaleX;
    const svgY = (e.clientY - rect.top) * scaleY;

    // Check if click is within chart area
    if (svgX < pad.left || svgX > pad.left + chartW || svgY < pad.top || svgY > pad.top + chartH) return;

    // Map X → nearest frequency (log scale)
    const logMin = Math.log10(125);
    const logMax = Math.log10(8000);
    const logFreq = logMin + ((svgX - pad.left) / chartW) * (logMax - logMin);
    const rawFreq = Math.pow(10, logFreq);
    // Snap to nearest standard frequency
    let nearestFreq = FREQUENCIES[0];
    let minDist = Infinity;
    for (const f of FREQUENCIES) {
      const dist = Math.abs(Math.log10(f) - Math.log10(rawFreq));
      if (dist < minDist) { minDist = dist; nearestFreq = f; }
    }

    // Map Y → dB HL (snap to 5 dB increments)
    const rawDb = DB_MIN + ((svgY - pad.top) / chartH) * (DB_MAX - DB_MIN);
    const snappedDb = Math.round(rawDb / 5) * 5;
    const clampedDb = Math.max(DB_MIN, Math.min(DB_MAX, snappedDb));

    onThresholdChange(nearestFreq, clampedDb, editingMode);
  }, [interactive, onThresholdChange, editingMode, width, height, pad, chartW, chartH]);

  // ── Interactive right-click handler (remove threshold) ─
  const handleContextMenu = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!interactive || !onThresholdRemove || !svgRef.current) return;

    e.preventDefault();

    const svg = svgRef.current;
    const rect = svg.getBoundingClientRect();
    const scaleX = width / rect.width;
    const scaleY = height / rect.height;
    const svgX = (e.clientX - rect.left) * scaleX;
    const svgY = (e.clientY - rect.top) * scaleY;

    if (svgX < pad.left || svgX > pad.left + chartW || svgY < pad.top || svgY > pad.top + chartH) return;

    // Find which threshold data belongs to current editing mode
    const dataMap: Record<string, ThresholdData> = {
      rightAir: rightEar,
      leftAir: leftEar,
      rightBone: rightBone ?? {},
      leftBone: leftBone ?? {},
    };
    const currentData = dataMap[editingMode];

    // Find closest existing point
    let closestFreq: number | null = null;
    let closestDist = Infinity;
    for (const f of FREQUENCIES) {
      if (currentData[String(f)] === undefined) continue;
      const px = freqToX(f);
      const py = dbToY(currentData[String(f)]);
      const dist = Math.sqrt((svgX - px) ** 2 + (svgY - py) ** 2);
      if (dist < closestDist) {
        closestDist = dist;
        closestFreq = f;
      }
    }

    // Only remove if right-clicked reasonably close to a point (within 25px in SVG coords)
    if (closestFreq !== null && closestDist < 25) {
      onThresholdRemove(closestFreq, editingMode);
    }
  }, [interactive, onThresholdRemove, editingMode, width, height, pad, chartW, chartH, rightEar, leftEar, rightBone, leftBone, freqToX, dbToY]);

  // dB label intervals
  const dbStep = compact ? 20 : 10;
  const dbLabels = [];
  for (let db = DB_MIN; db <= DB_MAX; db += dbStep) dbLabels.push(db);

  return (
    <div className={className}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className={`w-full h-auto ${interactive ? 'cursor-crosshair' : ''}`}
        style={{ maxWidth: width }}
        onClick={handleChartClick}
        onContextMenu={handleContextMenu}
      >
        {/* Background */}
        <rect x={0} y={0} width={width} height={height} fill="white" rx={compact ? 6 : 8} />

        {/* Hearing loss zones */}
        {ZONES.map(z => (
          <rect
            key={z.label}
            x={pad.left} y={dbToY(z.min)}
            width={chartW} height={dbToY(z.max) - dbToY(z.min)}
            fill={z.color} opacity={0.25}
          />
        ))}

        {/* Grid — horizontal (dB) */}
        {dbLabels.map(db => (
          <g key={`h-${db}`}>
            <line
              x1={pad.left} y1={dbToY(db)}
              x2={pad.left + chartW} y2={dbToY(db)}
              stroke={db === 0 ? COLORS.zeroLine : db % 20 === 0 ? COLORS.gridMajor : COLORS.grid}
              strokeWidth={db === 0 ? 1.2 : 0.5}
            />
            <text
              x={pad.left - 4} y={dbToY(db) + 3}
              textAnchor="end" fontSize={fontSize} fill={COLORS.text}
            >
              {db}
            </text>
          </g>
        ))}

        {/* Grid — vertical (frequency) */}
        {FREQUENCIES.map(f => (
          <g key={`v-${f}`}>
            <line
              x1={freqToX(f)} y1={pad.top}
              x2={freqToX(f)} y2={pad.top + chartH}
              stroke={[250, 500, 1000, 2000, 4000].includes(f) ? COLORS.gridMajor : COLORS.grid}
              strokeWidth={0.5}
            />
            <text
              x={freqToX(f)} y={pad.top + chartH + (compact ? 12 : 16)}
              textAnchor="middle" fontSize={fontSize} fill={COLORS.text}
            >
              {f >= 1000 ? `${f / 1000}k` : f}
            </text>
          </g>
        ))}

        {/* Zone labels (full mode only) */}
        {!compact && ZONES.map(z => (
          <text
            key={`zl-${z.label}`}
            x={pad.left + chartW - 4}
            y={dbToY((z.min + z.max) / 2) + 3}
            textAnchor="end" fontSize={7} fill={COLORS.text} opacity={0.6}
          >
            {z.label}
          </text>
        ))}

        {/* Axis titles (full mode only) */}
        {!compact && (
          <>
            <text
              x={width / 2} y={14}
              textAnchor="middle" fontSize={12} fill={COLORS.title} fontWeight="600"
            >
              Odyogram
            </text>
            <text
              x={12} y={pad.top + chartH / 2}
              textAnchor="middle" fontSize={10} fill={COLORS.text}
              transform={`rotate(-90, 12, ${pad.top + chartH / 2})`}
            >
              İşitme Seviyesi (dB HL)
            </text>
            <text
              x={width / 2} y={height - 6}
              textAnchor="middle" fontSize={10} fill={COLORS.text}
            >
              Frekans (Hz)
            </text>
          </>
        )}

        {/* Chart border */}
        <rect
          x={pad.left} y={pad.top}
          width={chartW} height={chartH}
          fill="none" stroke={COLORS.gridMajor} strokeWidth={1}
        />

        {/* Data lines */}
        {makePath(rightEar, COLORS.right)}
        {makePath(leftEar, COLORS.left)}
        {rightBone && makePath(rightBone, COLORS.right, true)}
        {leftBone && makePath(leftBone, COLORS.left, true)}

        {/* Data symbols */}
        {renderAirSymbols(rightEar, 'right')}
        {renderAirSymbols(leftEar, 'left')}
        {rightBone && renderBoneSymbols(rightBone, 'right')}
        {leftBone && renderBoneSymbols(leftBone, 'left')}

        {/* Legend (full mode only) */}
        {!compact && (
          <g transform={`translate(${pad.left + 8}, ${height - 18})`}>
            {/* Right air */}
            <circle cx={0} cy={0} r={5} stroke={COLORS.right} strokeWidth={1.5} fill="white" />
            <text x={10} y={3} fontSize={8} fill={COLORS.title}>Sag (hava)</text>
            {/* Left air */}
            <g transform="translate(80, 0)">
              <line x1={-4} y1={-4} x2={4} y2={4} stroke={COLORS.left} strokeWidth={1.5} />
              <line x1={4} y1={-4} x2={-4} y2={4} stroke={COLORS.left} strokeWidth={1.5} />
              <text x={10} y={3} fontSize={8} fill={COLORS.title}>Sol (hava)</text>
            </g>
            {/* Right bone */}
            {rightBone && (
              <g transform="translate(160, 0)">
                <polyline points="4,-4 -4,0 4,4" stroke={COLORS.right} strokeWidth={1.5} fill="none" />
                <text x={10} y={3} fontSize={8} fill={COLORS.title}>Sag (kemik)</text>
              </g>
            )}
            {/* Left bone */}
            {leftBone && (
              <g transform="translate(250, 0)">
                <polyline points="-4,-4 4,0 -4,4" stroke={COLORS.left} strokeWidth={1.5} fill="none" />
                <text x={10} y={3} fontSize={8} fill={COLORS.title}>Sol (kemik)</text>
              </g>
            )}
          </g>
        )}
      </svg>

      {/* PTA summary below chart */}
      {!compact && (pta.right !== null || pta.left !== null) && (
        <div className="flex gap-3 mt-6">
          {pta.right !== null && (
            <div className="flex-1 p-2.5 bg-red-50 dark:bg-red-900/15 rounded-lg border border-red-200 dark:border-red-800 text-center">
              <div className="text-[10px] font-medium text-red-600 dark:text-red-400 uppercase tracking-wider">Sag PTA</div>
              <div className="text-lg font-bold text-red-700 dark:text-red-300">{pta.right} dB</div>
              <div className="text-[10px] text-red-500 dark:text-red-400">
                {ZONES.find(z => pta.right! >= z.min && pta.right! < z.max)?.label ?? ''}
              </div>
            </div>
          )}
          {pta.left !== null && (
            <div className="flex-1 p-2.5 bg-blue-50 dark:bg-blue-900/15 rounded-lg border border-blue-200 dark:border-blue-800 text-center">
              <div className="text-[10px] font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wider">Sol PTA</div>
              <div className="text-lg font-bold text-blue-700 dark:text-blue-300">{pta.left} dB</div>
              <div className="text-[10px] text-blue-500 dark:text-blue-400">
                {ZONES.find(z => pta.left! >= z.min && pta.left! < z.max)?.label ?? ''}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AudiogramChart;
