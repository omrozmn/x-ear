import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { SiteWorkspace } from '@/lib/website-generator-client';

/* ---------- Orders Tab ---------- */
export interface OrdersTabProps {
    workspace: SiteWorkspace | null;
}

export const OrdersTab: React.FC<OrdersTabProps> = ({ workspace }) => (
    <div className="rounded-3xl bg-white p-6 ring-1 ring-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Siparisler</h3>
        <div className="mt-4 space-y-3">
            {(workspace?.site.orders ?? []).length > 0 ? (
                workspace?.site.orders?.map((order) => (
                    <div key={order.id} className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
                        <div className="font-medium">{order.id}</div>
                        <div className="mt-1 text-xs text-gray-500">{order.customer_name} - {order.status} - {order.total_amount} {order.currency}</div>
                    </div>
                ))
            ) : (
                <div className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-600">Siparis bulunmuyor.</div>
            )}
        </div>
    </div>
);

/* ---------- Commerce Tab ---------- */
export interface CommerceTabProps {
    workspace: SiteWorkspace | null;
}

export const CommerceTab: React.FC<CommerceTabProps> = ({ workspace }) => (
    <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl bg-white p-6 ring-1 ring-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Kargo ve Odeme Ayarlari</h3>
            <div className="mt-4 space-y-2 text-sm text-gray-600">
                <div>Currency: {workspace?.site.commerce_settings?.currency ?? '-'}</div>
                <div>Checkout: {workspace?.site.commerce_settings?.checkout_mode ?? '-'}</div>
                <div>Kargo aktif: {workspace?.site.commerce_settings?.shipping_enabled ? 'Evet' : 'Hayir'}</div>
            </div>
        </div>
        <div className="rounded-3xl bg-white p-6 ring-1 ring-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Odeme Metotlari</h3>
            <div className="mt-4 flex flex-wrap gap-2">
                {(workspace?.site.commerce_settings?.payment_methods ?? []).map((method) => (
                    <span key={method} className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                        {method}
                    </span>
                ))}
            </div>
        </div>
    </div>
);

/* ---------- Appointments Tab ---------- */
export interface AppointmentsTabProps {
    workspace: SiteWorkspace | null;
}

export const AppointmentsTab: React.FC<AppointmentsTabProps> = ({ workspace }) => (
    <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-3xl bg-white p-6 ring-1 ring-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Randevu Ayarlari</h3>
            <div className="mt-4 space-y-2 text-sm text-gray-600">
                <div>Mod: {workspace?.site.appointment_settings?.booking_mode ?? '-'}</div>
                <div>Telefon topla: {workspace?.site.appointment_settings?.collect_phone ? 'Evet' : 'Hayir'}</div>
                <div>Bildirim email: {workspace?.site.appointment_settings?.notification_email ?? '-'}</div>
            </div>
        </div>
        <div className="rounded-3xl bg-white p-6 ring-1 ring-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Lead Listesi</h3>
            <div className="mt-4 space-y-3">
                {(workspace?.site.leads ?? []).length > 0 ? (
                    workspace?.site.leads?.map((lead) => (
                        <div key={lead.id} className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
                            <div className="font-medium">{lead.name}</div>
                            <div className="mt-1 text-xs text-gray-500">{lead.source} - {lead.status}</div>
                        </div>
                    ))
                ) : (
                    <div className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-600">Lead bulunmuyor.</div>
                )}
            </div>
        </div>
    </div>
);

/* ---------- Chatbot Tab ---------- */
export interface ChatbotTabProps {
    workspace: SiteWorkspace | null;
}

export const ChatbotTab: React.FC<ChatbotTabProps> = ({ workspace }) => (
    <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl bg-white p-6 ring-1 ring-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">AI Chatbot Ayarlari</h3>
            <div className="mt-4 space-y-2 text-sm text-gray-600">
                <div>Mode: {workspace?.site.chatbot_settings?.mode ?? '-'}</div>
                <div>Mesaj limiti: {workspace?.site.chatbot_settings?.monthly_message_limit ?? 0}</div>
                <div>Handoff: {workspace?.site.chatbot_settings?.handoff_channel ?? '-'}</div>
            </div>
        </div>
        <div className="rounded-3xl bg-white p-6 ring-1 ring-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Yetkinlikler</h3>
            <div className="mt-4 flex flex-wrap gap-2">
                {(workspace?.site.chatbot_settings?.enabled_capabilities ?? []).map((capability) => (
                    <span key={capability} className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                        {capability}
                    </span>
                ))}
            </div>
        </div>
    </div>
);

