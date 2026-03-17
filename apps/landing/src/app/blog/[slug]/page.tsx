import BlogDetailPage from "./ClientPage";

export async function generateStaticParams() {
    try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5003";
        const res = await fetch(`${apiUrl}/api/blog/`);
        if (!res.ok) return [];
        const data = await res.json();
        return Array.isArray(data) ? data.map((post: any) => ({
            slug: post.slug,
        })) : [];
    } catch (e) {
        console.error("Failed to generate static params for blog:", e);
        return [];
    }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
    try {
        const resolvedParams = await params;
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5003";
        const res = await fetch(`${apiUrl}/api/blog/${resolvedParams.slug}`);
        if (!res.ok) return { title: 'Yazı Bulunamadı | X-Ear' };

        const post = await res.json();
        return {
            title: post.metaTitle || `${post.title} | X-Ear Blog`,
            description: post.metaDescription || post.excerpt,
            keywords: post.metaKeywords || post.category || 'işitme, crm, klinik, x-ear',
            openGraph: {
                title: post.metaTitle || post.title,
                description: post.metaDescription || post.excerpt,
                images: post.imageUrl ? [{ url: post.imageUrl }] : [],
            }
        };
    } catch (e) {
        return { title: 'X-Ear Web App' };
    }
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
    const resolvedParams = await params;
    return <BlogDetailPage slug={resolvedParams.slug} />;
}
