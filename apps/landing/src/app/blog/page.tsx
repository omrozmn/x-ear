"use client";

import React, { useEffect, useState } from "react";
import { BlogCard } from "@/components/ui/BlogCard";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Scene } from "@/components/canvas/Scene";
import { motion } from "framer-motion";

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

export default function BlogPage() {
    const [posts, setPosts] = useState<BlogPost[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchPosts = async () => {
            try {
                const response = await fetch("http://localhost:5003/api/blog/");
                const data = await response.json();
                setPosts(data);
            } catch (error) {
                console.error("Error fetching blog posts:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchPosts();
    }, []);

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
                            İşitme merkezleri için dijital dönüşüm, yapay zeka trendleri ve sektörel haberler.
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
                        <div className="h-[80vh] w-full overflow-y-auto snap-y snap-mandatory scroll-smooth scrollbar-hide">
                            <div className="container mx-auto px-4 max-w-5xl py-8 pb-[20vh]">
                                {posts.map((post, index) => (
                                    <div key={post.id} className="min-h-[80vh] flex items-center justify-center snap-center mb-8">
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
