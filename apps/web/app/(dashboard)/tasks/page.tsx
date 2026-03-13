'use client';

import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getList, post, put, del } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { toast } from 'sonner';
import { TableSkeleton, StatsSkeleton, EmptyState } from '@/components/ui/loading';
import Link from 'next/link';
import {
  CheckSquare, Clock, AlertTriangle, CheckCircle, Calendar,
  User, Search, Plus, X, ChevronLeft, ChevronRight, ChevronDown,
  ChevronUp, Trash2, Flag, Bell,
} from 'lucide-react';
import { formatDate, formatDateTime } from 'shared';

type OwnerFilter = 'all' | 'assigned' | 'created';

interface Task {
  id: string;
  title: string;
  description?: string;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  status: 'outstanding' | 'overdue' | 'completed';
  dueDate: string;
  reminderMinutes?: number;
  assignedTo: string;
  assignedToId?: string;
  createdBy: string;
  createdById?: string;
  claimNumber?: string;
  claimId?: string;
  createdAt: string;
  completedAt?: string;
}

interface ClaimOption {
  id: string;
  claimNumber: string;
}

const priorityConfig: Record<string, { color: string; label: string; dot: string }> = {
  urgent: { color: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400', label: 'Urgent', dot: 'bg-red-500' },
  high: { color: 'bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400', label: 'High', dot: 'bg-orange-500' },
  medium: { color: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400', label: 'Medium', dot: 'bg-amber-500' },
  low: { color: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400', label: 'Low', dot: 'bg-slate-400' },
};

const REMINDER_OPTIONS = [
  { value: 0, label: 'None' },
  { value: 1, label: 'At event' },
  { value: 1440, label: '1 day before' },
  { value: 4320, label: '3 days before' },
  { value: 10080, label: '1 week before' },
  { value: 20160, label: '2 weeks before' },
  { value: 43200, label: '1 month before' },
];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isOverdue(dueDate: string) {
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return due < today;
}

function isDueToday(dueDate: string) {
  return isSameDay(new Date(dueDate), new Date());
}

function isDueSoon(dueDate: string) {
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const diff = (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
  return diff > 0 && diff <= 3;
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// ─── Calendar Component ──────────────────────────────────────────────
function TaskCalendar({
  tasks,
  selectedDate,
  onSelectDate,
  calendarMonth,
  calendarYear,
  onPrevMonth,
  onNextMonth,
}: {
  tasks: Task[];
  selectedDate: Date | null;
  onSelectDate: (d: Date | null) => void;
  calendarMonth: number;
  calendarYear: number;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}) {
  const today = new Date();
  const daysInMonth = getDaysInMonth(calendarYear, calendarMonth);
  const firstDay = getFirstDayOfMonth(calendarYear, calendarMonth);

  const tasksByDay = useMemo(() => {
    const map: Record<number, { overdue: boolean; dueToday: boolean; upcoming: boolean }> = {};
    for (const task of tasks) {
      if (!task.dueDate || task.status === 'completed') continue;
      const d = new Date(task.dueDate);
      if (d.getFullYear() !== calendarYear || d.getMonth() !== calendarMonth) continue;
      const day = d.getDate();
      if (!map[day]) map[day] = { overdue: false, dueToday: false, upcoming: false };
      if (isOverdue(task.dueDate)) map[day].overdue = true;
      else if (isDueToday(task.dueDate)) map[day].dueToday = true;
      else map[day].upcoming = true;
    }
    return map;
  }, [tasks, calendarYear, calendarMonth]);

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-4">
        <button onClick={onPrevMonth} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
          <ChevronLeft className="w-4 h-4 text-slate-600 dark:text-slate-400" />
        </button>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
          {MONTH_NAMES[calendarMonth]} {calendarYear}
        </h3>
        <button onClick={onNextMonth} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
          <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-400" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-0">
        {DAY_NAMES.map(d => (
          <div key={d} className="text-center text-[10px] font-medium text-slate-400 dark:text-slate-500 pb-2">{d}</div>
        ))}
        {cells.map((day, idx) => {
          if (day === null) return <div key={`empty-${idx}`} className="h-9" />;

          const date = new Date(calendarYear, calendarMonth, day);
          const isToday = isSameDay(date, today);
          const isSelected = selectedDate && isSameDay(date, selectedDate);
          const dots = tasksByDay[day];

          return (
            <button
              key={day}
              onClick={() => {
                if (isSelected) onSelectDate(null);
                else onSelectDate(date);
              }}
              className={cn(
                'relative h-9 w-full flex flex-col items-center justify-center rounded-lg text-xs transition-all',
                isSelected
                  ? 'bg-primary-500 text-white font-bold'
                  : isToday
                    ? 'bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-400 font-semibold'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800',
              )}
            >
              <span>{day}</span>
              {dots && (
                <div className="flex gap-0.5 mt-0.5">
                  {dots.overdue && <span className="w-1 h-1 rounded-full bg-red-500" />}
                  {dots.dueToday && <span className="w-1 h-1 rounded-full bg-amber-500" />}
                  {dots.upcoming && <span className="w-1 h-1 rounded-full bg-blue-500" />}
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-slate-100 dark:border-slate-700">
        <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
          <span className="w-2 h-2 rounded-full bg-red-500" /> Overdue
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
          <span className="w-2 h-2 rounded-full bg-amber-500" /> Due today
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
          <span className="w-2 h-2 rounded-full bg-blue-500" /> Upcoming
        </div>
      </div>

      {selectedDate && (
        <button
          onClick={() => onSelectDate(null)}
          className="mt-3 w-full text-xs text-primary-500 hover:text-primary-600 font-medium py-1.5 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-500/10 transition-colors"
        >
          Clear date filter
        </button>
      )}
    </div>
  );
}

// ─── New Task Form ───────────────────────────────────────────────────
function NewTaskForm({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState('');
  const [assignee, setAssignee] = useState('');
  const [reminder, setReminder] = useState(0);
  const [claimSearch, setClaimSearch] = useState('');
  const [selectedClaimId, setSelectedClaimId] = useState('');
  const [selectedClaimNumber, setSelectedClaimNumber] = useState('');
  const [showClaimDropdown, setShowClaimDropdown] = useState(false);

  const { data: claimResults = [] } = useQuery({
    queryKey: ['claim-search', claimSearch],
    queryFn: () => getList<ClaimOption>(`/claims?search=${encodeURIComponent(claimSearch)}&limit=10`),
    enabled: claimSearch.length >= 2,
  });

  const { data: users = [] } = useQuery({
    queryKey: ['team-users'],
    queryFn: () => getList<{ id: string; firstName: string; lastName: string; email: string }>('/users'),
  });

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => {
      if (data.claimId) {
        return post(`/claims/${data.claimId}/tasks`, data);
      }
      return post('/claims/tasks', data);
    },
    onSuccess: () => {
      toast.success('Task created');
      onCreated();
      onClose();
    },
    onError: () => toast.error('Failed to create task'),
  });

  function handleSubmit() {
    if (!title.trim()) { toast.error('Title is required'); return; }
    createMutation.mutate({
      title,
      description: description || undefined,
      priority,
      dueDate: dueDate || undefined,
      assignedTo: assignee || undefined,
      claimId: selectedClaimId || undefined,
      reminderMinutes: reminder || undefined,
    });
  }

  return (
    <div className="card p-6 border-2 border-primary-200 dark:border-primary-500/30">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <Plus className="w-4 h-4 text-primary-500" /> New Task
        </h3>
        <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors">
          <X className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Title *</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors"
            placeholder="What needs to be done?"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors"
            placeholder="Optional details..."
          />
        </div>

        <div className="relative sm:col-span-2">
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Linked Claim</label>
          {selectedClaimNumber ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
              <span className="text-sm text-primary-600 dark:text-primary-400 font-medium">{selectedClaimNumber}</span>
              <button onClick={() => { setSelectedClaimId(''); setSelectedClaimNumber(''); setClaimSearch(''); }} className="ml-auto p-0.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded">
                <X className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
          ) : (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                value={claimSearch}
                onChange={e => { setClaimSearch(e.target.value); setShowClaimDropdown(true); }}
                onFocus={() => setShowClaimDropdown(true)}
                onBlur={() => setTimeout(() => setShowClaimDropdown(false), 200)}
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors"
                placeholder="Search by claim number..."
              />
              {showClaimDropdown && claimResults.length > 0 && (
                <div className="absolute z-20 top-full mt-1 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                  {claimResults.map(c => (
                    <button
                      key={c.id}
                      onMouseDown={() => { setSelectedClaimId(c.id); setSelectedClaimNumber(c.claimNumber); setClaimSearch(''); setShowClaimDropdown(false); }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                    >
                      {c.claimNumber}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Priority</label>
          <select
            value={priority}
            onChange={e => setPriority(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors"
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Due Date</label>
          <input
            type="date"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Assignee</label>
          <select
            value={assignee}
            onChange={e => setAssignee(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors"
          >
            <option value="">Unassigned</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Reminder</label>
          <select
            value={reminder}
            onChange={e => setReminder(Number(e.target.value))}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors"
          >
            {REMINDER_OPTIONS.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-slate-100 dark:border-slate-700">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={!title.trim() || createMutation.isPending}
          className="px-5 py-2 text-sm font-semibold text-white bg-primary-500 hover:bg-primary-600 rounded-lg disabled:opacity-50 transition-colors"
        >
          {createMutation.isPending ? 'Creating...' : 'Create Task'}
        </button>
      </div>
    </div>
  );
}

// ─── Task Card ───────────────────────────────────────────────────────
function TaskCard({
  task,
  onToggleComplete,
  onDelete,
}: {
  task: Task;
  onToggleComplete: (task: Task) => void;
  onDelete: (task: Task) => void;
}) {
  const isCompleted = task.status === 'completed';
  const overdue = !isCompleted && task.dueDate && isOverdue(task.dueDate);
  const dueSoon = !isCompleted && !overdue && task.dueDate && isDueSoon(task.dueDate);
  const dueToday = !isCompleted && task.dueDate && isDueToday(task.dueDate);
  const pConfig = priorityConfig[task.priority] || priorityConfig.medium;

  return (
    <div
      className={cn(
        'card p-4 transition-all hover:shadow-card-hover group',
        overdue && 'border-l-4 border-l-red-500 dark:border-l-red-400',
        (dueSoon || dueToday) && !overdue && 'border-l-4 border-l-amber-400 dark:border-l-amber-500',
        isCompleted && 'opacity-70',
      )}
    >
      <div className="flex items-start gap-3">
        <button
          onClick={() => onToggleComplete(task)}
          className={cn(
            'mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors',
            isCompleted
              ? 'bg-emerald-500 border-emerald-500'
              : 'border-slate-300 dark:border-slate-600 hover:border-primary-500 dark:hover:border-primary-400',
          )}
        >
          {isCompleted && <CheckCircle className="w-3.5 h-3.5 text-white" />}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={cn('text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full', pConfig.color)}>
              {pConfig.label}
            </span>
            {overdue && (
              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400">
                Overdue
              </span>
            )}
            {dueToday && !overdue && (
              <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                Due Today
              </span>
            )}
            {task.claimNumber && (
              <Link
                href={`/claims/${task.claimId}`}
                className="text-xs text-primary-500 hover:text-primary-600 font-medium hover:underline"
              >
                {task.claimNumber}
              </Link>
            )}
          </div>

          <h3 className={cn(
            'text-sm font-medium',
            isCompleted ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-slate-900 dark:text-white',
          )}>
            {task.title}
          </h3>

          {task.description && (
            <p className={cn(
              'text-xs mt-0.5 line-clamp-1',
              isCompleted ? 'text-slate-300 dark:text-slate-600' : 'text-slate-500 dark:text-slate-400',
            )}>
              {task.description}
            </p>
          )}

          <div className="flex items-center gap-4 mt-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" /> {task.assignedTo || 'Unassigned'}
            </span>
            {task.dueDate && (
              <span className={cn(
                'flex items-center gap-1',
                overdue && 'text-red-600 dark:text-red-400 font-medium',
                dueToday && !overdue && 'text-amber-600 dark:text-amber-400 font-medium',
              )}>
                <Calendar className="w-3 h-3" /> Due {formatDate(task.dueDate)}
              </span>
            )}
            {isCompleted && task.completedAt && (
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <CheckCircle className="w-3 h-3" /> Completed {formatDate(task.completedAt)}
              </span>
            )}
          </div>
        </div>

        <button
          onClick={() => onDelete(task)}
          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-slate-400 hover:text-red-500 transition-all"
          title="Delete task"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────
export default function TasksPage() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [ownerFilter, setOwnerFilter] = useState<OwnerFilter>('all');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);

  const now = new Date();
  const [calendarMonth, setCalendarMonth] = useState(now.getMonth());
  const [calendarYear, setCalendarYear] = useState(now.getFullYear());

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['claims-tasks'],
    queryFn: () => getList<Task>('/claims/tasks'),
  });

  const toggleComplete = useMutation({
    mutationFn: ({ claimId, taskId, completed }: { claimId: string; taskId: string; completed: boolean }) =>
      put(`/claims/${claimId}/tasks/${taskId}`, {
        status: completed ? 'completed' : 'outstanding',
        completedAt: completed ? new Date().toISOString() : null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claims-tasks'] });
      toast.success('Task updated');
    },
    onError: () => toast.error('Failed to update task'),
  });

  const deleteTask = useMutation({
    mutationFn: ({ claimId, taskId }: { claimId: string; taskId: string }) =>
      del(`/claims/${claimId}/tasks/${taskId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['claims-tasks'] });
      toast.success('Task deleted');
    },
    onError: () => toast.error('Failed to delete task'),
  });

  const handleToggleComplete = useCallback((task: Task) => {
    if (!task.claimId) { toast.error('This task is not linked to a claim'); return; }
    toggleComplete.mutate({ claimId: task.claimId, taskId: task.id, completed: task.status !== 'completed' });
  }, [toggleComplete]);

  const handleDelete = useCallback((task: Task) => {
    if (!task.claimId) { toast.error('This task is not linked to a claim'); return; }
    if (!confirm('Delete this task? This cannot be undone.')) return;
    deleteTask.mutate({ claimId: task.claimId, taskId: task.id });
  }, [deleteTask]);

  function prevMonth() {
    if (calendarMonth === 0) { setCalendarMonth(11); setCalendarYear(y => y - 1); }
    else setCalendarMonth(m => m - 1);
  }

  function nextMonth() {
    if (calendarMonth === 11) { setCalendarMonth(0); setCalendarYear(y => y + 1); }
    else setCalendarMonth(m => m + 1);
  }

  const filtered = useMemo(() => {
    return tasks.filter(t => {
      if (ownerFilter === 'assigned' && t.assignedToId !== user?.id && t.assignedTo !== `${user?.firstName} ${user?.lastName}`) return false;
      if (ownerFilter === 'created' && t.createdById !== user?.id && t.createdBy !== `${user?.firstName} ${user?.lastName}`) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!t.title.toLowerCase().includes(q) && !t.claimNumber?.toLowerCase().includes(q) && !t.description?.toLowerCase().includes(q)) return false;
      }
      if (selectedDate) {
        if (!t.dueDate) return false;
        if (!isSameDay(new Date(t.dueDate), selectedDate)) return false;
      }
      return true;
    });
  }, [tasks, ownerFilter, search, selectedDate, user]);

  const outstandingTasks = useMemo(() => {
    return filtered
      .filter(t => t.status !== 'completed')
      .sort((a, b) => {
        if (a.status === 'overdue' && b.status !== 'overdue') return -1;
        if (b.status === 'overdue' && a.status !== 'overdue') return 1;
        const aPriority = ['urgent', 'high', 'medium', 'low'].indexOf(a.priority);
        const bPriority = ['urgent', 'high', 'medium', 'low'].indexOf(b.priority);
        if (aPriority !== bPriority) return aPriority - bPriority;
        if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        return 0;
      });
  }, [filtered]);

  const completedTasks = useMemo(() => {
    return filtered
      .filter(t => t.status === 'completed')
      .sort((a, b) => {
        if (a.completedAt && b.completedAt) return new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime();
        return 0;
      });
  }, [filtered]);

  const counts = useMemo(() => ({
    outstanding: tasks.filter(t => t.status === 'outstanding').length,
    overdue: tasks.filter(t => t.status === 'overdue').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    total: tasks.length,
  }), [tasks]);

  if (isLoading) {
    return <div className="space-y-6"><StatsSkeleton count={4} /><TableSkeleton /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <CheckSquare className="w-6 h-6 text-primary-500" /> Tasks
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {counts.outstanding} outstanding{counts.overdue > 0 && <>, <span className="text-red-500 font-medium">{counts.overdue} overdue</span></>}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" /> New Task
        </button>
      </div>

      {showCreate && (
        <NewTaskForm
          onClose={() => setShowCreate(false)}
          onCreated={() => queryClient.invalidateQueries({ queryKey: ['claims-tasks'] })}
        />
      )}

      {tasks.length === 0 && !showCreate ? (
        <EmptyState
          icon={CheckSquare}
          title="No tasks yet"
          description="Tasks will appear here when they are created for your claims."
        />
      ) : (
        <div className="flex flex-col lg:flex-row gap-6">
          {/* LEFT: Calendar */}
          <div className="lg:w-72 flex-shrink-0">
            <TaskCalendar
              tasks={tasks}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              calendarMonth={calendarMonth}
              calendarYear={calendarYear}
              onPrevMonth={prevMonth}
              onNextMonth={nextMonth}
            />

            {/* Quick stats */}
            <div className="card p-4 mt-4 space-y-3">
              <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Summary</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-300 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500" /> Overdue
                  </span>
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">{counts.overdue}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-300 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500" /> Outstanding
                  </span>
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">{counts.outstanding}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-300 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" /> Completed
                  </span>
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">{counts.completed}</span>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Task List */}
          <div className="flex-1 min-w-0 space-y-4">
            {/* Filter tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
                {([
                  { key: 'all' as OwnerFilter, label: 'All Tasks' },
                  { key: 'assigned' as OwnerFilter, label: 'Assigned to Me' },
                  { key: 'created' as OwnerFilter, label: 'Created by Me' },
                ] as const).map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setOwnerFilter(tab.key)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                      ownerFilter === tab.key
                        ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300',
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search tasks..."
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors"
                />
              </div>
            </div>

            {selectedDate && (
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 bg-primary-50 dark:bg-primary-500/10 px-3 py-2 rounded-lg">
                <Calendar className="w-4 h-4 text-primary-500" />
                Showing tasks for <span className="font-medium">{formatDate(selectedDate.toISOString())}</span>
                <button onClick={() => setSelectedDate(null)} className="ml-auto text-primary-500 hover:text-primary-600 text-xs font-medium">
                  Clear
                </button>
              </div>
            )}

            {/* Outstanding Tasks */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-4 h-4 text-amber-500" />
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Outstanding Tasks</h2>
                <span className="text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full">
                  {outstandingTasks.length}
                </span>
              </div>

              {outstandingTasks.length === 0 ? (
                <div className="card p-8 text-center">
                  <CheckCircle className="w-10 h-10 text-emerald-300 dark:text-emerald-600 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">All caught up! No outstanding tasks.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {outstandingTasks.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onToggleComplete={handleToggleComplete}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Completed Tasks */}
            {completedTasks.length > 0 && (
              <div>
                <button
                  onClick={() => setShowCompleted(!showCompleted)}
                  className="flex items-center gap-2 mb-3 group"
                >
                  {showCompleted ? (
                    <ChevronUp className="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300" />
                  )}
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Completed Tasks</h2>
                  <span className="text-xs font-medium bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                    {completedTasks.length}
                  </span>
                </button>

                {showCompleted && (
                  <div className="space-y-2">
                    {completedTasks.map(task => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onToggleComplete={handleToggleComplete}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
