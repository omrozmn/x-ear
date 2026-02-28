import React from 'react';
import { User, Headphones, Settings, CheckCircle2, AlertCircle } from 'lucide-react';
import { useComposerStore } from '../../../stores/composerStore';

export const ActionProgress = () => {
    const {
        selectedAction,
        slots,
        executionSteps,
        executionStatus,
        executionError,
        reset,
        updateSlot,
        nextSlot,
        currentSlot
    } = useComposerStore();

    // Get current active step
    const currentStep = executionSteps.find(s => s.status === 'running');

    // Helpers to get label from slots (assuming format stored in selectAction)
    const getSlotLabel = (key: string) => {
        const labelKey = `_${key}_label`;
        return (slots[labelKey] as string) || (slots[key] as string) || 'Seçilmedi';
    };

    const patientLabel = getSlotLabel('patient_id') || getSlotLabel('party_id');
    const deviceLabel = getSlotLabel('device_id') || getSlotLabel('inventory_id');

    // --- RENDER STATES ---

    // 1. SUCCESS STATE
    if (executionStatus === 'success') {
        return (
            <div className="bg-white border border-green-100 rounded-lg p-4 shadow-sm animate-in fade-in duration-500">
                <div className="flex items-start gap-3">
                    <div className="mt-0.5 text-green-500">
                        <CheckCircle2 size={20} />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 leading-relaxed">
                            {selectedAction?.name} işlemi başarıyla tamamlandı.
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                            {deviceLabel !== 'Seçilmedi' ? `${deviceLabel} cihazı atandı.` : 'İşlem kaydedildi.'}
                        </p>

                        <div className="flex gap-2 mt-4">
                            <button data-allow-raw="true" className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium rounded transition-colors">
                                Hasta Detaylarını Aç
                            </button>
                            <button
                                data-allow-raw="true"
                                onClick={reset}
                                className="px-3 py-1.5 bg-gray-900 hover:bg-black text-white text-xs font-medium rounded transition-colors"
                            >
                                Yeni İşlem Yap
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // 2. ERROR STATE
    if (executionStatus === 'error') {
        return (
            <div className="bg-white border border-red-100 rounded-lg p-4 shadow-sm animate-in fade-in duration-300">
                <div className="flex items-start gap-3">
                    <div className="mt-0.5 text-red-500">
                        <AlertCircle size={20} />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                            Bir noktada durmam gerekti.
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                            {executionError || 'İşlem şu anda gerçekleştirilemiyor.'}
                        </p>

                        <div className="flex gap-2 mt-4">
                            <button
                                data-allow-raw="true"
                                onClick={reset} // TODO: Add Retry logic?
                                className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-medium rounded transition-colors"
                            >
                                Tekrar Dene
                            </button>
                            <button data-allow-raw="true" className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-medium rounded transition-colors">
                                Detay Gör
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // 4. WAITING (INTERRUPTION) STATE
    if (executionStatus === 'waiting' && currentSlot) {
        return (
            <div className="bg-white border border-blue-100 rounded-lg p-4 shadow-sm animate-in fade-in duration-300">
                <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-blue-900">
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                        <span className="text-sm font-medium">{currentSlot.prompt || 'Bir bilgiye ihtiyacım var.'}</span>
                    </div>

                    <div className="pl-3.5">
                        {currentSlot.uiType === 'enum' && (
                            <div className="flex gap-2 flex-wrap">
                                {currentSlot.enumOptions?.map((opt: string) => (
                                    <button
                                        data-allow-raw="true"
                                        key={opt}
                                        onClick={() => {
                                            updateSlot(currentSlot!.name, opt);
                                            nextSlot();
                                        }}
                                        className="px-3 py-1.5 bg-white border border-blue-200 text-blue-700 text-xs font-semibold rounded hover:bg-blue-50 transition-colors"
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        )}
                        {currentSlot.uiType === 'entity_search' && (
                            <div className="space-y-2">
                                <input
                                    data-allow-raw="true"
                                    autoFocus
                                    className="w-full border rounded p-1.5 text-sm"
                                    placeholder="Ara..."
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            updateSlot(currentSlot!.name, e.currentTarget.value);
                                            nextSlot();
                                        }
                                    }}
                                />
                                <p className="text-[10px] text-gray-400">ID veya isim yazıp Enter'layın</p>
                            </div>
                        )}
                        {currentSlot.uiType === 'date' && (
                            <div className="relative group">
                                <input data-allow-raw="true"
                                    type="date"
                                    className="w-full pl-3 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all shadow-sm"
                                    onChange={(e) => {
                                        updateSlot(currentSlot.name, e.target.value);
                                        nextSlot();
                                    }}
                                />
                            </div>
                        )}
                        {currentSlot.uiType === 'number' && (
                            <div className="relative group">
                                <input data-allow-raw="true"
                                    type="number"
                                    className="w-full pl-3 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all shadow-sm"
                                    placeholder="Sayı girin..."
                                    autoFocus
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            updateSlot(currentSlot.name, Number(e.currentTarget.value));
                                            nextSlot();
                                        }
                                    }}
                                />
                            </div>
                        )}
                        {currentSlot.uiType === 'text' && (
                            <div className="relative group">
                                <input data-allow-raw="true"
                                    className="w-full pl-3 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all shadow-sm"
                                    placeholder="Yazmaya başlayın..."
                                    autoFocus
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            updateSlot(currentSlot.name, e.currentTarget.value);
                                            nextSlot();
                                        }
                                    }}
                                />
                            </div>
                        )}
                        {currentSlot.uiType === 'boolean' && (
                            <div className="flex gap-2">
                                <button
                                    data-allow-raw="true"
                                    onClick={() => {
                                        updateSlot(currentSlot.name, true);
                                        nextSlot();
                                    }}
                                    className="flex-1 px-3 py-2 bg-white border border-green-200 text-green-700 text-xs font-bold rounded-lg hover:bg-green-50 transition-all shadow-sm"
                                >
                                    Evet
                                </button>
                                <button
                                    data-allow-raw="true"
                                    onClick={() => {
                                        updateSlot(currentSlot.name, false);
                                        nextSlot();
                                    }}
                                    className="flex-1 px-3 py-2 bg-white border border-red-200 text-red-700 text-xs font-bold rounded-lg hover:bg-red-50 transition-all shadow-sm"
                                >
                                    Hayır
                                </button>
                            </div>
                        )}
                        {currentSlot.uiType === 'time' && (
                            <div className="relative group">
                                <input data-allow-raw="true"
                                    type="time"
                                    className="w-full pl-3 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all shadow-sm"
                                    onChange={(e) => {
                                        updateSlot(currentSlot.name, e.target.value);
                                        nextSlot();
                                    }}
                                />
                            </div>
                        )}
                        {!['enum', 'entity_search', 'date', 'number', 'text', 'boolean', 'time'].includes(currentSlot.uiType as string) && (
                            <div className="p-2 bg-blue-50 border border-blue-100 rounded text-xs text-blue-700 italic">
                                {currentSlot.prompt} (Tip: {currentSlot.uiType}) yakında eklenecek.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // 5. INIT / RUNNING STATE
    return (
        <div className="bg-gray-50/50 border border-gray-100 rounded-lg p-4 animate-in fade-in slide-in-from-bottom-2 duration-500">

            {/* Status Text Area */}
            <div className="min-h-[24px] flex items-center mb-4">
                {executionStatus === 'init' ? (
                    <div className="flex items-center gap-2 text-gray-600 animate-pulse">
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                        <span className="text-sm font-medium">İşlem başlatılıyor...</span>
                    </div>
                ) : (
                    currentStep && (
                        <div
                            key={currentStep.id} // Key change triggers animation
                            className="flex items-center gap-2 text-gray-700 animate-in fade-in slide-in-from-bottom-1 duration-500"
                        >
                            <span className="flex gap-0.5">
                                <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce [animation-delay:0ms]" />
                                <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce [animation-delay:150ms]" />
                                <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce [animation-delay:300ms]" />
                            </span>
                            <span className="text-sm font-medium">{currentStep.label}</span>
                        </div>
                    )
                )}
            </div>

            {/* Context Chips */}
            {executionStatus === 'init' && (
                <div className="flex flex-wrap gap-2 animate-in fade-in slide-in-from-bottom-2 delay-100 fill-mode-forwards opacity-0">
                    {patientLabel !== 'Seçilmedi' && (
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-white border border-gray-200 rounded text-xs text-gray-600 shadow-sm">
                            <User size={12} className="text-blue-500" />
                            <span>{patientLabel}</span>
                        </div>
                    )}
                    {deviceLabel !== 'Seçilmedi' && (
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-white border border-gray-200 rounded text-xs text-gray-600 shadow-sm">
                            <Headphones size={12} className="text-purple-500" />
                            <span>{deviceLabel}</span>
                        </div>
                    )}
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-white border border-gray-200 rounded text-xs text-gray-600 shadow-sm">
                        <Settings size={12} className="text-orange-500" />
                        <span>{selectedAction?.name || 'Sistem İşlemi'}</span>
                    </div>
                </div>
            )}
        </div>
    );
};
