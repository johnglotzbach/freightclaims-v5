'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, post as apiPost, put, del, uploadFile } from '@/lib/api-client';
import { sanitizeHtml } from '@/lib/sanitize';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Newspaper, Plus, X, Pin, Eye, Clock, ChevronRight,
  Edit2, Trash2, Send, Image as ImageIcon, Loader2,
  Megaphone, Sparkles, Bug, Rocket, Tag,
} from 'lucide-react';

interface NewsPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  coverImage?: string;
  status: string;
  isPinned: boolean;
  viewCount: number;
  publishedAt?: string;
  createdAt: string;
  category?: { id: string; name: string; slug: string; color?: string };
}

interface NewsCategory {
  id: string;
  name: string;
  slug: string;
  color?: string;
}

function extractItems(raw: unknown): any[] {
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;
    if (Array.isArray(obj.data)) return obj.data;
    if (obj.success && Array.isArray((obj as any).data)) return (obj as any).data;
  }
  return [];
}

const CATEGORY_ICONS: Record<string, typeof Megaphone> = {
  announcement: Megaphone,
  feature: Sparkles,
  bugfix: Bug,
  improvement: Rocket,
};

const CATEGORY_COLORS: Record<string, string> = {
  announcement: 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
  feature: 'bg-purple-100 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400',
  bugfix: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400',
  improvement: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
};

