'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { get } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { CardSkeleton, EmptyState } from '@/components/ui/loading';
import { toast } from 'sonner';
import {
  Settings, Plus, Edit2, Trash2, ToggleLeft, ToggleRight,
  Tag, AlertTriangle, Clock, ChevronDown, ChevronUp,
  Layers, Hash, GripVertical, Check, X,
} from 'lucide-react';

type SettingSection = 'statuses' | 'types' | 'conditions' | 'modes' | 'identifiers' | 'stagnant' | 'divisions';

interface ClaimSetting {
  id: string;
  name: string;
  color?: string;
  isActive: boolean;
  order: number;
}

interface ClaimIdentifier {
  id: string;
  name: string;
  key: string;
  isActive: boolean;
  order: number;
}

interface ClaimSettingsData {
  statuses: ClaimSetting[];
  types: ClaimSetting[];
  conditions: ClaimSetting[];
  modes: ClaimSetting[];
  identifiers: ClaimIdentifier[];
  divisions: ClaimSetting[];
}

const sections: { key: SettingSection; label: string; icon: typeof Tag; description: string }[] = [
  { key: 'statuses', label: 'Claim Statuses', icon: Layers, description: 'Configure the lifecycle stages of a claim' },
  { key: 'types', label: 'Claim Types', icon: Tag, description: 'Define types of freight claims' },
  { key: 'conditions', label: 'Claim Conditions', icon: AlertTriangle, description: 'Conditions describing the state of goods' },
  { key: 'modes', label: 'Shipping Modes', icon: Tag, description: 'Modes of transportation' },
  { key: 'identifiers', label: 'Custom Identifiers', icon: Hash, description: 'Custom reference fields for claims' },
  { key: 'stagnant', label: 'Stagnant Claim Rules', icon: Clock, description: 'Configure alerts for stagnant claims' },
  { key: 'divisions', label: 'Company Divisions', icon: Layers, description: 'Organizational divisions for claim routing' },
];

