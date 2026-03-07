'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post, put, del } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { TableSkeleton, EmptyState } from '@/components/ui/loading';
import {
  Newspaper, Plus, Edit3, Trash2, Eye, EyeOff, Pin, PinOff,
  Users, ChevronRight, Calendar, BarChart3,
} from 'lucide-react';

interface NewsPost {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  status: string;
  publishedAt?: string;
  isPinned: boolean;
  viewCount: number;
  category?: { id: string; name: string; color: string };
  createdAt: string;
}

type Mode = 'list' | 'create' | 'edit';

export default function NewsAdminPage() {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<Mode>('list');
  const [editingPost, setEditingPost] = useState<NewsPost | null>(null);
  const [form, setForm] = useState({ title: '', content: '', excerpt: '', categoryId: '', status: 'draft' as string });

  const { data: postsData, isLoading } = useQuery({
    queryKey: ['admin-news'],
    queryFn: () => get<{ data: NewsPost[]; pagination: any }>('/news/admin/posts'),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['news-categories'],
    queryFn: () => get<{ data: any[] }>('/news/categories').then((r) => r.data),
  });

  const { data: subscribersData } = useQuery({
    queryKey: ['news-subscribers'],
    queryFn: () => get<{ data: any[]; pagination: { total: number } }>('/news/admin/subscribers'),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => post('/news/admin/posts', data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-news'] }); setMode('list'); resetForm(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => put(`/news/admin/posts/${id}`, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-news'] }); setMode('list'); resetForm(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => del(`/news/admin/posts/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-news'] }),
  });

  const resetForm = () => {
    setForm({ title: '', content: '', excerpt: '', categoryId: '', status: 'draft' });
    setEditingPost(null);
  };

  const handleSubmit = () => {
    if (editingPost) {
      updateMutation.mutate({ id: editingPost.id, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const handleEdit = (p: NewsPost) => {
    setEditingPost(p);
    setForm({ title: p.title, content: p.content, excerpt: p.excerpt || '', categoryId: p.category?.id || '', status: p.status });
    setMode('edit');
  };

  const posts = postsData?.data || [];
  const subscriberCount = subscribersData?.pagination?.total || 0;

  if (mode !== 'list') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {editingPost ? 'Edit Post' : 'New Post'}
          </h1>
          <button onClick={() => { setMode('list'); resetForm(); }} className="text-sm text-slate-500 hover:text-slate-700">
            Cancel
          </button>
        </div>

        <div className="card p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Title</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
              placeholder="Article title"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Excerpt</label>
            <textarea
              value={form.excerpt}
              onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
              rows={2}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
              placeholder="Brief summary shown in previews"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Content</label>
            <textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              rows={12}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-mono"
              placeholder="Article content (HTML supported)"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Category</label>
              <select
                value={form.categoryId}
                onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
              >
                <option value="">No category</option>
                {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-3">
            <button
              onClick={() => { setMode('list'); resetForm(); }}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!form.title || !form.content}
              className="px-6 py-2 text-sm font-semibold bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white rounded-xl transition-colors"
            >
              {editingPost ? 'Update Post' : 'Create Post'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Newspaper className="w-6 h-6 text-primary-500" /> News Management
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Create and manage news articles and newsletter</p>
        </div>
        <button
          onClick={() => setMode('create')}
          className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
        >
          <Plus className="w-4 h-4" /> New Post
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="text-sm text-slate-500">Total Posts</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{posts.length}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-slate-500">Published</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{posts.filter((p) => p.status === 'published').length}</div>
        </div>
        <div className="card p-4">
          <div className="text-sm text-slate-500 flex items-center gap-1"><Users className="w-3.5 h-3.5" /> Subscribers</div>
          <div className="text-2xl font-bold text-primary-600 mt-1">{subscriberCount}</div>
        </div>
      </div>

      {isLoading ? (
        <TableSkeleton />
      ) : posts.length === 0 ? (
        <EmptyState icon={Newspaper} title="No posts yet" description="Create your first news post to share with customers and the public." />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Title</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Category</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden sm:table-cell">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden lg:table-cell">Views</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
              {posts.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900 dark:text-white flex items-center gap-2">
                      {p.isPinned && <Pin className="w-3.5 h-3.5 text-amber-500" />}
                      {p.title}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {p.category ? (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: p.category.color }}>
                        {p.category.name}
                      </span>
                    ) : <span className="text-xs text-slate-400">—</span>}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className={cn(
                      'text-xs font-medium px-2 py-1 rounded-full capitalize',
                      p.status === 'published' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                        : p.status === 'draft' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400'
                          : 'bg-slate-100 text-slate-500'
                    )}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-sm text-slate-500">{p.viewCount}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => handleEdit(p)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600">
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button onClick={() => deleteMutation.mutate(p.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-slate-400 hover:text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
