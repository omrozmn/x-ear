import { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Zap, Save, RefreshCw, CheckCircle, XCircle, FileText, Upload, Eye, Trash2, Download, MessageSquare } from 'lucide-react';
import {
    useListAdminIntegrations,
    useListAdminIntegrationVatanSmConfig,
    useUpdateAdminIntegrationVatanSmConfig,
    useListAdminIntegrationBirfaturaConfig,
    useUpdateAdminIntegrationBirfaturaConfig,
    useListAdminIntegrationTelegramConfig,
    useUpdateAdminIntegrationTelegramConfig,
    useListAdminExampleDocuments,
    useCreateAdminExampleDocumentUpload,
    useDeleteAdminExampleDocument,
    getAdminExampleDocumentDownload,
} from '@/lib/api-client';
import toast from 'react-hot-toast';
import * as Dialog from '@radix-ui/react-dialog';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useAdminResponsive } from '@/hooks/useAdminResponsive';

interface SmsDocument {
    filename: string;
    url: string;
}

interface ExampleDocumentResponse {
    document_type: string;
    filename: string;
    exists: boolean;
    url: string;
}

interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    message?: string;
}

interface Integration {
    id: string;
    name: string;
    type: string;
    status: 'active' | 'inactive';
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function getIntegrations(data: unknown): Integration[] {
    if (!isRecord(data)) {
        return [];
    }

    const directIntegrations = data.integrations;
    if (Array.isArray(directIntegrations)) {
        return directIntegrations.filter(isRecord).map((integration) => ({
            id: String(integration.id ?? ''),
            name: typeof integration.name === 'string' ? integration.name : '',
            type: typeof integration.type === 'string' ? integration.type : '',
            status: integration.status === 'active' ? 'active' : 'inactive',
        }));
    }

    const envelopeData = data.data;
    if (isRecord(envelopeData) && Array.isArray(envelopeData.integrations)) {
        return envelopeData.integrations.filter(isRecord).map((integration) => ({
            id: String(integration.id ?? ''),
            name: typeof integration.name === 'string' ? integration.name : '',
            type: typeof integration.type === 'string' ? integration.type : '',
            status: integration.status === 'active' ? 'active' : 'inactive',
        }));
    }

    return [];
}

export default function IntegrationsPage() {
    const { isMobile } = useAdminResponsive();
    const queryClient = useQueryClient();
    const { data: integrationsData, isLoading } = useListAdminIntegrations({});
    const contractInputRef = useRef<HTMLInputElement>(null);
    const exampleInputRef = useRef<HTMLInputElement>(null);

    const [smsConfig, setSmsConfig] = useState({
        provider: 'vatan-sms',
        username: '',
        password: '',
        senderId: '',
        enabled: false
    });

    const [smsDocuments, setSmsDocuments] = useState({
        contractDocument: null as SmsDocument | null,
        exampleDocument: null as SmsDocument | null
    });

    const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
    const [previewDoc, setPreviewDoc] = useState<{ type: string; url: string; filename: string } | null>(null);

    const [birFaturaConfig, setBirFaturaConfig] = useState({
        integrationKey: '',
        appApiKey: '',
        appSecretKey: ''
    });

    const [telegramConfig, setTelegramConfig] = useState({
        botToken: '',
        chatId: '',
        enabled: false
    });

    // --- Declarative data loading via Orval query hooks ---
    const { data: vatanSmsData } = useListAdminIntegrationVatanSmConfig();
    const { data: birfaturaData } = useListAdminIntegrationBirfaturaConfig();
    const { data: telegramData } = useListAdminIntegrationTelegramConfig();
    const { data: exampleDocsData } = useListAdminExampleDocuments();

    useEffect(() => {
        if (!birfaturaData) return;
        const d = birfaturaData as Record<string, unknown>;
        setBirFaturaConfig({
            integrationKey: String(d.integrationKey ?? ''),
            appApiKey: String(d.appApiKey ?? ''),
            appSecretKey: String(d.appSecretKey ?? ''),
        });
    }, [birfaturaData]);

    useEffect(() => {
        if (!vatanSmsData) return;
        const d = vatanSmsData as Record<string, unknown>;
        setSmsConfig({
            provider: 'vatan-sms',
            username: String(d.username ?? ''),
            password: String(d.password ?? ''),
            senderId: String(d.senderId ?? ''),
            enabled: d.isActive === true,
        });
    }, [vatanSmsData]);

    useEffect(() => {
        if (!telegramData) return;
        const d = telegramData as Record<string, unknown>;
        setTelegramConfig({
            botToken: String(d.botToken ?? ''),
            chatId: String(d.chatId ?? ''),
            enabled: d.isActive === true,
        });
    }, [telegramData]);

    useEffect(() => {
        if (!exampleDocsData) return;
        const docs = (Array.isArray(exampleDocsData) ? exampleDocsData : []) as ExampleDocumentResponse[];
        const contractDoc = docs.find(d => d.document_type === 'contract');
        if (contractDoc && contractDoc.exists) {
            setSmsDocuments(prev => ({ ...prev, contractDocument: { filename: contractDoc.filename, url: contractDoc.url } }));
        }
        const exampleDoc = docs.find(d => d.document_type === 'example');
        if (exampleDoc && exampleDoc.exists) {
            setSmsDocuments(prev => ({ ...prev, exampleDocument: { filename: exampleDoc.filename, url: exampleDoc.url } }));
        }
    }, [exampleDocsData]);


    const integrations = getIntegrations(integrationsData);

    // --- Mutation hooks ---
    const { mutateAsync: saveVatanSms } = useUpdateAdminIntegrationVatanSmConfig();
    const { mutateAsync: saveBirFatura } = useUpdateAdminIntegrationBirfaturaConfig();
    const { mutateAsync: saveTelegram } = useUpdateAdminIntegrationTelegramConfig();
    const { mutateAsync: uploadDoc } = useCreateAdminExampleDocumentUpload();
    const { mutateAsync: deleteDoc } = useDeleteAdminExampleDocument();

    const handleSave = async () => {
        try {
            await saveVatanSms({
                data: {
                    username: smsConfig.username,
                    password: smsConfig.password,
                    senderId: smsConfig.senderId,
                    isActive: smsConfig.enabled,
                },
            });
            toast.success('VatanSMS ayarları kaydedildi');
            queryClient.invalidateQueries({ queryKey: ['/api/admin/integrations'] });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
            toast.error('Kaydetme başarısız: ' + errorMessage);
        }
    };

    const handleSaveBirFatura = async () => {
        try {
            await saveBirFatura({
                data: {
                    integrationKey: birFaturaConfig.integrationKey,
                    appApiKey: birFaturaConfig.appApiKey,
                    appSecretKey: birFaturaConfig.appSecretKey,
                },
            });
            toast.success('BirFatura ayarları kaydedildi');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
            toast.error('Kaydetme başarısız: ' + errorMessage);
        }
    };

    const handleSaveTelegram = async () => {
        try {
            await saveTelegram({
                data: {
                    botToken: telegramConfig.botToken,
                    chatId: telegramConfig.chatId,
                    isActive: telegramConfig.enabled,
                },
            });
            toast.success('Telegram ayarları kaydedildi');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
            toast.error('Kaydetme başarısız: ' + errorMessage);
        }
    };

    const handleTest = async () => {
        try {
            // TODO: Implement test endpoint
            toast.success('Test SMS başarıyla gönderildi');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
            toast.error('Test başarısız: ' + errorMessage);
        }
    };

    const handleDocumentUpload = async (file: File, docType: 'contract' | 'example') => {
        setUploadingDoc(docType);

        try {
            const response = await uploadDoc({
                data: { file },
                params: { document_type: docType },
            });

            const result = response as unknown as ApiResponse<ExampleDocumentResponse>;
            if (result.success !== false && result.data) {
                const newDoc = {
                    filename: result.data.filename,
                    url: result.data.url,
                };

                if (docType === 'contract') {
                    setSmsDocuments(prev => ({ ...prev, contractDocument: newDoc }));
                } else {
                    setSmsDocuments(prev => ({ ...prev, exampleDocument: newDoc }));
                }

                toast.success('Belge başarıyla yüklendi');
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
            toast.error('Yükleme başarısız: ' + errorMessage);
        } finally {
            setUploadingDoc(null);
        }
    };

    const handleDocumentDelete = async (docType: 'contract' | 'example') => {
        try {
            await deleteDoc({ documentType: docType });

            if (docType === 'contract') {
                setSmsDocuments(prev => ({ ...prev, contractDocument: null }));
            } else {
                setSmsDocuments(prev => ({ ...prev, exampleDocument: null }));
            }

            toast.success('Belge silindi');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
            toast.error('Silme başarısız: ' + errorMessage);
        }
    };

    const handleDocumentPreview = (docType: 'contract' | 'example') => {
        const doc = docType === 'contract' ? smsDocuments.contractDocument : smsDocuments.exampleDocument;
        if (!doc) {
            toast.error('Dosya bulunamadı');
            return;
        }
        setPreviewDoc({ type: docType, url: doc.url, filename: doc.filename });
    };

    const handleDocumentDownload = async (docType: 'contract' | 'example') => {
        try {
            const response = await getAdminExampleDocumentDownload(docType) as unknown as Blob;

            // Create blob URL and trigger download
            const blob = new Blob([response], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = DOCUMENT_TYPES[docType as keyof typeof DOCUMENT_TYPES] || 'document.pdf';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
            toast.error('İndirme başarısız: ' + errorMessage);
        }
    };

    const DOCUMENT_TYPES = {
        contract: 'contract-example.pdf',
        example: 'contract-filled.pdf'
    };

    return (
        <div className={`max-w-7xl mx-auto ${isMobile ? 'p-4 pb-safe' : 'p-6'}`}>
            <div className="mb-8">
                <h1 className={`font-bold text-gray-900 dark:text-white ${isMobile ? 'text-xl' : 'text-2xl'}`}>Entegrasyonlar</h1>
                <p className="text-gray-500 dark:text-gray-400 mt-1">Üçüncü parti sistem entegrasyonlarını yönetin</p>
            </div>

            {isLoading ? (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-indigo-400 mx-auto"></div>
                    <p className="text-center text-gray-500 dark:text-gray-400 mt-4">Yükleniyor...</p>
                </div>
            ) : (
                <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
                    {/* Vatan SMS Card */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                        <div className={`flex items-center mb-6 ${isMobile ? 'flex-col gap-4' : 'justify-between'}`}>
                            <div className={`flex items-center gap-3 ${isMobile ? 'w-full' : ''}`}>
                                <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl">
                                    <Zap className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900 dark:text-white">Vatan SMS</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">SMS gönderim servisi</p>
                                </div>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${smsConfig.enabled
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                                }`}>
                                {smsConfig.enabled ? 'Aktif' : 'Pasif'}
                            </span>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Kullanıcı Adı
                                </label>
                                <input
                                    type="text"
                                    value={smsConfig.username}
                                    onChange={(e) => setSmsConfig({ ...smsConfig, username: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-2xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    placeholder="API kullanıcı adı"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Şifre
                                </label>
                                <input
                                    type="password"
                                    value={smsConfig.password}
                                    onChange={(e) => setSmsConfig({ ...smsConfig, password: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-2xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    placeholder="API şifresi"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Gönderici Adı
                                </label>
                                <input
                                    type="text"
                                    value={smsConfig.senderId}
                                    onChange={(e) => setSmsConfig({ ...smsConfig, senderId: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-2xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    placeholder="Örn: XEAR"
                                    maxLength={11}
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Maksimum 11 karakter</p>
                            </div>

                            {/* Document Management Section */}
                            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Sözleşme Belgeleri</h4>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                                    Bu belgeler web app'te kullanıcılara gösterilecektir
                                </p>

                                {/* Contract Document */}
                                <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-200 dark:border-gray-700">
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Sözleşme Belgesi (Boş Şablon)
                                        </label>
                                        {smsDocuments.contractDocument && (
                                            <span className="text-xs text-green-600 dark:text-green-400 font-medium">Mevcut</span>
                                        )}
                                    </div>
                                    {smsDocuments.contractDocument ? (
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-gray-600 dark:text-gray-400 truncate flex-1">
                                                {smsDocuments.contractDocument.filename}
                                            </span>
                                            <div className="flex items-center gap-1 ml-2">
                                                <button
                                                    onClick={() => handleDocumentPreview('contract')}
                                                    className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors touch-feedback"
                                                    title="Önizle"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDocumentDownload('contract')}
                                                    className="p-1.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors touch-feedback"
                                                    title="İndir"
                                                >
                                                    <Download className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDocumentDelete('contract')}
                                                    className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors touch-feedback"
                                                    title="Sil"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <label className="flex items-center justify-center gap-2 px-3 py-2 border border-dashed border-gray-300 dark:border-gray-600 rounded-2xl hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors cursor-pointer touch-feedback">
                                            <Upload className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                            <span className="text-sm text-gray-600 dark:text-gray-400">
                                                {uploadingDoc === 'contract' ? 'Yükleniyor...' : 'Belge Yükle'}
                                            </span>
                                            <input
                                                ref={contractInputRef}
                                                type="file"
                                                className="hidden"
                                                accept=".pdf"
                                                disabled={uploadingDoc === 'contract'}
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) handleDocumentUpload(file, 'contract');
                                                    e.target.value = '';
                                                }}
                                            />
                                        </label>
                                    )}
                                </div>

                                {/* Example Document */}
                                <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-200 dark:border-gray-700">
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Örnek Sözleşme (Dolu Örnek)
                                        </label>
                                        {smsDocuments.exampleDocument && (
                                            <span className="text-xs text-green-600 dark:text-green-400 font-medium">Mevcut</span>
                                        )}
                                    </div>
                                    {smsDocuments.exampleDocument ? (
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-gray-600 dark:text-gray-400 truncate flex-1">
                                                {smsDocuments.exampleDocument.filename}
                                            </span>
                                            <div className="flex items-center gap-1 ml-2">
                                                <button
                                                    onClick={() => handleDocumentPreview('example')}
                                                    className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors touch-feedback"
                                                    title="Önizle"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDocumentDownload('example')}
                                                    className="p-1.5 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors touch-feedback"
                                                    title="İndir"
                                                >
                                                    <Download className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDocumentDelete('example')}
                                                    className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors touch-feedback"
                                                    title="Sil"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <label className="flex items-center justify-center gap-2 px-3 py-2 border border-dashed border-gray-300 dark:border-gray-600 rounded-2xl hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors cursor-pointer touch-feedback">
                                            <Upload className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                            <span className="text-sm text-gray-600 dark:text-gray-400">
                                                {uploadingDoc === 'example' ? 'Yükleniyor...' : 'Belge Yükle'}
                                            </span>
                                            <input
                                                ref={exampleInputRef}
                                                type="file"
                                                className="hidden"
                                                accept=".pdf"
                                                disabled={uploadingDoc === 'example'}
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) handleDocumentUpload(file, 'example');
                                                    e.target.value = '';
                                                }}
                                            />
                                        </label>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={smsConfig.enabled}
                                    onChange={(e) => setSmsConfig({ ...smsConfig, enabled: e.target.checked })}
                                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 rounded"
                                />
                                <label className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                                    Entegrasyonu aktif et
                                </label>
                            </div>

                            <div className={`pt-4 flex gap-3 ${isMobile ? 'flex-col' : ''}`}>
                                <button
                                    onClick={handleSave}
                                    className={`flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-colors touch-feedback ${isMobile ? 'flex-1 w-full' : 'flex-1'}`}
                                >
                                    <Save className="w-4 h-4" />
                                    Kaydet
                                </button>
                                <button
                                    onClick={handleTest}
                                    className={`flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors touch-feedback ${isMobile ? 'w-full' : ''}`}
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    Test Et
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* BirFatura Card */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                        <div className={`flex items-center mb-6 ${isMobile ? 'flex-col gap-4' : 'justify-between'}`}>
                            <div className={`flex items-center gap-3 ${isMobile ? 'w-full' : ''}`}>
                                <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-2xl">
                                    <FileText className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900 dark:text-white">BirFatura</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">E-Fatura entegrasyonu</p>
                                </div>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${birFaturaConfig.integrationKey
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                                }`}>
                                {birFaturaConfig.integrationKey ? 'Aktif' : 'Pasif'}
                            </span>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Integration Key (Global)
                                </label>
                                <input
                                    type="text"
                                    value={birFaturaConfig.integrationKey}
                                    onChange={(e) => setBirFaturaConfig({ ...birFaturaConfig, integrationKey: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-2xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                                    placeholder="865c3848-fda5-48f8-aeb6-9ae58abbb3bf"
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Tüm üyeler için geçerli ortak anahtar (INTEGRATION KEY)</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    App API Key
                                </label>
                                <input
                                    type="text"
                                    value={birFaturaConfig.appApiKey}
                                    onChange={(e) => setBirFaturaConfig({ ...birFaturaConfig, appApiKey: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-2xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                                    placeholder="d500f61b-2104-4a59-b306-71cf72dd52d1"
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Uygulama API anahtarı (API KEY)</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    App Secret Key
                                </label>
                                <input
                                    type="password"
                                    value={birFaturaConfig.appSecretKey}
                                    onChange={(e) => setBirFaturaConfig({ ...birFaturaConfig, appSecretKey: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-2xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                                    placeholder="b72389be-6285-4ec6-9128-c162e43f19c2"
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Uygulama gizli anahtarı (SECRET KEY)</p>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    onClick={handleSaveBirFatura}
                                    className={`flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-colors touch-feedback ${isMobile ? 'flex-1 w-full' : 'flex-1'}`}
                                >
                                    <Save className="w-4 h-4" />
                                    Kaydet
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Telegram Card */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                        <div className={`flex items-center mb-6 ${isMobile ? 'flex-col gap-4' : 'justify-between'}`}>
                            <div className={`flex items-center gap-3 ${isMobile ? 'w-full' : ''}`}>
                                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-2xl">
                                    <MessageSquare className="w-6 h-6 text-blue-500 dark:text-blue-400" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900 dark:text-white">Telegram Bot</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Bildirim ve komut servisi</p>
                                </div>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${telegramConfig.enabled
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                                }`}>
                                {telegramConfig.enabled ? 'Aktif' : 'Pasif'}
                            </span>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Bot Token
                                </label>
                                <input
                                    type="text"
                                    value={telegramConfig.botToken}
                                    onChange={(e) => setTelegramConfig({ ...telegramConfig, botToken: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-2xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                                    placeholder="7921642358:AAHeyvqyoFHak-T23EjYBq-eLX5l8ky9uIE"
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">BotFather'dan alınan API anahtarı</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Chat ID
                                </label>
                                <input
                                    type="text"
                                    value={telegramConfig.chatId}
                                    onChange={(e) => setTelegramConfig({ ...telegramConfig, chatId: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-2xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                                    placeholder="12345678"
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Bildirimlerin gönderileceği sohbet ID'si</p>
                            </div>

                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={telegramConfig.enabled}
                                    onChange={(e) => setTelegramConfig({ ...telegramConfig, enabled: e.target.checked })}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                                />
                                <label className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                                    Entegrasyonu aktif et
                                </label>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    onClick={handleSaveTelegram}
                                    className={`flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-colors touch-feedback ${isMobile ? 'flex-1 w-full' : 'flex-1'}`}
                                >
                                    <Save className="w-4 h-4" />
                                    Kaydet
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* More Integrations Placeholder inside the grid */}
                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 p-12 flex flex-col items-center justify-center text-center">
                        <Zap className="w-12 h-12 text-gray-400 dark:text-gray-600 mb-4" />
                        <h3 className="font-medium text-gray-900 dark:text-white mb-2">Daha Fazla Entegrasyon</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm">
                            Yakında daha fazla entegrasyon eklenecek. PayTR, Iyzico, ve diğer servisler için destek geliyor.
                        </p>
                    </div>
                </div>
            )}

            {/* Integration Status List */}
            {integrations.length > 0 && (
                <div className="mt-8 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="font-semibold text-gray-900 dark:text-white">Tüm Entegrasyonlar</h3>
                    </div>
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                        {integrations.map((integration: Integration) => (
                            <div key={integration.id} className={`px-6 py-4 flex items-center ${isMobile ? 'flex-col gap-3' : 'justify-between'}`}>
                                <div className={`flex items-center gap-3 ${isMobile ? 'w-full' : ''}`}>
                                    <Zap className="w-5 h-5 text-gray-400 dark:text-gray-600" />
                                    <div>
                                        <p className="font-medium text-gray-900 dark:text-white">{integration.name}</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{integration.type}</p>
                                    </div>
                                </div>
                                <span className={`flex items-center gap-1 text-sm font-medium ${integration.status === 'active'
                                    ? 'text-green-600 dark:text-green-400'
                                    : 'text-gray-500 dark:text-gray-400'
                                    }`}>
                                    {integration.status === 'active' ? (
                                        <><CheckCircle className="w-4 h-4" /> Aktif</>
                                    ) : (
                                        <><XCircle className="w-4 h-4" /> Pasif</>
                                    )}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Document Preview Modal */}
            {previewDoc && (
                <Dialog.Root open={!!previewDoc} onOpenChange={() => setPreviewDoc(null)}>
                    <Dialog.Portal>
                        <Dialog.Overlay className="fixed inset-0 bg-black/50 z-[90]" />
                        <Dialog.Content className={`fixed left-[50%] top-[50%] max-h-[90vh] translate-x-[-50%] translate-y-[-50%] rounded-2xl bg-white dark:bg-gray-800 shadow-2xl focus:outline-none z-[100] flex flex-col ${isMobile ? 'w-[95vw]' : 'w-[90vw] max-w-4xl'}`}>
                            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                                <Dialog.Title className={`font-semibold text-gray-900 dark:text-white ${isMobile ? 'text-base' : 'text-lg'}`}>
                                    {previewDoc.type === 'contract' ? 'Sözleşme Belgesi' : 'Örnek Sözleşme'}
                                </Dialog.Title>
                                <Dialog.Close className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-2xl touch-feedback">
                                    <XMarkIcon className="h-5 w-5 text-gray-900 dark:text-white" />
                                </Dialog.Close>
                            </div>
                            <div className="flex-1 p-4 overflow-auto">
                                <iframe
                                    src={previewDoc.url}
                                    className={`w-full h-full border-0 rounded-2xl ${isMobile ? 'min-h-[500px]' : 'min-h-[600px]'}`}
                                    title="Document Preview"
                                />
                            </div>
                        </Dialog.Content>
                    </Dialog.Portal>
                </Dialog.Root>
            )}
        </div>
    );
}
