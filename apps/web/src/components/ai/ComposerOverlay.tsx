import { useEffect, useCallback, useState, useMemo, useRef } from 'react';
import { useComposerStore } from '../../stores/composerStore';
import { useSpotlightStore } from '../../stores/spotlightStore';
import { useChatStore } from '../../ai/stores/chatStore';
import { Search, Zap, User, Box, Check, X, Loader2, AlertCircle, FileText, Store, Shield, Calendar, ShoppingCart, Package, Receipt, LifeBuoy, Megaphone } from 'lucide-react';
import {
    useAutocompleteApiAiComposerAutocompleteGet,
    useExecuteToolApiAiComposerExecutePost,
    useAnalyzeDocumentsApiAiComposerAnalyzePost,
    useCreateUploadPresigned
} from '../../api/generated';
import type { ExecuteResponse, EntityItem, Capability, AnalysisSuggestion } from '../../api/generated/schemas';
import { usePermissionCheck } from '../../hooks/usePermissionCheck';
import toast from 'react-hot-toast';
import { Button, Input } from '@x-ear/ui-web';
import { EntityPreviewModal } from './EntityPreviewModal';

export function ComposerOverlay() {
    const {
        isOpen, setOpen,
        mode, query, context, selectedAction, currentSlot, slots, executionResult,
        setQuery, selectAction, updateSlot, nextSlot, reset, setExecutionResult
    } = useComposerStore();

    const {
        stagedEntities, addStagedEntity, removeStagedEntity
    } = useSpotlightStore();

    const { setVisible: setChatVisible, setPendingPrompt } = useChatStore();

    const { canAll } = usePermissionCheck();
    const onClose = useCallback(() => setOpen(false), [setOpen]);

    // Entity search state for slot filling
    const [slotSearchQuery, setSlotSearchQuery] = useState('');

    // Preview state
    const [previewEntity, setPreviewEntity] = useState<EntityItem | null>(null);

    // Autocomplete query hook
    const contextType = context && context.length > 0 ? context[0].type : '';
    const contextId = context && context.length > 0 ? context[0].id : '';
    const { data: autocompleteData, isLoading } = useAutocompleteApiAiComposerAutocompleteGet(
        { q: query, context_entity_type: contextType, context_entity_id: contextId },
        { query: { enabled: query.length > 1 && isOpen } }
    );

    // Entity search for slot filling (when uiType is entity_search)
    const slotEntityType = currentSlot?.sourceEndpoint?.includes('inventory') ? 'device' : 'patient';
    const { data: slotEntityData, isLoading: isSlotSearchLoading } = useAutocompleteApiAiComposerAutocompleteGet(
        { q: slotSearchQuery, context_entity_type: slotEntityType },
        { query: { enabled: slotSearchQuery.length > 1 && currentSlot?.uiType === 'entity_search' } }
    );

    // Execute mutation hook
    const { mutate: executeTool, isPending: isExecuting } = useExecuteToolApiAiComposerExecutePost();

    // Upload mutation hook
    const { mutateAsync: getPresignedUrl } = useCreateUploadPresigned();

    // Analyze documents mutation hook
    const { mutateAsync: analyzeDocuments } = useAnalyzeDocumentsApiAiComposerAnalyzePost();

    // Handle File Upload
    const handleFileUpload = async (file: File) => {
        try {
            // 1. Get Presigned URL
            const presigned = await getPresignedUrl({
                data: {
                    filename: file.name,
                    folder: 'ai_uploads',
                    content_type: file.type
                }
            });

            if (!presigned.data?.url || !presigned.data?.fields) {
                throw new Error('Upload URL generation failed');
            }

            // 2. Upload to S3
            const formData = new FormData();
            Object.entries(presigned.data.fields).forEach(([k, v]) => {
                formData.append(k, v as string);
            });
            formData.append('file', file);

            const uploadRes = await fetch(presigned.data.url, {
                method: 'POST',
                body: formData
            });

            if (!uploadRes.ok) {
                throw new Error('S3 upload failed');
            }

            // 3. Update slot with key
            if (currentSlot) {
                updateSlot(currentSlot.name, presigned.data.key);
                updateSlot(`_${currentSlot.name}_label`, file.name); // Display purpose
                toast.success('Dosya yüklendi, analiz ediliyor...');

                // Trigger Vision Analysis
                // Note: In a real generation pipeline we would use the generated hook 'useAnalyzeDocuments'
                // Here we fetch manually to avoid regenerating the whole API client right now
                analyzeDocument(presigned.data.key);

                nextSlot();
            }

        } catch (error) {
            console.error('File upload error:', error);
            toast.error('Dosya yükleme hatası');
        }
    };

    // Vision Analysis Logic
    const [suggestions, setSuggestions] = useState<AnalysisSuggestion[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const analyzeDocument = async (fileKey: string) => {
        setIsAnalyzing(true);
        try {
            const result = await analyzeDocuments({
                data: {
                    files: [fileKey],
                    context_intent: selectedAction?.name || 'general'
                }
            });

            if (result.suggestions && result.suggestions.length > 0) {
                setSuggestions(prev => [...prev, ...result.suggestions]);
                toast.success(`${result.suggestions.length} öneri bulundu!`);
            }
        } catch (e) {
            console.error("Analysis failed:", e);
            toast.error('Analiz başarısız oldu');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const applySuggestion = (s: AnalysisSuggestion) => {
        // Find if this suggestion matches any slot
        // Ideally matches s.slot_name to slot key
        updateSlot(s.slot_name, s.value);

        // If it's an entity/enum, we might need label logic, for now assume value is direct
        // If entity search, we might need to search or set ID directly if we trust it
        // For simple fields (text, date, number):
        toast.success('Öneri uygulandı');

        // Remove applied suggestion
        setSuggestions(prev => prev.filter(p => p !== s));
    };

    // ... (rest of render)

    // Filter actions by user permissions (CRITICAL: B2.1 FE RBAC)
    const permittedActions = useMemo(() => {
        if (!autocompleteData?.actions) return [];
        return autocompleteData.actions.filter((action: Capability) => {
            // If no permissions required, allow
            if (!action.requiredPermissions || action.requiredPermissions.length === 0) {
                return true;
            }
            // User must have ALL required permissions
            return canAll(action.requiredPermissions);
        });
    }, [autocompleteData?.actions, canAll]);

    const hasResetRef = useRef(false);
    useEffect(() => {
        if (isOpen) {
            if (!hasResetRef.current) {
                if (mode === 'idle') {
                    reset();
                }
                setSlotSearchQuery('');
                hasResetRef.current = true;
            }
        } else {
            hasResetRef.current = false;
        }
    }, [isOpen, mode, reset]);

    // Handle keyboard shortcut (Cmd+K or Ctrl+K)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setOpen(!isOpen);
            }
            // ESC to close
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, setOpen, onClose]);

    const entityRouteMap: Record<string, string> = {
        patient: '/parties',
        invoice: '/invoices',
        device: '/inventory',
        product: '/inventory',
        supplier: '/suppliers',
        appointment: '/appointments',
        sale: '/sales',
        order: '/orders',
        promissory_note: '/promissory-notes',
        ticket: '/tickets',
        purchase_invoice: '/purchase-invoices',
        campaign: '/campaigns',
    };

    const handleSelectEntity = (entity: EntityItem) => {
        const base = entityRouteMap[entity.type] || '/parties';
        window.location.href = `${base}/${entity.id}`;
        onClose();
    };

    const handleStageEntity = (entity: EntityItem) => {
        addStagedEntity(entity);
        setQuery(''); // Clear search to allow next one
    };

    const handleSelectAction = (action: Capability) => {
        // Spotlight Handoff Logic
        selectAction(action, stagedEntities);
        setOpen(false);
        setChatVisible(true);
    };

    const handleSlotEntitySelect = (entity: EntityItem) => {
        if (currentSlot) {
            updateSlot(currentSlot.name, entity.id);
            // Store label for display
            updateSlot(`_${currentSlot.name}_label`, entity.label);
            setSlotSearchQuery('');
            nextSlot();
        }
    };

    const handleConfirm = () => {
        if (!selectedAction) return;
        executeTool({
            data: {
                tool_id: selectedAction.toolOperations?.[0] || selectedAction.name,
                args: slots,
                confirmed: true
            }
        }, {
            onSuccess: (res: ExecuteResponse) => {
                setExecutionResult(res);
                if (res.status === 'success') {
                    toast.success('İşlem başarıyla tamamlandı');
                } else if (res.status === 'error') {
                    toast.error(res.error || 'İşlem sırasında bir hata oluştu');
                }
            },
            onError: () => {
                toast.error('Bağlantı hatası');
            }
        });
    };

    const handleSimulate = () => {
        if (!selectedAction) return;
        executeTool({
            data: {
                tool_id: selectedAction.toolOperations?.[0] || selectedAction.name,
                args: slots,
                dry_run: true,
                confirmed: false
            }
        }, {
            onSuccess: (res: ExecuteResponse) => {
                if (res.status === 'dry_run') {
                    toast.success('Simülasyon tamamlandı - değişiklik yapılmadı');
                }
                setExecutionResult(res);
            }
        });
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[9999] bg-black/50 flex items-start justify-center pt-[10vh]"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="w-[600px] bg-card rounded-xl shadow-2xl overflow-hidden flex flex-col min-h-[100px] max-h-[80vh]">

                {/* Header / Input Area */}
                <div className="p-4 border-b border-border flex items-center gap-2">
                    <Search className="text-muted-foreground w-5 h-5" />

                    {/* Staged Entity Chips */}
                    <div className="flex gap-1 flex-wrap">
                        {stagedEntities.map(e => (
                            <span key={e.id} className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-1 rounded-xl text-sm font-medium">
                                {
                                    {
                                        patient: <User size={14} />,
                                        device: <Box size={14} />,
                                        invoice: <FileText size={14} />,
                                        supplier: <Store size={14} />,
                                        user: <Shield size={14} />,
                                        appointment: <Calendar size={14} />,
                                        sale: <ShoppingCart size={14} />,
                                        order: <Package size={14} />,
                                        promissory_note: <Receipt size={14} />,
                                        ticket: <LifeBuoy size={14} />,
                                        campaign: <Megaphone size={14} />,
                                    }[e.type] || <Box size={14} />
                                }
                                {e.label}
                                <Button
                                    onClick={() => removeStagedEntity(e.id)}
                                    variant="ghost"
                                    size="sm"
                                    className="hover:text-blue-900 ml-1 p-0 h-auto min-h-0"
                                >
                                    <X size={14} />
                                </Button>
                            </span>
                        ))}
                    </div>

                    <Input
                        className="flex-1 outline-none text-lg placeholder:text-muted-foreground border-0 focus:ring-0 shadow-none"
                        placeholder={stagedEntities.length > 0 ? "Bir işlem yazın..." : "Hasta, cihaz veya fatura ara..."}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                // 1. Priority: Explicit action match
                                if (autocompleteData?.intentType === 'action' && permittedActions.length > 0) {
                                    handleSelectAction(permittedActions[0]);
                                    return;
                                }

                                // 2. Fallback: Hand off to AI Chat
                                if (query.trim().length > 0) {
                                    setPendingPrompt(query, stagedEntities);
                                    setOpen(false); // Reset/Close spotlight
                                    setChatVisible(true);
                                }
                            }
                        }}
                        autoFocus
                    />

                    <kbd className="hidden sm:inline-block px-2 py-1 text-xs text-muted-foreground bg-muted rounded">
                        ESC
                    </kbd>
                </div>

                {/* Content Area */}
                <div className="overflow-y-auto p-2 flex-1">

                    {/* Suggestion Mode */}
                    {(mode === 'idle' || mode === 'context_locked') && (
                        <div>
                            {isLoading && (
                                <div className="p-4 text-muted-foreground text-sm flex items-center justify-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Aranıyor...
                                </div>
                            )}

                            {/* Entities */}
                            {autocompleteData?.entities && autocompleteData.entities.length > 0 && (
                                <div className="mb-3">
                                    <div className="text-xs font-semibold text-muted-foreground mb-1 px-2 uppercase tracking-wider">Varlıklar</div>
                                    {autocompleteData.entities.map((e: EntityItem) => (
                                        <div
                                            key={e.id}
                                            onClick={() => handleSelectEntity(e)}
                                            className="flex items-center gap-3 p-2 hover:bg-accent rounded-2xl cursor-pointer transition-colors group"
                                        >
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center text-primary relative">
                                                {
                                                    {
                                                        patient: <User size={18} />,
                                                        invoice: <FileText size={18} />,
                                                        supplier: <Store size={18} />,
                                                        appointment: <Calendar size={18} />,
                                                        sale: <ShoppingCart size={18} />,
                                                        order: <Package size={18} />,
                                                        promissory_note: <Receipt size={18} />,
                                                        ticket: <LifeBuoy size={18} />,
                                                        purchase_invoice: <FileText size={18} />,
                                                        campaign: <Megaphone size={18} />,
                                                    }[e.type] || <Box size={18} />
                                                }
                                                <span className="absolute -bottom-1 -right-1 px-1 bg-primary/10 text-primary text-[10px] font-bold rounded border border-white">
                                                    {(e.metadata?.entity_label as string) || (e.type === 'patient' ? 'HASTA' : e.type === 'invoice' ? 'FATURA' : 'CİHAZ')}
                                                </span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <div className="font-medium text-foreground truncate">{e.label}</div>
                                                    {e.metadata?.tags && Array.isArray(e.metadata.tags) ?
                                                        (e.metadata.tags.filter((t): t is string => typeof t === 'string')).map((tag, i) => (
                                                            <span key={i} className="px-1.5 py-0.5 bg-muted text-muted-foreground text-[10px] rounded-full border border-border truncate max-w-[80px]">
                                                                {tag}
                                                            </span>
                                                        ))
                                                        : null
                                                    }
                                                </div>
                                                <div className="text-xs text-muted-foreground truncate">{e.subLabel || ''}</div>
                                            </div>

                                            <Button
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    handleStageEntity(e);
                                                }}
                                                variant="ghost"
                                                size="sm"
                                                className="opacity-0 group-hover:opacity-100 bg-primary/10 text-primary hover:bg-primary/10 p-2 h-auto"
                                                title="AI İşlemine Ekle (Cmd+Enter)"
                                            >
                                                <Zap size={16} />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Actions (Filtered by permissions) */}
                            {permittedActions.length > 0 && (
                                <div className="mb-3">
                                    <div className="text-xs font-semibold text-muted-foreground mb-1 px-2 uppercase tracking-wider">İşlemler</div>
                                    {permittedActions.map((a: Capability) => (
                                        <div
                                            key={a.name}
                                            onClick={() => handleSelectAction(a)}
                                            className="flex items-center gap-3 p-2 hover:bg-purple-50 dark:hover:bg-purple-950/30 rounded-2xl cursor-pointer group transition-colors"
                                        >
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-50 to-purple-100 text-purple-600 flex items-center justify-center group-hover:from-purple-100 group-hover:to-purple-200 transition-colors relative">
                                                <Zap size={18} />
                                                <span className="absolute -bottom-1 -right-1 px-1 bg-purple-100 text-purple-700 text-[10px] font-bold rounded border border-white">
                                                    AKSİYON
                                                </span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-medium text-purple-900">{a.name}</div>
                                                <div className="text-xs text-purple-500 truncate">{a.description}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Empty State */}
                            {!isLoading && query.length > 1 &&
                                (!autocompleteData?.entities?.length) &&
                                (!permittedActions.length) && (
                                    <div className="p-4 text-center text-muted-foreground">
                                        <AlertCircle className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                                        <p>İlgili kayıt bulunamadı.</p>
                                        <p className="text-xs mt-1 text-muted-foreground">Yazdıklarınız AI işlem promptu olarak kullanılacaktır.</p>
                                    </div>
                                )}
                        </div>
                    )}

                    {/* Slot Filling Mode */}
                    {mode === 'slot_filling' && currentSlot && (
                        <div className="p-4 bg-gradient-to-br from-muted/50 to-muted rounded-2xl border border-border">

                            {/* Vision Suggestions Area */}
                            {(isAnalyzing || suggestions.length > 0) && (
                                <div className="mb-4 p-3 bg-primary/10/50 border border-blue-100 rounded-2xl">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Zap className="w-3 h-3 text-primary" />
                                        <span className="text-xs font-semibold text-primary uppercase tracking-wide">
                                            {isAnalyzing ? 'Yapay Zeka Analiz Ediyor...' : 'AI Önerileri'}
                                        </span>
                                        {isAnalyzing && <Loader2 className="w-3 h-3 animate-spin text-blue-400" />}
                                    </div>

                                    <div className="flex gap-2 flex-wrap">
                                        {suggestions
                                            .filter(s => s.slot_name === currentSlot.name || s.slot_name === 'general') // simple filtering
                                            .map((s, idx) => (
                                                <Button
                                                    key={idx}
                                                    onClick={() => applySuggestion(s)}
                                                    variant="outline"
                                                    size="sm"
                                                    className="flex items-center gap-2 px-3 py-1.5 bg-card border border-blue-200 shadow-sm rounded-xl hover:border-blue-400 hover:shadow-md transition-all text-sm text-left group"
                                                >
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-foreground group-hover:text-primary">
                                                            {typeof s.value === 'object' && s.value !== null ? JSON.stringify(s.value) : String(s.value ?? '')}
                                                        </span>
                                                        <span className="text-[10px] text-muted-foreground">
                                                            {(s.confidence * 100).toFixed(0)}% • {s.source_file ? 'Dosyadan' : 'AI'}
                                                        </span>
                                                    </div>
                                                    <Check className="w-3 h-3 text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </Button>
                                            ))}
                                        {!isAnalyzing && suggestions.length === 0 && (
                                            <span className="text-xs text-muted-foreground italic">Bu alan için öneri bulunamadı.</span>
                                        )}
                                    </div>
                                </div>
                            )}

                            <h3 className="text-lg font-medium mb-3 text-foreground">{currentSlot.prompt}</h3>

                            {/* Entity Search Slot */}
                            {currentSlot.uiType === 'entity_search' && (
                                <div className="relative">
                                    <div className="relative">
                                        <Input
                                            className="w-full border p-2 pl-10 rounded-2xl focus:ring-2 focus:ring-ring focus:border-transparent"
                                            placeholder="Ara..."
                                            value={slotSearchQuery}
                                            onChange={(e) => setSlotSearchQuery(e.target.value)}
                                            autoFocus
                                            leftIcon={<Search className="w-4 h-4" />}
                                        />
                                    </div>
                                    {isSlotSearchLoading && (
                                        <div className="mt-2 text-sm text-muted-foreground flex items-center gap-1">
                                            <Loader2 className="w-3 h-3 animate-spin" /> Aranıyor...
                                        </div>
                                    )}
                                    {slotEntityData?.entities && slotEntityData.entities.length > 0 && (
                                        <div className="mt-2 bg-card border rounded-2xl shadow-sm max-h-48 overflow-y-auto">
                                            {slotEntityData.entities.map((e: EntityItem) => (
                                                <div
                                                    key={e.id}
                                                    onClick={() => handleSlotEntitySelect(e)}
                                                    className="flex items-center gap-2 p-2 hover:bg-primary/10 dark:hover:bg-blue-950/30 cursor-pointer"
                                                >
                                                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                                        {e.type === 'patient' ? <User size={12} /> : <Box size={12} />}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-medium">{e.label}</div>
                                                        <div className="text-xs text-muted-foreground">{e.subLabel}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Text Slot */}
                            {currentSlot.uiType === 'text' && (
                                <Input
                                    className="w-full border p-2 rounded-2xl focus:ring-2 focus:ring-ring focus:border-transparent"
                                    autoFocus
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            updateSlot(currentSlot.name, (e.target as HTMLInputElement).value);
                                            nextSlot();
                                        }
                                    }}
                                />
                            )}

                            {/* Number Slot */}
                            {currentSlot.uiType === 'number' && (
                                <Input
                                    type="number"
                                    className="w-full border p-2 rounded-2xl focus:ring-2 focus:ring-ring focus:border-transparent"
                                    autoFocus
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            updateSlot(currentSlot.name, Number((e.target as HTMLInputElement).value));
                                            nextSlot();
                                        }
                                    }}
                                />
                            )}

                            {/* Date Slot */}
                            {currentSlot.uiType === 'date' && (
                                <Input
                                    type="date"
                                    className="w-full border p-2 rounded-2xl focus:ring-2 focus:ring-ring focus:border-transparent"
                                    autoFocus
                                    onChange={(e) => {
                                        updateSlot(currentSlot.name, e.target.value);
                                        nextSlot();
                                    }}
                                />
                            )}

                            {/* Enum Slot */}
                            {currentSlot.uiType === 'enum' && (
                                <div className="flex gap-2 flex-wrap">
                                    {(currentSlot.enumOptions || []).map((opt: string) => (
                                        <Button
                                            key={opt}
                                            onClick={() => {
                                                updateSlot(currentSlot.name, opt);
                                                nextSlot();
                                            }}
                                            variant="outline"
                                            className="px-4 py-2 bg-card border border-border rounded-2xl hover:bg-primary/10 dark:hover:bg-blue-950/30 hover:border-blue-300 hover:text-primary transition-colors font-medium"
                                        >
                                            {opt}
                                        </Button>
                                    ))}
                                </div>
                            )}

                            {/* File Upload Slot Specialty */}
                            {(currentSlot.uiType as string) === 'file' && (
                                <div className="mt-4 flex flex-col items-center justify-center p-6 border-2 border-dashed border-border rounded-2xl bg-card hover:bg-accent transition-colors">
                                    <label className="cursor-pointer w-full flex flex-col items-center">
                                        <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-3">
                                            <Box size={24} />
                                        </div>
                                        <span className="text-sm font-medium text-foreground">Dosya Seçin veya Sürükleyin</span>
                                        <span className="text-xs text-muted-foreground mt-1">PDF, JPG, PNG (Max 10MB)</span>

                                        <Input
                                            type="file"
                                            className="hidden"
                                            onChange={async (e) => {
                                                const file = e.target.files?.[0];
                                                if (!file) return;

                                                const toastId = toast.loading('Yükleniyor...');
                                                try {
                                                    handleFileUpload(file);
                                                } catch (error) {
                                                    console.error(error);
                                                    toast.error('Dosya yüklenemedi');
                                                } finally {
                                                    toast.dismiss(toastId);
                                                }
                                            }}
                                        />
                                    </label>
                                </div>
                            )}

                            <div className="mt-4 text-xs text-muted-foreground">
                                {currentSlot.uiType === 'entity_search' ? 'Listeden seçin' : 'Enter ile onaylayın'}
                            </div>
                        </div>
                    )}

                    {/* Entity Preview Modal */}
                    {previewEntity && (
                        <EntityPreviewModal
                            entity={previewEntity}
                            onClose={() => setPreviewEntity(null)}
                            onAdd={(e) => {
                                handleStageEntity(e);
                                setPreviewEntity(null);
                            }}
                        />
                    )}

                    {/* Confirmation Mode */}
                    {mode === 'confirmation' && selectedAction && (
                        <div className="p-4">
                            <h3 className="text-lg font-semibold text-foreground mb-4">İşlemi Onaylayın</h3>

                            <div className="bg-gradient-to-br from-card to-muted/50 border rounded-2xl p-4 mb-4 shadow-sm">
                                <div className="flex justify-between items-center mb-3 pb-3 border-b">
                                    <span className="text-muted-foreground text-sm">İşlem</span>
                                    <span className="font-semibold text-purple-700">{selectedAction.name}</span>
                                </div>
                                <div className="flex justify-between items-center mb-3 pb-3 border-b">
                                    <span className="text-muted-foreground text-sm">Hedef</span>
                                    <span className="font-medium">
                                        {context && context.length > 0
                                            ? context.map(c => c.label).join(', ')
                                            : '-'}
                                    </span>
                                </div>
                                {Object.entries(slots)
                                    .filter(([k]) => !k.startsWith('_')) // Hide internal fields
                                    .map(([k, v]) => {
                                        const label = slots[`_${k}_label`];
                                        const displayValue = typeof label === 'string'
                                            ? label
                                            : (v !== null && v !== undefined ? String(v) : '-');

                                        return (
                                            <div key={k} className="flex justify-between items-center mb-2 text-sm">
                                                <span className="text-muted-foreground capitalize">{k.replace(/_/g, ' ')}</span>
                                                <span className="font-medium">{displayValue}</span>
                                            </div>
                                        );
                                    })}
                            </div>

                            <div className="flex gap-3 justify-end">
                                <Button
                                    onClick={handleSimulate}
                                    disabled={isExecuting}
                                    variant="outline"
                                    className="px-4 py-2 text-primary bg-primary/10 hover:bg-primary/10 rounded-2xl font-medium transition-colors disabled:opacity-50"
                                >
                                    Simüle Et
                                </Button>
                                <Button
                                    onClick={reset}
                                    variant="ghost"
                                    className="px-4 py-2 text-muted-foreground hover:bg-accent rounded-2xl transition-colors"
                                >
                                    İptal
                                </Button>
                                <Button
                                    onClick={handleConfirm}
                                    disabled={isExecuting}
                                    variant="success"
                                    className="px-6 py-2 bg-green-600 text-white rounded-2xl hover:bg-green-700 flex items-center gap-2 disabled:opacity-50 font-medium transition-colors"
                                >
                                    {isExecuting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Çalışıyor...
                                        </>
                                    ) : (
                                        <>
                                            Onayla
                                            <Check size={16} />
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Execution Result */}
                    {executionResult && (
                        <div className="p-4 text-center">
                            <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 ${executionResult.status === 'success' ? 'bg-success/10 text-success' :
                                executionResult.status === 'dry_run' ? 'bg-primary/10 text-primary' :
                                    'bg-destructive/10 text-destructive'
                                }`}>
                                {executionResult.status === 'error' ? (
                                    <AlertCircle size={28} />
                                ) : (
                                    <Check size={28} />
                                )}
                            </div>
                            <h3 className="text-lg font-bold text-foreground mb-1">
                                {executionResult.status === 'success' ? 'Başarılı!' :
                                    executionResult.status === 'dry_run' ? 'Simülasyon Tamamlandı' :
                                        'Hata'}
                            </h3>
                            <p className="text-muted-foreground mb-4">
                                {executionResult.status === 'success' ? 'İşlem başarıyla tamamlandı.' :
                                    executionResult.status === 'dry_run' ? 'Değişiklik yapılmadı.' :
                                        executionResult.error}
                            </p>

                            {executionResult.auditId && (
                                <div className="text-xs text-muted-foreground font-mono bg-muted p-2 rounded inline-block mb-4">
                                    Kayıt ID: {executionResult.auditId}
                                </div>
                            )}

                            <div className="mt-6">
                                <Button
                                    onClick={() => { onClose(); reset(); }}
                                    variant="secondary"
                                    fullWidth
                                    className="w-full py-3 bg-gray-900 text-white rounded-2xl hover:bg-gray-800 font-medium transition-colors"
                                >
                                    Kapat
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
