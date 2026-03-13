'use client';

import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, getList, post, put, del } from '@/lib/api-client';
import { TableSkeleton, StatsSkeleton, EmptyState } from '@/components/ui/loading';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Workflow as WorkflowIcon, Plus, Edit2, Trash2, Play, Pause,
  Mail, CheckSquare, Clock, Bell, Zap, Search, ChevronUp, ChevronDown,
  ToggleLeft, ToggleRight, X, Save, ArrowLeft, ArrowRight,
  FileText, Timer, Bot, RefreshCw, AlertTriangle, Activity,
  Calendar, Upload, Loader2, TestTube, Hash, ChevronRight,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TriggerType = 'on_create' | 'on_status_change' | 'on_file_claim' | 'on_schedule' | 'on_document_upload' | 'on_overdue';
type ActionType = 'send_email' | 'create_task' | 'change_status' | 'notify_user' | 'wait_delay' | 'ai_action';
type ExecutionStatus = 'running' | 'completed' | 'failed' | 'paused';

interface WorkflowStep {
  id?: string;
  orderIndex: number;
  actionType: ActionType;
  config: Record<string, any>;
  condition?: string;
}

interface WorkflowData {
  id: string;
  name: string;
  description?: string;
  trigger: TriggerType;
  triggerConfig?: Record<string, any>;
  isActive: boolean;
  steps: WorkflowStep[];
  executionCount?: number;
  lastTriggeredAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface WorkflowExecution {
  id: string;
  workflowId: string;
  claimId?: string;
  claimNumber?: string;
  currentStep?: number;
  status: ExecutionStatus;
  startedAt: string;
  completedAt?: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TRIGGERS: { key: TriggerType; label: string; icon: typeof Zap; desc: string }[] = [
  { key: 'on_create', label: 'Claim Created', icon: Plus, desc: 'When a new claim is created' },
  { key: 'on_status_change', label: 'Status Changed', icon: RefreshCw, desc: 'When claim status changes' },
  { key: 'on_file_claim', label: 'Claim Filed', icon: FileText, desc: 'When a claim is filed with carrier' },
  { key: 'on_schedule', label: 'On Schedule', icon: Calendar, desc: 'Run on a recurring schedule' },
  { key: 'on_document_upload', label: 'Document Upload', icon: Upload, desc: 'When a document is uploaded' },
  { key: 'on_overdue', label: 'Overdue', icon: AlertTriangle, desc: 'When a claim becomes overdue' },
];

const ACTIONS: { key: ActionType; label: string; icon: typeof Mail; color: string }[] = [
  { key: 'send_email', label: 'Send Email', icon: Mail, color: 'text-blue-500' },
  { key: 'create_task', label: 'Create Task', icon: CheckSquare, color: 'text-emerald-500' },
  { key: 'change_status', label: 'Change Status', icon: RefreshCw, color: 'text-purple-500' },
  { key: 'notify_user', label: 'Notify User', icon: Bell, color: 'text-amber-500' },
  { key: 'wait_delay', label: 'Wait / Delay', icon: Timer, color: 'text-slate-500' },
  { key: 'ai_action', label: 'AI Action', icon: Bot, color: 'text-pink-500' },
];

const CLAIM_STATUSES = [
  'new', 'open', 'in_review', 'filed', 'pending_carrier', 'carrier_acknowledged',
  'investigation', 'negotiation', 'approved', 'partial_approved', 'denied',
  'appeal', 'settled', 'paid', 'closed', 'archived',
];

const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function triggerLabel(t: TriggerType) {
  return TRIGGERS.find(tr => tr.key === t)?.label ?? t;
}

function actionLabel(a: ActionType) {
  return ACTIONS.find(act => act.key === a)?.label ?? a;
}

function actionMeta(a: ActionType) {
  return ACTIONS.find(act => act.key === a) ?? ACTIONS[0];
}

function fmtDate(d?: string) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function fmtRelative(d?: string) {
  if (!d) return 'Never';
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return fmtDate(d);
}

const statusBadge: Record<ExecutionStatus, string> = {
  running: 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400',
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
  failed: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400',
  paused: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function AutomationPage() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<'list' | 'editor'>('list');
  const [editId, setEditId] = useState<string | null>(null);

  const { data: workflows = [], isLoading } = useQuery({
    queryKey: ['workflows'],
    queryFn: () => getList<WorkflowData>('/workflows'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => del(`/workflows/${id}`),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['workflows'] }); toast.success('Workflow deleted'); },
    onError: (e: Error) => toast.error(e.message || 'Delete failed'),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => put(`/workflows/${id}`, { isActive }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['workflows'] }); toast.success('Workflow updated'); },
    onError: (e: Error) => toast.error(e.message || 'Update failed'),
  });

  const triggerMutation = useMutation({
    mutationFn: (id: string) => post(`/workflows/${id}/trigger`, {}),
    onSuccess: () => toast.success('Workflow triggered'),
    onError: (e: Error) => toast.error(e.message || 'Trigger failed'),
  });

  function openEditor(id?: string) {
    setEditId(id ?? null);
    setView('editor');
  }

  function closeEditor() {
    setEditId(null);
    setView('list');
  }

  if (view === 'editor') {
    return <WorkflowEditor workflowId={editId} onBack={closeEditor} />;
  }

  return (
    <WorkflowList
      workflows={workflows}
      isLoading={isLoading}
      onCreateNew={() => openEditor()}
      onEdit={(id) => openEditor(id)}
      onDelete={(id) => { if (confirm('Delete this workflow?')) deleteMutation.mutate(id); }}
      onToggle={(id, active) => toggleMutation.mutate({ id, isActive: active })}
      onTrigger={(id) => triggerMutation.mutate(id)}
      isDeleting={deleteMutation.isPending}
      isToggling={toggleMutation.isPending}
    />
  );
}

