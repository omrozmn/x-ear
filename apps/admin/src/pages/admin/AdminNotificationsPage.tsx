import React, { useState } from 'react';
import { useListAdminNotificationTemplates, useCreateAdminNotificationSend } from '@/lib/api-client';
import type { EmailTemplateRead, NotificationSend, ResponseEnvelopeListEmailTemplateRead } from '@/api/generated/schemas';
import {
    PaperAirplaneIcon,
    PlusIcon,
    ChatBubbleLeftRightIcon,
    FunnelIcon,
    CheckIcon,
    CheckCircleIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { unwrapArray } from '@/lib/orval-response';

function getTemplates(data: ResponseEnvelopeListEmailTemplateRead | undefined): EmailTemplateRead[] {
    return unwrapArray<EmailTemplateRead>(data).filter((template): template is EmailTemplateRead => typeof template?.id === 'string');
}

type NotificationType = 'info' | 'warning' | 'error' | 'success' | 'system';

const NOTIFICATION_TYPES: { value: NotificationType | 'all'; label: string; color: string }[] = [
    { value: 'all', label: 'Tumu', color: 'bg-gray-100 text-gray-800' },
    { value: 'info', label: 'Bilgilendirme', color: 'bg-blue-100 text-blue-800' },
    { value: 'warning', label: 'Uyari', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'error', label: 'Hata', color: 'bg-red-100 text-red-800' },
    { value: 'success', label: 'Basari', color: 'bg-green-100 text-green-800' },
    { value: 'system', label: 'Sistem', color: 'bg-purple-100 text-purple-800' },
];

const AdminNotificationsPage: React.FC = () => {
    const { data: templatesData, isLoading: templatesLoading } = useListAdminNotificationTemplates();
    const sendNotificationMutation = useCreateAdminNotificationSend();

    const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplateRead | null>(null);
    const [targetType, setTargetType] = useState<'user' | 'tenant' | 'all'>('all');
    const [targetId, setTargetId] = useState('');
    const [customTitle, setCustomTitle] = useState('');
    const [customMessage, setCustomMessage] = useState('');
    const [notificationType, setNotificationType] = useState<NotificationType>('info');
    const [typeFilter, setTypeFilter] = useState<NotificationType | 'all'>('all');
    const [channelFilter, setChannelFilter] = useState<'all' | 'sms' | 'email' | 'push'>('all');
    const [selectedTemplateIds, setSelectedTemplateIds] = useState<Set<string>>(new Set());
    const [selectAll, setSelectAll] = useState(false);

    const templates = getTemplates(templatesData);

    // Filter templates by channel
    const filteredTemplates = templates.filter((template) => {
        if (channelFilter === 'all') return true;
        return template.channel === channelFilter;
    });

    const handleSend = async () => {
        if (!customTitle || !customMessage) {
            toast.error('Baslik ve mesaj zorunludur');
            return;
        }

        try {
            const payload: NotificationSend = {
                targetType,
                targetId: targetId || undefined,
                title: customTitle,
                message: customMessage,
                type: notificationType,
            };

            await sendNotificationMutation.mutateAsync({
                data: payload
            });
            toast.success('Bildirim basariyla gonderildi');
            setCustomTitle('');
            setCustomMessage('');
        } catch {
            toast.error('Bildirim gonderilemedi');
        }
    };

    const handleTemplateSelect = (template: EmailTemplateRead) => {
        setSelectedTemplate(template);
        setCustomTitle(template.titleTemplate || '');
        setCustomMessage(template.bodyTemplate || '');
    };

    const handleSelectAll = () => {
        if (selectAll) {
            setSelectedTemplateIds(new Set());
        } else {
            setSelectedTemplateIds(new Set(filteredTemplates.map((t) => t.id)));
        }
        setSelectAll(!selectAll);
    };

    const handleToggleTemplate = (id: string) => {
        const next = new Set(selectedTemplateIds);
        if (next.has(id)) {
            next.delete(id);
        } else {
            next.add(id);
        }
        setSelectedTemplateIds(next);
        setSelectAll(next.size === filteredTemplates.length && filteredTemplates.length > 0);
    };

    const handleBulkActivate = () => {
        toast.success(`${selectedTemplateIds.size} sablon aktif olarak isaretlendi`);
        setSelectedTemplateIds(new Set());
        setSelectAll(false);
    };

    const handleBulkDeactivate = () => {
        toast.success(`${selectedTemplateIds.size} sablon pasif olarak isaretlendi`);
        setSelectedTemplateIds(new Set());
        setSelectAll(false);
    };

    return (
        <div className="p-6">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Bildirim Yonetimi</h1>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Kullanicilara ve abonelere bildirim gonderin ve sablonlari yonetin
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Send Notification Form */}
                <div className="lg:col-span-2">
                    <div className="bg-white dark:bg-gray-800 shadow rounded-2xl p-6">
                        <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                            <PaperAirplaneIcon className="h-5 w-5 mr-2 text-primary-600" />
                            Bildirim Gonder
                        </h2>

                        <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Hedef Kitle</label>
                                    <select
                                        value={targetType}
                                        onChange={(e) => setTargetType(e.target.value as 'user' | 'tenant' | 'all')}
                                        className="mt-1 block w-full rounded-xl border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                                    >
                                        <option value="all">Tum Kullanicilar</option>
                                        <option value="tenant">Belirli Bir Tenant</option>
                                        <option value="user">Belirli Bir Kullanici</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Bildirim Tipi</label>
                                    <select
                                        value={notificationType}
                                        onChange={(e) => setNotificationType(e.target.value as NotificationType)}
                                        className="mt-1 block w-full rounded-xl border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                                    >
                                        <option value="info">Bilgilendirme</option>
                                        <option value="warning">Uyari</option>
                                        <option value="error">Hata</option>
                                        <option value="success">Basari</option>
                                        <option value="system">Sistem</option>
                                    </select>
                                </div>
                            </div>

                            {targetType !== 'all' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                        {targetType === 'tenant' ? 'Tenant ID' : 'User ID'}
                                    </label>
                                    <input
                                        type="text"
                                        value={targetId}
                                        onChange={(e) => setTargetId(e.target.value)}
                                        className="mt-1 block w-full rounded-xl border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                                        placeholder={targetType === 'tenant' ? 'tnt_...' : 'usr_...'}
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Baslik</label>
                                <input
                                    type="text"
                                    value={customTitle}
                                    onChange={(e) => setCustomTitle(e.target.value)}
                                    className="mt-1 block w-full rounded-xl border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Mesaj</label>
                                <textarea
                                    rows={4}
                                    value={customMessage}
                                    onChange={(e) => setCustomMessage(e.target.value)}
                                    className="mt-1 block w-full rounded-xl border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                                />
                            </div>

                            <div className="flex justify-end">
                                <button
                                    onClick={handleSend}
                                    disabled={sendNotificationMutation.isPending}
                                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-xl shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                                >
                                    {sendNotificationMutation.isPending ? 'Gonderiliyor...' : 'Gonder'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Templates List */}
                <div className="lg:col-span-1">
                    <div className="bg-white dark:bg-gray-800 shadow rounded-2xl p-6 h-full">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
                                <ChatBubbleLeftRightIcon className="h-5 w-5 mr-2 text-primary-600" />
                                Sablonlar
                            </h2>
                            <button className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                                <PlusIcon className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Channel Filter */}
                        <div className="flex items-center gap-2 mb-4">
                            <FunnelIcon className="h-4 w-4 text-gray-400" />
                            <div className="flex gap-1 flex-wrap">
                                {(['all', 'sms', 'email', 'push'] as const).map((ch) => (
                                    <button
                                        key={ch}
                                        onClick={() => setChannelFilter(ch)}
                                        className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                                            channelFilter === ch
                                                ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600'
                                        }`}
                                    >
                                        {ch === 'all' ? 'Tumu' : ch.toUpperCase()}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Bulk Actions */}
                        {selectedTemplateIds.size > 0 && (
                            <div className="flex items-center gap-2 mb-3 p-2 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
                                <span className="text-xs text-primary-700 dark:text-primary-300 font-medium">
                                    {selectedTemplateIds.size} secili
                                </span>
                                <button
                                    onClick={handleBulkActivate}
                                    className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                                >
                                    Aktif Et
                                </button>
                                <button
                                    onClick={handleBulkDeactivate}
                                    className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                                >
                                    Pasif Et
                                </button>
                            </div>
                        )}

                        {/* Select All */}
                        {filteredTemplates.length > 0 && (
                            <div className="flex items-center gap-2 mb-3">
                                <button
                                    onClick={handleSelectAll}
                                    className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                                        selectAll
                                            ? 'bg-primary-600 border-primary-600 text-white'
                                            : 'border-gray-300 dark:border-gray-600 hover:border-primary-400'
                                    }`}
                                >
                                    {selectAll && <CheckIcon className="w-3 h-3" />}
                                </button>
                                <span className="text-xs text-gray-500 dark:text-gray-400">Tumunu Sec</span>
                            </div>
                        )}

                        {templatesLoading ? (
                            <div className="text-center py-4 text-gray-500 dark:text-gray-400">Yukleniyor...</div>
                        ) : filteredTemplates.length === 0 ? (
                            <div className="text-center py-4 text-gray-400 dark:text-gray-500 text-sm">
                                Bu filtrede sablon bulunamadi
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {filteredTemplates.map((template) => (
                                    <div
                                        key={template.id}
                                        className={`p-3 rounded-xl border cursor-pointer transition-colors ${selectedTemplate?.id === template.id
                                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                                            : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                            }`}
                                    >
                                        <div className="flex items-start gap-2">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleToggleTemplate(template.id);
                                                }}
                                                className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                                                    selectedTemplateIds.has(template.id)
                                                        ? 'bg-primary-600 border-primary-600 text-white'
                                                        : 'border-gray-300 dark:border-gray-600'
                                                }`}
                                            >
                                                {selectedTemplateIds.has(template.id) && <CheckIcon className="w-3 h-3" />}
                                            </button>
                                            <div className="flex-1" onClick={() => handleTemplateSelect(template)}>
                                                <div className="font-medium text-sm text-gray-900 dark:text-white">{template.name}</div>
                                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{template.description}</div>
                                                <div className="mt-2 flex items-center space-x-2">
                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${template.channel === 'sms' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                                        }`}>
                                                        {(template.channel || 'unknown').toUpperCase()}
                                                    </span>
                                                    {template.isActive !== undefined && (
                                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                                                            template.isActive
                                                                ? 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                                                                : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                                                        }`}>
                                                            {template.isActive ? (
                                                                <><CheckCircleIcon className="w-3 h-3" /> Aktif</>
                                                            ) : 'Pasif'}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
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
