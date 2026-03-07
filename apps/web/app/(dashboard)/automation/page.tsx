'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getList } from '@/lib/api-client';
import { TableSkeleton, StatsSkeleton, EmptyState } from '@/components/ui/loading';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Workflow, Plus, Edit2, Trash2, Play, Pause,
  Mail, CheckSquare, Clock, AlertTriangle, Bell,
  Zap, Search, ChevronDown, ChevronUp,
  ToggleLeft, ToggleRight, Copy, X, Save,
  FileText, Send, Timer, ArrowRight,
} from 'lucide-react';

type RuleStatus = 'active' | 'paused' | 'draft';
type TriggerType = 'claim_filed' | 'claim_status_changed' | 'new_email_received' | 'task_overdue' | 'document_uploaded' | 'stagnant_claim' | 'payment_received';
type ActionType = 'send_email' | 'create_task' | 'send_notification' | 'update_status' | 'assign_user';

interface AutomationRule {
  id: string;
  name: string;
  description: string;
  trigger: TriggerType;
  actions: AutomationAction[];
  status: RuleStatus;
  timesTriggered: number;
  lastTriggered?: string;
  createdAt: string;
}

interface AutomationAction {
  id: string;
  type: ActionType;
  delayDays: number;
  config: Record<string, string>;
}

interface AutomationTemplate {
  id: string;
  name: string;
  description: string;
  trigger: TriggerType;
  actions: { type: ActionType; delayDays: number; description: string }[];
}

const TRIGGERS: { key: TriggerType; label: string; icon: typeof Zap; description: string }[] = [
  { key: 'claim_filed', label: 'Claim Filed', icon: FileText, description: 'When a claim is filed with a carrier' },
  { key: 'claim_status_changed', label: 'Status Changed', icon: Zap, description: 'When a claim status is updated' },
  { key: 'new_email_received', label: 'Email Received', icon: Mail, description: 'When a new email arrives on a claim' },
  { key: 'task_overdue', label: 'Task Overdue', icon: AlertTriangle, description: 'When a task passes its due date' },
  { key: 'document_uploaded', label: 'Document Uploaded', icon: FileText, description: 'When a document is added to a claim' },
  { key: 'stagnant_claim', label: 'Stagnant Claim', icon: Clock, description: 'When a claim has no activity for N days' },
  { key: 'payment_received', label: 'Payment Received', icon: Zap, description: 'When a payment is logged' },
];

const ACTIONS: { key: ActionType; label: string; icon: typeof Mail }[] = [
  { key: 'send_email', label: 'Send Email', icon: Mail },
  { key: 'create_task', label: 'Create Task', icon: CheckSquare },
  { key: 'send_notification', label: 'Send Notification', icon: Bell },
  { key: 'update_status', label: 'Update Status', icon: Zap },
  { key: 'assign_user', label: 'Assign User', icon: Zap },
];