// ---------------------------------------------------------------------------
// Workflow List View
// ---------------------------------------------------------------------------

function WorkflowList({
  workflows, isLoading, onCreateNew, onEdit, onDelete, onToggle, onTrigger, isDeleting, isToggling,
}: {
  workflows: WorkflowData[];
  isLoading: boolean;
  onCreateNew: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string, active: boolean) => void;
  onTrigger: (id: string) => void;
  isDeleting: boolean;
  isToggling: boolean;
}) {
  const [search, setSearch] = useState('');

  if (isLoading) return <div className="space-y-6"><StatsSkeleton /><TableSkeleton /></div>;

  const filtered = workflows.filter(w =>
    w.name.toLowerCase().includes(search.toLowerCase()) ||
    (w.description ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: workflows.length,
    active: workflows.filter(w => w.isActive).length,
    totalExec: workflows.reduce((s, w) => s + (w.executionCount ?? 0), 0),
    last7: workflows.filter(w => {
      if (!w.lastTriggeredAt) return false;
      return Date.now() - new Date(w.lastTriggeredAt).getTime() < 7 * 86400000;
    }).length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <WorkflowIcon className="w-6 h-6 text-primary-500" /> Workflows &amp; Automation
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">Build automated workflows to streamline claim processing</p>
        </div>
        <button onClick={onCreateNew} className="flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors">
          <Plus className="w-4 h-4" /> Create Workflow
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Workflows', value: stats.total, icon: WorkflowIcon, color: 'text-slate-900 dark:text-white' },
          { label: 'Active', value: stats.active, icon: Activity, color: 'text-emerald-600' },
          { label: 'Total Executions', value: stats.totalExec.toLocaleString(), icon: Play, color: 'text-primary-600' },
          { label: 'Triggered Last 7d', value: stats.last7, icon: Clock, color: 'text-amber-500' },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700/60">
                <s.icon className="w-5 h-5 text-slate-500 dark:text-slate-400" />
              </div>
              <div>
                <p className={cn('text-2xl font-bold', s.color)}>{s.value}</p>
                <p className="text-xs text-slate-500">{s.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search workflows..."
          className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600"
        />
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={WorkflowIcon}
          title={workflows.length === 0 ? 'No workflows yet' : 'No matching workflows'}
          description={workflows.length === 0 ? 'Create your first workflow to automate claim processing.' : 'Try a different search term.'}
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Trigger</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden lg:table-cell">Steps</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Active</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden lg:table-cell">Last Triggered</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                {filtered.map(w => (
                  <tr
                    key={w.id}
                    onClick={() => onEdit(w.id)}
                    className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900 dark:text-white">{w.name}</div>
                      {w.description && <p className="text-xs text-slate-400 mt-0.5 line-clamp-1 max-w-xs">{w.description}</p>}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-2.5 py-1 rounded-lg">
                        <Zap className="w-3 h-3" /> {triggerLabel(w.trigger)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center hidden lg:table-cell">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300">
                        {w.steps?.length ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => onToggle(w.id, !w.isActive)}
                        disabled={isToggling}
                        className="inline-flex disabled:opacity-50"
                      >
                        {w.isActive
                          ? <ToggleRight className="w-6 h-6 text-emerald-500" />
                          : <ToggleLeft className="w-6 h-6 text-slate-400" />
                        }
                      </button>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-xs text-slate-500">{fmtRelative(w.lastTriggeredAt)}</span>
                    </td>
                    <td className="px-4 py-3 text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => onTrigger(w.id)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-emerald-500 transition-colors" title="Trigger now">
                          <Play className="w-4 h-4" />
                        </button>
                        <button onClick={() => onEdit(w.id)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-primary-500 transition-colors" title="Edit">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => onDelete(w.id)} disabled={isDeleting} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-red-500 transition-colors disabled:opacity-50" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Workflow Editor
// ---------------------------------------------------------------------------

function WorkflowEditor({ workflowId, onBack }: { workflowId: string | null; onBack: () => void }) {
  const queryClient = useQueryClient();
  const isNew = !workflowId;
  const [tab, setTab] = useState<'builder' | 'history'>('builder');

  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ['workflow', workflowId],
    queryFn: () => get<WorkflowData>(`/workflows/${workflowId}`),
    enabled: !!workflowId,
  });

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [trigger, setTrigger] = useState<TriggerType>('on_create');
  const [triggerConfig, setTriggerConfig] = useState<Record<string, any>>({});
  const [isActive, setIsActive] = useState(false);
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);

  if (!initialized && existing) {
    setName(existing.name);
    setDescription(existing.description ?? '');
    setTrigger(existing.trigger);
    setTriggerConfig(existing.triggerConfig ?? {});
    setIsActive(existing.isActive);
    setSteps(existing.steps?.map((s, i) => ({ ...s, orderIndex: i })) ?? []);
    setInitialized(true);
  }
  if (!initialized && isNew) {
    setInitialized(true);
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name,
        description,
        trigger,
        triggerConfig,
        isActive,
        steps: steps.map((s, i) => ({
          ...(s.id ? { id: s.id } : {}),
          orderIndex: i,
          actionType: s.actionType,
          config: s.config,
          condition: s.condition || undefined,
        })),
      };
      if (isNew) {
        return post<WorkflowData>('/workflows', payload);
      }
      return put<WorkflowData>(`/workflows/${workflowId}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] });
      queryClient.invalidateQueries({ queryKey: ['workflow', workflowId] });
      toast.success(isNew ? 'Workflow created' : 'Workflow saved');
      onBack();
    },
    onError: (e: Error) => toast.error(e.message || 'Save failed'),
  });

  function handleSave() {
    if (!name.trim()) { toast.error('Workflow name is required'); return; }
    if (steps.length === 0) { toast.error('Add at least one step'); return; }
    saveMutation.mutate();
  }

  function addStep() {
    setSteps(prev => [...prev, {
      orderIndex: prev.length,
      actionType: 'send_email',
      config: {},
    }]);
  }

  function removeStep(idx: number) {
    setSteps(prev => prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, orderIndex: i })));
  }

  function moveStep(idx: number, dir: -1 | 1) {
    const target = idx + dir;
    if (target < 0 || target >= steps.length) return;
    setSteps(prev => {
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next.map((s, i) => ({ ...s, orderIndex: i }));
    });
  }

  function updateStep(idx: number, patch: Partial<WorkflowStep>) {
    setSteps(prev => prev.map((s, i) => i === idx ? { ...s, ...patch } : s));
  }

  if (!isNew && loadingExisting) {
    return <div className="space-y-6"><StatsSkeleton count={2} /><TableSkeleton /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-500" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              {isNew ? 'Create Workflow' : 'Edit Workflow'}
            </h1>
            <button onClick={onBack} className="text-xs text-primary-500 hover:text-primary-600 font-medium flex items-center gap-1 mt-0.5">
              <ArrowLeft className="w-3 h-3" /> Back to Workflows
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!isNew && (
            <button
              onClick={() => setShowTestModal(true)}
              className="flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <TestTube className="w-4 h-4" /> Test Workflow
            </button>
          )}
          <button onClick={onBack} className="px-4 py-2 text-sm text-slate-500 font-medium hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            className="flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isNew ? 'Create' : 'Save'}
          </button>
        </div>
      </div>

      {/* Tabs (only show history tab for existing workflows) */}
      {!isNew && (
        <div className="flex gap-1 border-b border-slate-200 dark:border-slate-700">
          {([['builder', 'Builder'], ['history', 'Execution History']] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                'px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
                tab === key
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {tab === 'builder' ? (
        <div className="space-y-6">
          {/* Basics */}
          <div className="card p-5 space-y-4">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Hash className="w-4 h-4 text-slate-400" /> Workflow Details
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Workflow Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g., Auto Follow-Up on Filed Claims"
                  className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600"
                />
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Active</label>
                  <button onClick={() => setIsActive(!isActive)} className="flex items-center gap-2 mt-1">
                    {isActive
                      ? <ToggleRight className="w-7 h-7 text-emerald-500" />
                      : <ToggleLeft className="w-7 h-7 text-slate-400" />
                    }
                    <span className="text-sm text-slate-600 dark:text-slate-400">{isActive ? 'Enabled' : 'Disabled'}</span>
                  </button>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Describe what this workflow does..."
                rows={2}
                className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600 resize-none"
              />
            </div>
          </div>

          {/* Trigger */}
          <div className="card p-5 space-y-4">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" /> Trigger
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {TRIGGERS.map(t => (
                <button
                  key={t.key}
                  onClick={() => { setTrigger(t.key); setTriggerConfig({}); }}
                  className={cn(
                    'p-3 rounded-xl border text-left transition-all',
                    trigger === t.key
                      ? 'border-primary-300 bg-primary-50 dark:bg-primary-500/10 dark:border-primary-500/30 ring-1 ring-primary-200 dark:ring-primary-500/20'
                      : 'border-slate-200 dark:border-slate-700 hover:border-primary-200 dark:hover:border-primary-500/30'
                  )}
                >
                  <t.icon className={cn('w-4 h-4 mb-1.5', trigger === t.key ? 'text-primary-500' : 'text-slate-400')} />
                  <p className={cn('text-xs font-semibold', trigger === t.key ? 'text-primary-700 dark:text-primary-400' : 'text-slate-600 dark:text-slate-400')}>
                    {t.label}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{t.desc}</p>
                </button>
              ))}
            </div>

            {/* Trigger Config */}
            <TriggerConfigForm trigger={trigger} config={triggerConfig} onChange={setTriggerConfig} />
          </div>

          {/* Steps */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <ArrowRight className="w-4 h-4 text-blue-500" /> Steps ({steps.length})
              </h2>
            </div>

            {steps.length === 0 && (
              <div className="text-center py-8 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                <WorkflowIcon className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-500 mb-3">No steps yet. Add steps to define what this workflow does.</p>
                <button onClick={addStep} className="inline-flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
                  <Plus className="w-4 h-4" /> Add First Step
                </button>
              </div>
            )}

            <div className="space-y-3">
              {steps.map((step, idx) => (
                <StepCard
                  key={idx}
                  index={idx}
                  step={step}
                  total={steps.length}
                  onUpdate={(patch) => updateStep(idx, patch)}
                  onRemove={() => removeStep(idx)}
                  onMoveUp={() => moveStep(idx, -1)}
                  onMoveDown={() => moveStep(idx, 1)}
                />
              ))}
            </div>

            {steps.length > 0 && (
              <button
                onClick={addStep}
                className="w-full flex items-center justify-center gap-1.5 border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-primary-300 dark:hover:border-primary-500/30 rounded-xl py-3 text-sm font-medium text-slate-500 hover:text-primary-600 dark:hover:text-primary-400 transition-all"
              >
                <Plus className="w-4 h-4" /> Add Step
              </button>
            )}
          </div>
        </div>
      ) : (
        <ExecutionHistory workflowId={workflowId!} />
      )}

      {/* Test Modal */}
      {showTestModal && workflowId && (
        <TestWorkflowModal workflowId={workflowId} onClose={() => setShowTestModal(false)} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Trigger Config Form
// ---------------------------------------------------------------------------

function TriggerConfigForm({ trigger, config, onChange }: {
  trigger: TriggerType;
  config: Record<string, any>;
  onChange: (c: Record<string, any>) => void;
}) {
  function set(key: string, value: any) {
    onChange({ ...config, [key]: value });
  }

  if (trigger === 'on_status_change') {
    return (
      <div className="grid md:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-700">
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">From Status (optional)</label>
          <select
            value={config.fromStatus ?? ''}
            onChange={e => set('fromStatus', e.target.value || undefined)}
            className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600"
          >
            <option value="">Any status</option>
            {CLAIM_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">To Status (optional)</label>
          <select
            value={config.toStatus ?? ''}
            onChange={e => set('toStatus', e.target.value || undefined)}
            className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600"
          >
            <option value="">Any status</option>
            {CLAIM_STATUSES.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>)}
          </select>
        </div>
      </div>
    );
  }

  if (trigger === 'on_schedule') {
    return (
      <div className="grid md:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-700">
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Cron Expression</label>
          <input
            type="text"
            value={config.cron ?? ''}
            onChange={e => set('cron', e.target.value)}
            placeholder="0 9 * * 1-5  (weekdays at 9am)"
            className="w-full px-3 py-2 border rounded-lg text-sm font-mono dark:bg-slate-700 dark:border-slate-600"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Timezone</label>
          <input
            type="text"
            value={config.timezone ?? ''}
            onChange={e => set('timezone', e.target.value)}
            placeholder="America/New_York"
            className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600"
          />
        </div>
      </div>
    );
  }

  if (trigger === 'on_overdue') {
    return (
      <div className="grid md:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-700">
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Overdue By (days)</label>
          <input
            type="number"
            value={config.overdueDays ?? ''}
            onChange={e => set('overdueDays', Number(e.target.value))}
            placeholder="1"
            min={1}
            className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600"
          />
        </div>
      </div>
    );
  }

  return null;
}

// ---------------------------------------------------------------------------
// Step Card
// ---------------------------------------------------------------------------

function StepCard({ index, step, total, onUpdate, onRemove, onMoveUp, onMoveDown }: {
  index: number;
  step: WorkflowStep;
  total: number;
  onUpdate: (patch: Partial<WorkflowStep>) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const meta = actionMeta(step.actionType);
  const Icon = meta.icon;

  function setConfig(key: string, value: any) {
    onUpdate({ config: { ...step.config, [key]: value } });
  }

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-800/50">
      {/* Step header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 dark:bg-slate-800">
        <div className="flex flex-col gap-0.5">
          <button onClick={onMoveUp} disabled={index === 0} className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-20 transition-colors">
            <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
          </button>
          <button onClick={onMoveDown} disabled={index === total - 1} className="p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-20 transition-colors">
            <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
          </button>
        </div>
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-500/10 text-primary-700 dark:text-primary-400 text-xs font-bold">
          {index + 1}
        </span>
        <Icon className={cn('w-4 h-4', meta.color)} />
        <select
          value={step.actionType}
          onChange={e => onUpdate({ actionType: e.target.value as ActionType, config: {} })}
          className="text-sm font-medium bg-transparent border-none focus:ring-0 p-0 text-slate-900 dark:text-white cursor-pointer"
        >
          {ACTIONS.map(a => <option key={a.key} value={a.key}>{a.label}</option>)}
        </select>
        <div className="flex-1" />
        <button onClick={() => setExpanded(!expanded)} className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </button>
        <button onClick={onRemove} className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-500/10 text-slate-400 hover:text-red-500 transition-colors">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Step config */}
      {expanded && (
        <div className="px-4 py-4 space-y-3 border-t border-slate-100 dark:border-slate-700">
          <ActionConfigForm actionType={step.actionType} config={step.config} setConfig={setConfig} />

          {/* Condition */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-700">
            <label className="block text-xs font-medium text-slate-500 mb-1">Condition (optional) — Only execute if:</label>
            <input
              type="text"
              value={step.condition ?? ''}
              onChange={e => onUpdate({ condition: e.target.value })}
              placeholder='e.g., claim_amount > 5000 or status = "filed"'
              className="w-full px-3 py-2 border rounded-lg text-sm font-mono dark:bg-slate-700 dark:border-slate-600"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Action Config Form
// ---------------------------------------------------------------------------

function ActionConfigForm({ actionType, config, setConfig }: {
  actionType: ActionType;
  config: Record<string, any>;
  setConfig: (key: string, value: any) => void;
}) {
  switch (actionType) {
    case 'send_email':
      return (
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Email Template</label>
            <select
              value={config.template ?? ''}
              onChange={e => setConfig('template', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600"
            >
              <option value="">Select template...</option>
              <option value="claim_acknowledgment">Claim Acknowledgment</option>
              <option value="status_update">Status Update</option>
              <option value="follow_up">Follow-Up Reminder</option>
              <option value="escalation">Escalation Notice</option>
              <option value="settlement_offer">Settlement Offer</option>
              <option value="document_request">Document Request</option>
              <option value="custom">Custom Template</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Recipients</label>
            <input
              type="text"
              value={config.recipients ?? ''}
              onChange={e => setConfig('recipients', e.target.value)}
              placeholder="claimant, carrier, adjuster, or email"
              className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600"
            />
          </div>
        </div>
      );

    case 'create_task':
      return (
        <div className="space-y-3">
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Task Title *</label>
              <input
                type="text"
                value={config.title ?? ''}
                onChange={e => setConfig('title', e.target.value)}
                placeholder="Review claim documentation"
                className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Assignee</label>
              <input
                type="text"
                value={config.assignee ?? ''}
                onChange={e => setConfig('assignee', e.target.value)}
                placeholder="User email or role (e.g., adjuster)"
                className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Description</label>
            <textarea
              value={config.description ?? ''}
              onChange={e => setConfig('description', e.target.value)}
              placeholder="Task description..."
              rows={2}
              className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600 resize-none"
            />
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Priority</label>
              <select
                value={config.priority ?? 'medium'}
                onChange={e => setConfig('priority', e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600"
              >
                {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Due In (days)</label>
              <input
                type="number"
                value={config.dueDays ?? ''}
                onChange={e => setConfig('dueDays', Number(e.target.value))}
                placeholder="3"
                min={0}
                className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600"
              />
            </div>
          </div>
        </div>
      );

    case 'change_status':
      return (
        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">New Status *</label>
          <select
            value={config.newStatus ?? ''}
            onChange={e => setConfig('newStatus', e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600 max-w-sm"
          >
            <option value="">Select status...</option>
            {CLAIM_STATUSES.map(s => (
              <option key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
            ))}
          </select>
        </div>
      );

    case 'notify_user':
      return (
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">User / Role *</label>
            <input
              type="text"
              value={config.target ?? ''}
              onChange={e => setConfig('target', e.target.value)}
              placeholder="User email, role, or 'assigned'"
              className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Message *</label>
            <input
              type="text"
              value={config.message ?? ''}
              onChange={e => setConfig('message', e.target.value)}
              placeholder="Claim {{claimNumber}} requires your attention"
              className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600"
            />
          </div>
        </div>
      );

    case 'wait_delay':
      return (
        <div className="grid grid-cols-2 gap-3 max-w-sm">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Days</label>
            <input
              type="number"
              value={config.delayDays ?? 0}
              onChange={e => setConfig('delayDays', Number(e.target.value))}
              min={0}
              className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Hours</label>
            <input
              type="number"
              value={config.delayHours ?? 0}
              onChange={e => setConfig('delayHours', Number(e.target.value))}
              min={0}
              max={23}
              className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600"
            />
          </div>
        </div>
      );

    case 'ai_action':
      return (
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Agent Type *</label>
            <select
              value={config.agentType ?? ''}
              onChange={e => setConfig('agentType', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600"
            >
              <option value="">Select agent...</option>
              <option value="intake">Intake Agent</option>
              <option value="research">Research Agent</option>
              <option value="communication">Communication Agent</option>
              <option value="document_analysis">Document Analysis</option>
              <option value="settlement">Settlement Agent</option>
              <option value="custom">Custom Prompt</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Input Config</label>
            <input
              type="text"
              value={config.inputConfig ?? ''}
              onChange={e => setConfig('inputConfig', e.target.value)}
              placeholder='e.g., {"analyzeDocuments": true}'
              className="w-full px-3 py-2 border rounded-lg text-sm font-mono dark:bg-slate-700 dark:border-slate-600"
            />
          </div>
          {config.agentType === 'custom' && (
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Custom Prompt</label>
              <textarea
                value={config.prompt ?? ''}
                onChange={e => setConfig('prompt', e.target.value)}
                placeholder="Describe what the AI should do..."
                rows={3}
                className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600 resize-none"
              />
            </div>
          )}
        </div>
      );

    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Execution History
// ---------------------------------------------------------------------------

function ExecutionHistory({ workflowId }: { workflowId: string }) {
  const { data: executions = [], isLoading } = useQuery({
    queryKey: ['workflow-executions', workflowId],
    queryFn: () => getList<WorkflowExecution>(`/workflows/${workflowId}/executions`),
    refetchInterval: (query) => {
      const execs = query.state.data;
      if (Array.isArray(execs) && execs.some(e => e.status === 'running')) return 5000;
      return false;
    },
  });

  if (isLoading) return <TableSkeleton />;

  if (executions.length === 0) {
    return (
      <EmptyState
        icon={Activity}
        title="No executions yet"
        description="This workflow hasn't been triggered yet. Run a test or wait for the trigger event."
      />
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-700">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Started</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Claim</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Current Step</th>
              <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Completed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
            {executions.map(exec => (
              <tr key={exec.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                <td className="px-4 py-3 text-slate-700 dark:text-slate-300">{fmtDate(exec.startedAt)}</td>
                <td className="px-4 py-3">
                  {exec.claimNumber ? (
                    <span className="font-medium text-primary-600 dark:text-primary-400">{exec.claimNumber}</span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300">
                    {exec.currentStep ?? '—'}
                  </span>
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={cn(
                    'text-[10px] font-semibold uppercase px-2.5 py-1 rounded-full',
                    statusBadge[exec.status] ?? 'bg-slate-100 text-slate-500'
                  )}>
                    {exec.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-500">{exec.completedAt ? fmtDate(exec.completedAt) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Test Workflow Modal
// ---------------------------------------------------------------------------

function TestWorkflowModal({ workflowId, onClose }: { workflowId: string; onClose: () => void }) {
  const [claimId, setClaimId] = useState('');
  const [results, setResults] = useState<any>(null);

  const testMutation = useMutation({
    mutationFn: () => post<any>(`/workflows/${workflowId}/trigger`, { claimId: claimId || undefined, dryRun: true }),
    onSuccess: (data) => {
      setResults(data);
      toast.success('Dry run completed');
    },
    onError: (e: Error) => toast.error(e.message || 'Test failed'),
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <TestTube className="w-4 h-4 text-primary-500" /> Test Workflow (Dry Run)
          </h3>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Claim ID (optional)</label>
            <input
              type="text"
              value={claimId}
              onChange={e => setClaimId(e.target.value)}
              placeholder="Enter a claim ID to test against"
              className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600"
            />
            <p className="text-xs text-slate-400 mt-1">Leave empty to run without a specific claim context</p>
          </div>

          <button
            onClick={() => testMutation.mutate()}
            disabled={testMutation.isPending}
            className="w-full flex items-center justify-center gap-2 bg-primary-500 hover:bg-primary-600 text-white py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {testMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {testMutation.isPending ? 'Running...' : 'Run Test'}
          </button>

          {results && (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">Dry Run Results</h4>
              <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 max-h-60 overflow-y-auto">
                {results.steps ? (
                  <div className="space-y-2">
                    {(results.steps as any[]).map((s: any, i: number) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className={cn(
                          'inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold mt-0.5',
                          s.success !== false
                            ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400'
                            : 'bg-red-100 text-red-600 dark:bg-red-500/10 dark:text-red-400'
                        )}>
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-slate-700 dark:text-slate-300">{s.action || s.actionType || `Step ${i + 1}`}</p>
                          {s.message && <p className="text-[10px] text-slate-400 mt-0.5">{s.message}</p>}
                          {s.skipped && <p className="text-[10px] text-amber-500 mt-0.5">Skipped: condition not met</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <pre className="text-xs text-slate-600 dark:text-slate-400 whitespace-pre-wrap font-mono">
                    {JSON.stringify(results, null, 2)}
                  </pre>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
