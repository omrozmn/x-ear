"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Scene } from "@/components/canvas/Scene";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { AISummary } from "@/components/ui/AISummary";

interface BlogPost {
    id: string;
    title: string;
    slug: string;
    content: string;
    excerpt?: string;
    imageUrl?: string;
    category?: string;
    authorName: string;
    publishedAt?: string;
}

export default function BlogDetailPage({ slug }: { slug: string }) {
    const [post, setPost] = useState<BlogPost | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchPost = async () => {
            try {
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5003";
                const response = await fetch(`${apiUrl}/api/blog/${slug}`);
                if (!response.ok) throw new Error("Post not found");
                const data = await response.json();
                setPost(data);
            } catch (error) {
                console.error("Error fetching blog post:", error);
            } finally {
                setIsLoading(false);
            }
        };

        if (slug) fetchPost();
    }, [slug]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex flex-col">
                <Header />
                <div className="flex-grow flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full border-4 border-accent-blue/20 border-t-accent-blue animate-spin" />
                </div>
                <Footer />
            </div>
        );
    }

    if (!post) {
        return (
            <div className="min-h-screen bg-background flex flex-col">
                <Header />
                <div className="flex-grow flex flex-col items-center justify-center space-y-6">
                    <h1 className="text-4xl font-bold">Yazı bulunamadı.</h1>
                    <Link href="/blog" className="text-accent-blue hover:underline">Bloga Geri Dön</Link>
                </div>
                <Footer />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground flex flex-col">
            <Header />

            <main className="relative flex-grow">
                <Scene />

                <article className="relative z-10 pt-32 pb-40 container mx-auto px-4 max-w-4xl">
                    {/* Glowing background blob behind the header */}
                    <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-accent-blue/10 dark:bg-accent-blue/5 blur-[120px] rounded-full pointer-events-none" />

                    {/* Header */}
                    <header className="relative space-y-8 mb-16 text-center">
                        <Link
                            href="/blog"
                            className="inline-flex items-center gap-2 text-foreground/50 hover:text-accent-blue transition-colors group mb-8 bg-white/5 backdrop-blur-sm px-4 py-2 rounded-full border border-white/10 shadow-sm"
                        >
                            <span className="group-hover:-translate-x-1 transition-transform">←</span>
                            <span className="text-sm font-medium">Tüm Yazılar</span>
                        </Link>

                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                            className="space-y-6"
                        >
                            <div className="flex items-center justify-center gap-4 text-accent-blue font-medium">
                                <span className="px-4 py-1.5 bg-accent-blue/10 rounded-full text-xs font-bold uppercase tracking-widest border border-accent-blue/20 shadow-[0_0_15px_rgba(var(--accent-blue),0.2)]">
                                    {post.category || "Genel"}
                                </span>
                                <span className="text-foreground/30">•</span>
                                <span className="text-sm text-foreground/60 font-medium tracking-wide">
                                    {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString("tr-TR", { day: 'numeric', month: 'long', year: 'numeric' }) : 'Draft'}
                                </span>
                            </div>

                            <h1 className="text-4xl md:text-5xl lg:text-7xl font-bold font-display leading-[1.1] tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-zinc-900 to-zinc-500 dark:from-white dark:to-zinc-500">
                                {post.title}
                            </h1>

                            <div className="flex items-center justify-center gap-4 pt-8">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-accent-purple to-accent-blue p-[2px] shadow-lg shadow-accent-blue/20">
                                    <div className="w-full h-full rounded-full bg-white dark:bg-zinc-900 flex items-center justify-center text-sm font-bold text-foreground">
                                        XT
                                    </div>
                                </div>
                                <div className="text-left">
                                    <p className="text-base font-semibold text-foreground">{post.authorName}</p>
                                    <p className="text-sm text-foreground/50">X-Ear Editör Ekibi</p>
                                </div>
                            </div>
                        </motion.div>
                    </header>

                    {/* Premium Cover Image */}
                    {post.imageUrl && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            transition={{ delay: 0.3, duration: 1, ease: [0.16, 1, 0.3, 1] }}
                            className="relative group mb-24"
                        >
                            <div className="absolute -inset-4 bg-gradient-to-b from-accent-blue/20 to-transparent blur-2xl opacity-50 group-hover:opacity-100 transition-opacity duration-700" />
                            <div className="relative aspect-[21/9] w-full rounded-[2rem] overflow-hidden shadow-2xl border border-white/10 dark:border-white/5 bg-zinc-100 dark:bg-zinc-900/50 backdrop-blur-sm">
                                <Image
                                    src={post.imageUrl}
                                    alt={post.title}
                                    fill
                                    className="object-cover transition-transform duration-1000 group-hover:scale-105"
                                    priority
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/40 via-transparent to-transparent opacity-60" />
                            </div>
                        </motion.div>
                    )}

                    {/* Glassmorphism Content Container */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.5, duration: 0.8 }}
                        className="relative mx-auto"
                    >
                        <script
                            type="application/ld+json"
                            dangerouslySetInnerHTML={{
                                __html: JSON.stringify({
                                    "@context": "https://schema.org",
                                    "@type": "BlogPosting",
                                    "headline": post.title,
                                    "description": post.excerpt || post.title,
                                    "image": post.imageUrl ? [post.imageUrl] : [],
                                    "datePublished": post.publishedAt,
                                    "author": [{
                                        "@type": "Person",
                                        "name": post.authorName
                                    }]
                                })
                            }}
                        />

                        {post.excerpt && (
                            <div className="mb-16 -mx-4 md:-mx-8">
                                <AISummary content={post.excerpt} label="Yazı Özeti" />
                            </div>
                        )}

                        <div className="absolute inset-0 bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl rounded-[2.5rem] shadow-[-10px_-10px_30px_4px_rgba(0,0,0,0.05),_10px_10px_30px_4px_rgba(45,78,255,0.05)] border border-white/50 dark:border-white/5 -m-8 md:-m-12 p-8 md:p-12 z-0" />

                        {/* The actual content rendered safely with typography enhancements */}
                        <div
                            className="relative z-10 prose prose-lg md:prose-xl prose-zinc dark:prose-invert max-w-none 
                                     prose-headings:font-display prose-headings:font-bold prose-headings:tracking-tight 
                                     prose-h1:text-4xl prose-h2:text-3xl prose-h3:text-2xl
                                     prose-p:text-zinc-600 dark:prose-p:text-zinc-300 prose-p:leading-[1.8] prose-p:font-light
                                     prose-a:text-accent-blue prose-a:no-underline hover:prose-a:text-accent-purple prose-a:transition-colors
                                     prose-strong:font-semibold prose-strong:text-zinc-900 dark:prose-strong:text-zinc-100
                                     prose-li:text-zinc-600 dark:prose-li:text-zinc-300
                                     prose-img:rounded-2xl prose-img:shadow-xl
                                     prose-blockquote:border-l-accent-blue prose-blockquote:bg-accent-blue/5 prose-blockquote:px-6 prose-blockquote:py-2 prose-blockquote:rounded-r-xl prose-blockquote:font-medium prose-blockquote:text-zinc-700 dark:prose-blockquote:text-zinc-200"
                            dangerouslySetInnerHTML={{ __html: post.content }}
                        />
                    </motion.div>

                    {/* Lead Generation CTA */}
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-100px" }}
                        transition={{ duration: 0.8 }}
                        className="mt-24 relative rounded-3xl overflow-hidden bg-gradient-to-br from-accent-blue/10 to-accent-purple/10 border border-accent-blue/20 p-8 md:p-12 text-center"
                    >
                        <div className="absolute inset-0 bg-white/40 dark:bg-zinc-950/40 backdrop-blur-md" />
                        <div className="relative z-10 max-w-2xl mx-auto space-y-6">
                            <h3 className="text-2xl md:text-3xl font-bold font-display text-zinc-900 dark:text-white">
                                Kliniğinizi Dijitale Taşıyın
                            </h3>
                            <p className="text-zinc-600 dark:text-zinc-300">
                                X-Ear'ın yapay zeka destekli altyapısıyla hasta kayıtlarınızı, randevularınızı ve cihaz takiplerinizi tek bir platformdan yönetin. Üstelik her yerden erişilebilir.
                            </p>
                            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
                                <Link
                                    href="/demo"
                                    className="px-8 py-3 rounded-full bg-accent-blue text-white font-medium hover:bg-accent-blue/90 transition-colors shadow-lg shadow-accent-blue/25 w-full sm:w-auto"
                                >
                                    Ücretsiz Demo Talebi
                                </Link>
                                <Link
                                    href="/pricing"
                                    className="px-8 py-3 rounded-full bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white font-medium hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors border border-zinc-200 dark:border-white/10 w-full sm:w-auto"
                                >
                                    Fiyatlandırma
                                </Link>
                            </div>
                        </div>
                    </motion.div>
                </article>
            </main>

            <Footer />
        </div>
    );
}
