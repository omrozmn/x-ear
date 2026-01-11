import React, { useState, useEffect } from 'react';
import { useListAdminIntegrationVatanSmConfig, useUpdateAdminIntegrationVatanSmConfig } from '@/lib/api-client';
import { EnvelopeIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const VatanSmsSettingsPage: React.FC = () => {
    const { data: configData, isLoading } = useListAdminIntegrationVatanSmConfig();
    const updateMutation = useUpdateAdminIntegrationVatanSmConfig();

    const [approvalEmail, setApprovalEmail] = useState('');
    const [emailSubject, setEmailSubject] = useState('');
    const [emailBody, setEmailBody] = useState('');

    useEffect(() => {
        if ((configData as any)?.data) {
            setApprovalEmail((configData as any).data.approvalEmail || '');
            setEmailSubject((configData as any).data.emailTemplate?.emailSubject || '[X-Ear CRM] {{tenant_name}} - Yeni Belge Onayı');
            setEmailBody((configData as any).data.emailTemplate?.emailBodyHtml || '<h3>Merhaba,</h3><p>{{tenant_name}} adlı müşterimiz yeni belge yükledi.</p><p><strong>Belge Türleri:</strong> {{document_types}}</p><p><strong>Yükleyen:</strong> {{uploaded_by}}</p><p><strong>Tarih:</strong> {{uploaded_at}}</p><p>İyi çalışmalar,<br>X-Ear CRM Sistemi</p>');
        }
    }, [configData]);

    const handleSave = async () => {
        try {
            await updateMutation.mutateAsync({
                data: {
                    approvalEmail,
                    emailTemplate: {
                        name: 'VatanSMS Document Approval',
                        emailSubject,
                        emailBodyHtml: emailBody
                    }
                }
            });
            toast.success('VatanSMS ayarları başarıyla kaydedildi');
        } catch (error) {
            toast.error('Ayarlar kaydedilemedi');
            console.error(error);
        }
    };

    if (isLoading) {
        return (
            <div className="p-6">
                <div className="animate-pulse space-y-4">
                    <div className="h-8 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-32 bg-gray-200 rounded"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-4xl">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                    <EnvelopeIcon className="h-7 w-7 mr-2 text-primary-600" />
                    VatanSMS Entegrasyonu
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                    Belge onay süreçleri için e-posta ayarları
                </p>
            </div>

            <div className="bg-white shadow rounded-lg divide-y divide-gray-200">
                {/* Approval Email Section */}
                <div className="p-6">
                    <h2 className="text-lg font-medium text-gray-900 mb-4">
                        Belge Onay E-posta Adresi
                    </h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                E-posta Adresi
                            </label>
                            <input
                                type="email"
                                value={approvalEmail}
                                onChange={(e) => setApprovalEmail(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                                placeholder="belgeler@vatansms.com.tr"
                            />
                            <p className="mt-1 text-xs text-gray-500">
                                Aboneler tarafından yüklenen SMS sözleşme belgeleri bu adrese otomatik gönderilir
                            </p>
                        </div>
                    </div>
                </div>

                {/* Email Template Section */}
                <div className="p-6">
                    <h2 className="text-lg font-medium text-gray-900 mb-4">
                        E-posta Template Ayarları
                    </h2>
                    <div className="space-y-4">
                        {/* Subject */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                E-posta Konusu
                            </label>
                            <input
                                type="text"
                                value={emailSubject}
                                onChange={(e) => setEmailSubject(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                                placeholder="[X-Ear CRM] {{tenant_name}} - Yeni Belge Onayı"
                            />
                        </div>

                        {/* Body */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                E-posta İçeriği (HTML)
                            </label>
                            <textarea
                                rows={10}
                                value={emailBody}
                                onChange={(e) => setEmailBody(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 font-mono text-sm"
                                placeholder="<h3>Merhaba,</h3><p>{{tenant_name}} adlı müşterimiz yeni belge yükledi.</p>"
                            />
                            <p className="mt-1 text-xs text-gray-500">
                                Kullanılabilir değişkenler: <code className="bg-gray-100 px-1 py-0.5 rounded">{'{{tenant_name}}'}</code>, <code className="bg-gray-100 px-1 py-0.5 rounded">{'{{document_types}}'}</code>, <code className="bg-gray-100 px-1 py-0.5 rounded">{'{{uploaded_by}}'}</code>, <code className="bg-gray-100 px-1 py-0.5 rounded">{'{{uploaded_at}}'}</code>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Preview Section */}
                <div className="p-6 bg-gray-50">
                    <h2 className="text-lg font-medium text-gray-900 mb-4">
                        Önizleme
                    </h2>
                    <div className="bg-white border rounded-lg p-4">
                        <div className="text-sm text-gray-600 mb-2">
                            <strong>Konu:</strong> {emailSubject || '[Konu Girilmedi]'}
                        </div>
                        <div className="text-sm text-gray-600 mb-2">
                            <strong>Alıcı:</strong> {approvalEmail || '[E-posta Girilmedi]'}
                        </div>
                        <div className="border-t pt-3 mt-3">
                            <div
                                className="prose prose-sm max-w-none"
                                dangerouslySetInnerHTML={{ __html: emailBody || '[İçerik Girilmedi]' }}
                            />
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="p-6 bg-gray-50 flex justify-end space-x-3">
                    <button
                        type="button"
                        onClick={() => {
                            setApprovalEmail((configData as any)?.data?.approvalEmail || '');
                            setEmailSubject((configData as any)?.data?.emailTemplate?.emailSubject || '');
                            setEmailBody((configData as any)?.data?.emailTemplate?.emailBodyHtml || '');
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    >
                        İptal
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={updateMutation.isPending}
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {updateMutation.isPending ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Kaydediliyor...
                            </>
                        ) : (
                            <>
                                <CheckCircleIcon className="h-4 w-4 mr-2" />
                                Kaydet
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default VatanSmsSettingsPage;