export default function AutomationPage() {
  const { data: fetchedRules = [], isLoading: rulesLoading } = useQuery({
    queryKey: ['automation-rules'],
    queryFn: () => getList<AutomationRule>('/automation/rules'),
  });
  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ['automation-templates'],
    queryFn: () => getList<AutomationTemplate>('/automation/templates'),
  });
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [rulesInitialized, setRulesInitialized] = useState(false);

  useEffect(() => {
    if (!rulesInitialized && !rulesLoading) {
      setRules(fetchedRules);
      setRulesInitialized(true);
    }
  }, [fetchedRules, rulesLoading, rulesInitialized]);

  const [search, setSearch] = useState('');
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | RuleStatus>('all');

  const isLoading = rulesLoading || templatesLoading;
  if (isLoading) return <div className="space-y-6"><StatsSkeleton /><TableSkeleton /></div>;
  if (rules.length === 0 && !showBuilder) return <EmptyState icon={Workflow} title="No automation rules yet" description="Create your first rule to automate claim workflows." />;

  const filtered = rules.filter(r => {
    const matchesSearch = r.name.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: rules.length,
    active: rules.filter(r => r.status === 'active').length,
    paused: rules.filter(r => r.status === 'paused').length,
    totalTriggers: rules.reduce((s, r) => s + r.timesTriggered, 0),
  };

  function toggleRule(id: string) {
    setRules(rules.map(r => r.id === id ? { ...r, status: r.status === 'active' ? 'paused' : 'active' } : r));
    toast.success('Rule updated');
  }

  function applyTemplate(template: AutomationTemplate) {
    const newRule: AutomationRule = {
      id: crypto.randomUUID(),
      name: template.name,
      description: template.description,
      trigger: template.trigger,
      actions: template.actions.map((a, i) => ({ id: `${i}`, type: a.type, delayDays: a.delayDays, config: { description: a.description } })),
      status: 'draft',
      timesTriggered: 0,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setRules([newRule, ...rules]);
    setShowTemplates(false);
    toast.success(`Template "${template.name}" applied — configure and activate`);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><Workflow className="w-6 h-6 text-primary-500" /> Automation</h1>
          <p className="text-sm text-slate-500 mt-0.5">Create rules that automatically send emails, create tasks, and manage claims</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowTemplates(!showTemplates)} className="flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800"><Copy className="w-4 h-4" /> Templates</button>
          <button onClick={() => setShowBuilder(true)} className="flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-semibold"><Plus className="w-4 h-4" /> New Rule</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Rules', value: stats.total, color: 'text-slate-900 dark:text-white' },
          { label: 'Active', value: stats.active, color: 'text-emerald-600' },
          { label: 'Paused', value: stats.paused, color: 'text-amber-500' },
          { label: 'Total Executions', value: stats.totalTriggers.toLocaleString(), color: 'text-primary-600' },
        ].map(s => (
          <div key={s.label} className="card p-4 text-center">
            <p className={cn('text-2xl font-bold', s.color)}>{s.value}</p>
            <p className="text-xs text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Templates Panel */}
      {showTemplates && (
        <div className="card p-5 border-2 border-primary-200 dark:border-primary-500/30">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900 dark:text-white">Workflow Templates</h3>
            <button onClick={() => setShowTemplates(false)}><X className="w-4 h-4 text-slate-400" /></button>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            {templates.map(t => (
              <div key={t.id} className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                <div className="flex items-center gap-2 mb-1">
                  <Workflow className="w-4 h-4 text-primary-500" />
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{t.name}</h4>
                </div>
                <p className="text-xs text-slate-500 mb-3">{t.description}</p>
                <div className="space-y-1 mb-3">
                  {t.actions.map((a, i) => (
                    <div key={i} className="flex items-center gap-2 text-[10px]">
                      <Timer className="w-3 h-3 text-slate-400" />
                      <span className="text-slate-500">Day {a.delayDays}:</span>
                      <span className="text-slate-700 dark:text-slate-300">{a.description}</span>
                    </div>
                  ))}
                </div>
                <button onClick={() => applyTemplate(t)} className="text-xs text-primary-500 hover:text-primary-600 font-semibold">Use Template</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rule Builder */}
      {showBuilder && <RuleBuilder onClose={() => setShowBuilder(false)} onSave={(rule) => { setRules([rule, ...rules]); setShowBuilder(false); toast.success('Rule created'); }} />}

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search rules..." className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
        </div>
        <div className="flex gap-1.5">
          {(['all', 'active', 'paused', 'draft'] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)} className={cn('px-3 py-1.5 rounded-lg text-xs font-medium border transition-all capitalize', statusFilter === s ? 'bg-primary-50 border-primary-200 text-primary-700 dark:bg-primary-500/10 dark:border-primary-500/30 dark:text-primary-400' : 'border-slate-200 dark:border-slate-700 text-slate-500')}>{s}</button>
          ))}
        </div>
      </div>

      {/* Rules List */}
      <div className="space-y-3">
        {filtered.map(rule => (
          <div key={rule.id} className="card p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-sm text-slate-900 dark:text-white">{rule.name}</h3>
                  <span className={cn('text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full', rule.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : rule.status === 'paused' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' : 'bg-slate-100 text-slate-500')}>{rule.status}</span>
                </div>
                <p className="text-xs text-slate-500">{rule.description}</p>

                <div className="flex items-center gap-4 mt-3">
                  <span className="flex items-center gap-1 text-xs text-slate-400"><Zap className="w-3 h-3" /> {TRIGGERS.find(t => t.key === rule.trigger)?.label}</span>
                  <span className="flex items-center gap-1 text-xs text-slate-400"><ArrowRight className="w-3 h-3" /> {rule.actions.length} action{rule.actions.length !== 1 ? 's' : ''}</span>
                  <span className="flex items-center gap-1 text-xs text-slate-400"><Play className="w-3 h-3" /> {rule.timesTriggered}x triggered</span>
                  {rule.lastTriggered && <span className="text-xs text-slate-400">Last: {rule.lastTriggered}</span>}
                </div>

                <div className="flex flex-wrap gap-2 mt-2">
                  {rule.actions.map(action => (
                    <span key={action.id} className="flex items-center gap-1 text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                      {action.delayDays > 0 && <Timer className="w-3 h-3 text-slate-400" />}
                      {action.delayDays > 0 && <span className="text-slate-500">Day {action.delayDays}:</span>}
                      {ACTIONS.find(a => a.key === action.type)?.label}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button onClick={() => toggleRule(rule.id)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
                  {rule.status === 'active' ? <ToggleRight className="w-5 h-5 text-emerald-500" /> : <ToggleLeft className="w-5 h-5 text-slate-400" />}
                </button>
                <button className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => { setRules(rules.filter(r => r.id !== rule.id)); toast.success('Rule deleted'); }} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RuleBuilder({ onClose, onSave }: { onClose: () => void; onSave: (rule: AutomationRule) => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [trigger, setTrigger] = useState<TriggerType>('claim_filed');
  const [actions, setActions] = useState<{ type: ActionType; delayDays: number; description: string }[]>([]);
  const [newActionType, setNewActionType] = useState<ActionType>('send_email');
  const [newActionDelay, setNewActionDelay] = useState(0);

  function addAction() {
    setActions([...actions, { type: newActionType, delayDays: newActionDelay, description: '' }]);
    setNewActionDelay(0);
  }

  function save() {
    if (!name.trim()) { toast.error('Rule name is required'); return; }
    if (actions.length === 0) { toast.error('Add at least one action'); return; }
    onSave({
      id: crypto.randomUUID(),
      name, description, trigger,
      actions: actions.map((a, i) => ({ id: String(i), type: a.type, delayDays: a.delayDays, config: {} })),
      status: 'draft', timesTriggered: 0, createdAt: new Date().toISOString().split('T')[0],
    });
  }

  return (
    <div className="card p-6 border-2 border-primary-200 dark:border-primary-500/30 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-900 dark:text-white">New Automation Rule</h3>
        <button onClick={onClose}><X className="w-4 h-4 text-slate-400" /></button>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Rule Name *</label><input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., 30-Day Follow-Up" className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" /></div>
        <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Description</label><input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="What this rule does..." className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" /></div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Trigger</label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {TRIGGERS.map(t => (
            <button key={t.key} onClick={() => setTrigger(t.key)} className={cn('p-3 rounded-xl border text-left transition-all', trigger === t.key ? 'border-primary-300 bg-primary-50 dark:bg-primary-500/10 dark:border-primary-500/30' : 'border-slate-200 dark:border-slate-700 hover:border-primary-200')}>
              <t.icon className={cn('w-4 h-4 mb-1', trigger === t.key ? 'text-primary-500' : 'text-slate-400')} />
              <p className={cn('text-xs font-medium', trigger === t.key ? 'text-primary-700 dark:text-primary-400' : 'text-slate-600 dark:text-slate-400')}>{t.label}</p>
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Actions</label>
        {actions.length > 0 && (
          <div className="space-y-2 mb-3">
            {actions.map((a, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
                <Timer className="w-4 h-4 text-slate-400" />
                <span className="text-xs text-slate-500">Day {a.delayDays}:</span>
                <span className="text-sm font-medium">{ACTIONS.find(act => act.key === a.type)?.label}</span>
                <div className="flex-1" />
                <button onClick={() => setActions(actions.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center gap-2">
          <select value={newActionType} onChange={e => setNewActionType(e.target.value as ActionType)} className="px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600">
            {ACTIONS.map(a => <option key={a.key} value={a.key}>{a.label}</option>)}
          </select>
          <div className="flex items-center gap-1">
            <span className="text-xs text-slate-500">After</span>
            <input type="number" value={newActionDelay} onChange={e => setNewActionDelay(Number(e.target.value))} min={0} className="w-16 px-2 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600 text-center" />
            <span className="text-xs text-slate-500">days</span>
          </div>
          <button onClick={addAction} className="bg-primary-500 hover:bg-primary-600 text-white px-3 py-2 rounded-lg text-xs font-medium"><Plus className="w-3.5 h-3.5 inline" /> Add</button>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <button onClick={onClose} className="px-4 py-2 text-sm text-slate-500">Cancel</button>
        <button onClick={save} className="bg-primary-500 hover:bg-primary-600 text-white px-5 py-2 rounded-lg text-sm font-semibold flex items-center gap-1"><Save className="w-4 h-4" /> Create Rule</button>
      </div>
    </div>
  );
}
