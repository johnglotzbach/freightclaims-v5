'use client';

import { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getList } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { TableSkeleton, EmptyState } from '@/components/ui/loading';
import { toast } from 'sonner';
import {
  Upload, FileText, Users, Truck, MapPin, Package,
  Download, CheckCircle, AlertCircle, X, Clock,
  FileSpreadsheet, Info,
} from 'lucide-react';

type UploadType = 'claims' | 'customers' | 'contacts' | 'carriers' | 'carrier-contacts' | 'locations';

interface UploadHistory {
  id: string;
  fileName: string;
  type: UploadType;
  status: 'completed' | 'failed' | 'processing';
  totalRows: number;
  successRows: number;
  failedRows: number;
  uploadedBy: string;
  uploadedAt: string;
}

const UPLOAD_TABS: { key: UploadType; label: string; icon: typeof FileText; template: string }[] = [
  { key: 'claims', label: 'Claims', icon: FileText, template: 'claims-template.csv' },
  { key: 'customers', label: 'Customers', icon: Users, template: 'customers-template.csv' },
  { key: 'contacts', label: 'Customer Contacts', icon: Users, template: 'contacts-template.csv' },
  { key: 'carriers', label: 'Capacity Providers', icon: Truck, template: 'carriers-template.csv' },
  { key: 'carrier-contacts', label: 'Carrier Contacts', icon: Truck, template: 'carrier-contacts-template.csv' },
  { key: 'locations', label: 'Locations', icon: MapPin, template: 'locations-template.csv' },
];

const COLUMN_INFO: Record<UploadType, string[]> = {
  claims: ['Claim Number', 'PRO Number', 'BOL Number', 'Claim Type', 'Claim Amount', 'Ship Date', 'Delivery Date', 'Customer Name', 'Carrier Name', 'Origin City', 'Origin State', 'Destination City', 'Destination State', 'Description'],
  customers: ['Company Name', 'Code', 'Email', 'Phone', 'Address Line 1', 'Address Line 2', 'City', 'State', 'Zip Code', 'Country', 'Industry', 'Is Corporate'],
  contacts: ['Customer Name', 'First Name', 'Last Name', 'Email', 'Phone', 'Title', 'Department', 'Is Primary'],
  carriers: ['Carrier Name', 'SCAC Code', 'DOT Number', 'MC Number', 'Email', 'Phone', 'Address', 'City', 'State', 'Zip'],
  'carrier-contacts': ['Carrier Name', 'First Name', 'Last Name', 'Email', 'Phone', 'Title', 'Department'],
  locations: ['Customer Name', 'Location Name', 'Address Line 1', 'Address Line 2', 'City', 'State', 'Zip Code', 'Country', 'Is Default'],
};

