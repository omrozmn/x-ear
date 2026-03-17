import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Upload, Eye, Save, RefreshCw, AlertCircle, CheckCircle, X, Circle } from 'lucide-react';
// extractAudiogramThresholds was removed from generated API
const extractAudiogramThresholds = async (_opts: { file: File }): Promise<any> => { throw new Error('extractAudiogramThresholds not available'); };
import AudiogramChart, { type ThresholdData } from './AudiogramChart';

const FREQUENCIES = [125, 250, 500, 1000, 2000, 3000, 4000, 6000, 8000];
const DB_MIN = -10;
const DB_MAX = 120;
const DB_STEP = 5;

interface AudiogramThresholdModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { rightEar: ThresholdData; leftEar: ThresholdData; rightBone?: ThresholdData; leftBone?: ThresholdData }) => void;
  initialData?: {
    rightEar?: ThresholdData;
    leftEar?: ThresholdData;
    confidence?: number;
  };
  partyName?: string;
}

const AudiogramThresholdModal: React.FC<AudiogramThresholdModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  partyName,
}) => {
  const [rightEar, setRightEar] = useState<ThresholdData>({});
  const [leftEar, setLeftEar] = useState<ThresholdData>({});
  const [rightBone, setRightBone] = useState<ThresholdData>({});
  const [leftBone, setLeftBone] = useState<ThresholdData>({});
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'right' | 'left'>('right');
  const [conductionType, setConductionType] = useState<'air' | 'bone'>('air');

  useEffect(() => {
    if (initialData) {
      setRightEar(initialData.rightEar || {});
      setLeftEar(initialData.leftEar || {});
    }
  }, [initialData]);

  const handleThresholdChange = useCallback((freq: number, value: string, ear: 'right' | 'left') => {
    const numValue = value === '' ? undefined : parseInt(value, 10);
    if (numValue !== undefined && (isNaN(numValue) || numValue < DB_MIN || numValue > DB_MAX)) return;

    const isBone = conductionType === 'bone';
    const setter = ear === 'right'
      ? (isBone ? setRightBone : setRightEar)
      : (isBone ? setLeftBone : setLeftEar);
    setter(prev => {
      const next = { ...prev };
      if (numValue === undefined) {
        delete next[String(freq)];
      } else {
        next[String(freq)] = numValue;
      }
      return next;
    });
  }, [conductionType]);

  // Interactive chart click handler
  const handleChartThresholdChange = useCallback((frequency: number, db: number, mode: 'rightAir' | 'leftAir' | 'rightBone' | 'leftBone') => {
    const setterMap = {
      rightAir: setRightEar,
      leftAir: setLeftEar,
      rightBone: setRightBone,
      leftBone: setLeftBone,
    };
    setterMap[mode](prev => ({ ...prev, [String(frequency)]: db }));
  }, []);

  // Interactive chart right-click handler — remove threshold
  const handleChartThresholdRemove = useCallback((frequency: number, mode: 'rightAir' | 'leftAir' | 'rightBone' | 'leftBone') => {
    const setterMap = {
      rightAir: setRightEar,
      leftAir: setLeftEar,
      rightBone: setRightBone,
      leftBone: setLeftBone,
    };
    setterMap[mode](prev => {
      const next = { ...prev };
      delete next[String(frequency)];
      return next;
    });
  }, []);

  const editingMode = `${activeTab === 'right' ? 'right' : 'left'}${conductionType === 'air' ? 'Air' : 'Bone'}` as 'rightAir' | 'leftAir' | 'rightBone' | 'leftBone';

  const handleSave = useCallback(() => {
    onSave({
      rightEar,
      leftEar,
      ...(Object.keys(rightBone).length > 0 ? { rightBone } : {}),
      ...(Object.keys(leftBone).length > 0 ? { leftBone } : {}),
    } as { rightEar: ThresholdData; leftEar: ThresholdData });
    onClose();
  }, [rightEar, leftEar, rightBone, leftBone, onSave, onClose]);

  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      const envelope = await extractAudiogramThresholds({ file });
      const data = envelope?.data;

      if (data?.rightEar) {
        setRightEar(prev => ({ ...prev, ...data.rightEar }));
      }
      if (data?.leftEar) {
        setLeftEar(prev => ({ ...prev, ...data.leftEar }));
      }
    } catch (err) {
      console.error('Audiogram OCR failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const hasData = useMemo(() =>
    Object.keys(rightEar).length > 0 || Object.keys(leftEar).length > 0 ||
    Object.keys(rightBone).length > 0 || Object.keys(leftBone).length > 0,
    [rightEar, leftEar, rightBone, leftBone]
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">İşitme Eşikleri</h2>
          <button data-allow-raw="true" onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-4 space-y-4">
          {/* Patient info */}
          {partyName && (
            <div className="text-sm text-gray-600">
              Hasta: <span className="font-medium text-gray-900">{partyName}</span>
            </div>
          )}

          {/* OCR confidence */}
          {initialData?.confidence !== undefined && initialData.confidence > 0 && (
            <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-xl ${
              initialData.confidence > 0.7 ? 'bg-green-50 text-green-700' :
              initialData.confidence > 0.4 ? 'bg-yellow-50 text-yellow-700' :
              'bg-red-50 text-red-700'
            }`}>
              {initialData.confidence > 0.7 ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              OCR Güven: %{Math.round(initialData.confidence * 100)} - Değerleri kontrol edin
            </div>
          )}

          {/* Actions row */}
          <div className="flex gap-2 flex-wrap">
            <label className="cursor-pointer">
              <input data-allow-raw="true" type="file" accept="image/*" onChange={handleImageUpload} className="hidden" capture="environment" />
              <span className="inline-flex items-center gap-2 px-3 py-2 text-sm border rounded-xl hover:bg-gray-50 transition-colors cursor-pointer">
                <Upload className="w-4 h-4" />
                {isLoading ? 'OCR çalışıyor...' : 'Odyogram Yükle'}
              </span>
            </label>
            {hasData && (
              <button
                data-allow-raw="true"
                onClick={() => { setRightEar({}); setLeftEar({}); setRightBone({}); setLeftBone({}); }}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm border rounded-xl hover:bg-gray-50 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Temizle
              </button>
            )}
          </div>

          {/* Audiogram chart — interactive: click to place points */}
          <AudiogramChart
            rightEar={rightEar}
            leftEar={leftEar}
            rightBone={Object.keys(rightBone).length > 0 ? rightBone : undefined}
            leftBone={Object.keys(leftBone).length > 0 ? leftBone : undefined}
            interactive
            editingMode={editingMode}
            onThresholdChange={handleChartThresholdChange}
            onThresholdRemove={handleChartThresholdRemove}
          />

          {/* Threshold input tabs */}
          <div>
            {/* Ear tabs */}
            <div className="flex items-center gap-2 border-b mb-3">
              <button
                data-allow-raw="true"
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'right' ? 'border-red-500 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setActiveTab('right')}
              >
                <Circle className="w-3 h-3 text-red-500 inline mr-1" /> Sag Kulak
              </button>
              <button
                data-allow-raw="true"
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'left' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setActiveTab('left')}
              >
                <X className="w-3 h-3 text-blue-500 inline mr-1" /> Sol Kulak
              </button>
              {/* Air/bone toggle */}
              <div className="ml-auto flex rounded-lg border overflow-hidden text-xs">
                <button
                  data-allow-raw="true"
                  className={`px-3 py-1.5 transition-colors ${conductionType === 'air' ? 'bg-gray-800 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                  onClick={() => setConductionType('air')}
                >
                  Hava Yolu
                </button>
                <button
                  data-allow-raw="true"
                  className={`px-3 py-1.5 transition-colors ${conductionType === 'bone' ? 'bg-gray-800 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                  onClick={() => setConductionType('bone')}
                >
                  Kemik Yolu
                </button>
              </div>
            </div>

            <p className="text-[10px] text-gray-400 mb-2">
              {conductionType === 'air' ? 'Hava yolu iletim esikleri' : 'Kemik yolu iletim esikleri'} — Sol tık: işaretle / Sağ tık: kaldır
            </p>

            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {FREQUENCIES.map(freq => {
                const thresholds = activeTab === 'right'
                  ? (conductionType === 'air' ? rightEar : rightBone)
                  : (conductionType === 'air' ? leftEar : leftBone);
                const value = thresholds[String(freq)];
                const borderColor = activeTab === 'right' ? 'border-red-200 focus:border-red-500 focus:ring-red-200' : 'border-blue-200 focus:border-blue-500 focus:ring-blue-200';

                return (
                  <div key={`${conductionType}-${freq}`} className="text-center">
                    <label className="block text-xs text-gray-500 mb-1">
                      {freq >= 1000 ? `${freq / 1000}k` : freq} Hz
                    </label>
                    <input
                      data-allow-raw="true"
                      type="number"
                      min={DB_MIN}
                      max={DB_MAX}
                      step={DB_STEP}
                      value={value !== undefined ? value : ''}
                      onChange={(e) => handleThresholdChange(freq, e.target.value, activeTab)}
                      placeholder="—"
                      className={`w-full text-center text-sm h-9 rounded-lg border ${borderColor} focus:outline-none focus:ring-1`}
                    />
                    {value !== undefined && (
                      <div className="text-[10px] text-gray-400 mt-0.5">{value} dB</div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-between pt-3 border-t">
            <button data-allow-raw="true" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
              İptal
            </button>
            <div className="flex gap-2">
              <button
                data-allow-raw="true"
                onClick={() => setActiveTab(activeTab === 'right' ? 'left' : 'right')}
                className="inline-flex items-center gap-1 px-3 py-2 text-sm border rounded-xl hover:bg-gray-50 transition-colors"
              >
                <Eye className="w-4 h-4" />
                {activeTab === 'right' ? 'Sol Kulağa Geç' : 'Sağ Kulağa Geç'}
              </button>
              <button
                data-allow-raw="true"
                onClick={handleSave}
                disabled={!hasData}
                className="inline-flex items-center gap-1 px-4 py-2 text-sm bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Save className="w-4 h-4" />
                Kaydet
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AudiogramThresholdModal;