/* ---------- Marketplace Tab ---------- */
export interface MarketplaceTabProps {
    workspace: SiteWorkspace | null;
    newMarketplaceProvider: string;
    setNewMarketplaceProvider: (v: string) => void;
    newMarketplaceLabel: string;
    setNewMarketplaceLabel: (v: string) => void;
    newMarketplaceUrl: string;
    setNewMarketplaceUrl: (v: string) => void;
    marketplaceUrlError: string | null;
    setMarketplaceUrlError: (v: string | null) => void;
    isBusy: (key: string) => boolean;
    handleAddMarketplaceLink: () => void;
    handleDeleteMarketplaceLink: (linkId: string) => void;
}

export const MarketplaceTab: React.FC<MarketplaceTabProps> = ({
    workspace,
    newMarketplaceProvider,
    setNewMarketplaceProvider,
    newMarketplaceLabel,
    setNewMarketplaceLabel,
    newMarketplaceUrl,
    setNewMarketplaceUrl,
    marketplaceUrlError,
    setMarketplaceUrlError,
    isBusy,
    handleAddMarketplaceLink,
    handleDeleteMarketplaceLink,
}) => (
    <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-3xl bg-white p-6 ring-1 ring-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Pazaryeri Ayarlari</h3>
            <div className="mt-4 space-y-2 text-sm text-gray-600">
                <div>Gorunum: {workspace?.site.marketplace_settings?.display_mode ?? '-'}</div>
                <div>WhatsApp CTA: {workspace?.site.whatsapp_settings?.enabled ? 'Destekli' : 'Kapali'}</div>
            </div>
        </div>
        <div className="rounded-3xl bg-white p-6 ring-1 ring-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Bagli Kanallar</h3>
            <div className="mt-4 space-y-3">
                {(workspace?.site.marketplace_links_data ?? []).length > 0 ? (
                    workspace?.site.marketplace_links_data?.map((item) => (
                        <div key={item.id} className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="font-medium">{item.label}</div>
                                    <div className="mt-1 text-xs text-gray-500">{item.provider} - {item.url}</div>
                                </div>
                                <button onClick={() => handleDeleteMarketplaceLink(item.id)} className="rounded-xl bg-white px-2 py-1 text-xs text-rose-600 ring-1 ring-rose-200 hover:bg-rose-50">
                                    <Trash2 className="inline h-3 w-3" /> Sil
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-600">Bagli pazaryeri linki yok.</div>
                )}
            </div>
            <div className="mt-4 rounded-2xl bg-gray-50 p-4">
                <div className="text-sm font-semibold text-gray-900">Yeni Kanal Ekle</div>
                <div className="mt-3 grid gap-2">
                    <select value={newMarketplaceProvider} onChange={(e) => setNewMarketplaceProvider(e.target.value)} className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none">
                        <option value="trendyol">Trendyol</option>
                        <option value="hepsiburada">Hepsiburada</option>
                        <option value="amazon">Amazon</option>
                        <option value="n11">N11</option>
                        <option value="ciceksepeti">Ciceksepeti</option>
                    </select>
                    <input value={newMarketplaceLabel} onChange={(e) => setNewMarketplaceLabel(e.target.value)} className="rounded-2xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none" placeholder="Etiket (orn: Trendyol Magaza)" />
                    <div>
                        <input value={newMarketplaceUrl} onChange={(e) => { setNewMarketplaceUrl(e.target.value); setMarketplaceUrlError(null); }} className={`w-full rounded-2xl border bg-white px-3 py-2 text-sm outline-none ${marketplaceUrlError ? 'border-rose-400' : 'border-gray-200'}`} placeholder="URL (https://...)" />
                        {marketplaceUrlError && <p className="mt-1 text-xs text-rose-600">{marketplaceUrlError}</p>}
                    </div>
                    <button onClick={handleAddMarketplaceLink} disabled={!newMarketplaceLabel.trim() || !newMarketplaceUrl.trim() || isBusy('add-marketplace')} className="rounded-2xl bg-gray-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60">
                        <Plus className="mr-1 inline h-4 w-4" />{isBusy('add-marketplace') ? 'Ekleniyor...' : 'Kanal Ekle'}
                    </button>
                </div>
            </div>
        </div>
    </div>
);
