'use client';

import React, { useState } from 'react';
import { useLocale } from '@/hooks/useLocale';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, CheckCircle, Send, User, Mail, Phone, Building2, MessageSquare } from 'lucide-react';
import { HyperGlassCard } from '@/components/ui/HyperGlassCard';
import { Scene } from '@/components/canvas/Scene';

export default function DemoClient() {
    const { locale } = useLocale();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        contactName: '',
        contactEmail: '',
        contactPhone: '',
        company: '',
        notes: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        try {
            const response = await fetch('http://localhost:5003/api/leads/public/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...formData,
                    language: locale,
                    source: 'landing_demo'
                }),
            });

            if (!response.ok) {
                throw new Error('Bir hata oluştu. Lütfen tekrar deneyin.');
            }

            setIsSuccess(true);
        } catch (err: any) {
            setError(err.message || 'Bir hata oluştu.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }));
    };

    const translations = {
        tr: {
            title: 'Demo İsteyin',
            subtitle: 'X-Ear CRM dünyasını keşfetmek için ilk adımı atın.',
            name: 'Ad Soyad',
            email: 'E-posta Adresi',
            phone: 'Telefon Numarası',
            company: 'Şirket / Klinik Adı',
            notes: 'Mesajınız',
            submit: 'Gönder',
            submitting: 'Gönderiliyor...',
            successTitle: 'Tebrikler!',
            successMsg: 'Başvurunuz başarıyla alındı. Ekibimiz en kısa sürede sizinle iletişime geçecektir.',
            backHome: 'Ana Sayfaya Dön'
        },
        en: {
            title: 'Request a Demo',
            subtitle: 'Take the first step to explore the world of X-Ear CRM.',
            name: 'Full Name',
            email: 'Email Address',
            phone: 'Phone Number',
            company: 'Company / Clinic Name',
            notes: 'Your Message',
            submit: 'Submit',
            submitting: 'Submitting...',
            successTitle: 'Congratulations!',
            successMsg: 'Your request has been successfully received. Our team will contact you shortly.',
            backHome: 'Back to Home'
        }
    };
    const t = translations[locale as 'tr' | 'en'] || translations.tr;

    return (
        <div className="relative min-h-screen w-full overflow-hidden bg-black flex items-center justify-center p-4">
            {/* Background 3D Scene */}
            <div className="absolute inset-0 z-0">
                <Scene />
            </div>

            <div className="relative z-10 w-full max-w-2xl">
                <AnimatePresence mode="wait">
                    {!isSuccess ? (
                        <motion.div
                            key="form"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.5 }}
                        >
                            <HyperGlassCard className="p-8 md:p-12">
                                <div className="text-center mb-10">
                                    <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-white via-blue-200 to-blue-400 bg-clip-text text-transparent mb-4">
                                        {t.title}
                                    </h1>
                                    <p className="text-blue-100/60 text-lg">
                                        {t.subtitle}
                                    </p>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Name */}
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-blue-100/80 ml-1 flex items-center gap-2">
                                                <User className="w-4 h-4" /> {t.name}
                                            </label>
                                            <input
                                                required
                                                type="text"
                                                name="contactName"
                                                value={formData.contactName}
                                                onChange={handleChange}
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-white/20"
                                                placeholder="John Doe"
                                            />
                                        </div>

                                        {/* Email */}
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-blue-100/80 ml-1 flex items-center gap-2">
                                                <Mail className="w-4 h-4" /> {t.email}
                                            </label>
                                            <input
                                                required
                                                type="email"
                                                name="contactEmail"
                                                value={formData.contactEmail}
                                                onChange={handleChange}
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-white/20"
                                                placeholder="john@example.com"
                                            />
                                        </div>

                                        {/* Phone */}
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-blue-100/80 ml-1 flex items-center gap-2">
                                                <Phone className="w-4 h-4" /> {t.phone}
                                            </label>
                                            <input
                                                required
                                                type="tel"
                                                name="contactPhone"
                                                value={formData.contactPhone}
                                                onChange={handleChange}
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-white/20"
                                                placeholder="+90 5xx xxx xx xx"
                                            />
                                        </div>

                                        {/* Company */}
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium text-blue-100/80 ml-1 flex items-center gap-2">
                                                <Building2 className="w-4 h-4" /> {t.company}
                                            </label>
                                            <input
                                                type="text"
                                                name="company"
                                                value={formData.company}
                                                onChange={handleChange}
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-white/20"
                                                placeholder="X-Ear Medical"
                                            />
                                        </div>
                                    </div>

                                    {/* Notes */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-blue-100/80 ml-1 flex items-center gap-2">
                                            <MessageSquare className="w-4 h-4" /> {t.notes}
                                        </label>
                                        <textarea
                                            name="notes"
                                            value={formData.notes}
                                            onChange={handleChange}
                                            rows={4}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-white/20"
                                            placeholder="..."
                                        />
                                    </div>

                                    {error && (
                                        <div className="text-red-400 text-sm bg-red-400/10 p-3 rounded-xl border border-red-400/20">
                                            {error}
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-3 group relative overflow-hidden"
                                    >
                                        {isSubmitting ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <>
                                                {t.submit}
                                                <Send className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                            </>
                                        )}
                                    </button>
                                </form>
                            </HyperGlassCard>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="success"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ type: 'spring', damping: 15 }}
                        >
                            <HyperGlassCard className="p-12 text-center">
                                <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-8 border border-green-500/30">
                                    <CheckCircle className="w-12 h-12 text-green-400" />
                                </div>
                                <h2 className="text-4xl font-bold text-white mb-4">
                                    {t.successTitle}
                                </h2>
                                <p className="text-blue-100/60 text-lg mb-10 max-w-md mx-auto">
                                    {t.successMsg}
                                </p>
                                <button
                                    onClick={() => window.location.href = `/${locale}`}
                                    className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 font-medium transition-colors"
                                >
                                    {t.backHome}
                                </button>
                            </HyperGlassCard>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
