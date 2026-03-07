'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { get } from '@/lib/api-client';
import Link from 'next/link';
import {
  Newspaper, Search, Calendar, Eye, ArrowRight, Tag,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NewsPost {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  coverImage?: string;
  status: string;
  publishedAt: string;
  viewCount: number;
  isPinned: boolean;
  category?: { id: string; name: string; slug: string; color: string };
}

interface NewsCategory {
  id: string;
  name: string;
  slug: string;
  color: string;
}

export default function NewsPage() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const { data: postsData, isLoading, isError } = useQuery({
    queryKey: ['news', selectedCategory, search],
    queryFn: () => {
      const params = new URLSearchParams();
      if (selectedCategory) params.set('category', selectedCategory);
      if (search) params.set('search', search);
      params.set('limit', '12');
      return get<{ data: NewsPost[]; pagination: any }>(`/news?${params}`);
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['news-categories'],
    queryFn: () => get<{ data: NewsCategory[] }>('/news/categories').then((r) => r.data),
  });

  const posts = postsData?.data || [];

  const handleSubscribe = async () => {
    if (!email) return;
    try {
      await fetch('/api/v1/news/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setSubscribed(true);
    } catch {
      alert('Failed to subscribe. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary-600 to-primary-800 text-white">
        <div className="max-w-6xl mx-auto px-6 py-16">
          <div className="flex items-center gap-3 mb-4">
            <Newspaper className="w-8 h-8" />
            <h1 className="text-4xl font-bold">News & Updates</h1>
          </div>
          <p className="text-primary-100 text-lg max-w-2xl">
            Stay up to date with the latest in freight claims management, industry news, and FreightClaims platform updates.
          </p>

          {/* Search */}
          <div className="relative mt-8 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary-300" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search articles..."
              className="w-full pl-12 pr-4 py-3 rounded-xl bg-white/10 backdrop-blur border border-white/20 text-white placeholder-primary-200 text-sm focus:outline-none focus:ring-2 focus:ring-white/30"
            />
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Categories */}
        <div className="flex gap-2 flex-wrap mb-8">
          <button
            onClick={() => setSelectedCategory(null)}
            className={cn(
              'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              !selectedCategory
                ? 'bg-primary-500 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            )}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.slug)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                selectedCategory === cat.slug
                  ? 'text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              )}
              style={selectedCategory === cat.slug ? { backgroundColor: cat.color } : {}}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Posts Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="card overflow-hidden animate-pulse">
                <div className="aspect-video bg-slate-200 dark:bg-slate-700" />
                <div className="p-5 space-y-3">
                  <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/4" />
                  <div className="h-5 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-full" />
                  <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="text-center py-20">
            <Newspaper className="w-12 h-12 text-red-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Failed to load articles</h3>
            <p className="text-slate-500 mt-1">Please try refreshing the page.</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20">
            <Newspaper className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">No articles yet</h3>
            <p className="text-slate-500 mt-1">Check back soon for news and updates.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/news/${post.slug}`}
                className="group card overflow-hidden hover:shadow-card-hover transition-all"
              >
                {post.coverImage && (
                  <div className="aspect-video bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <img src={post.coverImage} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  </div>
                )}
                <div className="p-5">
                  {post.category && (
                    <span
                      className="inline-block text-xs font-medium px-2 py-0.5 rounded-full mb-2 text-white"
                      style={{ backgroundColor: post.category.color }}
                    >
                      {post.category.name}
                    </span>
                  )}
                  {post.isPinned && (
                    <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full mb-2 ml-1 bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                      Pinned
                    </span>
                  )}
                  <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-primary-500 transition-colors line-clamp-2">
                    {post.title}
                  </h3>
                  {post.excerpt && (
                    <p className="text-sm text-slate-500 mt-2 line-clamp-3">{post.excerpt}</p>
                  )}
                  <div className="flex items-center gap-4 mt-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(post.publishedAt).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" />
                      {post.viewCount}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Newsletter Signup */}
        <div className="mt-16 bg-gradient-to-r from-primary-50 to-blue-50 dark:from-primary-500/10 dark:to-blue-500/10 rounded-2xl p-8 text-center">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Stay in the Loop</h3>
          <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-md mx-auto">
            Subscribe to our newsletter for the latest freight claims insights and platform updates.
          </p>
          {subscribed ? (
            <p className="text-emerald-600 font-medium">You're subscribed! Check your email for confirmation.</p>
          ) : (
            <div className="flex gap-3 max-w-sm mx-auto">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm"
              />
              <button
                onClick={handleSubscribe}
                className="px-6 py-2.5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                Subscribe
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
