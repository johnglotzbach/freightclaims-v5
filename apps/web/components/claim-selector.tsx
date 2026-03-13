'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { get } from '@/lib/api-client';
import { Search, ChevronDown, X, FileText } from 'lucide-react';

interface ClaimOption {
  id: string;
  claimNumber: string;
  proNumber?: string;
  status: string;
  claimType?: string;
  claimAmount?: number;
}

interface CarrierOption {
  id: string;
  name: string;
  scacCode?: string;
}

export function ClaimSelector({
  value,
  onChange,
  placeholder = 'Search or select a claim...',
}: {
  value: string;
  onChange: (id: string, claim?: ClaimOption) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const { data: claims = [] } = useQuery({
    queryKey: ['claims-selector', search],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '20', sortBy: 'createdAt', sortDir: 'desc' });
      if (search.trim()) params.set('search', search.trim());
      const res = await get<any>(`/claims?${params}`);
      return (res?.data || res || []) as ClaimOption[];
    },
    staleTime: 15_000,
  });

  const selected = claims.find((c) => c.id === value);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <div
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm cursor-pointer hover:border-primary-300 dark:hover:border-primary-500/40 transition-colors"
      >
        <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
        {selected ? (
          <span className="flex-1 truncate">
            <span className="font-medium">{selected.claimNumber}</span>
            {selected.proNumber && <span className="text-slate-400 ml-2">PRO: {selected.proNumber}</span>}
            <span className="text-xs ml-2 text-slate-400 capitalize">{selected.status}</span>
          </span>
        ) : value ? (
          <span className="flex-1 truncate font-mono text-slate-600 dark:text-slate-300">{value}</span>
        ) : (
          <span className="flex-1 text-slate-400">{placeholder}</span>
        )}
        {value ? (
          <button onClick={(e) => { e.stopPropagation(); onChange(''); setSearch(''); }} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </div>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden">
          <div className="p-2 border-b border-slate-100 dark:border-slate-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by claim #, PRO, or status..."
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                autoFocus
              />
            </div>
          </div>

          <div className="p-1 border-b border-slate-100 dark:border-slate-700">
            <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Or paste a claim ID directly</div>
            <input
              type="text"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              placeholder="Paste claim ID..."
              className="w-full px-3 py-1.5 text-xs font-mono border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900 mx-1"
              style={{ width: 'calc(100% - 8px)' }}
            />
          </div>

          <div className="max-h-64 overflow-y-auto">
            {claims.length === 0 ? (
              <div className="p-4 text-center text-sm text-slate-400">No claims found</div>
            ) : (
              claims.map((c) => (
                <button
                  key={c.id}
                  onClick={() => { onChange(c.id, c); setOpen(false); }}
                  className={`w-full text-left px-3 py-2.5 text-sm hover:bg-primary-50 dark:hover:bg-primary-500/10 flex items-center gap-3 transition-colors ${c.id === value ? 'bg-primary-50 dark:bg-primary-500/10' : ''}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900 dark:text-white">{c.claimNumber}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase ${
                        c.status === 'open' ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400' :
                        c.status === 'filed' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400' :
                        c.status === 'settled' ? 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400' :
                        'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                      }`}>
                        {c.status}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-3">
                      {c.proNumber && <span>PRO: {c.proNumber}</span>}
                      {c.claimType && <span className="capitalize">{c.claimType.replace('_', ' ')}</span>}
                      {c.claimAmount != null && <span>${Number(c.claimAmount).toLocaleString()}</span>}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function CarrierSelector({
  value,
  onChange,
  placeholder = 'Search or select a carrier...',
}: {
  value: string;
  onChange: (scac: string, carrier?: CarrierOption) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  const { data: carriers = [] } = useQuery({
    queryKey: ['carriers-selector', search],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '25' });
      if (search.trim()) params.set('search', search.trim());
      const res = await get<any>(`/carriers?${params}`);
      return (res?.data || res || []) as CarrierOption[];
    },
    staleTime: 30_000,
  });

  const selected = carriers.find((c) => c.scacCode === value);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} className="relative flex-1">
      <div
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm cursor-pointer hover:border-primary-300 dark:hover:border-primary-500/40 transition-colors"
      >
        {selected ? (
          <span className="flex-1 truncate">
            <span className="font-semibold">{selected.name}</span>
            <span className="text-slate-400 ml-2 font-mono">{selected.scacCode}</span>
          </span>
        ) : value ? (
          <span className="flex-1 font-mono uppercase">{value}</span>
        ) : (
          <span className="flex-1 text-slate-400">{placeholder}</span>
        )}
        {value ? (
          <button onClick={(e) => { e.stopPropagation(); onChange(''); }} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-400" />
        )}
      </div>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden">
          <div className="p-2 border-b border-slate-100 dark:border-slate-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search carrier name or SCAC..."
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
                autoFocus
              />
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {carriers.length === 0 ? (
              <div className="p-4 text-center text-sm text-slate-400">No carriers found</div>
            ) : (
              carriers.map((c) => (
                <button
                  key={c.id}
                  onClick={() => { onChange(c.scacCode || c.name, c); setOpen(false); }}
                  className={`w-full text-left px-3 py-2.5 text-sm hover:bg-primary-50 dark:hover:bg-primary-500/10 transition-colors ${c.scacCode === value ? 'bg-primary-50 dark:bg-primary-500/10' : ''}`}
                >
                  <span className="font-medium text-slate-900 dark:text-white">{c.name}</span>
                  {c.scacCode && <span className="text-xs text-slate-400 ml-2 font-mono">{c.scacCode}</span>}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
