'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getList, post, put, del } from '@/lib/api-client';
import { TableSkeleton, EmptyState } from '@/components/ui/loading';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Mail, FileText, Zap, Plus, Edit2, Trash2,
  Copy, Search, Eye, ChevronRight, X, Save,
  Bold, Italic, Underline, List, Link2,
  Variable, Code, Palette,
} from 'lucide-react';

type TemplateType = 'email' | 'letter' | 'automation';

interface Template {
  id: string;
  name: string;
  type: TemplateType;
  subject?: string;
  body: string;
  category?: string;
  isDefault: boolean;
  updatedAt: string;
}

const VARIABLES = [
  '{{claimNumber}}', '{{proNumber}}', '{{bolNumber}}', '{{claimAmount}}',
  '{{carrierName}}', '{{shipperName}}', '{{customerName}}', '{{senderName}}',
  '{{shipDate}}', '{{deliveryDate}}', '{{filingDate}}', '{{date}}',
  '{{origin}}', '{{destination}}', '{{claimType}}', '{{description}}',
  '{{referenceNumber}}', '{{productList}}', '{{taskTitle}}', '{{dueDate}}',
];

export default function TemplatesPage() {
  const [activeType, setActiveType] = useState<TemplateType>('email');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Template | null>(null);
  const [creating, setCreating] = useState(false);
  const queryClient = useQueryClient();

  const { data: emailTemplates = [], isLoading: loadingEmail } = useQuery({
    queryKey: ['templates', 'email'],
    queryFn: () => getList<Template>('/users/templates/email'),
  });
  const { data: letterTemplates = [], isLoading: loadingLetter } = useQuery({
    queryKey: ['templates', 'letter'],
    queryFn: () => getList<Template>('/users/templates/letter'),
  });

  const templates = useMemo(() => {
    const email = emailTemplates.map(t => ({ ...t, type: 'email' as const }));
    const letter = letterTemplates.map(t => ({ ...t, type: 'letter' as const }));
    return [...email, ...letter];
  }, [emailTemplates, letterTemplates]);

  const saveTemplateMutation = useMutation({
    mutationFn: async (data: { template: Template; isNew: boolean }) => {
      const { template, isNew } = data;
      if (template.type === 'automation') throw new Error('Automation templates not supported');
      const payload = { name: template.name, subject: template.subject, body: template.body, category: template.category, isDefault: template.isDefault };
      if (template.type === 'email') {
        return isNew ? post('/users/templates/email', payload) : put(`/users/templates/email/${template.id}`, payload);
      }
      return isNew ? post('/users/templates/letter', payload) : put(`/users/templates/letter/${template.id}`, payload);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['templates', 'email'] });
      queryClient.invalidateQueries({ queryKey: ['templates', 'letter'] });
      toast.success(variables.isNew ? 'Template created' : 'Template updated');
      setEditing(null);
      setCreating(false);
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to save template'),
  });

  const copyTemplateMutation = useMutation({
    mutationFn: (template: Template) => {
      const payload = { name: `${template.name} (Copy)`, subject: template.subject, body: template.body, category: template.category, isDefault: false };
      if (template.type === 'email') return post('/users/templates/email', payload);
      if (template.type === 'letter') return post('/users/templates/letter', payload);
      throw new Error('Automation templates not supported');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates', 'email'] });
      queryClient.invalidateQueries({ queryKey: ['templates', 'letter'] });
      toast.success('Template duplicated');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to duplicate template'),
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (template: Template) => {
      if (template.type === 'email') return del(`/users/templates/email/${template.id}`);
      if (template.type === 'letter') return del(`/users/templates/letter/${template.id}`);
      throw new Error('Automation templates not supported');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates', 'email'] });
      queryClient.invalidateQueries({ queryKey: ['templates', 'letter'] });
      toast.success('Template deleted');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to delete template'),
  });

  const isLoading = loadingEmail || loadingLetter;
  const filtered = templates.filter(t => t.type === activeType && (search === '' || t.name.toLowerCase().includes(search.toLowerCase())));

  const typeConfig: Record<TemplateType, { label: string; icon: typeof Mail; color: string }> = {
    email: { label: 'Email Templates', icon: Mail, color: 'text-blue-500' },
    letter: { label: 'Letter Templates', icon: FileText, color: 'text-purple-500' },
    automation: { label: 'Automation Templates', icon: Zap, color: 'text-amber-500' },
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><Mail className="w-6 h-6 text-primary-500" /> Templates</h1>
            <p className="text-sm text-slate-500 mt-0.5">Loading templates...</p>
          </div>
        </div>
        <TableSkeleton rows={4} cols={3} />
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><Mail className="w-6 h-6 text-primary-500" /> Templates</h1>
            <p className="text-sm text-slate-500 mt-0.5">Manage email, letter, and automation templates</p>
          </div>
          <button onClick={() => { setEditing({ id: '', name: '', type: activeType, body: '', isDefault: false, updatedAt: new Date().toISOString().split('T')[0] }); setCreating(true); }} className="flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">
            <Plus className="w-4 h-4" /> New Template
          </button>
        </div>
        <EmptyState icon={Mail} title="No templates yet" description="Create your first template to streamline communications." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><Mail className="w-6 h-6 text-primary-500" /> Templates</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage email, letter, and automation templates</p>
        </div>
        <button onClick={() => { setEditing({ id: '', name: '', type: activeType, body: '', isDefault: false, updatedAt: new Date().toISOString().split('T')[0] }); setCreating(true); }} className="flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-semibold">
          <Plus className="w-4 h-4" /> New Template
        </button>
      </div>

      {/* Type Tabs */}
      <div className="flex gap-2">
        {(Object.keys(typeConfig) as TemplateType[]).map(type => {
          const config = typeConfig[type];
          const count = templates.filter(t => t.type === type).length;
          return (
            <button key={type} onClick={() => setActiveType(type)} className={cn('flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all border', activeType === type ? 'bg-primary-50 dark:bg-primary-500/10 border-primary-200 dark:border-primary-500/30 text-primary-700 dark:text-primary-400' : 'border-slate-200 dark:border-slate-700 text-slate-500')}>
              <config.icon className={cn('w-4 h-4', activeType === type ? config.color : '')} />
              {config.label} <span className="bg-slate-200/60 dark:bg-slate-700 rounded-full px-2 py-0.5 text-xs">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search templates..." className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
      </div>

      {/* Template Editor */}
      {editing && (
        <TemplateEditor
          template={editing}
          isNew={creating}
          variables={VARIABLES}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSave={(data) => saveTemplateMutation.mutate({ template: data, isNew: creating })}
          isSaving={saveTemplateMutation.isPending}
        />
      )}

      {/* Template List */}
      <div className="grid md:grid-cols-2 gap-4">
        {filtered.map(template => (
          <div key={template.id} className="card p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm text-slate-900 dark:text-white">{template.name}</h3>
                  {template.isDefault && <span className="text-[10px] bg-primary-100 text-primary-700 dark:bg-primary-500/10 dark:text-primary-400 px-2 py-0.5 rounded-full font-semibold">Default</span>}
                </div>
                {template.subject && <p className="text-xs text-slate-500 mt-0.5">{template.subject}</p>}
                {template.category && <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded mt-1 inline-block">{template.category}</span>}
              </div>
            </div>
            <p className="text-xs text-slate-400 line-clamp-3 font-mono mt-2">{template.body.substring(0, 150)}...</p>
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
              <span className="text-[10px] text-slate-400">Updated {template.updatedAt}</span>
              <div className="flex items-center gap-1">
                <button onClick={() => { setEditing(template); setCreating(false); }} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400"><Edit2 className="w-3.5 h-3.5" /></button>
                <button onClick={() => copyTemplateMutation.mutate(template)} disabled={copyTemplateMutation.isPending} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 disabled:opacity-50"><Copy className="w-3.5 h-3.5" /></button>
                {!template.isDefault && <button onClick={() => { if (confirm('Delete this template?')) deleteTemplateMutation.mutate(template); }} disabled={deleteTemplateMutation.isPending} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-red-500 disabled:opacity-50"><Trash2 className="w-3.5 h-3.5" /></button>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TemplateEditor({ template, isNew, variables, onClose, onSave, isSaving }: {
  template: Template; isNew: boolean; variables: string[];
  onClose: () => void; onSave: (data: Template) => void; isSaving?: boolean;
}) {
  const [name, setName] = useState(template.name);
  const [subject, setSubject] = useState(template.subject || '');
  const [body, setBody] = useState(template.body);
  const [showVars, setShowVars] = useState(false);
  const varsRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  function applyFormat(prefix: string, suffix: string) {
    const ta = bodyRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = body.substring(start, end);
    const newText = body.substring(0, start) + prefix + selected + suffix + body.substring(end);
    setBody(newText);
    setTimeout(() => { ta.focus(); ta.setSelectionRange(start + prefix.length, end + prefix.length); }, 0);
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (varsRef.current && !varsRef.current.contains(e.target as Node)) {
        setShowVars(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function insertVariable(v: string) {
    setBody(body + v);
    setShowVars(false);
  }

  function handleSave() {
    onSave({ ...template, name, subject: template.type === 'email' ? subject : undefined, body });
  }

  return (
    <div className="card p-6 space-y-4 border-2 border-primary-200 dark:border-primary-500/30">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-900 dark:text-white">{isNew ? 'New' : 'Edit'} {template.type} Template</h3>
        <button onClick={onClose}><X className="w-4 h-4 text-slate-400" /></button>
      </div>

      <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Template name..." className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />

      {template.type === 'email' && (
        <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Email subject..." className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
      )}

      <div className="flex items-center gap-1 border-b border-slate-100 dark:border-slate-700 pb-2">
        {template.type !== 'automation' && (
          <>
            <button onClick={() => applyFormat('**', '**')} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded" title="Bold"><Bold className="w-4 h-4 text-slate-500" /></button>
            <button onClick={() => applyFormat('_', '_')} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded" title="Italic"><Italic className="w-4 h-4 text-slate-500" /></button>
            <button onClick={() => applyFormat('<u>', '</u>')} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded" title="Underline"><Underline className="w-4 h-4 text-slate-500" /></button>
            <button onClick={() => applyFormat('\n- ', '')} className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded" title="List"><List className="w-4 h-4 text-slate-500" /></button>
          </>
        )}
        <div className="relative" ref={varsRef}>
          <button onClick={() => setShowVars(!showVars)} className="flex items-center gap-1 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-xs text-purple-500 font-medium"><Variable className="w-4 h-4" /> Variables</button>
          {showVars && (
            <div className="absolute left-0 top-full mt-1 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-10 p-2 max-h-48 overflow-y-auto">
              {variables.map(v => (
                <button key={v} onClick={() => insertVariable(v)} className="w-full text-left px-2 py-1 text-xs font-mono hover:bg-slate-50 dark:hover:bg-slate-700 rounded">{v}</button>
              ))}
            </div>
          )}
        </div>
      </div>

      <textarea ref={bodyRef} value={body} onChange={(e) => setBody(e.target.value)} rows={12} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600 resize-none font-mono" />

      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500 font-medium">Cancel</button>
        <button onClick={handleSave} disabled={isSaving} className="bg-primary-500 hover:bg-primary-600 text-white px-5 py-2 rounded-lg text-sm font-semibold flex items-center gap-1 disabled:opacity-50"><Save className="w-4 h-4" /> {isNew ? 'Create' : 'Save'}</button>
      </div>
    </div>
  );
}
