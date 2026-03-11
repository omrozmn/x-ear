import React, { useMemo, useState } from 'react';
import { Bot, BrushCleaning, FileStack, Globe2, LayoutTemplate, MessageCircle, Package, Rocket, ShoppingBag, Store, WandSparkles } from 'lucide-react';
import { useAdminResponsive } from '@/hooks';

type FeatureState = {
    blog: boolean;
    productListing: boolean;
    ecommerce: boolean;
    appointments: boolean;
    whatsapp: boolean;
    chatbot: boolean;
    marketplace: boolean;
};

type TabKey =
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
    | 'marketplace';

const aiQuestionGroups = [
    {
        title: 'Temel Site Yapısı',
        items: [
            'Ürünlerinizi web sitenizde listelemek istiyor musunuz?',
            'Randevu veya form toplama alanı olsun mu?',
            'WhatsApp iletişim butonu olsun mu?',
        ],
    },
    {
        title: 'İçerik ve Büyüme',
        items: [
            'Blog bölümü olsun mu?',
            'Kampanya veya duyuru sayfası ister misiniz?',
            'Yorumlar veya referanslar bölümü eklensin mi?',
        ],
    },
    {
        title: 'Satış ve Entegrasyon',
        items: [
            'Online satış ister misiniz?',
            'Pazaryeri bağlantıları olsun mu?',
            'AI chatbot müşteri desteği aktif olsun mu?',
        ],
    },
];

const featureCards: Array<{ key: keyof FeatureState; label: string; detail: string }> = [
    { key: 'blog', label: 'Blog Modülü', detail: 'Bilgilendirme, kampanya ve duyuru içerikleri' },
    { key: 'productListing', label: 'Ürün Modülü', detail: 'Katalog, markalar ve ürün listeleme alanları' },
    { key: 'ecommerce', label: 'E-Ticaret', detail: 'Sipariş, ödeme ve kargo süreçleri' },
    { key: 'appointments', label: 'Randevu & Formlar', detail: 'Lead toplama ve randevu talepleri' },
    { key: 'whatsapp', label: 'WhatsApp İletişim', detail: 'Hızlı destek ve dönüşüm CTA alanları' },
    { key: 'chatbot', label: 'AI Chatbot', detail: 'SSS, katalog ve sipariş desteği' },
    { key: 'marketplace', label: 'Pazaryeri Bağlantıları', detail: 'Trendyol, Amazon, Hepsiburada yönlendirmeleri' },
];

function TabButton({
    active,
    label,
    onClick,
}: {
    active: boolean;
    label: string;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className={`whitespace-nowrap rounded-2xl px-4 py-2 text-sm font-medium transition-colors ${
                active
                    ? 'bg-gray-900 text-white shadow-sm'
                    : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50'
            }`}
        >
            {label}
        </button>
    );
}

