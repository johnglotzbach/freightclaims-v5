'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getList } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { TableSkeleton, StatsSkeleton, EmptyState } from '@/components/ui/loading';
import {
  CheckSquare, Clock, AlertTriangle, CheckCircle, Calendar,
  User, Filter, Search, Plus, ChevronDown,
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
  const [filter, setFilter] = useState<TaskFilter>('outstanding');
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState('all');

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['claims-tasks'],
    queryFn: () => getList<Task>('/claims/tasks'),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <StatsSkeleton count={4} />
        <TableSkeleton />
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CheckSquare className="w-6 h-6 text-primary-500" /> Tasks
            </h1>
          </div>
          <button className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors">
            <Plus className="w-4 h-4" /> New Task
          </button>
        </div>
        <EmptyState
          icon={CheckSquare}
          title="No tasks yet"
          description="Tasks will appear here when they are created for your claims."
        />
      </div>
    );
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CheckSquare className="w-6 h-6 text-primary-500" /> Tasks
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">{counts.outstanding} outstanding, {counts.overdue} overdue</p>
        </div>
        <button className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors">
          <Plus className="w-4 h-4" /> New Task
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {([
          { key: 'outstanding' as TaskFilter, label: 'Outstanding', icon: Clock, count: counts.outstanding },
          { key: 'overdue' as TaskFilter, label: 'Overdue', icon: AlertTriangle, count: counts.overdue },
          { key: 'completed' as TaskFilter, label: 'Completed', icon: CheckCircle, count: counts.completed },
          { key: 'all' as TaskFilter, label: 'All Tasks', icon: CheckSquare, count: counts.all },
        ]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all border',
              filter === tab.key
                ? 'bg-primary-50 dark:bg-primary-500/10 border-primary-200 dark:border-primary-500/30 text-primary-700 dark:text-primary-400'
                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-primary-200'
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full px-2 py-0.5 text-xs">
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Search + Date Range */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks or claim numbers..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
          />
        </div>
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
        >
          <option value="all">All Dates</option>
          <option value="7">Last 7 Days</option>
          <option value="15">Last 15 Days</option>
          <option value="30">Last 30 Days</option>
        </select>
      </div>

      {/* Task List */}
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
                <button className={cn(
                  'mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                  task.status === 'completed'
                    ? 'bg-emerald-500 border-emerald-500'
                    : 'border-slate-300 dark:border-slate-600 hover:border-primary-500'
                )}>
                  {task.status === 'completed' && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={cn('text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full', priorityConfig[task.priority].color)}>
                      {priorityConfig[task.priority].label}
                    </span>
                    {task.status === 'overdue' && (
                      <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400">
                        Overdue
                      </span>
                    )}
                    {task.claimNumber && (
                      <span className="text-xs text-primary-500 font-medium">{task.claimNumber}</span>
                    )}
                  </div>
                  <h3 className={cn(
                    'text-sm font-medium',
                    task.status === 'completed' ? 'text-slate-400 line-through' : 'text-slate-900 dark:text-white'
                  )}>
                    {task.title}
                  </h3>
                  <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                    <span className="flex items-center gap-1"><User className="w-3 h-3" /> {task.assignedTo}</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Due {formatDate(task.dueDate)}
                    </span>
                    <span>Created by {task.createdBy}</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
