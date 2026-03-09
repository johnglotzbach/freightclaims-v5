'use client';

import { useState, useCallback, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { get, post, put, del } from '@/lib/api-client';
import { toast } from 'sonner';
import {
  Percent, Users, Truck, BarChart3, MapPin,
  TrendingDown, Clock, Shield, FileText, Download,
  Loader2, CalendarRange, Plus, Pencil, Trash2, X,
  CheckCircle, XCircle, Mail,
} from 'lucide-react';

type ReportFormat = 'pdf' | 'csv' | 'excel';

interface ReportCard {
  type: string;
  name: string;
  description: string;
  icon: typeof Percent;
  iconColor: string;
  iconBg: string;
}

const REPORTS: ReportCard[] = [
  {
    type: 'collection-percentage',
    name: 'Collection Percentage',
    description: 'Track settlement collection rates across carriers and time periods',
    icon: Percent,
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    iconBg: 'bg-emerald-50 dark:bg-emerald-500/10',
  },
  {
    type: 'top-customers',
    name: 'Top Customers',
    description: 'View customers with the highest claim volumes and amounts',
    icon: Users,
    iconColor: 'text-blue-600 dark:text-blue-400',
    iconBg: 'bg-blue-50 dark:bg-blue-500/10',
  },
  {
    type: 'top-carriers',
    name: 'Top Carriers',
    description: 'Carriers with the most claims, denials, and settlement delays',
    icon: Truck,
    iconColor: 'text-violet-600 dark:text-violet-400',
    iconBg: 'bg-violet-50 dark:bg-violet-500/10',
  },
  {
    type: 'metrics-by-carrier',
    name: 'Metrics by Carrier',
    description: 'Detailed performance breakdown per carrier',
    icon: BarChart3,
    iconColor: 'text-amber-600 dark:text-amber-400',
    iconBg: 'bg-amber-50 dark:bg-amber-500/10',
  },
  {
    type: 'metrics-by-destination',
    name: 'Metrics by Destination',
    description: 'Claim frequency and severity by destination',
    icon: MapPin,
    iconColor: 'text-rose-600 dark:text-rose-400',
    iconBg: 'bg-rose-50 dark:bg-rose-500/10',
  },
  {
    type: 'write-off',
    name: 'Write-Off Amount',
    description: 'Track total write-offs and identify trends',
    icon: TrendingDown,
    iconColor: 'text-red-600 dark:text-red-400',
    iconBg: 'bg-red-50 dark:bg-red-500/10',
  },
  {
    type: 'aging',
    name: 'Aging Report',
    description: 'Claims grouped by age brackets (0-30, 31-60, 61-90, 91-120, 120+ days)',
    icon: Clock,
    iconColor: 'text-orange-600 dark:text-orange-400',
    iconBg: 'bg-orange-50 dark:bg-orange-500/10',
  },
  {
    type: 'insurance',
    name: 'Insurance Report',
    description: 'Claims filed with insurance providers and recovery rates',
    icon: Shield,
    iconColor: 'text-teal-600 dark:text-teal-400',
    iconBg: 'bg-teal-50 dark:bg-teal-500/10',
  },
];

const FORMAT_CONFIG: Record<ReportFormat, { label: string; ext: string; color: string; hoverColor: string }> = {
  pdf: {
    label: 'PDF',
    ext: 'pdf',
    color: 'bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-500',
    hoverColor: 'shadow-red-500/25',
  },
  csv: {
    label: 'CSV',
    ext: 'csv',
    color: 'bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-500',
    hoverColor: 'shadow-emerald-500/25',
  },
  excel: {
    label: 'Excel',
    ext: 'xlsx',
    color: 'bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-500',
    hoverColor: 'shadow-blue-500/25',
  },
};

interface ScheduledReport {
  id: string;
  name: string;
  reportType: string;
  schedule: string;
  recipients: string[];
  isActive: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
  createdAt: string;
}

interface ScheduledFormData {
  name: string;
  reportType: string;
  schedule: string;
  recipients: string;
  isActive: boolean;
}

const EMPTY_FORM: ScheduledFormData = { name: '', reportType: 'collection-percentage', schedule: 'weekly', recipients: '', isActive: true };

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState('6m');
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
  const [scheduledReports, setScheduledReports] = useState<ScheduledReport[]>([]);
  const [scheduledLoading, setScheduledLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ScheduledFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const fetchScheduled = useCallback(async () => {
    try {
      const res = await get<{ success: boolean; data: ScheduledReport[] }>('/reports/scheduled');
      setScheduledReports(res.data ?? []);
    } catch {
      /* empty */
    } finally {
      setScheduledLoading(false);
    }
  }, []);

  useEffect(() => { fetchScheduled(); }, [fetchScheduled]);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (r: ScheduledReport) => {
    setEditingId(r.id);
    setForm({ name: r.name, reportType: r.reportType, schedule: r.schedule, recipients: r.recipients.join(', '), isActive: r.isActive });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.recipients.trim()) {
      toast.error('Name and recipients are required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        reportType: form.reportType,
        schedule: form.schedule,
        recipients: form.recipients.split(',').map(e => e.trim()).filter(Boolean),
        isActive: form.isActive,
      };
      if (editingId) {
        await put(`/reports/scheduled/${editingId}`, payload);
        toast.success('Schedule updated');
      } else {
        await post('/reports/scheduled', payload);
        toast.success('Schedule created');
      }
      setShowModal(false);
      fetchScheduled();
    } catch {
      toast.error('Failed to save schedule');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await del(`/reports/scheduled/${id}`);
      toast.success('Schedule deleted');
      fetchScheduled();
    } catch {
      toast.error('Failed to delete schedule');
    }
  };

  const handleDownload = useCallback(async (reportType: string, format: ReportFormat) => {
    const key = `${reportType}-${format}`;
    setLoadingMap((prev) => ({ ...prev, [key]: true }));

    try {
      const res = await apiClient.get(`/reports/export/${reportType}`, {
        responseType: 'blob',
        params: { format, dateRange },
      });

      const blob = res.data as Blob;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${reportType}-${dateRange}-${Date.now()}.${FORMAT_CONFIG[format].ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`${REPORTS.find((r) => r.type === reportType)?.name ?? 'Report'} downloaded as ${format.toUpperCase()}`);
    } catch {
      toast.error('Failed to download report. Please try again.');
    } finally {
      setLoadingMap((prev) => ({ ...prev, [key]: false }));
    }
  }, [dateRange]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-primary-500" />
            Reports
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Generate and download detailed reports
          </p>
        </div>

        {/* Date Range Picker */}
        <div className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 shadow-sm">
          <CalendarRange className="w-4 h-4 text-slate-400" />
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="bg-transparent text-sm font-medium text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
          >
            <option value="30d">Last 30 Days</option>
            <option value="3m">Last 3 Months</option>
            <option value="6m">Last 6 Months</option>
            <option value="1y">Last Year</option>
            <option value="all">All Time</option>
          </select>
        </div>
      </div>

      {/* Report Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {REPORTS.map((report) => (
          <div
            key={report.type}
            className="group relative bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 transition-all duration-200 hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-slate-900/50 hover:border-slate-300 dark:hover:border-slate-600 hover:-translate-y-0.5"
          >
            {/* Icon + Title */}
            <div className="flex items-start gap-4 mb-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${report.iconBg}`}>
                <report.icon className={`w-6 h-6 ${report.iconColor}`} />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-slate-900 dark:text-white leading-tight">
                  {report.name}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  {report.description}
                </p>
              </div>
            </div>

            {/* Download Buttons */}
            <div className="flex items-center gap-2 pt-4 border-t border-slate-100 dark:border-slate-700/50">
              {(Object.keys(FORMAT_CONFIG) as ReportFormat[]).map((format) => {
                const config = FORMAT_CONFIG[format];
                const loadingKey = `${report.type}-${format}`;
                const isLoading = loadingMap[loadingKey] ?? false;

                return (
                  <button
                    key={format}
                    onClick={() => handleDownload(report.type, format)}
                    disabled={isLoading}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all duration-150 ${config.color} hover:shadow-md ${config.hoverColor} disabled:opacity-60 disabled:cursor-not-allowed`}
                  >
                    {isLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Download className="w-3.5 h-3.5" />
                    )}
                    {config.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Scheduled Reports */}
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center">
              <CalendarRange className="w-5 h-5 text-primary-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Scheduled Reports</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Automated report delivery to your inbox</p>
            </div>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-white px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Schedule
          </button>
        </div>

        {scheduledLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : scheduledReports.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-700/50 flex items-center justify-center mb-3">
              <Clock className="w-7 h-7 text-slate-300 dark:text-slate-500" />
            </div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No scheduled reports yet</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Click &quot;Add Schedule&quot; to automate report delivery.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700">
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase">Name</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase hidden sm:table-cell">Type</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Frequency</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase hidden lg:table-cell">Last Run</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase hidden lg:table-cell">Next Run</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Recipients</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase">Status</th>
                  <th className="text-right px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                {scheduledReports.map((r) => {
                  const reportMeta = REPORTS.find(rp => rp.type === r.reportType);
                  return (
                    <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="px-3 py-3 font-medium text-slate-900 dark:text-white">{r.name}</td>
                      <td className="px-3 py-3 hidden sm:table-cell text-xs text-slate-600 dark:text-slate-400">{reportMeta?.name ?? r.reportType}</td>
                      <td className="px-3 py-3 hidden md:table-cell">
                        <span className="capitalize text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-lg">{r.schedule}</span>
                      </td>
                      <td className="px-3 py-3 hidden lg:table-cell text-xs text-slate-500">
                        {r.lastRunAt ? new Date(r.lastRunAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-3 py-3 hidden lg:table-cell text-xs text-slate-500">
                        {r.nextRunAt ? new Date(r.nextRunAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-3 py-3 hidden md:table-cell">
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          <Mail className="w-3.5 h-3.5" /> {r.recipients.length}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        {r.isActive ? (
                          <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                            <CheckCircle className="w-3.5 h-3.5" /> Active
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs font-medium text-slate-400">
                            <XCircle className="w-3.5 h-3.5" /> Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEdit(r)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 hover:text-primary-500 transition-colors">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDelete(r.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-slate-500 hover:text-red-500 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Scheduled Report Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                {editingId ? 'Edit Schedule' : 'New Scheduled Report'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Weekly Carrier Summary"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Report Type</label>
                <select
                  value={form.reportType}
                  onChange={(e) => setForm(f => ({ ...f, reportType: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                >
                  {REPORTS.map(r => (
                    <option key={r.type} value={r.type}>{r.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Frequency</label>
                <select
                  value={form.schedule}
                  onChange={(e) => setForm(f => ({ ...f, schedule: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Recipients (comma-separated emails)</label>
                <input
                  type="text"
                  value={form.recipients}
                  onChange={(e) => setForm(f => ({ ...f, recipients: e.target.value }))}
                  placeholder="alice@company.com, bob@company.com"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.isActive ? 'bg-primary-500' : 'bg-slate-300 dark:bg-slate-600'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
                <span className="text-sm text-slate-700 dark:text-slate-300">{form.isActive ? 'Active' : 'Inactive'}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-100 dark:border-slate-700">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-60"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {editingId ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