export default function ClaimsSettingsPage() {
  const [expandedSections, setExpandedSections] = useState<Set<SettingSection>>(new Set(['statuses']));
  const [stagnantDays, setStagnantDays] = useState(30);
  const [stagnantEnabled, setStagnantEnabled] = useState(true);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['claim-settings'],
    queryFn: () => get<ClaimSettingsData>('/claims/settings/all'),
  });

  function toggleSection(key: SettingSection) {
    const next = new Set(expandedSections);
    next.has(key) ? next.delete(key) : next.add(key);
    setExpandedSections(next);
  }

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><Settings className="w-6 h-6 text-primary-500" /> Claims Configuration</h1>
          <p className="text-sm text-slate-500 mt-0.5">Loading settings...</p>
        </div>
        <div className="space-y-3">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><Settings className="w-6 h-6 text-primary-500" /> Claims Configuration</h1>
          <p className="text-sm text-slate-500 mt-0.5">Configure claim statuses, types, conditions, identifiers, and automation rules</p>
        </div>
        <EmptyState icon={Settings} title="No settings found" description="Unable to load claim settings. Please try again." />
      </div>
    );
  }

  const statuses = settings.statuses || [];
  const types = settings.types || [];
  const conditions = settings.conditions || [];
  const modes = settings.modes || [];
  const identifiers = settings.identifiers || [];
  const divisions = settings.divisions || [];

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><Settings className="w-6 h-6 text-primary-500" /> Claims Configuration</h1>
        <p className="text-sm text-slate-500 mt-0.5">Configure claim statuses, types, conditions, identifiers, and automation rules</p>
      </div>

      <div className="space-y-3">
        {sections.map(section => (
          <div key={section.key} className="card overflow-hidden">
            <button onClick={() => toggleSection(section.key)} className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
              <div className="flex items-center gap-3">
                <section.icon className="w-5 h-5 text-primary-500" />
                <div className="text-left">
                  <h3 className="font-semibold text-sm text-slate-900 dark:text-white">{section.label}</h3>
                  <p className="text-xs text-slate-500">{section.description}</p>
                </div>
              </div>
              {expandedSections.has(section.key) ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            {expandedSections.has(section.key) && (
              <div className="border-t border-slate-100 dark:border-slate-700 px-5 py-4">
                {section.key === 'statuses' && <SettingsList items={statuses} showColor />}
                {section.key === 'types' && <SettingsList items={types} />}
                {section.key === 'conditions' && <SettingsList items={conditions} />}
                {section.key === 'modes' && <SettingsList items={modes} />}
                {section.key === 'identifiers' && <IdentifiersList items={identifiers} />}
                {section.key === 'stagnant' && (
                  <div className="space-y-4">
                    <label className="flex items-center justify-between cursor-pointer">
                      <div>
                        <p className="text-sm font-medium">Enable Stagnant Claim Alerts</p>
                        <p className="text-xs text-slate-500">Send notifications when claims have no activity</p>
                      </div>
                      <button onClick={() => setStagnantEnabled(!stagnantEnabled)} className={cn('transition-colors', stagnantEnabled ? 'text-emerald-500' : 'text-slate-400')}>
                        {stagnantEnabled ? <ToggleRight className="w-6 h-6" /> : <ToggleLeft className="w-6 h-6" />}
                      </button>
                    </label>
                    {stagnantEnabled && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Days before marking as stagnant</label>
                        <input type="number" value={stagnantDays} onChange={(e) => setStagnantDays(Number(e.target.value))} className="w-32 px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" min={1} />
                        <p className="text-xs text-slate-400 mt-1">Claims with no activity for {stagnantDays} days will trigger a notification</p>
                      </div>
                    )}
                    <button onClick={() => toast.success('Stagnant rules saved')} className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium">Save Rules</button>
                  </div>
                )}
                {section.key === 'divisions' && <SettingsList items={divisions} />}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function SettingsList({ items, showColor = false }: { items: ClaimSetting[]; showColor?: boolean }) {
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');

  return (
    <div className="space-y-2">
      {items.map(item => (
        <div key={item.id} className="flex items-center justify-between py-2 px-3 bg-slate-50/50 dark:bg-slate-800/30 rounded-lg">
          <div className="flex items-center gap-3">
            <GripVertical className="w-3.5 h-3.5 text-slate-300 cursor-move" />
            {showColor && item.color && <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />}
            <span className="text-sm font-medium text-slate-900 dark:text-white">{item.name}</span>
          </div>
          <div className="flex items-center gap-1">
            <button className={cn('transition-colors', item.isActive ? 'text-emerald-500' : 'text-slate-300')}>
              {item.isActive ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
            </button>
            <button className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400"><Edit2 className="w-3 h-3" /></button>
            <button className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
          </div>
        </div>
      ))}
      {adding ? (
        <div className="flex items-center gap-2 py-2">
          <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="New item..." autoFocus className="flex-1 px-3 py-1.5 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
          <button onClick={() => { toast.success('Item added'); setAdding(false); setNewName(''); }} className="p-1 text-emerald-500"><Check className="w-4 h-4" /></button>
          <button onClick={() => setAdding(false)} className="p-1 text-slate-400"><X className="w-4 h-4" /></button>
        </div>
      ) : (
        <button onClick={() => setAdding(true)} className="flex items-center gap-1.5 text-xs text-primary-500 hover:text-primary-600 font-medium py-2"><Plus className="w-3.5 h-3.5" /> Add Item</button>
      )}
    </div>
  );
}

function IdentifiersList({ items }: { items: ClaimIdentifier[] }) {
  return (
    <div className="space-y-2">
      {items.map(item => (
        <div key={item.id} className="flex items-center justify-between py-2 px-3 bg-slate-50/50 dark:bg-slate-800/30 rounded-lg">
          <div>
            <span className="text-sm font-medium text-slate-900 dark:text-white">{item.name}</span>
            <span className="text-xs text-slate-400 font-mono ml-2">{item.key}</span>
          </div>
          <div className="flex items-center gap-1">
            <button className={cn('transition-colors', item.isActive ? 'text-emerald-500' : 'text-slate-300')}>
              {item.isActive ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
            </button>
            <button className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400"><Edit2 className="w-3 h-3" /></button>
          </div>
        </div>
      ))}
      <button className="flex items-center gap-1.5 text-xs text-primary-500 hover:text-primary-600 font-medium py-2"><Plus className="w-3.5 h-3.5" /> Add Identifier</button>
    </div>
  );
}
