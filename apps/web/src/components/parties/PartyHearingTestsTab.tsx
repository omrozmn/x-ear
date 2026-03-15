import React, { useState, useCallback } from 'react';
import { Badge } from '@x-ear/ui-web';
import { Activity, AlertCircle, Calendar, ChevronDown, ChevronUp, Headphones, Plus, Zap, Package, CheckCircle, XCircle, BarChart3 } from 'lucide-react';
import AudiogramChart, { type ThresholdData } from '../hearing/AudiogramChart';
import AudiogramThresholdModal from '../hearing/AudiogramThresholdModal';
import {
  usePartyHearingTests,
  type PartyHearingTest,
  type DeviceRecommendationResult,
  type RemTargetsResult,
  type RemFrequencyTarget,
  type RemEarVerification,
  type RemMeasurementResult,
} from '../../hooks/party/usePartyHearingTests';

interface PartyHearingTestsTabProps {
  partyId: string;
}

function parseResults(test: PartyHearingTest): {
  rightEar?: ThresholdData;
  leftEar?: ThresholdData;
  rightBone?: ThresholdData;
  leftBone?: ThresholdData;
  deviceBrand?: string;
  deviceModel?: string;
  deviceSerial?: string;
  deviceCategory?: string;
  deviceEar?: string;
} {
  const r = test.results ?? {};
  if (test.testType === 'audiometry') {
    return {
      rightEar: r.rightEar as ThresholdData | undefined,
      leftEar: r.leftEar as ThresholdData | undefined,
      rightBone: r.rightBone as ThresholdData | undefined,
      leftBone: r.leftBone as ThresholdData | undefined,
    };
  }
  return {
    deviceBrand: r.deviceBrand as string | undefined,
    deviceModel: r.deviceModel as string | undefined,
    deviceSerial: r.deviceSerial as string | undefined,
    deviceCategory: r.deviceCategory as string | undefined,
    deviceEar: r.deviceEar as string | undefined,
  };
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function AudiometryCard({ test, isExpanded, onToggle, onFetchRecommendations, onFetchRemTargets, onSaveRem, onFetchRem }: {
  test: PartyHearingTest;
  isExpanded: boolean;
  onToggle: () => void;
  onFetchRecommendations: (testId: string) => Promise<DeviceRecommendationResult | null>;
  onFetchRemTargets: (testId: string, inputLevel?: number, experienced?: boolean) => Promise<RemTargetsResult | null>;
  onSaveRem: (testId: string, payload: { rem: Record<string, unknown> }) => Promise<RemMeasurementResult | null>;
  onFetchRem: (testId: string) => Promise<RemMeasurementResult['rem'] | null>;
}) {
  const { rightEar, leftEar, rightBone, leftBone } = parseResults(test);
  const hasData = rightEar || leftEar;
  const [recs, setRecs] = useState<DeviceRecommendationResult | null>(null);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [remTargets, setRemTargets] = useState<RemTargetsResult | null>(null);
  const [remOpen, setRemOpen] = useState(false);
  const [loadingRem, setLoadingRem] = useState(false);
  const [remError, setRemError] = useState<string | null>(null);

  const handleLoadRecs = useCallback(async () => {
    if (recs) { setRecs(null); return; }
    setLoadingRecs(true);
    const result = await onFetchRecommendations(test.id);
    setRecs(result);
    setLoadingRecs(false);
  }, [recs, test.id, onFetchRecommendations]);

  const handleToggleRem = useCallback(async () => {
    if (remOpen) { setRemOpen(false); return; }
    setLoadingRem(true);
    setRemError(null);
    try {
      const result = await onFetchRemTargets(test.id, 65, true);
      if (result) {
        setRemTargets(result);
        setRemOpen(true);
      } else {
        setRemError('REM hedefleri yuklenemedi. Konsolu kontrol edin.');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Bilinmeyen hata';
      console.error('REM targets error:', err);
      setRemError('REM hatasi: ' + msg);
    } finally {
      setLoadingRem(false);
    }
  }, [remOpen, test.id, onFetchRemTargets]);

  return (
    <div className="border rounded-2xl overflow-hidden">
        <button
          data-allow-raw="true"
          onClick={onToggle}
          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors text-left"
        >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center">
            <Activity className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h4 className="font-medium text-gray-900 text-sm">Odyometri</h4>
            <p className="text-xs text-gray-500">{formatDate(test.testDate)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {test.conductedBy && (
            <span className="text-xs text-gray-500">{test.conductedBy}</span>
          )}
          <Badge variant="default">Tamamlandı</Badge>
          {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </button>

      {isExpanded && (
        <div className="border-t p-4 space-y-3">
          {hasData ? (
            <AudiogramChart
              rightEar={rightEar ?? {}}
              leftEar={leftEar ?? {}}
              rightBone={rightBone}
              leftBone={leftBone}
            />
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">Odyogram verisi bulunamadi.</p>
          )}

          {/* Action buttons */}
          {hasData && (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                data-allow-raw="true"
                onClick={handleLoadRecs}
                disabled={loadingRecs}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs border rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <Zap className="w-3.5 h-3.5" />
                {loadingRecs ? 'Yukleniyor...' : recs ? 'Onerileri Gizle' : 'Uyumlu Cihaz Oner'}
              </button>
              <button
                data-allow-raw="true"
                onClick={handleToggleRem}
                disabled={loadingRem}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs border rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <BarChart3 className="w-3.5 h-3.5" />
                {loadingRem ? 'Yukleniyor...' : remOpen ? 'REM Kapat' : 'REM Dogrulama'}
              </button>
              {remError && (
                <span className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {remError}
                </span>
              )}
            </div>
          )}

          {/* Recommendation results */}
          {recs && (
            <div className="border rounded-xl p-3 bg-gray-50 space-y-3">
              <div className="flex items-center justify-between">
                <h5 className="text-xs font-medium text-gray-700">Cihaz Onerileri</h5>
                <div className="flex items-center gap-2">
                  {recs.audiogramConfig && recs.audiogramConfig.config !== 'unknown' && (
                    <Badge variant="secondary">
                      {recs.audiogramConfig.configTr}
                    </Badge>
                  )}
                  {recs.lossLevel && (
                    <Badge variant="secondary">
                      {recs.lossLevel.labelTr} ({recs.worsePta} dB PTA)
                    </Badge>
                  )}
                </div>
              </div>

              {recs.guidelines && (
                <p className="text-[11px] text-gray-500">{recs.guidelines}</p>
              )}

              {/* Device type suitability with recommended/suitable labels */}
              {recs.suitableStyles && recs.suitableStyles.length > 0 && (
                <div className="flex gap-1.5 flex-wrap">
                  {recs.suitableStyles.map(s => (
                    <span
                      key={s.type}
                      className={`text-[10px] px-2 py-0.5 rounded-full ${
                        s.suitability === 'recommended'
                          ? 'bg-green-50 text-green-700 border border-green-200'
                          : 'bg-blue-50 text-blue-700'
                      }`}
                    >
                      {s.label} ({s.suitabilityTr})
                    </span>
                  ))}
                </div>
              )}

              {/* Coupling (dome/earmold/vent) recommendations */}
              {recs.coupling && (
                <div className="border rounded-lg bg-white p-3 space-y-2">
                  <h6 className="text-[11px] font-medium text-gray-700">Kalip ve Vent Onerisi</h6>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {/* Dome/earmold */}
                    <div className="p-2 bg-gray-50 rounded-lg">
                      <p className="text-[10px] text-gray-500 mb-0.5">Kubbe / Kalip Tipi</p>
                      {recs.coupling.domes.length > 0 ? (
                        <div className="space-y-0.5">
                          {recs.coupling.domes.map((d, i) => (
                            <p key={d.type} className={`text-[11px] ${i === 0 ? 'font-medium text-gray-900' : 'text-gray-600'}`}>
                              {i === 0 ? '' : 'veya '}{d.labelTr}
                            </p>
                          ))}
                        </div>
                      ) : recs.coupling.earmold ? (
                        <p className="text-[11px] font-medium text-gray-900">{recs.coupling.earmold.labelTr}</p>
                      ) : (
                        <p className="text-[11px] text-gray-400">-</p>
                      )}
                      {recs.coupling.domes.length > 0 && recs.coupling.earmold && (
                        <p className="text-[10px] text-gray-500 mt-0.5">Alternatif: {recs.coupling.earmold.labelTr}</p>
                      )}
                    </div>

                    {/* Vent */}
                    <div className="p-2 bg-gray-50 rounded-lg">
                      <p className="text-[10px] text-gray-500 mb-0.5">Vent Boyutu</p>
                      <p className="text-[11px] font-medium text-gray-900">{recs.coupling.vent.labelTr}</p>
                      <p className="text-[10px] text-gray-500">{recs.coupling.vent.description}</p>
                    </div>

                    {/* Vent size indicator */}
                    <div className="p-2 bg-gray-50 rounded-lg">
                      <p className="text-[10px] text-gray-500 mb-0.5">Vent Cap (mm)</p>
                      <p className="text-[11px] font-medium text-gray-900">{recs.coupling.vent.sizeMm} mm</p>
                    </div>
                  </div>

                  {/* Clinical notes */}
                  <p className="text-[10px] text-gray-500">{recs.coupling.notes}</p>
                  {recs.coupling.configNote && (
                    <p className="text-[10px] text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                      {recs.coupling.configNote}
                    </p>
                  )}
                </div>
              )}

              {recs.recommendations.length > 0 ? (
                <div className="space-y-2">
                  {recs.recommendations.slice(0, 6).map(rec => (
                    <div key={rec.inventoryId} className="flex items-center justify-between p-2.5 bg-white rounded-lg border">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center">
                          <Headphones className="w-4 h-4 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-900">{rec.brand} {rec.model || rec.name}</p>
                          <p className="text-[10px] text-gray-500">
                            {rec.deviceTypeLabel}
                            {rec.fittingRangeMin != null && rec.fittingRangeMax != null
                              ? ` / ${rec.fittingRangeMin}-${rec.fittingRangeMax} dB HL`
                              : ''}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1.5">
                          {rec.matchQuality === 'exact' && (
                            <Badge variant={rec.suitability === 'recommended' ? 'success' : 'default'}>
                              {rec.suitabilityTr || 'Tam Uyum'}
                            </Badge>
                          )}
                          {rec.matchQuality === 'style' && rec.suitabilityTr && (
                            <Badge variant="secondary">{rec.suitabilityTr}</Badge>
                          )}
                          <span className="flex items-center gap-0.5 text-[10px] text-gray-500">
                            <Package className="w-3 h-3" />
                            {rec.availableStock}
                          </span>
                        </div>
                        {rec.price != null && (
                          <p className="text-[10px] text-gray-400 mt-0.5">{rec.price.toLocaleString('tr-TR')} TL</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-500 text-center py-2">Envanterde uyumlu cihaz bulunamadi.</p>
              )}
            </div>
          )}

          {/* REM Panel - rendered full-width below recommendations */}
          {remOpen && remTargets && (
            <RemPanel
              testId={test.id}
              targets={remTargets}
              onSaveRem={onSaveRem}
              onFetchRem={onFetchRem}
              onClose={() => setRemOpen(false)}
            />
          )}

          {test.notes && (
            <div className="p-3 bg-gray-50 rounded-xl">
              <p className="text-xs text-gray-500 font-medium mb-1">Notlar</p>
              <p className="text-sm text-gray-700">{test.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* Compact chart preview when collapsed */}
      {!isExpanded && hasData && (
        <div className="border-t px-4 py-2">
          <AudiogramChart
            rightEar={rightEar ?? {}}
            leftEar={leftEar ?? {}}
            rightBone={rightBone}
            leftBone={leftBone}
            compact
          />
        </div>
      )}
    </div>
  );
}

function FittingCard({ test }: { test: PartyHearingTest }) {
  const { deviceBrand, deviceModel, deviceSerial, deviceCategory, deviceEar } = parseResults(test);

  const earLabel = deviceEar === 'right' ? 'Sag' : deviceEar === 'left' ? 'Sol' : deviceEar === 'both' ? 'Bilateral' : deviceEar ?? '-';

  return (
    <div className="border rounded-2xl p-4">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 bg-purple-50 rounded-lg flex items-center justify-center">
          <Headphones className="w-5 h-5 text-purple-600" />
        </div>
        <div className="flex-1">
          <h4 className="font-medium text-gray-900 text-sm">Cihaz Uyumu</h4>
          <p className="text-xs text-gray-500">{formatDate(test.testDate)}</p>
        </div>
        <Badge variant="secondary">{earLabel}</Badge>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        {deviceBrand && (
          <div>
            <p className="text-xs text-gray-500">Marka</p>
            <p className="font-medium text-gray-900">{deviceBrand}</p>
          </div>
        )}
        {deviceModel && (
          <div>
            <p className="text-xs text-gray-500">Model</p>
            <p className="font-medium text-gray-900">{deviceModel}</p>
          </div>
        )}
        {deviceSerial && (
          <div>
            <p className="text-xs text-gray-500">Seri No</p>
            <p className="font-medium text-gray-900">{deviceSerial}</p>
          </div>
        )}
        {deviceCategory && (
          <div>
            <p className="text-xs text-gray-500">Kategori</p>
            <p className="font-medium text-gray-900">{deviceCategory}</p>
          </div>
        )}
      </div>
      {test.notes && (
        <div className="mt-3 p-3 bg-gray-50 rounded-xl">
          <p className="text-xs text-gray-500 font-medium mb-1">Notlar</p>
          <p className="text-sm text-gray-700">{test.notes}</p>
        </div>
      )}
    </div>
  );
}

const REM_FREQUENCIES = ['250', '500', '1000', '1500', '2000', '3000', '4000', '6000', '8000'];
const FREQ_LABELS: Record<string, string> = {
  '250': '250', '500': '500', '1000': '1k', '1500': '1.5k',
  '2000': '2k', '3000': '3k', '4000': '4k', '6000': '6k', '8000': '8k',
};

interface RemPanelProps {
  testId: string;
  targets: RemTargetsResult;
  onSaveRem: (testId: string, payload: { rem: Record<string, unknown> }) => Promise<RemMeasurementResult | null>;
  onFetchRem: (testId: string) => Promise<RemMeasurementResult['rem'] | null>;
  onClose: () => void;
}

function RemPanel({ testId, targets, onSaveRem, onFetchRem, onClose }: RemPanelProps) {
  const [saving, setSaving] = useState(false);
  const [rightRear, setRightRear] = useState<Record<string, string>>({});
  const [leftRear, setLeftRear] = useState<Record<string, string>>({});
  const [experienced, setExperienced] = useState(true);
  const [equipment, setEquipment] = useState('');
  const [verification, setVerification] = useState<Record<string, RemEarVerification> | null>(null);
  const [loadedExisting, setLoadedExisting] = useState(false);

  // Load existing REM data on mount
  const loadExisting = useCallback(async () => {
    if (loadedExisting) return;
    setLoadedExisting(true);
    try {
      const existing = await onFetchRem(testId);
      if (existing) {
        setVerification(existing.verification || null);
        if (existing.right?.rear) {
          const r: Record<string, string> = {};
          for (const [f, v] of Object.entries(existing.right.rear)) r[f] = String(v);
          setRightRear(r);
        }
        if (existing.left?.rear) {
          const l: Record<string, string> = {};
          for (const [f, v] of Object.entries(existing.left.rear)) l[f] = String(v);
          setLeftRear(l);
        }
        if (existing.equipment) setEquipment(existing.equipment);
        if (typeof existing.experienced === 'boolean') setExperienced(existing.experienced);
      }
    } catch (err) {
      console.error('Failed to load existing REM data:', err);
    }
  }, [testId, loadedExisting, onFetchRem]);

  React.useEffect(() => { loadExisting(); }, [loadExisting]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const rightData: Record<string, number> = {};
      const leftData: Record<string, number> = {};
      for (const [f, v] of Object.entries(rightRear)) {
        const n = parseFloat(v);
        if (!isNaN(n)) rightData[f] = n;
      }
      for (const [f, v] of Object.entries(leftRear)) {
        const n = parseFloat(v);
        if (!isNaN(n)) leftData[f] = n;
      }

      const payload = {
        rem: {
          ...(Object.keys(rightData).length > 0 ? { right: { rear: rightData } } : {}),
          ...(Object.keys(leftData).length > 0 ? { left: { rear: leftData } } : {}),
          inputLevel: 65,
          experienced,
          ...(equipment ? { equipment } : {}),
        },
      };

      const result = await onSaveRem(testId, payload);
      if (result && result.verification) {
        setVerification(result.verification);
      }
    } catch (err) {
      console.error('REM save error:', err);
    } finally {
      setSaving(false);
    }
  }, [testId, rightRear, leftRear, experienced, equipment, onSaveRem]);

  const rightTargets = targets.rightTargets || {};
  const leftTargets = targets.leftTargets || {};
  const hasRight = Object.keys(rightTargets).length > 0;
  const hasLeft = Object.keys(leftTargets).length > 0;
  const hasAnyInput = Object.values(rightRear).some(v => v !== '') || Object.values(leftRear).some(v => v !== '');

  return (
    <div className="border rounded-xl p-4 bg-gray-50 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-indigo-600" />
          <h5 className="text-xs font-medium text-gray-700">REM Dogrulama (NAL-NL2)</h5>
        </div>
        <button
          data-allow-raw="true"
          onClick={onClose}
          className="text-[10px] text-gray-400 hover:text-gray-600"
        >
          Kapat
        </button>
      </div>

      {/* Settings row */}
      <div className="flex items-center gap-4 text-xs">
        <label className="flex items-center gap-1.5">
          <input
            data-allow-raw="true"
            type="checkbox"
            checked={experienced}
            onChange={e => setExperienced(e.target.checked)}
            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span className="text-gray-600">Deneyimli kullanici</span>
        </label>
        <div className="flex items-center gap-1.5">
          <span className="text-gray-500">Ekipman:</span>
          <input
            data-allow-raw="true"
            type="text"
            value={equipment}
            onChange={e => setEquipment(e.target.value)}
            placeholder="Ornek: Verifit2"
            className="w-32 px-2 py-1 text-xs border rounded-lg bg-white"
          />
        </div>
        <span className="text-gray-400">Giris: 65 dB SPL</span>
      </div>

      {/* REM data entry table */}
      {(hasRight || hasLeft) && (
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b">
                <th className="text-left py-1.5 px-1 text-gray-500 font-medium w-16">Kulak</th>
                {REM_FREQUENCIES.map(f => (
                  <th key={f} className="text-center py-1.5 px-0.5 text-gray-500 font-medium">
                    {FREQ_LABELS[f]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Right ear targets */}
              {hasRight && (
                <>
                  <tr className="border-b border-dashed">
                    <td className="py-1.5 px-1 text-red-600 font-medium">Sag Hedef</td>
                    {REM_FREQUENCIES.map(f => {
                      const t = rightTargets[f] as RemFrequencyTarget | undefined;
                      return (
                        <td key={f} className="text-center py-1.5 px-0.5 text-gray-400">
                          {t ? t.targetRear.toFixed(0) : '-'}
                        </td>
                      );
                    })}
                  </tr>
                  <tr className="border-b">
                    <td className="py-1.5 px-1 text-red-600 font-medium">Sag REAR</td>
                    {REM_FREQUENCIES.map(f => {
                      const t = rightTargets[f] as RemFrequencyTarget | undefined;
                      if (!t) return <td key={f} className="text-center py-1.5 px-0.5 text-gray-300">-</td>;
                      return (
                        <td key={f} className="text-center py-1.5 px-0.5">
                          <input
                            data-allow-raw="true"
                            type="number"
                            value={rightRear[f] ?? ''}
                            onChange={e => setRightRear(prev => ({ ...prev, [f]: e.target.value }))}
                            className="w-10 px-1 py-0.5 text-center text-[11px] border rounded bg-white"
                            placeholder={t.targetRear.toFixed(0)}
                          />
                        </td>
                      );
                    })}
                  </tr>
                </>
              )}
              {/* Left ear targets */}
              {hasLeft && (
                <>
                  <tr className="border-b border-dashed">
                    <td className="py-1.5 px-1 text-blue-600 font-medium">Sol Hedef</td>
                    {REM_FREQUENCIES.map(f => {
                      const t = leftTargets[f] as RemFrequencyTarget | undefined;
                      return (
                        <td key={f} className="text-center py-1.5 px-0.5 text-gray-400">
                          {t ? t.targetRear.toFixed(0) : '-'}
                        </td>
                      );
                    })}
                  </tr>
                  <tr className="border-b">
                    <td className="py-1.5 px-1 text-blue-600 font-medium">Sol REAR</td>
                    {REM_FREQUENCIES.map(f => {
                      const t = leftTargets[f] as RemFrequencyTarget | undefined;
                      if (!t) return <td key={f} className="text-center py-1.5 px-0.5 text-gray-300">-</td>;
                      return (
                        <td key={f} className="text-center py-1.5 px-0.5">
                          <input
                            data-allow-raw="true"
                            type="number"
                            value={leftRear[f] ?? ''}
                            onChange={e => setLeftRear(prev => ({ ...prev, [f]: e.target.value }))}
                            className="w-10 px-1 py-0.5 text-center text-[11px] border rounded bg-white"
                            placeholder={t.targetRear.toFixed(0)}
                          />
                        </td>
                      );
                    })}
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Save button */}
      {hasAnyInput && (
        <button
          data-allow-raw="true"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          {saving ? 'Kaydediliyor...' : 'Kaydet ve Dogrula'}
        </button>
      )}

      {/* Verification results */}
      {verification && (
        <div className="space-y-3">
          {Object.entries(verification).map(([ear, v]) => {
            const earLabel = ear === 'right' ? 'Sag Kulak' : 'Sol Kulak';
            const earColor = ear === 'right' ? 'red' : 'blue';
            return (
              <div key={ear} className="border rounded-lg bg-white p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-medium text-${earColor}-600`}>{earLabel}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-500">
                      {v.passCount}/{v.totalCount} frekans
                    </span>
                    {v.overallPass ? (
                      <Badge variant="default">Basarili ({v.passRate}%)</Badge>
                    ) : (
                      <Badge variant="danger">Basarisiz ({v.passRate}%)</Badge>
                    )}
                  </div>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {Object.entries(v.frequencies).map(([freq, fv]) => (
                    <div
                      key={freq}
                      className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] ${
                        fv.pass ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                      }`}
                    >
                      {fv.pass ? (
                        <CheckCircle className="w-3 h-3" />
                      ) : (
                        <XCircle className="w-3 h-3" />
                      )}
                      <span>{FREQ_LABELS[freq] || freq} Hz</span>
                      <span className="font-medium">
                        {fv.deviation > 0 ? '+' : ''}{fv.deviation} dB
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-[10px] text-gray-400">
        NAL-NL2 formulune gore hedef kazanc hesaplandi. Tolerans: +/-5 dB.
      </p>
    </div>
  );
}

export const PartyHearingTestsTab: React.FC<PartyHearingTestsTabProps> = ({ partyId }) => {
  const { hearingTests, isLoading, error, createHearingTest, fetchRecommendations, fetchRemTargets, saveRemMeasurement, fetchRemData, saving } = usePartyHearingTests(partyId);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const handleSaveTest = async (data: { rightEar: ThresholdData; leftEar: ThresholdData; rightBone?: ThresholdData; leftBone?: ThresholdData }) => {
    await createHearingTest({
      testType: 'audiometry',
      testDate: new Date().toISOString(),
      results: {
        rightEar: data.rightEar,
        leftEar: data.leftEar,
        ...(data.rightBone && Object.keys(data.rightBone).length > 0 ? { rightBone: data.rightBone } : {}),
        ...(data.leftBone && Object.keys(data.leftBone).length > 0 ? { leftBone: data.leftBone } : {}),
        conductionType: data.rightBone || data.leftBone ? 'both' : 'air',
        source: 'manual',
      },
    });
    setShowModal(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 text-sm">İşitme testleri yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
        <h3 className="text-sm font-medium text-gray-900 mb-1">Hata Oluştu</h3>
        <p className="text-xs text-gray-500">İşitme testleri yüklenirken bir hata oluştu.</p>
      </div>
    );
  }

  const audiometryTests = hearingTests.filter(t => t.testType === 'audiometry');
  const fittingTests = hearingTests.filter(t => t.testType === 'fitting');

  if (hearingTests.length === 0) {
    return (
      <div className="text-center py-12">
        <Activity className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="text-sm font-medium text-gray-900 mb-1">İşitme Testi Bulunamadı</h3>
        <p className="text-xs text-gray-500 mb-4">
          Manuel olarak test ekleyebilir veya Noah&apos;tan aktarım yapabilirsiniz.
        </p>
        <button
          data-allow-raw="true"
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Yeni Test Ekle
        </button>
        <AudiogramThresholdModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          onSave={handleSaveTest}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary bar */}
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-1.5">
          <Activity className="w-4 h-4 text-blue-600" />
          <span className="font-medium text-gray-900">{audiometryTests.length}</span>
          <span className="text-gray-500">Odyometri</span>
        </div>
        {fittingTests.length > 0 && (
          <div className="flex items-center gap-1.5">
            <Headphones className="w-4 h-4 text-purple-600" />
            <span className="font-medium text-gray-900">{fittingTests.length}</span>
            <span className="text-gray-500">Cihaz Uyumu</span>
          </div>
        )}
        {hearingTests.length > 0 && (
          <div className="flex items-center gap-3 ml-auto">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="text-gray-500">Son: {formatDate(hearingTests[0]?.testDate)}</span>
            </div>
            <button
              data-allow-raw="true"
              onClick={() => setShowModal(true)}
              disabled={saving}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Yeni Test
            </button>
          </div>
        )}
      </div>

      {/* Audiometry section */}
      {audiometryTests.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-700">Odyometri Testleri</h3>
          {audiometryTests.map(test => (
            <AudiometryCard
              key={test.id}
              test={test}
              isExpanded={expandedId === test.id}
              onToggle={() => setExpandedId(prev => prev === test.id ? null : test.id)}
              onFetchRecommendations={fetchRecommendations}
              onFetchRemTargets={fetchRemTargets}
              onSaveRem={saveRemMeasurement}
              onFetchRem={fetchRemData}
            />
          ))}
        </div>
      )}

      {/* Fitting section */}
      {fittingTests.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-gray-700">Cihaz Uyum Kayıtları</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {fittingTests.map(test => (
              <FittingCard key={test.id} test={test} />
            ))}
          </div>
        </div>
      )}

      <AudiogramThresholdModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleSaveTest}
      />
    </div>
  );
};
