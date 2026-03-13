'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  BarChart3, Settings, Save, RotateCcw,
  Eye, EyeOff,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface InsightToggle {
  key: string;
  label: string;
  description: string;
  enabled: boolean;
}

interface InsightCategory {
  title: string;
  toggles: InsightToggle[];
}

const DEFAULT_SETTINGS: InsightCategory[] = [
  {
    title: 'Customer Metrics',
    toggles: [
      { key: 'topCustomers', label: 'Top Customers', description: 'Customers ranked by claim volume', enabled: true },
      { key: 'topOrigins', label: 'Top Origins', description: 'Most frequent shipment origins', enabled: true },
      { key: 'topDestinations', label: 'Top Destinations', description: 'Most frequent shipment destinations', enabled: true },
      { key: 'topFilingReasons', label: 'Top Filing Reasons', description: 'Most common claim types filed', enabled: true },
      { key: 'topFiledProducts', label: 'Top Filed Products', description: 'Products with most claims', enabled: false },
      { key: 'topClosedReasons', label: 'Top Closed Reasons', description: 'Most common claim closure reasons', enabled: false },
      { key: 'topSalesRepOrAgent', label: 'Top Sales Rep / Agent', description: 'Agents with highest claim volumes', enabled: false },
      { key: 'customerTotalAmountOutstanding', label: 'Total Amount Outstanding', description: 'Aggregate outstanding claim value per customer', enabled: true },
      { key: 'customerTotalAmountFiled', label: 'Total Amount Filed', description: 'Aggregate filed claim value per customer', enabled: true },
      { key: 'collectionPercentage', label: 'Collection Percentage', description: 'Ratio of collected to filed amounts', enabled: true },
      { key: 'customerTotalWriteOff', label: 'Total Write-Off', description: 'Aggregate write-off value per customer', enabled: false },
    ],
  },
  {
    title: 'Carrier / 3PL Metrics',
    toggles: [
      { key: 'topCarriers', label: 'Top Carriers', description: 'Carriers ranked by claim volume', enabled: true },
      { key: 'top3PL', label: 'Top 3PLs', description: 'Third-party logistics providers ranked by claims', enabled: false },
      { key: 'cpTotalAmountOutstanding', label: 'CP Total Outstanding', description: 'Outstanding amounts per carrier/3PL', enabled: true },
      { key: 'cpTotalAmountPaid', label: 'CP Total Paid', description: 'Total paid amounts per carrier/3PL', enabled: true },
      { key: 'cpTotalAmountFiled', label: 'CP Total Filed', description: 'Total filed amounts per carrier/3PL', enabled: true },
      { key: 'cpMetricsPerProduct', label: 'Metrics Per Product', description: 'Carrier performance broken down by product', enabled: false },
      { key: 'cpMetricsDestination', label: 'Metrics Per Destination', description: 'Carrier performance broken down by destination', enabled: false },
      { key: 'cpMetricsCarrierClient', label: 'Metrics Per Carrier-Client', description: 'Cross-reference carrier and client performance', enabled: false },
    ],
  },
];

export default function InsightsSettingsPage() {
  const [categories, setCategories] = useState(DEFAULT_SETTINGS);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('insights-settings');
      if (stored) {
        const prefs: Record<string, boolean> = JSON.parse(stored);
        setCategories(cats => cats.map(cat => ({
          ...cat,
          toggles: cat.toggles.map(t => t.key in prefs ? { ...t, enabled: prefs[t.key] } : t),
        })));
      }
    } catch { /* ignore corrupt data */ }
  }, []);

  function toggleSetting(categoryIdx: number, toggleKey: string) {
    setCategories(cats => cats.map((cat, i) =>
      i === categoryIdx ? { ...cat, toggles: cat.toggles.map(t => t.key === toggleKey ? { ...t, enabled: !t.enabled } : t) } : cat,
    ));
    setHasChanges(true);
  }

  function save() {
    const preferences: Record<string, boolean> = {};
    categories.forEach(cat => cat.toggles.forEach(t => { preferences[t.key] = t.enabled; }));
    try {
      localStorage.setItem('insights-settings', JSON.stringify(preferences));
      toast.success('Insights settings saved');
      setHasChanges(false);
    } catch {
      toast.error('Failed to save settings');
    }
  }

  function reset() {
    setCategories(DEFAULT_SETTINGS);
    setHasChanges(false);
    toast.info('Settings reset to defaults');
  }

  const totalEnabled = categories.reduce((sum, cat) => sum + cat.toggles.filter(t => t.enabled).length, 0);
  const totalAvailable = categories.reduce((sum, cat) => sum + cat.toggles.length, 0);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><Settings className="w-6 h-6 text-primary-500" /> Insights Configuration</h1>
          <p className="text-sm text-slate-500 mt-0.5">Choose which charts and metrics appear on your Insights dashboard</p>
        </div>
        <div className="flex gap-2">
          <button onClick={reset} className="flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg text-sm hover:bg-slate-50"><RotateCcw className="w-4 h-4" /> Reset</button>
          <button onClick={save} disabled={!hasChanges} className="flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-40"><Save className="w-4 h-4" /> Save</button>
        </div>
      </div>

      <div className="card p-4 flex items-center gap-3">
        <BarChart3 className="w-5 h-5 text-primary-500" />
        <div>
          <p className="text-sm font-medium text-slate-900 dark:text-white">{totalEnabled} of {totalAvailable} charts enabled</p>
          <p className="text-xs text-slate-500">Enabled charts will appear on your Insights dashboard. Changes are saved per user.</p>
        </div>
      </div>

      {categories.map((category, catIdx) => (
        <div key={category.title} className="card overflow-hidden">
          <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{category.title}</h3>
            <p className="text-[10px] text-slate-400">{category.toggles.filter(t => t.enabled).length} enabled</p>
          </div>
          <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
            {category.toggles.map(toggle => (
              <div key={toggle.key} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div className="flex items-center gap-3">
                  {toggle.enabled ? <Eye className="w-4 h-4 text-primary-500" /> : <EyeOff className="w-4 h-4 text-slate-300" />}
                  <div>
                    <p className={cn('text-sm font-medium', toggle.enabled ? 'text-slate-900 dark:text-white' : 'text-slate-500')}>{toggle.label}</p>
                    <p className="text-[10px] text-slate-400">{toggle.description}</p>
                  </div>
                </div>
                <button onClick={() => toggleSetting(catIdx, toggle.key)} className="relative w-11 h-6 rounded-full transition-colors" style={{ backgroundColor: toggle.enabled ? '#3b82f6' : '#cbd5e1' }}>
                  <span className={cn('absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform', toggle.enabled ? 'left-[22px]' : 'left-0.5')} />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
