"use client";

import React, { useEffect, useState } from "react";
import { BlogCard } from "@/components/ui/BlogCard";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Scene } from "@/components/canvas/Scene";
import { motion } from "framer-motion";
import { useSectorStore, type SectorId } from "@/lib/sector-store";
import { apiClient } from "@/lib/api-client";

interface BlogPost {
    id: string;
    title: string;
    slug: string;
    excerpt?: string;
    imageUrl?: string;
    category?: string;
    authorName: string;
    publishedAt?: string;
}

const sectorBlogDesc: Record<SectorId, string> = {
    hearing: "İşitme merkezleri için dijital dönüşüm, yapay zeka trendleri ve sektörel haberler.",
    pharmacy: "Eczane yönetimi, ilaç sektörü trendleri ve dijital dönüşüm yazıları.",
    hospital: "Hastane yönetimi, sağlık teknolojileri ve dijital dönüşüm içerikleri.",
    hotel: "Konaklama sektörü trendleri, misafir deneyimi ve otel yönetimi yazıları.",
    medical: "Medikal cihaz sektörü, UTS uyumluluğu ve distribüsyon yönetimi içerikleri.",
    optic: "Optik sektörü trendleri, lens teknolojileri ve mağaza yönetimi yazıları.",
    beauty: "Güzellik sektörü trendleri, salon yönetimi ve müşteri deneyimi içerikleri.",
    general: "İşletme yönetimi, dijital dönüşüm, yapay zeka trendleri ve sektörel haberler.",
};

export default function BlogPage() {
    const sector = useSectorStore((s) => s.sector);
    const [posts, setPosts] = useState<BlogPost[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchPosts = async () => {
            setIsLoading(true);
            try {
                const params: Record<string, string> = {};
                if (sector && sector !== "general") {
                    params.category = sector;
                }
                const response = await apiClient.get("/api/blog/", { params });
                const data = response.data;
                setPosts(Array.isArray(data) ? data : []);
            } catch (error) {
                console.error("Error fetching blog posts:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchPosts();
    }, [sector]);

    return (
        <div className="min-h-screen flex flex-col bg-background text-foreground">
            <Header />

            <main className="relative flex-grow">
                <Scene />

                {/* Blog Hero */}
                <section className="relative z-10 pt-32 pb-20 px-4 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        className="max-w-4xl mx-auto space-y-6"
                    >
                        <h1 className="text-5xl md:text-7xl font-bold font-display tracking-tight">
                            X-Ear <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-blue to-accent-purple">Blog</span>
                        </h1>
                        <p className="text-xl text-foreground/60 max-w-2xl mx-auto leading-relaxed">
                            {sectorBlogDesc[sector] || sectorBlogDesc.general}
                        </p>
                    </motion.div>
                </section>

                {/* Blog List Section */}
                <section className="relative z-10 pb-40">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-[400px]">
                            <div className="w-12 h-12 rounded-full border-4 border-accent-blue/20 border-t-accent-blue animate-spin" />
                        </div>
                    ) : posts.length > 0 ? (
                        <div className="h-[75vh] md:h-[85vh] w-full overflow-y-auto snap-y snap-mandatory scroll-smooth scrollbar-hide py-[10vh] md:py-[15vh]">
                            <div className="container mx-auto px-4 max-w-5xl space-y-16 md:space-y-[20vh] pb-[20vh]">
                                {posts.map((post, index) => (
                                    <div key={post.id} className="snap-center snap-always flex items-center justify-center">
                                        <BlogCard post={post} index={index} total={posts.length} />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-40">
                            <p className="text-2xl text-foreground/40">Henüz blog yazısı bulunmuyor.</p>
                        </div>
                    )}
                </section>
            </main>

            <Footer />
        </div>
    );
}