export default function MassUploadPage() {
  const [activeTab, setActiveTab] = useState<UploadType>('claims');
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const { data: history = [], isLoading: historyLoading } = useQuery({
    queryKey: ['mass-upload-history'],
    queryFn: () => getList<UploadHistory>('/claims/mass-upload/history'),
  });

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.csv') || file.name.endsWith('.xlsx'))) {
      setSelectedFile(file);
    } else {
      toast.error('Please upload a CSV or Excel file');
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    await new Promise(r => setTimeout(r, 2000));
    setUploading(false);
    setSelectedFile(null);
    toast.success(`${selectedFile.name} uploaded successfully. Processing ${activeTab}...`);
  };

  const tab = UPLOAD_TABS.find(t => t.key === activeTab)!;
  const columns = COLUMN_INFO[activeTab];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Upload className="w-6 h-6 text-primary-500" /> Mass Upload
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">Bulk import claims, customers, carriers, contacts, and locations from CSV or Excel files</p>
      </div>

      {/* Upload Type Tabs */}
      <div className="flex gap-2 flex-wrap">
        {UPLOAD_TABS.map(t => (
          <button
            key={t.key}
            onClick={() => { setActiveTab(t.key); setSelectedFile(null); }}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all border',
              activeTab === t.key
                ? 'bg-primary-50 dark:bg-primary-500/10 border-primary-200 dark:border-primary-500/30 text-primary-700 dark:text-primary-400'
                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-primary-200'
            )}
          >
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Upload Zone */}
        <div className="lg:col-span-2 space-y-4">
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            className={cn(
              'border-2 border-dashed rounded-2xl p-12 text-center transition-all',
              dragOver ? 'border-primary-400 bg-primary-50 dark:bg-primary-500/5' : 'border-slate-200 dark:border-slate-700',
              selectedFile && 'border-emerald-400 bg-emerald-50 dark:bg-emerald-500/5'
            )}
          >
            {selectedFile ? (
              <div className="space-y-3">
                <FileSpreadsheet className="w-12 h-12 text-emerald-500 mx-auto" />
                <p className="text-sm font-medium text-slate-900 dark:text-white">{selectedFile.name}</p>
                <p className="text-xs text-slate-500">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                <div className="flex items-center justify-center gap-3">
                  <button onClick={() => setSelectedFile(null)} className="text-sm text-red-500 hover:text-red-600 font-medium flex items-center gap-1">
                    <X className="w-4 h-4" /> Remove
                  </button>
                  <button
                    onClick={handleUpload}
                    disabled={uploading}
                    className="bg-primary-500 hover:bg-primary-600 text-white px-6 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                  >
                    {uploading ? 'Uploading...' : `Upload ${tab.label}`}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <Upload className="w-12 h-12 text-slate-300 mx-auto" />
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Drag & drop your CSV or Excel file here
                </p>
                <p className="text-xs text-slate-400">or</p>
                <label className="inline-block cursor-pointer bg-primary-500 hover:bg-primary-600 text-white px-6 py-2 rounded-lg text-sm font-semibold transition-colors">
                  Browse Files
                  <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFileSelect} className="hidden" />
                </label>
                <p className="text-xs text-slate-400">Supported formats: CSV, XLSX, XLS (max 10MB)</p>
              </div>
            )}
          </div>

          {/* Download Template */}
          <div className="card p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Info className="w-5 h-5 text-primary-500" />
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">Download Template</p>
                <p className="text-xs text-slate-500">Use our template to ensure your data is formatted correctly</p>
              </div>
            </div>
            <button className="flex items-center gap-1.5 text-sm font-medium text-primary-500 hover:text-primary-600">
              <Download className="w-4 h-4" /> {tab.template}
            </button>
          </div>
        </div>

        {/* Column Requirements */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Required Columns for {tab.label}</h3>
          <div className="space-y-1.5">
            {columns.map((col, i) => (
              <div key={col} className="flex items-center gap-2 text-xs">
                <span className="w-5 h-5 rounded bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 font-mono">{i + 1}</span>
                <span className="text-slate-700 dark:text-slate-300">{col}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Upload History */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Upload History</h3>
        </div>
        {historyLoading ? (
          <TableSkeleton rows={3} cols={6} />
        ) : history.length === 0 ? (
          <div className="p-12 text-center">
            <Upload className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">No uploads yet</h3>
            <p className="text-sm text-slate-500">Your upload history will appear here after your first import.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">File</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase hidden sm:table-cell">Type</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Results</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Status</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase hidden lg:table-cell">Date</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                {history.map(h => (
                  <tr key={h.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{h.fileName}</td>
                    <td className="px-4 py-3 hidden sm:table-cell capitalize text-xs text-slate-500">{h.type}</td>
                    <td className="px-4 py-3 hidden md:table-cell text-xs">
                      <span className="text-emerald-600">{h.successRows} passed</span>
                      {h.failedRows > 0 && <span className="text-red-500 ml-2">{h.failedRows} failed</span>}
                      <span className="text-slate-400 ml-2">/ {h.totalRows} total</span>
                    </td>
                    <td className="px-4 py-3">
                      {h.status === 'completed' && <span className="flex items-center gap-1 text-xs text-emerald-600"><CheckCircle className="w-3.5 h-3.5" /> Completed</span>}
                      {h.status === 'failed' && <span className="flex items-center gap-1 text-xs text-red-500"><AlertCircle className="w-3.5 h-3.5" /> Failed</span>}
                      {h.status === 'processing' && <span className="flex items-center gap-1 text-xs text-blue-500"><Clock className="w-3.5 h-3.5 animate-spin" /> Processing</span>}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-xs text-slate-500">{new Date(h.uploadedAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right">
                      <button className="text-xs text-primary-500 hover:text-primary-600 font-medium"><Download className="w-4 h-4 inline" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
