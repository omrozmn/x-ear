import React from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useComposerStore } from '../../../stores/composerStore';

/**
 * Route mapping for each action type → app page
 */
const ACTION_ROUTE_MAP: Record<string, { route: string; paramKey?: string; label: string; icon: string }> = {
    // Party / Patient
    'Create Party Record': { route: '/parties', label: 'Hasta Listesi', icon: '👤' },
    'party_create': { route: '/parties', label: 'Hasta Listesi', icon: '👤' },

    // Device Assignment
    'Assign Device to Party': { route: '/inventory', label: 'Cihaz Envanteri', icon: '🔧' },
    'device_assign': { route: '/inventory', label: 'Cihaz Envanteri', icon: '🔧' },

    // Appointments
    'Schedule Appointment': { route: '/appointments', label: 'Randevular', icon: '📅' },
    'appointment_create': { route: '/appointments', label: 'Randevular', icon: '📅' },

    // Invoices
    'View Sales Information': { route: '/invoices', label: 'Faturalar', icon: '📄' },
    'invoice_create': { route: '/invoices', label: 'Faturalar', icon: '📄' },
    'invoices_list': { route: '/invoices', label: 'Faturalar', icon: '📄' },

    // Sales
    'Create Sales Opportunity': { route: '/invoices', label: 'Satışlar', icon: '💰' },
    'sale_create': { route: '/invoices', label: 'Satışlar', icon: '💰' },

    // Inventory
    'View Device Inventory': { route: '/inventory', label: 'Envanter', icon: '📦' },
    'inventory_list': { route: '/inventory', label: 'Envanter', icon: '📦' },

    // Cashflow
    'collection_create': { route: '/cashflow', label: 'Tahsilatlar', icon: '💳' },
};

/**
 * Get the navigation route for a given action
 */
function getRouteForAction(actionName: string, entityId?: string | null): { path: string; label: string; icon: string } | null {
    const mapping = ACTION_ROUTE_MAP[actionName];
    if (!mapping) return null;

    let path = mapping.route;
    // If we have an entity ID and the route supports it, navigate to detail page
    if (entityId) {
        if (mapping.route === '/parties') path = `/parties/${entityId}`;
        else if (mapping.route === '/inventory') path = `/inventory/${entityId}`;
        else if (mapping.route === '/cashflow') path = `/cashflow/${entityId}`;
    }

    return { path, label: mapping.label, icon: mapping.icon };
}

/**
 * Turkish-friendly action name mapping
 */
const ACTION_DISPLAY_NAMES: Record<string, string> = {
    'Create Party Record': 'Hasta Kaydı',
    'Assign Device to Party': 'Cihaz Atama',
    'Schedule Appointment': 'Randevu',
    'View Sales Information': 'Satış Bilgileri',
    'Create Sales Opportunity': 'Satış',
    'View Device Inventory': 'Envanter',
    'View Appointments': 'Randevular',
};

interface ActionResultCardProps {
    onClose: () => void;
}

/**
 * Rich action result card with summary and navigation button.
 * Replaces the generic "Başarılı!" message with actual operation details.
 */
export function ActionResultCard({ onClose }: ActionResultCardProps): React.ReactElement | null {
    const { executionResult, selectedAction } = useComposerStore();
    const navigate = useNavigate();

    if (!executionResult || executionResult.status !== 'success') return null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = executionResult.result as any;
    const actionName = result?.actionName || selectedAction?.name || 'İşlem';
    const summary: Array<{ label: string; value: string }> = result?.summary || [];
    const entityId: string | null = result?.entityId || null;
    const displayName = ACTION_DISPLAY_NAMES[actionName] || actionName;
    const routeInfo = getRouteForAction(actionName, entityId);

    return (
        <div className="mt-2 rounded-xl border border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 overflow-hidden animate-in slide-in-from-bottom-2 shadow-sm">
            {/* Header */}
            <div className="px-4 pt-4 pb-2 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                </div>
                <div>
                    <p className="text-sm font-bold text-green-900">{displayName} Tamamlandı</p>
                    <p className="text-[10px] text-green-600 font-medium">İşlem başarıyla gerçekleştirildi</p>
                </div>
            </div>

            {/* Summary Table */}
            {summary.length > 0 && (
                <div className="mx-3 mb-3 rounded-lg bg-white/70 border border-green-100 divide-y divide-green-50">
                    {summary.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between px-3 py-2">
                            <span className="text-[11px] text-gray-500 font-medium">{item.label}</span>
                            <span className="text-[11px] text-gray-900 font-semibold max-w-[55%] text-right truncate">
                                {item.value}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {/* Action Buttons */}
            <div className="px-3 pb-3 flex gap-2">
                {routeInfo && (
                    <button
                        data-allow-raw="true"
                        onClick={() => {
                            onClose();
                            navigate({ to: routeInfo.path });
                        }}
                        className="flex-1 flex items-center justify-center gap-1.5 bg-green-600 text-white py-2.5 rounded-lg text-xs font-bold hover:bg-green-700 transition-all active:scale-[0.98] shadow-sm"
                    >
                        <span>{routeInfo.icon}</span>
                        <span>İncelemek İçin Tıkla</span>
                        <svg className="w-3.5 h-3.5 ml-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                        </svg>
                    </button>
                )}
                <button
                    data-allow-raw="true"
                    onClick={onClose}
                    className={`${routeInfo ? 'w-12' : 'flex-1'} flex items-center justify-center bg-gray-100 text-gray-600 py-2.5 rounded-lg text-xs font-bold hover:bg-gray-200 transition-all active:scale-[0.98]`}
                >
                    {routeInfo ? '✕' : 'Kapat'}
                </button>
            </div>
        </div>
    );
}
