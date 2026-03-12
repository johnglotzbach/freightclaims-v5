'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getList, post, put } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { TableSkeleton, StatsSkeleton, EmptyState } from '@/components/ui/loading';
import {
  CheckSquare, Clock, AlertTriangle, CheckCircle, Calendar,
  User, Search, Plus, X,
} from 'lucide-react';
import { formatDate } from 'shared';

type TaskFilter = 'outstanding' | 'overdue' | 'completed' | 'all';

interface Task {
  id: string;
  title: string;
  description?: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  status: 'outstanding' | 'overdue' | 'completed';
  dueDate: string;
  reminderMinutes?: number;
  assignedTo: string;
  createdBy: string;
  claimNumber?: string;
  claimId?: string;
  createdAt: string;
  completedAt?: string;
}

const priorityConfig: Record<string, { color: string; label: string }> = {
  urgent: { color: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400', label: 'Urgent' },
  high: { color: 'bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400', label: 'High' },
  medium: { color: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400', label: 'Medium' },
  low: { color: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400', label: 'Low' },
};

export default function TasksPage() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<TaskFilter>('outstanding');
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '', priority: 'medium', dueDate: '' });

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['claims-tasks'],
    queryFn: () => getList<Task>('/claims/tasks'),
  });

  const createTask = useMutation({
    mutationFn: (data: Record<string, unknown>) => post('/claims/tasks', data),
    onSuccess: () => { toast.success('Task created'); queryClient.invalidateQueries({ queryKey: ['claims-tasks'] }); setShowCreate(false); setNewTask({ title: '', description: '', priority: 'medium', dueDate: '' }); },
    onError: () => toast.error('Failed to create task'),
  });

  const toggleComplete = useMutation({
    mutationFn: ({ claimId, taskId, completed }: { claimId: string; taskId: string; completed: boolean }) =>
      put(`/claims/${claimId}/tasks/${taskId}`, { status: completed ? 'completed' : 'outstanding', completedAt: completed ? new Date().toISOString() : null }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['claims-tasks'] }),
  });

  if (isLoading) {
    return <div className="space-y-6"><StatsSkeleton count={4} /><TableSkeleton /></div>;
  }

  const filtered = tasks.filter(t => {
    if (filter !== 'all' && t.status !== filter) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase()) && !t.claimNumber?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const counts = {
    outstanding: tasks.filter(t => t.status === 'outstanding').length,
    overdue: tasks.filter(t => t.status === 'overdue').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    all: tasks.length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CheckSquare className="w-6 h-6 text-primary-500" /> Tasks
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">{counts.outstanding} outstanding, {counts.overdue} overdue</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors">
          <Plus className="w-4 h-4" /> New Task
        </button>
      </div>

      {showCreate && (
        <div className="card p-6 border-2 border-primary-200 dark:border-primary-500/30">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900 dark:text-white">New Task</h3>
            <button onClick={() => setShowCreate(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"><X className="w-4 h-4" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Title *</label>
              <input value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm" placeholder="Task title..." />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Description</label>
              <textarea value={newTask.description} onChange={e => setNewTask({ ...newTask, description: e.target.value })} rows={2} className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm" placeholder="Optional description..." />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Priority</label>
              <select value={newTask.priority} onChange={e => setNewTask({ ...newTask, priority: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Due Date</label>
              <input type="date" value={newTask.dueDate} onChange={e => setNewTask({ ...newTask, dueDate: e.target.value })} className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm" />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg">Cancel</button>
            <button onClick={() => createTask.mutate({ title: newTask.title, description: newTask.description, priority: newTask.priority, dueDate: newTask.dueDate || undefined })} disabled={!newTask.title.trim() || createTask.isPending} className="px-4 py-2 text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 rounded-lg disabled:opacity-50">
              {createTask.isPending ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </div>
      )}

      {tasks.length === 0 && !showCreate ? (
        <EmptyState icon={CheckSquare} title="No tasks yet" description="Tasks will appear here when they are created for your claims." />
      ) : (
        <>
          <div className="flex gap-2 flex-wrap">
            {([
              { key: 'outstanding' as TaskFilter, label: 'Outstanding', icon: Clock, count: counts.outstanding },
              { key: 'overdue' as TaskFilter, label: 'Overdue', icon: AlertTriangle, count: counts.overdue },
              { key: 'completed' as TaskFilter, label: 'Completed', icon: CheckCircle, count: counts.completed },
              { key: 'all' as TaskFilter, label: 'All Tasks', icon: CheckSquare, count: counts.all },
            ]).map(tab => (
              <button key={tab.key} onClick={() => setFilter(tab.key)} className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all border',
                filter === tab.key ? 'bg-primary-50 dark:bg-primary-500/10 border-primary-200 dark:border-primary-500/30 text-primary-700 dark:text-primary-400' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-primary-200'
              )}>
                <tab.icon className="w-4 h-4" /> {tab.label}
                <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full px-2 py-0.5 text-xs">{tab.count}</span>
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tasks or claim numbers..." className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm" />
            </div>
          </div>

          <div className="space-y-2">
            {filtered.length === 0 ? (
              <div className="card p-12 text-center">
                <CheckCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">No tasks match your filters.</p>
              </div>
            ) : (
              filtered.map((task) => (
                <div key={task.id} className="card p-4 hover:shadow-card-hover transition-all">
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => {
                        if (!task.claimId) { toast.error('This task is not linked to a claim'); return; }
                        toggleComplete.mutate({ claimId: task.claimId, taskId: task.id, completed: task.status !== 'completed' });
                      }}
                      className={cn(
                        'mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors cursor-pointer',
                        task.status === 'completed' ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 dark:border-slate-600 hover:border-primary-500'
                      )}
                    >
                      {task.status === 'completed' && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={cn('text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full', (priorityConfig[task.priority] || priorityConfig.medium).color)}>
                          {(priorityConfig[task.priority] || priorityConfig.medium).label}
                        </span>
                        {task.status === 'overdue' && <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400">Overdue</span>}
                        {task.claimNumber && <span className="text-xs text-primary-500 font-medium">{task.claimNumber}</span>}
                      </div>
                      <h3 className={cn('text-sm font-medium', task.status === 'completed' ? 'text-slate-400 line-through' : 'text-slate-900 dark:text-white')}>{task.title}</h3>
                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                        <span className="flex items-center gap-1"><User className="w-3 h-3" /> {task.assignedTo || 'Unassigned'}</span>
                        {task.dueDate && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Due {formatDate(task.dueDate)}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
