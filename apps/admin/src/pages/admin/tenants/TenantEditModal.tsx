import { useState, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import * as Dialog from '@radix-ui/react-dialog';
import * as Tabs from '@radix-ui/react-tabs';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useGetAdminTenant } from '@/lib/api-client';
import { GeneralTab } from './GeneralTab';
import { UsersTab } from './UsersTab';
import { SubscriptionTab } from './SubscriptionTab';
import { IntegrationsTab } from './IntegrationsTab';
import { SmsDocumentsTab } from './SmsDocumentsTab';
import { ProductGuard } from '@/components/guards/ProductGuard';

interface Tenant {
    id?: string;
    name?: string;
    owner_email?: string;
    status?: string;
    max_users?: number;
    current_plan?: string;
    created_at?: string;
    settings?: any;
    product_code?: string;
}

interface ExtendedTenant extends Tenant {
    current_plan_id?: string;
    subscription_start_date?: string;
    subscription_end_date?: string;
    feature_usage?: Record<string, any>;
}

export const TenantEditModal = ({ tenantId, isOpen, onClose }: { tenantId: string | null, isOpen: boolean, onClose: () => void }) => {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState('general');

    const { data: tenantData, isLoading: loadingTenant, refetch } = useGetAdminTenant(tenantId!, {
        query: {
            enabled: !!tenantId && isOpen
        }
    });
    const tenant = (tenantData as any)?.data?.tenant as ExtendedTenant;

    useEffect(() => {
        if (tenantId && isOpen) {
            refetch();
        }
    }, [tenantId, isOpen, refetch]);

    if (!isOpen) return null;

    return (
        <Dialog.Root open={isOpen} onOpenChange={onClose}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50 data-[state=open]:animate-overlayShow z-40" />
                <Dialog.Content className="fixed left-[50%] top-[50%] max-h-[90vh] w-[90vw] max-w-[900px] translate-x-[-50%] translate-y-[-50%] rounded-lg bg-white shadow-2xl focus:outline-none data-[state=open]:animate-contentShow z-50 flex flex-col">
                    <div className="flex justify-between items-center p-6 border-b">
                        <Dialog.Title className="text-xl font-bold text-gray-900">
                            {loadingTenant ? 'Yükleniyor...' : `Abone Düzenle: ${tenant?.name}`}
                        </Dialog.Title>
                        <Dialog.Description className="sr-only">
                            Abone detaylarını ve ayarlarını düzenleyin.
                        </Dialog.Description>
                        <Dialog.Close asChild>
                            <button className="text-gray-400 hover:text-gray-500">
                                <XMarkIcon className="h-6 w-6" />
                            </button>
                        </Dialog.Close>
                    </div>

                    <div className="flex-1 overflow-hidden flex flex-col">
                        {loadingTenant ? (
                            <div className="p-12 text-center">Yükleniyor...</div>
                        ) : tenant ? (
                            <Tabs.Root value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                                <div className="px-6 pt-4 border-b">
                                    <Tabs.List className="flex space-x-6">
                                        <Tabs.Trigger
                                            value="general"
                                            className="pb-3 text-sm font-medium text-gray-500 border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 hover:text-gray-700"
                                        >
                                            Genel Bilgiler
                                        </Tabs.Trigger>
                                        <Tabs.Trigger
                                            value="users"
                                            className="pb-3 text-sm font-medium text-gray-500 border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 hover:text-gray-700"
                                        >
                                            Kullanıcılar
                                        </Tabs.Trigger>
                                        <Tabs.Trigger
                                            value="subscription"
                                            className="pb-3 text-sm font-medium text-gray-500 border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 hover:text-gray-700"
                                        >
                                            Abonelik & Plan
                                        </Tabs.Trigger>
                                        <Tabs.Trigger
                                            value="integrations"
                                            className="pb-3 text-sm font-medium text-gray-500 border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 hover:text-gray-700"
                                        >
                                            Entegrasyonlar
                                        </Tabs.Trigger>
                                        <ProductGuard currentProduct={tenant.product_code || 'xear_hearing'} allowedProducts={['xear_hearing']}>
                                            <Tabs.Trigger
                                                value="sms-documents"
                                                className="pb-3 text-sm font-medium text-gray-500 border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 hover:text-gray-700"
                                            >
                                                SMS Belgeleri
                                            </Tabs.Trigger>
                                        </ProductGuard>
                                    </Tabs.List>
                                </div>

                                <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
                                    <Tabs.Content value="general" className="outline-none">
                                        <GeneralTab tenant={tenant} onUpdate={() => {
                                            queryClient.invalidateQueries({ queryKey: ['/api/admin/tenants'] });
                                            refetch();
                                        }} />
                                    </Tabs.Content>
                                    <Tabs.Content value="users" className="outline-none">
                                        <UsersTab tenantId={tenant.id!} />
                                    </Tabs.Content>
                                    <Tabs.Content value="subscription" className="outline-none">
                                        <SubscriptionTab tenant={tenant} onUpdate={() => {
                                            queryClient.invalidateQueries({ queryKey: ['/api/admin/tenants'] });
                                            refetch();
                                        }} />
                                    </Tabs.Content>
                                    <Tabs.Content value="integrations" className="outline-none">
                                        <IntegrationsTab tenant={tenant} onUpdate={() => {
                                            queryClient.invalidateQueries({ queryKey: ['/api/admin/tenants'] });
                                            refetch();
                                        }} />
                                    </Tabs.Content>
                                    <ProductGuard currentProduct={tenant.product_code || 'xear_hearing'} allowedProducts={['xear_hearing']}>
                                        <Tabs.Content value="sms-documents" className="outline-none">
                                            <SmsDocumentsTab tenantId={tenant.id!} onUpdate={() => {
                                                queryClient.invalidateQueries({ queryKey: ['/api/admin/tenants'] });
                                                refetch();
                                            }} />
                                        </Tabs.Content>
                                    </ProductGuard>
                                </div>
                            </Tabs.Root>
                        ) : (
                            <div className="p-6 text-red-500">Abone bulunamadı</div>
                        )}
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};