export default function NewsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isAdmin = user?.isSuperAdmin || false;

  const [showEditor, setShowEditor] = useState(false);
  const [editingPost, setEditingPost] = useState<NewsPost | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');

  const { data: rawPosts, isLoading } = useQuery({
    queryKey: ['news', isAdmin ? 'admin' : 'public'],
    queryFn: () => isAdmin ? get<any>('/news/admin/posts?limit=50') : get<any>('/news?limit=50'),
  });

  const { data: rawCategories } = useQuery({
    queryKey: ['news-categories'],
    queryFn: () => get<any>('/news/categories'),
  });

  const posts: NewsPost[] = extractItems(rawPosts);
  const categories: NewsCategory[] = extractItems(rawCategories);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => del(`/news/admin/posts/${id}`),
    onSuccess: () => {
      toast.success('Post deleted');
      queryClient.invalidateQueries({ queryKey: ['news'] });
    },
    onError: () => toast.error('Failed to delete'),
  });

  const pinMutation = useMutation({
    mutationFn: ({ id, isPinned }: { id: string; isPinned: boolean }) =>
      put(`/news/admin/posts/${id}`, { isPinned }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['news'] });
    },
  });

  const filtered = filter === 'all'
    ? posts
    : posts.filter(p => p.category?.slug === filter);

  function handleEdit(post: NewsPost) {
    setEditingPost(post);
    setShowEditor(true);
  }

  function handleNewPost() {
    setEditingPost(null);
    setShowEditor(true);
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: d.getFullYear() !== now.getFullYear() ? 'numeric' : undefined });
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <div className="p-2 bg-gradient-to-br from-primary-500 to-purple-500 rounded-xl">
              <Newspaper className="w-5 h-5 text-white" />
            </div>
            News & Changelog
          </h1>
          <p className="text-sm text-slate-500 mt-1">Stay up to date with the latest updates, features, and fixes</p>
        </div>
        {isAdmin && (
          <button
            onClick={handleNewPost}
            className="flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> New Post
          </button>
        )}
      </div>

      {/* Category filters */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilter('all')}
          className={cn(
            'px-3 py-1.5 rounded-lg text-xs font-medium transition-all border',
            filter === 'all'
              ? 'bg-primary-50 dark:bg-primary-500/10 border-primary-200 dark:border-primary-500/30 text-primary-700 dark:text-primary-400'
              : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300'
          )}
        >
          All Updates
        </button>
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setFilter(cat.slug)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-medium transition-all border flex items-center gap-1',
              filter === cat.slug
                ? 'bg-primary-50 dark:bg-primary-500/10 border-primary-200 dark:border-primary-500/30 text-primary-700 dark:text-primary-400'
                : 'border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-300'
            )}
          >
            {cat.color && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />}
            {cat.name}
          </button>
        ))}
      </div>

      {/* Editor */}
      {showEditor && isAdmin && (
        <PostEditor
          post={editingPost}
          categories={categories}
          onClose={() => { setShowEditor(false); setEditingPost(null); }}
          onSaved={() => {
            setShowEditor(false);
            setEditingPost(null);
            queryClient.invalidateQueries({ queryKey: ['news'] });
          }}
        />
      )}

      {/* Posts */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="card p-6 animate-pulse">
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-3" />
              <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-2/3 mb-2" />
              <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-12 text-center">
          <Newspaper className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">No updates yet</p>
          <p className="text-sm text-slate-400 mt-1">
            {isAdmin ? 'Create the first post to share news with your users.' : 'Check back later for updates.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(post => {
            const isExpanded = expandedId === post.id;
            const catSlug = post.category?.slug || '';
            const CatIcon = CATEGORY_ICONS[catSlug] || Tag;
            const catColor = CATEGORY_COLORS[catSlug] || 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400';

            return (
              <div
                key={post.id}
                className={cn(
                  'card overflow-hidden transition-all',
                  post.isPinned && 'ring-1 ring-amber-200 dark:ring-amber-500/20',
                )}
              >
                {post.coverImage && isExpanded && (
                  <div className="w-full h-48 bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <img src={post.coverImage} alt="" className="w-full h-full object-cover" />
                  </div>
                )}

                <div className="p-5">
                  <div className="flex items-start gap-3">
                    <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', catColor)}>
                      <CatIcon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {post.isPinned && (
                          <span className="flex items-center gap-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase">
                            <Pin className="w-3 h-3" /> Pinned
                          </span>
                        )}
                        {post.category && (
                          <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full uppercase', catColor)}>
                            {post.category.name}
                          </span>
                        )}
                        {post.status === 'draft' && isAdmin && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">Draft</span>
                        )}
                        <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                          <Clock className="w-3 h-3" />
                          {formatDate(post.publishedAt || post.createdAt)}
                        </span>
                        <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                          <Eye className="w-3 h-3" /> {post.viewCount}
                        </span>
                      </div>

                      <button
                        onClick={() => setExpandedId(isExpanded ? null : post.id)}
                        className="text-left w-full group"
                      >
                        <h3 className="text-base font-semibold text-slate-900 dark:text-white group-hover:text-primary-500 transition-colors">
                          {post.title}
                        </h3>
                        {!isExpanded && post.excerpt && (
                          <p className="text-sm text-slate-500 mt-1 line-clamp-2">{post.excerpt}</p>
                        )}
                      </button>

                      {isExpanded && (
                        <div className="mt-4 prose prose-sm dark:prose-invert max-w-none">
                          <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(post.content) }} />
                        </div>
                      )}

                      <div className="flex items-center gap-2 mt-3">
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : post.id)}
                          className="text-xs text-primary-500 hover:text-primary-600 font-medium flex items-center gap-0.5"
                        >
                          {isExpanded ? 'Show less' : 'Read more'} <ChevronRight className={cn('w-3 h-3 transition-transform', isExpanded && 'rotate-90')} />
                        </button>

                        {isAdmin && (
                          <>
                            <button onClick={() => handleEdit(post)} className="text-xs text-slate-400 hover:text-slate-600 font-medium flex items-center gap-0.5 ml-2">
                              <Edit2 className="w-3 h-3" /> Edit
                            </button>
                            <button onClick={() => pinMutation.mutate({ id: post.id, isPinned: !post.isPinned })} className="text-xs text-slate-400 hover:text-amber-600 font-medium flex items-center gap-0.5">
                              <Pin className="w-3 h-3" /> {post.isPinned ? 'Unpin' : 'Pin'}
                            </button>
                            <button
                              onClick={() => { if (window.confirm('Delete this post?')) deleteMutation.mutate(post.id); }}
                              className="text-xs text-slate-400 hover:text-red-500 font-medium flex items-center gap-0.5"
                            >
                              <Trash2 className="w-3 h-3" /> Delete
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PostEditor({
  post,
  categories,
  onClose,
  onSaved,
}: {
  post: NewsPost | null;
  categories: NewsCategory[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(post?.title || '');
  const [content, setContent] = useState(post?.content || '');
  const [excerpt, setExcerpt] = useState(post?.excerpt || '');
  const [categoryId, setCategoryId] = useState(post?.category?.id || '');
  const [coverImage, setCoverImage] = useState(post?.coverImage || '');
  const [status, setStatus] = useState<'draft' | 'published'>(
    (post?.status as 'draft' | 'published') || 'draft'
  );
  const [uploading, setUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const isEditing = !!post;
  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      isEditing ? put(`/news/admin/posts/${post!.id}`, data) : apiPost('/news/admin/posts', data),
    onSuccess: () => {
      toast.success(post ? 'Post updated' : 'Post created');
      onSaved();
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || 'Failed to save'),
  });

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('files', file);
      const res = await uploadFile('/documents/upload', formData);
      const uploaded = res?.data?.uploaded?.[0] || res?.uploaded?.[0];
      if (uploaded?.url || uploaded?.s3Key) {
        setCoverImage(uploaded.url || `/api/v1/documents/${uploaded.id}/download`);
        toast.success('Image uploaded');
      }
    } catch {
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  function handleSave(publishStatus: 'draft' | 'published') {
    if (!title.trim()) { toast.error('Title is required'); return; }
    if (!content.trim()) { toast.error('Content is required'); return; }
    createMutation.mutate({
      title,
      content,
      excerpt: excerpt || title.slice(0, 200),
      categoryId: categoryId || undefined,
      coverImage: coverImage || undefined,
      status: publishStatus,
    });
  }

  return (
    <div className="card p-6 border-2 border-primary-200 dark:border-primary-500/30 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-900 dark:text-white">
          {post ? 'Edit Post' : 'New Post'}
        </h3>
        <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">
          <X className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Title *</label>
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="w-full px-3 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-medium"
          placeholder="What's new?"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Category</label>
          <select
            value={categoryId}
            onChange={e => setCategoryId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
          >
            <option value="">None</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Cover Image</label>
          <div className="flex gap-2">
            <input
              value={coverImage}
              onChange={e => setCoverImage(e.target.value)}
              className="flex-1 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
              placeholder="Image URL or upload"
            />
            <button
              onClick={() => imageInputRef.current?.click()}
              disabled={uploading}
              className="px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
            >
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4 text-slate-500" />}
            </button>
            <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          </div>
        </div>
      </div>

      {coverImage && (
        <div className="relative rounded-lg overflow-hidden h-32 bg-slate-100 dark:bg-slate-800">
          <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
          <button
            onClick={() => setCoverImage('')}
            className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full hover:bg-black/70"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      <div>
        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Excerpt (optional)</label>
        <input
          value={excerpt}
          onChange={e => setExcerpt(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
          placeholder="Brief summary shown in the feed..."
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Content *</label>
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          rows={12}
          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm resize-none font-sans"
          placeholder="Write your update... (HTML supported)"
        />
        <p className="text-[10px] text-slate-400 mt-1">HTML supported: use &lt;b&gt;, &lt;i&gt;, &lt;ul&gt;, &lt;img&gt;, etc.</p>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700">
        <button onClick={onClose} className="text-sm text-slate-500 hover:text-slate-700 font-medium">Cancel</button>
        <div className="flex gap-2">
          <button
            onClick={() => handleSave('draft')}
            disabled={createMutation.isPending}
            className="px-4 py-2 text-sm font-medium border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
          >
            Save as Draft
          </button>
          <button
            onClick={() => handleSave('published')}
            disabled={createMutation.isPending}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 rounded-lg disabled:opacity-50"
          >
            {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Publish
          </button>
        </div>
      </div>
    </div>
  );
}
