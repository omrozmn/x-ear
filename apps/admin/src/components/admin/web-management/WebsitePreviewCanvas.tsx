import React from 'react';

type SectionDocument = {
    type: string;
    variant: string;
    fields: Record<string, unknown>;
};

type PageDocument = {
    title: string;
    slug: string;
    sections: SectionDocument[];
};

type SitePreviewData = {
    name: string;
    slug: string;
    theme_settings: {
        primary_color: string;
        accent_color: string;
        font_family: string;
    };
    pages: PageDocument[];
};

type PreviewTarget = {
    key: string;
    label: string;
};

function TargetButton({
    target,
    active,
    onSelect,
    children,
}: {
    target: PreviewTarget;
    active: boolean;
    onSelect?: (target: PreviewTarget) => void;
    children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={() => onSelect?.(target)}
            className={`w-full rounded-[2rem] text-left transition-all ${
                active ? 'ring-2 ring-cyan-400 shadow-[0_0_0_1px_rgba(34,211,238,0.2)]' : 'ring-1 ring-white/10 hover:ring-cyan-300/60'
            }`}
        >
            {children}
        </button>
    );
}

function renderSectionCard(
    page: PageDocument,
    section: SectionDocument,
    index: number,
    selectedTargetKey?: string,
    onSelectTarget?: (target: PreviewTarget) => void,
) {
    const target = {
        key: `${page.slug}::${section.type}::${index}`,
        label: `${page.title} / ${section.type}`,
    };
    const title = String(section.fields.title ?? section.type);
    const active = selectedTargetKey === target.key;
    const sharedInner = 'overflow-hidden rounded-[2rem] px-6 py-8 sm:px-8 sm:py-10';

    if (section.type === 'hero') {
        return (
            <TargetButton key={target.key} target={target} active={active} onSelect={onSelectTarget}>
                <section className={`${sharedInner} bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.22),_transparent_38%),linear-gradient(135deg,#020617_0%,#0f172a_55%,#111827_100%)] text-white`}>
                    <div className="mx-auto flex max-w-6xl flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
                        <div className="max-w-3xl">
                            <div className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-100">
                                Premium Hero
                            </div>
                            <h2 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">{title}</h2>
                            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300">
                                AI ve panel ile olusan bu hero, safe-area icinde kalir ve uzun icerikte de layout bozulmaz.
                            </p>
                        </div>
                        <div className="grid min-w-[240px] gap-3 sm:grid-cols-2">
                            {['Snap story', 'WebGL ready', 'CTA focus', 'Mobile safe'].map((item) => (
                                <div key={item} className="rounded-2xl bg-white/5 px-4 py-4 text-sm text-slate-100 backdrop-blur">
                                    {item}
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            </TargetButton>
        );
    }

    if (section.type === 'services') {
        return (
            <TargetButton key={target.key} target={target} active={active} onSelect={onSelectTarget}>
                <section className={`${sharedInner} bg-white`}>
                    <div className="mx-auto max-w-6xl">
                        <div className="max-w-2xl">
                            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Services</div>
                            <h3 className="mt-3 text-3xl font-semibold text-slate-950">{title}</h3>
                        </div>
                        <div className="mt-6 grid gap-4 md:grid-cols-3">
                            {['Klinik Danismanlik', 'Cihaz Uygulama', 'Teknik Destek'].map((item) => (
                                <div key={item} className="rounded-[1.75rem] bg-slate-50 px-5 py-5 text-sm text-slate-700 ring-1 ring-slate-200">
                                    <div className="font-semibold text-slate-950">{item}</div>
                                    <div className="mt-2 leading-6">Safe-area kurali ile kartlar tasma yapmadan yeniden akislaniyor.</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            </TargetButton>
        );
    }

    if (section.type === 'product_listing') {
        return (
            <TargetButton key={target.key} target={target} active={active} onSelect={onSelectTarget}>
                <section className={`${sharedInner} bg-slate-950 text-white`}>
                    <div className="mx-auto max-w-6xl">
                        <div className="flex items-end justify-between gap-4">
                            <div>
                                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Products</div>
                                <h3 className="mt-3 text-3xl font-semibold">{title}</h3>
                            </div>
                            <div className="rounded-full border border-white/10 px-4 py-2 text-xs text-slate-300">Snap commerce preset</div>
                        </div>
                        <div className="mt-6 grid gap-4 lg:grid-cols-3">
                            {['Premium Aid', 'Invisible Fit', 'Daily Care Kit'].map((item, cardIndex) => (
                                <div key={item} className="rounded-[1.75rem] bg-white/5 px-5 py-5 backdrop-blur">
                                    <div className="aspect-[4/3] rounded-[1.25rem] bg-gradient-to-br from-cyan-300/20 to-purple-400/10" />
                                    <div className="mt-4 font-semibold">{item}</div>
                                    <div className="mt-2 text-sm text-slate-300">Card {cardIndex + 1} kontrollu product component.</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            </TargetButton>
        );
    }

    if (section.type === 'appointment_form') {
        return (
            <TargetButton key={target.key} target={target} active={active} onSelect={onSelectTarget}>
                <section className={`${sharedInner} bg-[linear-gradient(135deg,#f8fafc_0%,#ecfeff_100%)]`}>
                    <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1fr_0.85fr] lg:items-center">
                        <div>
                            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Appointment</div>
                            <h3 className="mt-3 text-3xl font-semibold text-slate-950">{title}</h3>
                            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
                                Uzun metin gelse bile form karti ve kopya safe-area disina tasmaz.
                            </p>
                        </div>
                        <div className="rounded-[1.75rem] bg-white p-5 ring-1 ring-slate-200">
                            <div className="grid gap-3">
                                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">Ad Soyad</div>
                                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">Telefon</div>
                                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">Mesaj</div>
                                <div className="rounded-2xl bg-slate-950 px-4 py-3 text-center text-sm font-semibold text-white">Randevu Talebi Gonder</div>
                            </div>
                        </div>
                    </div>
                </section>
            </TargetButton>
        );
    }

    if (section.type === 'faq') {
        return (
            <TargetButton key={target.key} target={target} active={active} onSelect={onSelectTarget}>
                <section className={`${sharedInner} bg-white`}>
                    <div className="mx-auto max-w-4xl">
                        <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">FAQ</div>
                        <h3 className="mt-3 text-3xl font-semibold text-slate-950">{title}</h3>
                        <div className="mt-6 space-y-3">
                            {['Cihaz secimi nasil yapilir?', 'Randevu sureci nasil ilerler?', 'Destek kanallari nelerdir?'].map((item) => (
                                <div key={item} className="rounded-[1.5rem] bg-slate-50 px-5 py-4 text-sm text-slate-700 ring-1 ring-slate-200">
                                    {item}
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            </TargetButton>
        );
    }

    return (
        <TargetButton key={target.key} target={target} active={active} onSelect={onSelectTarget}>
            <section className={`${sharedInner} bg-white`}>
                <div className="mx-auto max-w-6xl">
                    <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{section.type}</div>
                    <h3 className="mt-3 text-3xl font-semibold text-slate-950">{title}</h3>
                    <p className="mt-3 text-sm leading-7 text-slate-600">
                        Bu component kontrollu builder section tanimindan render edildi.
                    </p>
                </div>
            </section>
        </TargetButton>
    );
}

export function WebsitePreviewCanvas({
    site,
    pageSlug,
    selectedTargetKey,
    onSelectTarget,
}: {
    site: SitePreviewData;
    pageSlug?: string;
    selectedTargetKey?: string;
    onSelectTarget?: (target: PreviewTarget) => void;
}) {
    const selectedPage = site.pages.find((page) => page.slug === pageSlug) ?? site.pages[0];

    if (!selectedPage) {
        return (
            <div className="rounded-[2rem] bg-white p-8 text-sm text-slate-500 ring-1 ring-slate-200">
                Preview olusturmak icin once en az bir sayfa gerekiyor.
            </div>
        );
    }

    return (
        <div
            className="overflow-hidden rounded-[2rem] bg-slate-950 text-slate-50 shadow-[0_40px_120px_rgba(15,23,42,0.22)]"
            style={{
                fontFamily: site.theme_settings.font_family,
                ['--preview-primary' as string]: site.theme_settings.primary_color,
                ['--preview-accent' as string]: site.theme_settings.accent_color,
            }}
        >
            <div className="border-b border-white/10 bg-black/20 px-5 py-3 text-xs uppercase tracking-[0.2em] text-slate-300">
                {site.name} / {selectedPage.title}
            </div>
            <div className="max-h-[80vh] snap-y snap-mandatory overflow-y-auto bg-[linear-gradient(180deg,#020617_0%,#0f172a_14%,#f8fafc_14%,#f8fafc_100%)]">
                <div className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/85 backdrop-blur">
                    <div className="mx-auto flex w-full max-w-[1280px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
                        <div className="text-sm font-semibold text-white">{site.name}</div>
                        <div className="flex flex-wrap gap-3 text-xs text-slate-300">
                            {site.pages.map((page) => (
                                <span key={page.slug} className={`rounded-full px-3 py-1 ${page.slug === selectedPage.slug ? 'bg-white/10 text-white' : 'bg-transparent'}`}>
                                    {page.title}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="space-y-4 px-3 py-3 sm:px-4 lg:px-6">
                    {selectedPage.sections.map((section, index) => (
                        <div key={`${selectedPage.slug}-${section.type}-${index}`} className="snap-start">
                            {renderSectionCard(selectedPage, section, index, selectedTargetKey, onSelectTarget)}
                        </div>
                    ))}
                </div>
                <div className="border-t border-slate-200 bg-slate-950 px-4 py-8 text-center text-sm text-slate-300 sm:px-6 lg:px-8">
                    Footer / controlled runtime preview
                </div>
            </div>
        </div>
    );
}
