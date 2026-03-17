import React, { useState } from 'react';
import { useListAdminNotificationTemplates, useCreateAdminNotificationSend } from '@/lib/api-client';
import type { EmailTemplateRead, NotificationSend, ResponseEnvelopeListEmailTemplateRead } from '@/api/generated/schemas';
import {
    PaperAirplaneIcon,
    PlusIcon,
    ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { unwrapArray } from '@/lib/orval-response';

function getTemplates(data: ResponseEnvelopeListEmailTemplateRead | undefined): EmailTemplateRead[] {
    return unwrapArray<EmailTemplateRead>(data).filter((template): template is EmailTemplateRead => typeof template?.id === 'string');
}

const AdminNotificationsPage: React.FC = () => {
    const { data: templatesData, isLoading: templatesLoading } = useListAdminNotificationTemplates();
    const sendNotificationMutation = useCreateAdminNotificationSend();

    const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplateRead | null>(null);
    const [targetType, setTargetType] = useState<'user' | 'tenant' | 'all'>('all');
    const [targetId, setTargetId] = useState('');
    const [customTitle, setCustomTitle] = useState('');
    const [customMessage, setCustomMessage] = useState('');

    const templates = getTemplates(templatesData);

    const handleSend = async () => {
        if (!customTitle || !customMessage) {
            toast.error('Başlık ve mesaj zorunludur');
            return;
        }

        try {
            const payload: NotificationSend = {
                targetType,
                targetId: targetId || undefined,
                title: customTitle,
                message: customMessage,
                type: 'info'
            };

            await sendNotificationMutation.mutateAsync({
                data: payload
            });
            toast.success('Bildirim başarıyla gönderildi');
            setCustomTitle('');
            setCustomMessage('');
        } catch {
            toast.error('Bildirim gönderilemedi');
        }
    };

    const handleTemplateSelect = (template: EmailTemplateRead) => {
        setSelectedTemplate(template);
        setCustomTitle(template.titleTemplate || '');
        setCustomMessage(template.bodyTemplate || '');
    };

    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Bildirim Yönetimi</h1>
                <p className="mt-1 text-sm text-gray-500">
                    Kullanıcılara ve abonelere bildirim gönderin ve şablonları yönetin
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Send Notification Form */}
                <div className="lg:col-span-2">
                    <div className="bg-white shadow rounded-2xl p-6">
                        <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                            <PaperAirplaneIcon className="h-5 w-5 mr-2 text-primary-600" />
                            Bildirim Gönder
                        </h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Hedef Kitle</label>
                                <select
                                    value={targetType}
                                    onChange={(e) => setTargetType(e.target.value as 'user' | 'tenant' | 'all')}
                                    className="mt-1 block w-full rounded-xl border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                                >
                                    <option value="all">Tüm Kullanıcılar</option>
                                    <option value="tenant">Belirli Bir Tenant</option>
                                    <option value="user">Belirli Bir Kullanıcı</option>
                                </select>
                            </div>

                            {targetType !== 'all' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">
                                        {targetType === 'tenant' ? 'Tenant ID' : 'User ID'}
                                    </label>
                                    <input
                                        type="text"
                                        value={targetId}
                                        onChange={(e) => setTargetId(e.target.value)}
                                        className="mt-1 block w-full rounded-xl border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                                        placeholder={targetType === 'tenant' ? 'tnt_...' : 'usr_...'}
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Başlık</label>
                                <input
                                    type="text"
                                    value={customTitle}
                                    onChange={(e) => setCustomTitle(e.target.value)}
                                    className="mt-1 block w-full rounded-xl border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Mesaj</label>
                                <textarea
                                    rows={4}
                                    value={customMessage}
                                    onChange={(e) => setCustomMessage(e.target.value)}
                                    className="mt-1 block w-full rounded-xl border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                                />
                            </div>

                            <div className="flex justify-end">
                                <button
                                    onClick={handleSend}
                                    disabled={sendNotificationMutation.isPending}
                                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                                >
                                    {sendNotificationMutation.isPending ? 'Gönderiliyor...' : 'Gönder'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Templates List */}
                <div className="lg:col-span-1">
                    <div className="bg-white shadow rounded-2xl p-6 h-full">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-medium text-gray-900 flex items-center">
                                <ChatBubbleLeftRightIcon className="h-5 w-5 mr-2 text-primary-600" />
                                Şablonlar
                            </h2>
                            {/* Add Template Button (Placeholder) */}
                            <button className="p-1 text-gray-400 hover:text-gray-600">
                                <PlusIcon className="h-5 w-5" />
                            </button>
                        </div>

                        {templatesLoading ? (
                            <div className="text-center py-4 text-gray-500">Yükleniyor...</div>
                        ) : (
                            <div className="space-y-3">
                                {templates.map((template) => (
                                    <div
                                        key={template.id}
                                        onClick={() => handleTemplateSelect(template)}
                                        className={`p-3 rounded-xl border cursor-pointer transition-colors ${selectedTemplate?.id === template.id
                                            ? 'border-primary-500 bg-primary-50'
                                            : 'border-gray-200 hover:bg-gray-50'
                                            }`}
                                    >
                                        <div className="font-medium text-sm text-gray-900">{template.name}</div>
                                        <div className="text-xs text-gray-500 mt-1">{template.description}</div>
                                        <div className="mt-2 flex items-center space-x-2">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${template.channel === 'sms' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                                                }`}>
                                                {(template.channel || 'unknown').toUpperCase()}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminNotificationsPage;
