'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { get } from '@/lib/api-client';
import { TableSkeleton, EmptyState } from '@/components/ui/loading';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Key, Plus, Trash2, Copy, Eye, EyeOff,
  Shield, CheckCircle, AlertCircle, ExternalLink,
  Truck, RefreshCw,
} from 'lucide-react';

interface IntegratedCarrier {
  id: string;
  name: string;
  scacCode: string;
  apiKey?: string;
  isActive: boolean;
  lastSync?: string;
}

interface ApiKey {
  id: string;
  name: string;
  key: string;
  createdAt: string;
  lastUsed?: string;
  isActive: boolean;
}

export default function ApiSetupPage() {
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});

  const { data: apiKeys = [], isLoading: loadingKeys } = useQuery({
    queryKey: ['api-keys'],
    queryFn: () => get<ApiKey[]>('/users/api-keys'),
  });

  const { data: carriers = [], isLoading: loadingCarriers } = useQuery({
    queryKey: ['carriers'],
    queryFn: () => get<IntegratedCarrier[]>('/shipments/carriers'),
  });

  const isLoading = loadingKeys || loadingCarriers;

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><Key className="w-6 h-6 text-primary-500" /> API & Integrations</h1>
          <p className="text-sm text-slate-500 mt-0.5">Loading API configuration...</p>
        </div>
        <TableSkeleton rows={3} cols={4} />
        <TableSkeleton rows={3} cols={5} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><Key className="w-6 h-6 text-primary-500" /> API & Integrations</h1>
        <p className="text-sm text-slate-500 mt-0.5">Manage API keys and carrier integrations</p>
      </div>

      {/* API Keys */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">API Keys</h2>
          <button onClick={() => toast.success('New API key generated')} className="flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
            <Plus className="w-4 h-4" /> Generate Key
          </button>
        </div>
        {apiKeys.length === 0 ? (
          <EmptyState icon={Key} title="No API keys" description="Generate your first API key to start integrating." />
        ) : (
          <div className="space-y-3">
            {apiKeys.map(key => (
              <div key={key.id} className="card p-4 flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm text-slate-900 dark:text-white">{key.name}</p>
                    {key.isActive && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">Active</span>}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="text-xs text-slate-500 font-mono">{showKey[key.id] ? key.key : '•'.repeat(30)}</code>
                    <button onClick={() => setShowKey({ ...showKey, [key.id]: !showKey[key.id] })} className="text-slate-400 hover:text-slate-600">
                      {showKey[key.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={() => { navigator.clipboard.writeText(key.key); toast.success('Copied to clipboard'); }} className="text-slate-400 hover:text-slate-600"><Copy className="w-3.5 h-3.5" /></button>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Created {key.createdAt} &middot; Last used {key.lastUsed || 'Never'}</p>
                </div>
                <button onClick={() => toast.error('Cannot revoke active key')} className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Integrated Carriers */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Integrated Carriers</h2>
          <button onClick={() => toast.info('Carrier integration wizard coming soon')} className="flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800">
            <Truck className="w-4 h-4" /> Add Carrier
          </button>
        </div>
        {carriers.length === 0 ? (
          <EmptyState icon={Truck} title="No carriers integrated" description="Add a carrier integration to sync claim data automatically." />
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Carrier</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase hidden sm:table-cell">SCAC</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Last Sync</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Status</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                {carriers.map(carrier => (
                  <tr key={carrier.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{carrier.name}</td>
                    <td className="px-4 py-3 hidden sm:table-cell font-mono text-xs text-slate-500">{carrier.scacCode}</td>
                    <td className="px-4 py-3 hidden md:table-cell text-xs text-slate-500">{carrier.lastSync ? new Date(carrier.lastSync).toLocaleString() : 'Never'}</td>
                    <td className="px-4 py-3">
                      {carrier.isActive ? (
                        <span className="flex items-center gap-1 text-xs text-emerald-600"><CheckCircle className="w-3.5 h-3.5" /> Connected</span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-slate-400"><AlertCircle className="w-3.5 h-3.5" /> Not Connected</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400"><RefreshCw className="w-3.5 h-3.5" /></button>
                      <button className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400"><Key className="w-3.5 h-3.5" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Webhook */}
      <section className="card p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">Webhook Configuration</h2>
        <p className="text-xs text-slate-500 mb-4">Configure webhooks to receive real-time notifications about claim events</p>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Webhook URL</label>
            <input type="url" placeholder="https://your-server.com/webhook" className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Secret Key</label>
            <input type="text" placeholder="whsec_..." className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-600 dark:text-slate-400">Events:</label>
            {['claim.created', 'claim.filed', 'claim.settled', 'claim.closed', 'document.uploaded'].map(event => (
              <label key={event} className="flex items-center gap-1 text-xs bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded cursor-pointer">
                <input type="checkbox" defaultChecked className="rounded border-slate-300 text-primary-500 w-3 h-3" /> {event}
              </label>
            ))}
          </div>
          <button className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium">Save Webhook</button>
        </div>
      </section>
    </div>
  );
}
