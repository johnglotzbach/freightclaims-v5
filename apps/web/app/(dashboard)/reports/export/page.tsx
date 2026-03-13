'use client';

import { useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  FileSearch, Download, Calendar, Filter,
  FileText, Table, BarChart3, PieChart,
} from 'lucide-react';

interface ReportType {
  id: string;
  title: string;
  description: string;
  icon: typeof FileText;
  formats: string[];
}

const REPORT_TYPES: ReportType[] = [
  { id: 'collection-percentage', title: 'Collection Percentage', description: 'Track settlement collection rates across carriers and time periods', icon: BarChart3, formats: ['PDF', 'CSV', 'Excel'] },
  { id: 'top-customers', title: 'Top Customers', description: 'View customers with the highest claim volumes and amounts', icon: Table, formats: ['PDF', 'CSV', 'Excel'] },
  { id: 'top-carriers', title: 'Top Carriers', description: 'Carriers with the most claims, denials, and settlement delays', icon: Table, formats: ['PDF', 'CSV', 'Excel'] },
  { id: 'metrics-by-carrier', title: 'Metrics by Carrier', description: 'Detailed performance breakdown per carrier', icon: PieChart, formats: ['PDF', 'CSV', 'Excel'] },
  { id: 'metrics-by-destination', title: 'Metrics by Destination', description: 'Claim frequency and severity by destination', icon: PieChart, formats: ['PDF', 'CSV', 'Excel'] },
  { id: 'write-off', title: 'Write-Off Amount', description: 'Track total write-offs and identify trends', icon: FileText, formats: ['PDF', 'CSV', 'Excel'] },
  { id: 'aging', title: 'Aging Report', description: 'Claims grouped by age brackets (30, 60, 90, 120+ days)', icon: BarChart3, formats: ['PDF', 'CSV', 'Excel'] },
  { id: 'insurance', title: 'Insurance Report', description: 'Claims filed with insurance providers and recovery rates', icon: FileText, formats: ['PDF', 'CSV', 'Excel'] },
];

export default function ReportsExportPage() {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedReport, setSelectedReport] = useState<string | null>(null);

  async function handleExport(reportId: string, format: string) {
    try {
      const res = await apiClient.get(`/reports/export/${reportId}`, {
        responseType: 'blob',
        params: { format: format.toLowerCase(), dateFrom: dateFrom || undefined, dateTo: dateTo || undefined },
      });
      const blob = res.data as Blob;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const ext = format.toLowerCase() === 'pdf' ? 'pdf' : format.toLowerCase() === 'csv' ? 'csv' : 'xlsx';
      a.download = `${reportId}-${Date.now()}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`${format} report downloaded`);
    } catch {
      toast.error(`Failed to export ${format} report`);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <FileSearch className="w-6 h-6 text-primary-500" /> Reports
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">Generate and download detailed reports</p>
      </div>

      {/* Date Range */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Date Range:</span>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="pl-10 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
              />
            </div>
            <span className="text-slate-400">to</span>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="pl-10 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Report Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {REPORT_TYPES.map(report => (
          <div
            key={report.id}
            className={cn(
              'card p-6 hover:shadow-card-hover transition-all cursor-pointer border-2',
              selectedReport === report.id ? 'border-primary-300 dark:border-primary-500/50' : 'border-transparent'
            )}
            onClick={() => setSelectedReport(report.id)}
          >
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center flex-shrink-0">
                <report.icon className="w-5 h-5 text-primary-500" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{report.title}</h3>
                <p className="text-xs text-slate-500 mt-1">{report.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
              {report.formats.map(format => (
                <button
                  key={format}
                  onClick={(e) => { e.stopPropagation(); handleExport(report.id, format); }}
                  className="flex items-center gap-1 text-xs font-medium text-primary-500 hover:text-primary-600 bg-primary-50 dark:bg-primary-500/10 px-2.5 py-1 rounded-lg transition-colors"
                >
                  <Download className="w-3 h-3" /> {format}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
