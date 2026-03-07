'use client';

import { useQuery } from '@tanstack/react-query';
import { get } from '@/lib/api-client';
import Link from 'next/link';
import { ArrowLeft, Calendar, Eye, Tag } from 'lucide-react';

interface NewsPost {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  coverImage?: string;
  publishedAt: string;
  viewCount: number;
  category?: { id: string; name: string; slug: string; color: string };
}

export default function NewsArticlePage({ params }: { params: { slug: string } }) {
  const { data: post, isLoading } = useQuery({
    queryKey: ['news-post', params.slug],
    queryFn: () => get<{ data: NewsPost }>(`/news/post/${params.slug}`).then((r) => r.data),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-900">
        <div className="max-w-3xl mx-auto px-6 py-16">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/4" />
            <div className="h-64 bg-slate-200 dark:bg-slate-700 rounded-xl mt-8" />
            <div className="space-y-3 mt-8">
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded" />
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-5/6" />
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-4/6" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Article not found</h1>
          <Link href="/news" className="text-primary-500 mt-4 inline-block">Back to News</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link href="/news" className="text-sm text-primary-500 hover:text-primary-600 font-medium inline-flex items-center gap-1 mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to News
        </Link>

        {post.category && (
          <span
            className="inline-block text-xs font-medium px-3 py-1 rounded-full text-white mb-4"
            style={{ backgroundColor: post.category.color }}
          >
            {post.category.name}
          </span>
        )}

        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white leading-tight">
          {post.title}
        </h1>

        <div className="flex items-center gap-4 mt-4 text-sm text-slate-500">
          <span className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            {new Date(post.publishedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
          <span className="flex items-center gap-1.5">
            <Eye className="w-4 h-4" />
            {post.viewCount} views
          </span>
        </div>

        {post.coverImage && (
          <div className="mt-8 rounded-xl overflow-hidden">
            <img src={post.coverImage} alt={post.title} className="w-full" />
          </div>
        )}

        <div
          className="prose prose-slate dark:prose-invert max-w-none mt-8"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />
      </div>
    </div>
  );
}
