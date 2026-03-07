'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  FileText, Save, Send, Calendar, Filter, Plus,
  Trash2, ArrowLeft, Download, Eye, ChevronDown,
} from 'lucide-react';
import Link from 'next/link';

type ReportType = 'weekly' | 'carrier' | 'insurance' | 'corporate' | '3pl' | 'custom';
type OutputFormat = 'pdf' | 'csv' | 'excel';

interface ReportColumn {
  key: string;
  label: string;
  selected: boolean;
}

const AVAILABLE_COLUMNS: ReportColumn[] = [
  { key: 'claimNumber', label: 'Claim Number', selected: true },
  { key: 'proNumber', label: 'PRO Number', selected: true },
  { key: 'bolNumber', label: 'BOL Number', selected: false },
  { key: 'claimType', label: 'Claim Type', selected: true },
  { key: 'status', label: 'Status', selected: true },
  { key: 'claimAmount', label: 'Claim Amount', selected: true },
  { key: 'settledAmount', label: 'Settled Amount', selected: true },
  { key: 'filingDate', label: 'Filing Date', selected: true },
  { key: 'shipDate', label: 'Ship Date', selected: false },
  { key: 'deliveryDate', label: 'Delivery Date', selected: false },
  { key: 'customerName', label: 'Customer', selected: true },
  { key: 'carrierName', label: 'Carrier', selected: true },
  { key: 'carrierScac', label: 'Carrier SCAC', selected: false },
  { key: 'originCity', label: 'Origin City', selected: false },
  { key: 'originState', label: 'Origin State', selected: false },
  { key: 'destinationCity', label: 'Destination City', selected: false },
  { key: 'destinationState', label: 'Destination State', selected: false },
  { key: 'daysOpen', label: 'Days Open', selected: false },
  { key: 'assignedTo', label: 'Assigned To', selected: false },
  { key: 'description', label: 'Description', selected: false },
];

export default function NewReportPage() {
  const router = useRouter();
  const [reportName, setReportName] = useState('');
  const [reportType, setReportType] = useState<ReportType>('weekly');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [format, setFormat] = useState<OutputFormat>('pdf');
  const [columns, setColumns] = useState(AVAILABLE_COLUMNS);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleFrequency, setScheduleFrequency] = useState('weekly');
  const [recipients, setRecipients] = useState<string[]>([]);
  const [newRecipient, setNewRecipient] = useState('');

  function toggleColumn(key: string) {
    setColumns(columns.map(c => c.key === key ? { ...c, selected: !c.selected } : c));
  }

  function addRecipient() {
    if (!newRecipient.trim() || recipients.includes(newRecipient)) return;
    setRecipients([...recipients, newRecipient.trim()]);
    setNewRecipient('');
  }

  function handleSave() {
    if (!reportName.trim()) { toast.error('Report name is required'); return; }
    toast.success('Report saved successfully');
    router.push('/reports/export');
  }

  function handleGenerate() {
    if (!reportName.trim()) { toast.error('Report name is required'); return; }
    toast.success(`Generating ${format.toUpperCase()} report...`);
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <nav className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/reports/export" className="hover:text-primary-500 flex items-center gap-1"><ArrowLeft className="w-3.5 h-3.5" /> Reports</Link>
        <span>/</span>
        <span className="text-slate-900 dark:text-white font-medium">New Report</span>
      </nav>

      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Create Report</h1>
        <p className="text-sm text-slate-500 mt-0.5">Configure and generate custom claim reports</p>
      </div>

      {/* Report Name & Type */}
      <div className="card p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Report Name</label>
          <input type="text" value={reportName} onChange={(e) => setReportName(e.target.value)} placeholder="e.g., Weekly Claims Summary" className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Report Type</label>
            <select value={reportType} onChange={(e) => setReportType(e.target.value as ReportType)} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600">
              <option value="weekly">Weekly Claims Report</option>
              <option value="carrier">Carrier Report</option>
              <option value="insurance">Insurance Report</option>
              <option value="corporate">Corporate Report</option>
              <option value="3pl">3PL Report</option>
              <option value="custom">Custom Report</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Output Format</label>
            <div className="flex gap-2">
              {(['pdf', 'csv', 'excel'] as OutputFormat[]).map(f => (
                <button key={f} onClick={() => setFormat(f)} className={cn('flex-1 py-2 rounded-lg text-sm font-medium border transition-all uppercase', format === f ? 'bg-primary-50 border-primary-200 text-primary-700 dark:bg-primary-950 dark:border-primary-500/30 dark:text-primary-400' : 'border-slate-200 dark:border-slate-700 text-slate-500')}>
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Date From</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Date To</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
          </div>
        </div>
      </div>

      {/* Column Selection */}
      <div className="card p-6">
        <h3 className="font-semibold text-slate-900 dark:text-white mb-3">Report Columns</h3>
        <p className="text-xs text-slate-500 mb-4">Select which columns to include in the report</p>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {columns.map(col => (
            <label key={col.key} className={cn('flex items-center gap-2 p-2.5 rounded-lg border text-sm cursor-pointer transition-all', col.selected ? 'bg-primary-50 dark:bg-primary-500/10 border-primary-200 dark:border-primary-500/30' : 'border-slate-200 dark:border-slate-700 hover:border-primary-200')}>
              <input type="checkbox" checked={col.selected} onChange={() => toggleColumn(col.key)} className="rounded border-slate-300 text-primary-500" />
              <span className={cn(col.selected ? 'text-primary-700 dark:text-primary-400 font-medium' : 'text-slate-600 dark:text-slate-400')}>{col.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Schedule & Email */}
      <div className="card p-6 space-y-4">
        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white">Schedule Report</h3>
            <p className="text-xs text-slate-500 mt-0.5">Automatically generate and email this report on a schedule</p>
          </div>
          <input type="checkbox" checked={scheduleEnabled} onChange={(e) => setScheduleEnabled(e.target.checked)} className="rounded border-slate-300 text-primary-500 w-5 h-5" />
        </label>

        {scheduleEnabled && (
          <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-700">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Frequency</label>
              <select value={scheduleFrequency} onChange={(e) => setScheduleFrequency(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600">
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="biweekly">Bi-Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email Recipients</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {recipients.map(r => (
                  <span key={r} className="flex items-center gap-1 text-xs bg-primary-100 dark:bg-primary-500/10 text-primary-700 dark:text-primary-400 px-2.5 py-1 rounded-full">
                    {r}
                    <button onClick={() => setRecipients(recipients.filter(x => x !== r))}><Trash2 className="w-3 h-3" /></button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input type="email" value={newRecipient} onChange={(e) => setNewRecipient(e.target.value)} placeholder="email@company.com" className="flex-1 px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" onKeyDown={(e) => e.key === 'Enter' && addRecipient()} />
                <button onClick={addRecipient} className="text-sm text-primary-500 font-medium px-3">Add</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <Link href="/reports/export" className="text-sm text-slate-500 hover:text-slate-700 font-medium">Cancel</Link>
        <div className="flex gap-3">
          <button onClick={handleSave} className="flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800">
            <Save className="w-4 h-4" /> Save Report
          </button>
          <button onClick={handleGenerate} className="flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors">
            <Download className="w-4 h-4" /> Generate Report
          </button>
        </div>
      </div>
    </div>
  );
}