const WebManagementPage: React.FC = () => {
    const { isMobile } = useAdminResponsive();
    const [entryMode, setEntryMode] = useState<'template' | 'ai'>('ai');
    const [activeTab, setActiveTab] = useState<TabKey>('content');
    const [features, setFeatures] = useState<FeatureState>({
        blog: true,
        productListing: true,
        ecommerce: true,
        appointments: true,
        whatsapp: true,
        chatbot: true,
        marketplace: true,
    });

    const visibleTabs = useMemo(
        () =>
            [
                { key: 'content' as const, label: 'İçerik Yönetimi' },
                { key: 'appearance' as const, label: 'Görünüm Yönetimi' },
                { key: 'pages' as const, label: 'Sayfa ve Menü Yönetimi' },
                { key: 'publishing' as const, label: 'Yayınlama' },
                ...(features.blog ? [{ key: 'blog' as const, label: 'Blog Yönetimi' }] : []),
                ...(features.productListing ? [{ key: 'products' as const, label: 'Ürün Yönetimi' }] : []),
                ...(features.ecommerce ? [{ key: 'orders' as const, label: 'Siparişler' }, { key: 'commerce' as const, label: 'Kargo / Ödeme Ayarları' }] : []),
                ...(features.appointments ? [{ key: 'appointments' as const, label: 'Randevu ve Formlar' }] : []),
                ...(features.chatbot ? [{ key: 'chatbot' as const, label: 'AI Chatbot' }] : []),
                ...(features.marketplace ? [{ key: 'marketplace' as const, label: 'Pazaryeri Entegrasyonları' }] : []),
            ],
        [features],
    );

    const tabContent: Record<TabKey, React.ReactNode> = {
        content: (
            <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-3xl bg-white p-6 ring-1 ring-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Sayfa İçerikleri</h3>
                    <p className="mt-2 text-sm text-gray-500">Hero başlıkları, section metinleri, CTA’lar, görseller ve iletişim alanları burada düzenlenir.</p>
                    <div className="mt-4 space-y-3">
                        {['Ana Sayfa Hero', 'Hizmetler Bölümü', 'Markalar Bölümü', 'İletişim Kartı'].map((item) => (
                            <div key={item} className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
                                {item}
                            </div>
                        ))}
                    </div>
                </div>
                <div className="rounded-3xl bg-white p-6 ring-1 ring-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Section Kütüphanesi</h3>
                    <p className="mt-2 text-sm text-gray-500">Kullanıcı controlled builder mantığıyla section ekler, kaldırır ve sıralar.</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                        {['Hero', 'Services', 'Brands', 'Testimonials', 'Appointment Form', 'FAQ', 'Map'].map((item) => (
                            <span key={item} className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                                {item}
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        ),
        appearance: (
            <div className="grid gap-4 lg:grid-cols-3">
                {[
                    { title: 'Tema', detail: 'hearing-center-modern' },
                    { title: 'Motion', detail: 'sticky-story + snap-sections' },
                    { title: 'WebGL', detail: 'ambient fallback-ready preset' },
                ].map((item) => (
                    <div key={item.title} className="rounded-3xl bg-white p-6 ring-1 ring-gray-200">
                        <h3 className="text-base font-semibold text-gray-900">{item.title}</h3>
                        <p className="mt-2 text-sm text-gray-500">{item.detail}</p>
                    </div>
                ))}
            </div>
        ),
        pages: (
            <div className="rounded-3xl bg-white p-6 ring-1 ring-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Sayfa ve Menü Yapısı</h3>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {['/ Ana Sayfa', '/about Hakkımızda', '/services Hizmetler', '/contact İletişim', '/products Ürünler'].map((item) => (
                        <div key={item} className="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-700">
                            {item}
                        </div>
                    ))}
                </div>
            </div>
        ),
        publishing: (
            <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-3xl bg-white p-6 ring-1 ring-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Draft Durumu</h3>
                    <ul className="mt-4 space-y-2 text-sm text-gray-600">
                        <li>Preview hazır</li>
                        <li>Publish readiness kontrolü aktif</li>
                        <li>Rollback destekli release modeli</li>
                    </ul>
                </div>
                <div className="rounded-3xl bg-gray-900 p-6 text-white">
                    <h3 className="text-lg font-semibold">Canlıya Alma</h3>
                    <p className="mt-2 text-sm text-gray-300">Preview, publish ve rollback akışları bu sekmeden yönetilir.</p>
                    <div className="mt-4 flex flex-wrap gap-3">
                        <button className="rounded-2xl bg-white px-4 py-2 text-sm font-medium text-gray-900">Preview Aç</button>
                        <button className="rounded-2xl bg-emerald-400 px-4 py-2 text-sm font-medium text-gray-950">Publish Et</button>
                    </div>
                </div>
            </div>
        ),
        blog: <div className="rounded-3xl bg-white p-6 ring-1 ring-gray-200 text-sm text-gray-600">Blog listesi, post oluşturma ve yayın durumu bu sekmede yer alır.</div>,
        products: <div className="rounded-3xl bg-white p-6 ring-1 ring-gray-200 text-sm text-gray-600">Katalog, ürün kartları, SKU yönetimi ve ürün görünürlüğü burada yönetilir.</div>,
        orders: <div className="rounded-3xl bg-white p-6 ring-1 ring-gray-200 text-sm text-gray-600">Sipariş listesi, sipariş detayları, fulfillment ve ödeme durumları burada görünür.</div>,
        commerce: <div className="rounded-3xl bg-white p-6 ring-1 ring-gray-200 text-sm text-gray-600">Kargo, ödeme metotları ve checkout davranışı bu sekmede yönetilir.</div>,
        appointments: <div className="rounded-3xl bg-white p-6 ring-1 ring-gray-200 text-sm text-gray-600">Form alanları, lead listesi ve randevu ayarları burada yönetilir.</div>,
        chatbot: <div className="rounded-3xl bg-white p-6 ring-1 ring-gray-200 text-sm text-gray-600">AI chatbot modu, handoff kanalı, message limiti ve widget görünürlüğü burada yönetilir.</div>,
        marketplace: <div className="rounded-3xl bg-white p-6 ring-1 ring-gray-200 text-sm text-gray-600">Pazaryeri linkleri ve CTA kartları bu sekmede yönetilir.</div>,
    };

    return (
        <div className={isMobile ? 'p-4 pb-safe max-w-7xl mx-auto' : 'p-6 max-w-7xl mx-auto'}>
            <div className="rounded-[2rem] bg-gradient-to-br from-gray-950 via-slate-900 to-slate-800 p-6 text-white shadow-xl">
                <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
                    <div className="max-w-3xl">
                        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium tracking-wide text-slate-100">
                            <Globe2 className="h-4 w-4" />
                            Web Yonetim
                        </div>
                        <h1 className="mt-4 text-3xl font-semibold tracking-tight">AI ve panel ile website olusturma ve yonetme</h1>
                        <p className="mt-3 text-sm leading-6 text-slate-300">
                            Kullanici ister panelden hazir sablonla, ister AI ile site olusturur. Sonra ayni drafti sekmeler altindan duzenler, preview eder ve publish eder.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={() => setEntryMode('template')}
                            className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium transition-colors ${entryMode === 'template' ? 'bg-white text-gray-950' : 'bg-white/10 text-white hover:bg-white/15'}`}
                        >
                            <LayoutTemplate className="h-4 w-4" />
                            Hazir Sablonla Olustur
                        </button>
                        <button
                            onClick={() => setEntryMode('ai')}
                            className={`inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium transition-colors ${entryMode === 'ai' ? 'bg-emerald-300 text-gray-950' : 'bg-emerald-400/20 text-emerald-100 hover:bg-emerald-400/30'}`}
                        >
                            <WandSparkles className="h-4 w-4" />
                            Yapay Zeka ile Olustur
                        </button>
                    </div>
                </div>
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
                <div className="rounded-[2rem] bg-white p-6 ring-1 ring-gray-200">
                    <div className="flex items-center gap-3">
                        {entryMode === 'ai' ? <Bot className="h-5 w-5 text-sky-500" /> : <BrushCleaning className="h-5 w-5 text-fuchsia-500" />}
                        <h2 className="text-lg font-semibold text-gray-900">
                            {entryMode === 'ai' ? 'AI Onboarding Akisi' : 'Hazir Sablon Baslangici'}
                        </h2>
                    </div>

                    {entryMode === 'ai' ? (
                        <div className="mt-5 space-y-4">
                            {aiQuestionGroups.map((group) => (
                                <div key={group.title} className="rounded-3xl bg-gray-50 p-5">
                                    <h3 className="text-sm font-semibold text-gray-900">{group.title}</h3>
                                    <ul className="mt-3 space-y-2 text-sm text-gray-600">
                                        {group.items.map((item) => (
                                            <li key={item} className="rounded-2xl bg-white px-4 py-3 ring-1 ring-gray-200">
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                            <div className="rounded-3xl border border-dashed border-sky-300 bg-sky-50 p-5 text-sm text-sky-900">
                                AI sonunda serbest HTML degil; feature config + typed site draft + section plan uretir.
                            </div>
                        </div>
                    ) : (
                        <div className="mt-5 grid gap-4 md:grid-cols-3">
                            {[
                                { icon: LayoutTemplate, title: 'Tema Sec', detail: 'Health / clinic / commerce presetleri' },
                                { icon: FileStack, title: 'Sayfa Seti', detail: 'Ana sayfa, hakkimizda, iletisim ve opsiyonel moduller' },
                                { icon: Rocket, title: 'Draft Baslat', detail: 'Kullanici sonra panel veya chat ile duzenler' },
                            ].map((item) => (
                                <div key={item.title} className="rounded-3xl bg-gray-50 p-5">
                                    <item.icon className="h-5 w-5 text-gray-700" />
                                    <h3 className="mt-3 text-sm font-semibold text-gray-900">{item.title}</h3>
                                    <p className="mt-2 text-sm text-gray-500">{item.detail}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="rounded-[2rem] bg-white p-6 ring-1 ring-gray-200">
                    <div className="flex items-center gap-3">
                        <Store className="h-5 w-5 text-emerald-500" />
                        <h2 className="text-lg font-semibold text-gray-900">Modul Aktivasyonlari</h2>
                    </div>
                    <div className="mt-5 space-y-3">
                        {featureCards.map((item) => (
                            <button
                                key={item.key}
                                onClick={() => setFeatures((current) => ({ ...current, [item.key]: !current[item.key] }))}
                                className={`flex w-full items-start justify-between rounded-3xl px-4 py-4 text-left ring-1 transition-colors ${
                                    features[item.key] ? 'bg-emerald-50 ring-emerald-200' : 'bg-gray-50 ring-gray-200'
                                }`}
                            >
                                <div>
                                    <div className="text-sm font-semibold text-gray-900">{item.label}</div>
                                    <div className="mt-1 text-xs text-gray-500">{item.detail}</div>
                                </div>
                                <div className={`rounded-full px-2 py-1 text-[11px] font-semibold ${features[item.key] ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
                                    {features[item.key] ? 'Aktif' : 'Pasif'}
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="mt-6 rounded-[2rem] bg-white p-6 ring-1 ring-gray-200">
                <div className="flex items-center gap-3">
                    <Package className="h-5 w-5 text-slate-700" />
                    <h2 className="text-lg font-semibold text-gray-900">Web Yonetim Sekmeleri</h2>
                </div>
                <div className="mt-5 flex gap-3 overflow-x-auto pb-2">
                    {visibleTabs.map((tab) => (
                        <TabButton
                            key={tab.key}
                            label={tab.label}
                            active={activeTab === tab.key}
                            onClick={() => setActiveTab(tab.key)}
                        />
                    ))}
                </div>
                <div className="mt-6">{tabContent[activeTab]}</div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
                {[
                    { icon: WandSparkles, title: 'AI ile Taslak Olustur', detail: 'Kullanici prompt verir, AI draft cikarir.' },
                    { icon: MessageCircle, title: 'Chat ile Duzenle', detail: 'Hero basligini degistir, blog ekle, footeri guncelle gibi komutlar.' },
                    { icon: Globe2, title: 'Preview ve Publish', detail: 'Draft ayni panelden preview edilir ve canliya alinir.' },
                ].map((card) => (
                    <div key={card.title} className="rounded-3xl bg-white p-5 ring-1 ring-gray-200">
                        <card.icon className="h-5 w-5 text-gray-700" />
                        <h3 className="mt-3 text-sm font-semibold text-gray-900">{card.title}</h3>
                        <p className="mt-2 text-sm text-gray-500">{card.detail}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default WebManagementPage;
