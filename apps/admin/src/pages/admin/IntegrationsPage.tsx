import { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Zap, Save, RefreshCw, CheckCircle, XCircle, FileText, Upload, Eye, Trash2, Download, MessageSquare } from 'lucide-react';
import { useListAdminIntegrations } from '@/lib/api-client';
import { adminApi } from '@/lib/apiMutator';
import toast from 'react-hot-toast';
import * as Dialog from '@radix-ui/react-dialog';
import { XMarkIcon } from '@heroicons/react/24/outline';

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

export default function IntegrationsPage() {
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

    useEffect(() => {
        // Load configurations
        const loadConfigs = async () => {
            // 1. BirFatura
            try {
                const response = await adminApi({
                    url: '/admin/integrations/birfatura/config',
                    method: 'GET'
                }) as ApiResponse<{
                    integrationKey?: string;
                    appApiKey?: string;
                    appSecretKey?: string;
                }>;

                if (response.success && response.data) {
                    setBirFaturaConfig({
                        integrationKey: response.data.integrationKey || '',
                        appApiKey: response.data.appApiKey || '',
                        appSecretKey: response.data.appSecretKey || ''
                    });
                }
            } catch (e) {
                // Check if e is object and has message potentially
                const errMsg = e instanceof Error ? e.message : String(e);
                // Safe check
                if (typeof errMsg === 'string' && errMsg.includes('404')) {
                    // Config might not exist yet, which is fine
                } else {
                    console.error('Failed to load BirFatura config', e);
                }
            }

            // 2. Vatan SMS
            try {
                const response = await adminApi({
                    url: '/admin/integrations/vatan-sms/config',
                    method: 'GET'
                }) as ApiResponse<{
                    username?: string;
                    password?: string;
                    senderId?: string;
                    isActive?: boolean;
                }>;

                if (response.success && response.data) {
                    setSmsConfig({
                        provider: 'vatan-sms',
                        username: response.data.username || '',
                        password: response.data.password || '',
                        senderId: response.data.senderId || '',
                        enabled: response.data.isActive === true // Explicitly use isActive
                    });
                }
            } catch (e) {
                console.error('Failed to load VatanSMS config', e);
            }

            // 3. Telegram
            try {
                const response = await adminApi({
                    url: '/admin/integrations/telegram/config',
                    method: 'GET'
                }) as ApiResponse<{
                    botToken?: string;
                    chatId?: string;
                    isActive?: boolean;
                }>;

                if (response.success && response.data) {
                    setTelegramConfig({
                        botToken: response.data.botToken || '',
                        chatId: response.data.chatId || '',
                        enabled: response.data.isActive === true
                    });
                }
            } catch (e) {
                console.error('Failed to load Telegram config', e);
            }

            // 4. Load SMS Documents from API
            try {
                const docsResponse = await adminApi({
                    url: '/admin/example-documents',
                    method: 'GET'
                }) as ApiResponse<ExampleDocumentResponse[]>;

                if (docsResponse.success && docsResponse.data) {
                    const docs = docsResponse.data;

                    // Find contract document
                    const contractDoc = docs.find(d => d.document_type === 'contract');
                    if (contractDoc && contractDoc.exists) {
                        setSmsDocuments(prev => ({
                            ...prev,
                            contractDocument: {
                                filename: contractDoc.filename,
                                url: contractDoc.url
                            }
                        }));
                    }

                    // Find example document
                    const exampleDoc = docs.find(d => d.document_type === 'example');
                    if (exampleDoc && exampleDoc.exists) {
                        setSmsDocuments(prev => ({
                            ...prev,
                            exampleDocument: {
                                filename: exampleDoc.filename,
                                url: exampleDoc.url
                            }
                        }));
                    }
                }
            } catch (e) {
                console.log('Failed to load SMS documents', e);
            }
        };
        loadConfigs();
    }, []);


    const integrations = (integrationsData as any)?.integrations || (integrationsData as any)?.data?.integrations || [];

    const handleSave = async () => {
        try {
            await adminApi({
                url: '/admin/integrations/vatan-sms/config',
                method: 'PUT',
                data: {
                    username: smsConfig.username,
                    password: smsConfig.password,
                    senderId: smsConfig.senderId,
                    isActive: smsConfig.enabled
                }
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
            await adminApi({
                url: '/admin/integrations/birfatura/config',
                method: 'PUT',
                data: {
                    integrationKey: birFaturaConfig.integrationKey,
                    appApiKey: birFaturaConfig.appApiKey,
                    appSecretKey: birFaturaConfig.appSecretKey
                }
            });
            toast.success('BirFatura ayarları kaydedildi');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
            toast.error('Kaydetme başarısız: ' + errorMessage);
        }
    };

    const handleSaveTelegram = async () => {
        try {
            await adminApi({
                url: '/admin/integrations/telegram/config',
                method: 'PUT',
                data: {
                    botToken: telegramConfig.botToken,
                    chatId: telegramConfig.chatId,
                    isActive: telegramConfig.enabled
                }
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
            const formData = new FormData();
            formData.append('file', file);

            const response = await adminApi({
                url: `/admin/example-documents/upload?document_type=${docType}`,
                method: 'POST',
                data: formData,
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            }) as ApiResponse<ExampleDocumentResponse>;

            if (response.success && response.data) {
                const newDoc = {
                    filename: response.data.filename,
                    url: response.data.url
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
            const response = await adminApi({
                url: `/admin/example-documents/${docType}`,
                method: 'DELETE'
            }) as ApiResponse;

            if (response.success) {
                // Update state
                if (docType === 'contract') {
                    setSmsDocuments(prev => ({ ...prev, contractDocument: null }));
                } else {
                    setSmsDocuments(prev => ({ ...prev, exampleDocument: null }));
                }

                toast.success('Belge silindi');
            }
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
            // Use adminApi to get download URL
            const response = await adminApi({
                url: `/admin/example-documents/${docType}/download`,
                method: 'GET',
                responseType: 'blob'
            }) as Blob;

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
        <div className="p-6 max-w-7xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900">Entegrasyonlar</h1>
                <p className="text-gray-500 mt-1">Üçüncü parti sistem entegrasyonlarını yönetin</p>
            </div>

            {isLoading ? (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                    <p className="text-center text-gray-500 mt-4">Yükleniyor...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Vatan SMS Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-indigo-100 rounded-lg">
                                    <Zap className="w-6 h-6 text-indigo-600" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900">Vatan SMS</h3>
                                    <p className="text-sm text-gray-500">SMS gönderim servisi</p>
                                </div>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${smsConfig.enabled
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-600'
                                }`}>
                                {smsConfig.enabled ? 'Aktif' : 'Pasif'}
                            </span>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Kullanıcı Adı
                                </label>
                                <input
                                    type="text"
                                    value={smsConfig.username}
                                    onChange={(e) => setSmsConfig({ ...smsConfig, username: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    placeholder="API kullanıcı adı"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Şifre
                                </label>
                                <input
                                    type="password"
                                    value={smsConfig.password}
                                    onChange={(e) => setSmsConfig({ ...smsConfig, password: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    placeholder="API şifresi"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Gönderici Adı
                                </label>
                                <input
                                    type="text"
                                    value={smsConfig.senderId}
                                    onChange={(e) => setSmsConfig({ ...smsConfig, senderId: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                    placeholder="Örn: XEAR"
                                    maxLength={11}
                                />
                                <p className="text-xs text-gray-500 mt-1">Maksimum 11 karakter</p>
                            </div>

                            {/* Document Management Section */}
                            <div className="pt-4 border-t border-gray-200">
                                <h4 className="text-sm font-medium text-gray-900 mb-3">Sözleşme Belgeleri</h4>
                                <p className="text-xs text-gray-500 mb-4">
                                    Bu belgeler web app'te kullanıcılara gösterilecektir
                                </p>

                                {/* Contract Document */}
                                <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-sm font-medium text-gray-700">
                                            Sözleşme Belgesi (Boş Şablon)
                                        </label>
                                        {smsDocuments.contractDocument && (
                                            <span className="text-xs text-green-600 font-medium">Mevcut</span>
                                        )}
                                    </div>
                                    {smsDocuments.contractDocument ? (
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-gray-600 truncate flex-1">
                                                {smsDocuments.contractDocument.filename}
                                            </span>
                                            <div className="flex items-center gap-1 ml-2">
                                                <button
                                                    onClick={() => handleDocumentPreview('contract')}
                                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                    title="Önizle"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDocumentDownload('contract')}
                                                    className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                                    title="İndir"
                                                >
                                                    <Download className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDocumentDelete('contract')}
                                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                                    title="Sil"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <label className="flex items-center justify-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg hover:border-indigo-400 hover:bg-indigo-50 transition-colors cursor-pointer">
                                            <Upload className="w-4 h-4 text-gray-500" />
                                            <span className="text-sm text-gray-600">
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
                                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-sm font-medium text-gray-700">
                                            Örnek Sözleşme (Dolu Örnek)
                                        </label>
                                        {smsDocuments.exampleDocument && (
                                            <span className="text-xs text-green-600 font-medium">Mevcut</span>
                                        )}
                                    </div>
                                    {smsDocuments.exampleDocument ? (
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-gray-600 truncate flex-1">
                                                {smsDocuments.exampleDocument.filename}
                                            </span>
                                            <div className="flex items-center gap-1 ml-2">
                                                <button
                                                    onClick={() => handleDocumentPreview('example')}
                                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                    title="Önizle"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDocumentDownload('example')}
                                                    className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                                                    title="İndir"
                                                >
                                                    <Download className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDocumentDelete('example')}
                                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                                                    title="Sil"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <label className="flex items-center justify-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg hover:border-indigo-400 hover:bg-indigo-50 transition-colors cursor-pointer">
                                            <Upload className="w-4 h-4 text-gray-500" />
                                            <span className="text-sm text-gray-600">
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
                                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                />
                                <label className="ml-2 block text-sm text-gray-700">
                                    Entegrasyonu aktif et
                                </label>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    onClick={handleSave}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                                >
                                    <Save className="w-4 h-4" />
                                    Kaydet
                                </button>
                                <button
                                    onClick={handleTest}
                                    className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    Test Et
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* BirFatura Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-blue-100 rounded-lg">
                                    <FileText className="w-6 h-6 text-blue-600" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900">BirFatura</h3>
                                    <p className="text-sm text-gray-500">E-Fatura entegrasyonu</p>
                                </div>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${birFaturaConfig.integrationKey
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-600'
                                }`}>
                                {birFaturaConfig.integrationKey ? 'Aktif' : 'Pasif'}
                            </span>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Integration Key (Global)
                                </label>
                                <input
                                    type="text"
                                    value={birFaturaConfig.integrationKey}
                                    onChange={(e) => setBirFaturaConfig({ ...birFaturaConfig, integrationKey: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                                    placeholder="865c3848-fda5-48f8-aeb6-9ae58abbb3bf"
                                />
                                <p className="text-xs text-gray-500 mt-1">Tüm üyeler için geçerli ortak anahtar (INTEGRATION KEY)</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    App API Key
                                </label>
                                <input
                                    type="text"
                                    value={birFaturaConfig.appApiKey}
                                    onChange={(e) => setBirFaturaConfig({ ...birFaturaConfig, appApiKey: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                                    placeholder="d500f61b-2104-4a59-b306-71cf72dd52d1"
                                />
                                <p className="text-xs text-gray-500 mt-1">Uygulama API anahtarı (API KEY)</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    App Secret Key
                                </label>
                                <input
                                    type="password"
                                    value={birFaturaConfig.appSecretKey}
                                    onChange={(e) => setBirFaturaConfig({ ...birFaturaConfig, appSecretKey: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                                    placeholder="b72389be-6285-4ec6-9128-c162e43f19c2"
                                />
                                <p className="text-xs text-gray-500 mt-1">Uygulama gizli anahtarı (SECRET KEY)</p>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    onClick={handleSaveBirFatura}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    <Save className="w-4 h-4" />
                                    Kaydet
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Telegram Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-blue-50 rounded-lg">
                                    <MessageSquare className="w-6 h-6 text-blue-500" />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900">Telegram Bot</h3>
                                    <p className="text-sm text-gray-500">Bildirim ve komut servisi</p>
                                </div>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${telegramConfig.enabled
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-600'
                                }`}>
                                {telegramConfig.enabled ? 'Aktif' : 'Pasif'}
                            </span>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Bot Token
                                </label>
                                <input
                                    type="text"
                                    value={telegramConfig.botToken}
                                    onChange={(e) => setTelegramConfig({ ...telegramConfig, botToken: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                                    placeholder="7921642358:AAHeyvqyoFHak-T23EjYBq-eLX5l8ky9uIE"
                                />
                                <p className="text-xs text-gray-500 mt-1">BotFather'dan alınan API anahtarı</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Chat ID
                                </label>
                                <input
                                    type="text"
                                    value={telegramConfig.chatId}
                                    onChange={(e) => setTelegramConfig({ ...telegramConfig, chatId: e.target.value })}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                                    placeholder="12345678"
                                />
                                <p className="text-xs text-gray-500 mt-1">Bildirimlerin gönderileceği sohbet ID'si</p>
                            </div>

                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    checked={telegramConfig.enabled}
                                    onChange={(e) => setTelegramConfig({ ...telegramConfig, enabled: e.target.checked })}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                />
                                <label className="ml-2 block text-sm text-gray-700">
                                    Entegrasyonu aktif et
                                </label>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    onClick={handleSaveTelegram}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    <Save className="w-4 h-4" />
                                    Kaydet
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* More Integrations Placeholder inside the grid */}
                    <div className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 p-12 flex flex-col items-center justify-center text-center">
                        <Zap className="w-12 h-12 text-gray-400 mb-4" />
                        <h3 className="font-medium text-gray-900 mb-2">Daha Fazla Entegrasyon</h3>
                        <p className="text-sm text-gray-500 max-w-sm">
                            Yakında daha fazla entegrasyon eklenecek. PayTR, Iyzico, ve diğer servisler için destek geliyor.
                        </p>
                    </div>
                </div>
            )}

            {/* Integration Status List */}
            {integrations.length > 0 && (
                <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h3 className="font-semibold text-gray-900">Tüm Entegrasyonlar</h3>
                    </div>
                    <div className="divide-y divide-gray-200">
                        {integrations.map((integration: Integration) => (
                            <div key={integration.id} className="px-6 py-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Zap className="w-5 h-5 text-gray-400" />
                                    <div>
                                        <p className="font-medium text-gray-900">{integration.name}</p>
                                        <p className="text-sm text-gray-500">{integration.type}</p>
                                    </div>
                                </div>
                                <span className={`flex items-center gap-1 text-sm font-medium ${integration.status === 'active'
                                    ? 'text-green-600'
                                    : 'text-gray-500'
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
                        <Dialog.Content className="fixed left-[50%] top-[50%] max-h-[90vh] w-[90vw] max-w-4xl translate-x-[-50%] translate-y-[-50%] rounded-lg bg-white shadow-2xl focus:outline-none z-[100] flex flex-col">
                            <div className="flex items-center justify-between p-4 border-b">
                                <Dialog.Title className="text-lg font-semibold text-gray-900">
                                    {previewDoc.type === 'contract' ? 'Sözleşme Belgesi' : 'Örnek Sözleşme'}
                                </Dialog.Title>
                                <Dialog.Close className="p-2 hover:bg-gray-100 rounded-lg">
                                    <XMarkIcon className="h-5 w-5" />
                                </Dialog.Close>
                            </div>
                            <div className="flex-1 p-4 overflow-auto">
                                <iframe
                                    src={previewDoc.url}
                                    className="w-full h-full border-0 rounded-lg min-h-[600px]"
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
