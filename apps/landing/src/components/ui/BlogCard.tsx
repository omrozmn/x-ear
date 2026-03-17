"use client";

import React, { useRef } from "react";
import { motion, useScroll, useTransform, MotionValue } from "framer-motion";
import Link from "next/link";
import Image from "next/image";

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

interface BlogCardProps {
    post: BlogPost;
    index: number;
    total: number;
}

export function BlogCard({ post, index }: BlogCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className="w-full h-full max-h-[85vh] rounded-3xl overflow-hidden bg-white dark:bg-zinc-950 border border-gray-200 dark:border-white/10 shadow-lg hover:shadow-2xl transition-all flex flex-col group relative"
        >
            {/* Image Section */}
            <div className="w-full h-48 md:h-64 lg:h-72 relative bg-zinc-100 dark:bg-zinc-900 shrink-0 overflow-hidden">
                {post.imageUrl ? (
                    <Image
                        src={post.imageUrl}
                        alt={post.title}
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-accent-blue/10 to-accent-purple/10">
                        <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-white dark:bg-zinc-800 shadow-xl flex items-center justify-center rotate-3 group-hover:-rotate-3 transition-transform duration-500">
                            <span className="text-xl md:text-2xl font-black bg-clip-text text-transparent bg-gradient-to-br from-accent-blue to-accent-purple">
                                XE
                            </span>
                        </div>
                    </div>
                )}

                {post.category && (
                    <div className="absolute top-4 left-4 px-3 py-1 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md rounded-full text-[10px] md:text-xs font-bold text-zinc-900 dark:text-white uppercase tracking-wider shadow-sm border border-black/5 dark:border-white/10 z-10">
                        {post.category}
                    </div>
                )}
            </div>

            {/* Content Section */}
            <div className="p-5 md:p-8 flex flex-col flex-grow bg-white dark:bg-zinc-950 overflow-hidden">
                <div className="space-y-2 md:space-y-3 mb-4">
                    <div className="text-xs md:text-sm font-medium tracking-wide flex items-center gap-2">
                        <span className="text-accent-blue">{post.authorName}</span>
                        <span className="h-1 w-1 rounded-full bg-gray-300 dark:bg-zinc-700" />
                        <span className="text-gray-500 dark:text-zinc-400">
                            {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : 'Draft'}
                        </span>
                    </div>

                    <h2 className="text-lg md:text-2xl lg:text-3xl font-bold font-display leading-tight group-hover:text-accent-blue transition-colors text-zinc-900 dark:text-white line-clamp-2">
                        {post.title}
                    </h2>

                    <p className="text-zinc-600 dark:text-zinc-400 line-clamp-2 md:line-clamp-3 text-sm md:text-base leading-relaxed hidden sm:block">
                        {post.excerpt || post.title}
                    </p>
                </div>

                <div className="pt-4 md:pt-6 mt-auto">
                    <Link
                        href={`/blog/${post.slug}`}
                        className="inline-flex items-center gap-2 font-semibold text-xs md:text-sm group/link hover:text-accent-blue transition-colors text-zinc-900 dark:text-white"
                    >
                        Yazıya Git
                        <motion.span
                            className="bg-accent-blue/10 text-accent-blue rounded-full w-5 h-5 md:w-6 md:h-6 flex items-center justify-center group-hover/link:bg-accent-blue group-hover/link:text-white transition-colors text-[10px] md:text-xs"
                        >
                            →
                        </motion.span>
                    </Link>
                </div>
            </div>
        </motion.div>
    );
}

