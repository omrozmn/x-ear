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
import { useAdminResponsive } from '@/hooks';

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
    const { isMobile } = useAdminResponsive();
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState('general');

    const { data: tenantData, isLoading: loadingTenant, refetch } = useGetAdminTenant(tenantId!, {
        query: {
            enabled: !!tenantId && isOpen
        }
    });
    
    // Orval already unwraps ResponseEnvelope, tenantData is the tenant directly
    const tenant = tenantData as ExtendedTenant;

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
                <Dialog.Content className={`fixed ${isMobile ? 'inset-0' : 'left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%]'} ${isMobile ? 'w-full h-full' : 'max-h-[90vh] w-[90vw] max-w-[900px]'} ${isMobile ? 'rounded-none' : 'rounded-lg'} bg-white dark:bg-gray-800 shadow-2xl focus:outline-none data-[state=open]:animate-contentShow z-50 flex flex-col`}>
                    <div className={`flex justify-between items-center ${isMobile ? 'p-4' : 'p-6'} border-b border-gray-200 dark:border-gray-700`}>
                        <Dialog.Title className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold text-gray-900 dark:text-white`}>
                            {loadingTenant ? 'Yükleniyor...' : `Abone: ${tenant?.name}`}
                        </Dialog.Title>
                        <Dialog.Description className="sr-only">
                            Abone detaylarını ve ayarlarını düzenleyin.
                        </Dialog.Description>
                        <Dialog.Close asChild>
                            <button className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 touch-feedback">
                                <XMarkIcon className={isMobile ? 'h-5 w-5' : 'h-6 w-6'} />
                            </button>
                        </Dialog.Close>
                    </div>

                    <div className="flex-1 overflow-hidden flex flex-col">
                        {loadingTenant ? (
                            <div className="p-12 text-center text-gray-500 dark:text-gray-400">Yükleniyor...</div>
                        ) : tenant ? (
                            <Tabs.Root value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                                <div className={`${isMobile ? 'px-4 pt-2' : 'px-6 pt-4'} border-b border-gray-200 dark:border-gray-700 ${isMobile ? 'overflow-x-auto' : ''}`}>
                                    <Tabs.List className={`flex ${isMobile ? 'space-x-4' : 'space-x-6'}`}>
                                        <Tabs.Trigger
                                            value="general"
                                            className={`pb-3 ${isMobile ? 'text-xs' : 'text-sm'} font-medium text-gray-500 dark:text-gray-400 border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 hover:text-gray-700 dark:hover:text-gray-300 whitespace-nowrap`}
                                        >
                                            Genel
                                        </Tabs.Trigger>
                                        <Tabs.Trigger
                                            value="users"
                                            className={`pb-3 ${isMobile ? 'text-xs' : 'text-sm'} font-medium text-gray-500 dark:text-gray-400 border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 hover:text-gray-700 dark:hover:text-gray-300 whitespace-nowrap`}
                                        >
                                            Kullanıcılar
                                        </Tabs.Trigger>
                                        <Tabs.Trigger
                                            value="subscription"
                                            className={`pb-3 ${isMobile ? 'text-xs' : 'text-sm'} font-medium text-gray-500 dark:text-gray-400 border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 hover:text-gray-700 dark:hover:text-gray-300 whitespace-nowrap`}
                                        >
                                            Abonelik
                                        </Tabs.Trigger>
                                        {!isMobile && (
                                            <>
                                                <Tabs.Trigger
                                                    value="integrations"
                                                    className="pb-3 text-sm font-medium text-gray-500 dark:text-gray-400 border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 hover:text-gray-700 dark:hover:text-gray-300 whitespace-nowrap"
                                                >
                                                    Entegrasyonlar
                                                </Tabs.Trigger>
                                                <ProductGuard currentProduct={tenant.product_code || 'xear_hearing'} allowedProducts={['xear_hearing']}>
                                                    <Tabs.Trigger
                                                        value="sms-documents"
                                                        className="pb-3 text-sm font-medium text-gray-500 dark:text-gray-400 border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 hover:text-gray-700 dark:hover:text-gray-300 whitespace-nowrap"
                                                    >
                                                        SMS Belgeleri
                                                    </Tabs.Trigger>
                                                </ProductGuard>
                                            </>
                                        )}
                                    </Tabs.List>
                                </div>

                                <div className={`flex-1 overflow-y-auto ${isMobile ? 'p-4 pb-safe' : 'p-6'} bg-gray-50/50 dark:bg-gray-900/50`}>
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
                                    {!isMobile && (
                                        <>
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
                                        </>
                                    )}
                                </div>
                            </Tabs.Root>
                        ) : (
                            <div className="p-6 text-red-500 dark:text-red-400">Abone bulunamadı</div>
                        )}
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};
