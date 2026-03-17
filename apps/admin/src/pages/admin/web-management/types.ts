import type {
    AIDraftAnswers,
    ThemeSettings,
} from '@/lib/website-generator-client';

export type TabKey =
    | 'content'
    | 'appearance'
    | 'pages'
    | 'publishing'
    | 'blog'
    | 'products'
    | 'orders'
    | 'commerce'
    | 'appointments'
    | 'chatbot'
    | 'marketplace'
    | 'settings';

export type DiscoveryAnswerKey = Exclude<keyof AIDraftAnswers, 'chatbot_mode'>;

export const ACTIVE_SITE_STORAGE_KEY = 'xear.websiteGenerator.activeSiteId';
export const PENDING_PREVIEW_COMMAND_STORAGE_KEY = 'xear.websiteGenerator.pendingPreviewCommand';

export const aiQuestionGroups = [
    {
        title: 'Temel Site Yapisi',
        items: [
            'Urunlerinizi web sitenizde listelemek istiyor musunuz?',
            'Randevu veya form toplama alani olsun mu?',
            'WhatsApp iletisim butonu olsun mu?',
        ],
    },
    {
        title: 'Icerik ve Buyume',
        items: [
            'Blog bolumu olsun mu?',
            'Kampanya veya duyuru sayfasi ister misiniz?',
            'Yorumlar veya referanslar bolumu eklensin mi?',
        ],
    },
    {
        title: 'Satis ve Entegrasyon',
        items: [
            'Online satis ister misiniz?',
            'Pazaryeri baglantilari olsun mu?',
            'AI chatbot musteri destegi aktif olsun mu?',
        ],
    },
];

export const featureCards: Array<{ key: DiscoveryAnswerKey; label: string; detail: string }> = [
    { key: 'blog', label: 'Blog Modulu', detail: 'Bilgilendirme, kampanya ve duyuru icerikleri' },
    { key: 'product_listing', label: 'Urun Modulu', detail: 'Katalog, markalar ve urun listeleme alanlari' },
    { key: 'ecommerce', label: 'E-Ticaret', detail: 'Siparis, odeme ve kargo surecleri' },
    { key: 'appointment_forms', label: 'Randevu ve Formlar', detail: 'Lead toplama ve randevu talepleri' },
    { key: 'whatsapp_contact', label: 'WhatsApp Iletisim', detail: 'Hizli destek ve donusum CTA alanlari' },
    { key: 'ai_chatbot', label: 'AI Chatbot', detail: 'SSS, katalog ve siparis destegi' },
    { key: 'marketplace_links', label: 'Pazaryeri Baglantilari', detail: 'Trendyol, Amazon, Hepsiburada yonlendirmeleri' },
];

export const themeOptions: Array<{ key: string; label: string; detail: string; settings: ThemeSettings }> = [
    {
        key: 'hearing-center-modern',
        label: 'Hearing Center Modern',
        detail: 'Premium clinic hero, trust blocks, calm motion',
        settings: { primary_color: '#0f172a', accent_color: '#14b8a6', font_family: 'Manrope' },
    },
    {
        key: 'commerce-modern',
        label: 'Commerce Modern',
        detail: 'Snap commerce highlights, product storytelling, CTA rhythm',
        settings: { primary_color: '#111827', accent_color: '#f97316', font_family: 'Manrope' },
    },
    {
        key: 'soft-minimal',
        label: 'Soft Minimal',
        detail: 'Calm typography, lightweight motion, content-first layout',
        settings: { primary_color: '#1f2937', accent_color: '#8b5cf6', font_family: 'Instrument Sans' },
    },
];

export const suggestedCommands = ['Hero basligini degistir', 'Blog ekle', 'E-ticareti ac', 'Footera Instagram ekle'];

export const adminMenuToTabKey: Record<string, TabKey> = {
    'Icerik Yonetimi': 'content',
    'Gorunum Yonetimi': 'appearance',
    'Sayfa ve Menu Yonetimi': 'pages',
    Yayinlama: 'publishing',
    'Blog Yonetimi': 'blog',
    'Urun Yonetimi': 'products',
    Siparisler: 'orders',
    'Kargo / Odeme Ayarlari': 'commerce',
    'Randevu ve Formlar': 'appointments',
    'AI Chatbot': 'chatbot',
    'Pazaryeri Entegrasyonlari': 'marketplace',
    'Platform Ayarlari': 'settings',
};
