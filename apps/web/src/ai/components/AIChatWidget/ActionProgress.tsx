import React from 'react';
import { useTranslation } from 'react-i18next';
import { User, Headphones, Settings, CheckCircle2, AlertCircle } from 'lucide-react';
import { useComposerStore } from '../../../stores/composerStore';

export const ActionProgress = () => {
    const { t } = useTranslation();
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
        return (slots[labelKey] as string) || (slots[key] as string) || t('common.notSelected', 'Seçilmedi');
    };

    const patientLabel = getSlotLabel('party_id');
    const deviceLabel = getSlotLabel('device_id') || getSlotLabel('inventory_id');

    // --- RENDER STATES ---

    // 1. SUCCESS STATE
    if (executionStatus === 'success') {
        return (
            <div className="bg-card border border-green-200 dark:border-green-800 rounded-2xl p-4 shadow-sm animate-in fade-in duration-500">
                <div className="flex items-start gap-3">
                    <div className="mt-0.5 text-success">
                        <CheckCircle2 size={20} />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-medium text-foreground leading-relaxed">
                            {selectedAction?.displayName || selectedAction?.name} {t('ai.actionCompleted', 'işlemi başarıyla tamamlandı.')}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                            {deviceLabel !== t('common.notSelected', 'Seçilmedi')
                                ? t('ai.deviceAssigned', { device: deviceLabel, defaultValue: `${deviceLabel} cihazı atandı.` }) as string
                                : t('ai.operationRecorded', 'İşlem kaydedildi.')}
                        </p>

                        <div className="flex gap-2 mt-4">
                            <button
                                data-allow-raw="true"
                                onClick={() => {
                                    if (patientLabel !== 'Seçilmedi') {
                                        window.location.href = `/parties/${slots.party_id}`;
                                    }
                                }}
                                className="px-3 py-1.5 bg-muted hover:bg-accent text-foreground text-xs font-medium rounded transition-colors"
                            >
                                {t('ai.openPatientDetails', 'Hasta Detaylarını Aç')}
                            </button>
                            <button
                                data-allow-raw="true"
                                onClick={reset}
                                className="px-3 py-1.5 bg-foreground hover:bg-foreground/90 text-background text-xs font-medium rounded transition-colors"
                            >
                                {t('ai.newAction', 'Yeni İşlem Yap')}
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
            <div className="bg-card border border-red-200 dark:border-red-800 rounded-2xl p-4 shadow-sm animate-in fade-in duration-300">
                <div className="flex items-start gap-3">
                    <div className="mt-0.5 text-destructive">
                        <AlertCircle size={20} />
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">
                            {t('ai.errorTitle', 'Bir noktada durmam gerekti.')}
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                            {executionError || t('ai.errorGeneric', 'İşlem şu anda gerçekleştirilemiyor.')}
                        </p>

                        <div className="flex gap-2 mt-4">
                            <button
                                data-allow-raw="true"
                                onClick={reset} // TODO: Add Retry logic?
                                className="px-3 py-1.5 bg-destructive/10 hover:bg-destructive/20 text-destructive text-xs font-medium rounded transition-colors"
                            >
                                {t('common.retry', 'Tekrar Dene')}
                            </button>
                            <button
                                data-allow-raw="true"
                                onClick={() => {
                                    const detailEl = document.getElementById('error-detail');
                                    if (detailEl) detailEl.classList.toggle('hidden');
                                }}
                                className="px-3 py-1.5 bg-muted hover:bg-accent text-muted-foreground text-xs font-medium rounded transition-colors"
                            >
                                {t('common.viewDetail', 'Detay Gör')}
                            </button>
                        </div>
                        <p id="error-detail" className="hidden mt-2 text-xs text-muted-foreground bg-muted rounded-lg p-2 break-words">
                            {executionError || 'Bilinmeyen hata'}
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // 4. WAITING (INTERRUPTION) STATE
    if (executionStatus === 'waiting' && currentSlot) {
        return (
            <div className="bg-card border border-blue-200 dark:border-blue-800 rounded-2xl p-4 shadow-sm animate-in fade-in duration-300">
                <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-blue-900">
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                        <span className="text-sm font-medium">{currentSlot.prompt || t('ai.infoNeeded', 'Bir bilgiye ihtiyacım var.')}</span>
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
                                        className="px-3 py-1.5 bg-card border border-blue-200 text-primary text-xs font-semibold rounded hover:bg-primary/10 transition-colors"
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
                                    placeholder={t('common.searchPlaceholder', 'Ara...')}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            updateSlot(currentSlot!.name, e.currentTarget.value);
                                            nextSlot();
                                        }
                                    }}
                                />
                                <p className="text-[10px] text-muted-foreground">{t('ai.searchHint', "ID veya isim yazıp Enter'layın")}</p>
                            </div>
                        )}
                        {currentSlot.uiType === 'date' && (
                            <div className="relative group">
                                <input data-allow-raw="true"
                                    type="date"
                                    className="w-full pl-3 pr-4 py-2 bg-muted border border-border rounded-2xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:bg-card transition-all shadow-sm"
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
                                    className="w-full pl-3 pr-4 py-2 bg-muted border border-border rounded-2xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:bg-card transition-all shadow-sm"
                                    placeholder={t('ai.enterNumber', 'Sayı girin...')}
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
                                    className="w-full pl-3 pr-4 py-2 bg-muted border border-border rounded-2xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:bg-card transition-all shadow-sm"
                                    placeholder={t('ai.startTyping', 'Yazmaya başlayın...')}
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
                        {(currentSlot.uiType as string) === 'boolean' && (
                            <div className="flex gap-2">
                                <button
                                    data-allow-raw="true"
                                    onClick={() => {
                                        updateSlot(currentSlot.name, true);
                                        nextSlot();
                                    }}
                                    className="flex-1 px-3 py-2 bg-card border border-green-200 text-success text-xs font-bold rounded-2xl hover:bg-success/10 transition-all shadow-sm"
                                >
                                    {t('common.yes', 'Evet')}
                                </button>
                                <button
                                    data-allow-raw="true"
                                    onClick={() => {
                                        updateSlot(currentSlot.name, false);
                                        nextSlot();
                                    }}
                                    className="flex-1 px-3 py-2 bg-card border border-red-200 text-destructive text-xs font-bold rounded-2xl hover:bg-destructive/10 transition-all shadow-sm"
                                >
                                    {t('common.no', 'Hayır')}
                                </button>
                            </div>
                        )}
                        {(currentSlot.uiType as string) === 'time' && (
                            <div className="relative group">
                                <input data-allow-raw="true"
                                    type="time"
                                    className="w-full pl-3 pr-4 py-2 bg-muted border border-border rounded-2xl text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:bg-card transition-all shadow-sm"
                                    onChange={(e) => {
                                        updateSlot(currentSlot.name, e.target.value);
                                        nextSlot();
                                    }}
                                />
                            </div>
                        )}
                        {!['enum', 'entity_search', 'date', 'number', 'text', 'boolean', 'time'].includes(currentSlot.uiType as string) && (
                            <div className="p-2 bg-primary/10 border border-blue-100 rounded text-xs text-primary italic">
                                {currentSlot.prompt} ({t('ai.type', 'Tip')}: {currentSlot.uiType as string}) {t('ai.comingSoon', 'yakında eklenecek.')}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // 5. INIT / RUNNING STATE
    return (
        <div className="bg-muted/50 border border-border rounded-2xl p-4 animate-in fade-in slide-in-from-bottom-2 duration-500">

            {/* Status Text Area */}
            <div className="min-h-[24px] flex items-center mb-4">
                {executionStatus === 'init' ? (
                    <div className="flex items-center gap-2 text-muted-foreground animate-pulse">
                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                        <span className="text-sm font-medium">{t('ai.initializing', 'İşlem başlatılıyor...')}</span>
                    </div>
                ) : (
                    currentStep && (
                        <div
                            key={currentStep.id} // Key change triggers animation
                            className="flex items-center gap-2 text-foreground animate-in fade-in slide-in-from-bottom-1 duration-500"
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
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-card border border-border rounded text-xs text-muted-foreground shadow-sm">
                            <User size={12} className="text-primary" />
                            <span>{patientLabel}</span>
                        </div>
                    )}
                    {deviceLabel !== 'Seçilmedi' && (
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-card border border-border rounded text-xs text-muted-foreground shadow-sm">
                            <Headphones size={12} className="text-purple-500" />
                            <span>{deviceLabel}</span>
                        </div>
                    )}
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-card border border-border rounded text-xs text-muted-foreground shadow-sm">
                        <Settings size={12} className="text-orange-500" />
                        <span>{selectedAction?.displayName || selectedAction?.name || 'Sistem İşlemi'}</span>
                    </div>
                </div>
            )}
        </div>
    );
};
