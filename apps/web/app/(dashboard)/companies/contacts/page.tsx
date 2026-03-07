'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getList, post, put, del } from '@/lib/api-client';
import { TableSkeleton, EmptyState } from '@/components/ui/loading';
import { cn } from '@/lib/utils';
import {
  Users, Search, Plus, Edit2, Trash2,
  Mail, Download, X, Save,
} from 'lucide-react';
import { toast } from 'sonner';

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  title?: string;
  companyName?: string;
  companyType?: 'customer' | 'carrier' | 'insurance';
  isPrimary?: boolean;
  customerId?: string;
}

interface Customer {
  id: string;
  name: string;
}

const emptyContact = { id: '', firstName: '', lastName: '', email: '', phone: '', title: '', customerId: '' };

export default function AllContactsPage() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Contact | null>(null);
  const [formData, setFormData] = useState<Partial<Contact> & { customerId?: string }>(emptyContact);
  const queryClient = useQueryClient();

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => getList<Contact>('/customers/contacts'),
  });

  const { data: customersData } = useQuery({
    queryKey: ['customers'],
    queryFn: () => getList<Customer>('/customers', { params: { limit: 100 } }),
  });
  const customers = customersData ?? [];

  const createMutation = useMutation({
    mutationFn: (data: { customerId: string; firstName: string; lastName: string; email?: string; phone?: string; title?: string }) =>
      post(`/customers/${data.customerId}/contacts`, { firstName: data.firstName, lastName: data.lastName, email: data.email, phone: data.phone, title: data.title }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.success('Contact added');
      setShowCreate(false);
      setFormData(emptyContact);
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to add contact'),
  });

  const updateMutation = useMutation({
    mutationFn: (c: Contact) =>
      put(`/customers/${c.customerId}/contacts/${c.id}`, { firstName: c.firstName, lastName: c.lastName, email: c.email, phone: c.phone, title: c.title }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.success('Contact updated');
      setEditing(null);
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to update contact'),
  });

  const deleteMutation = useMutation({
    mutationFn: (c: Contact) =>
      del(`/customers/${c.customerId}/contacts/${c.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.success('Contact deleted');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to delete contact'),
  });

  const handleExport = () => {
    const headers = ['First Name', 'Last Name', 'Email', 'Phone', 'Title', 'Company'];
    const rows = filtered.map(c => [c.firstName, c.lastName, c.email, c.phone || '', c.title || '', c.companyName]);
    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contacts-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Exported to CSV');
  };

  const filtered = contacts.filter(c => {
    const matchesSearch = `${c.firstName} ${c.lastName} ${c.email} ${c.companyName}`.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'all' || c.companyType === typeFilter;
    return matchesSearch && matchesType;
  });

  const formContact = editing ?? (showCreate ? { ...emptyContact, ...formData } : null);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><Users className="w-6 h-6 text-primary-500" /> All Contacts</h1>
            <p className="text-sm text-slate-500 mt-0.5">Loading contacts...</p>
          </div>
        </div>
        <TableSkeleton rows={5} cols={5} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2"><Users className="w-6 h-6 text-primary-500" /> All Contacts</h1>
          <p className="text-sm text-slate-500 mt-0.5">{contacts.length} contacts across all companies</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} className="flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800"><Download className="w-4 h-4" /> Export</button>
          <button onClick={() => { setShowCreate(true); setEditing(null); setFormData(emptyContact); }} className="flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-semibold"><Plus className="w-4 h-4" /> Add Contact</button>
        </div>
      </div>

      {formContact && (
        <div className="card p-5 border-2 border-primary-200 dark:border-primary-500/30 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-900 dark:text-white">{editing ? 'Edit' : 'Add'} Contact</h3>
            <button onClick={() => { setShowCreate(false); setEditing(null); }}><X className="w-4 h-4 text-slate-400" /></button>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <input type="text" value={formContact.firstName} onChange={(e) => editing ? setEditing({ ...formContact, firstName: e.target.value }) : setFormData(d => ({ ...d, firstName: e.target.value }))} placeholder="First Name" className="px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
            <input type="text" value={formContact.lastName} onChange={(e) => editing ? setEditing({ ...formContact, lastName: e.target.value }) : setFormData(d => ({ ...d, lastName: e.target.value }))} placeholder="Last Name" className="px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
            <input type="email" value={formContact.email || ''} onChange={(e) => editing ? setEditing({ ...formContact, email: e.target.value }) : setFormData(d => ({ ...d, email: e.target.value }))} placeholder="Email" className="px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
            <input type="tel" value={formContact.phone || ''} onChange={(e) => editing ? setEditing({ ...formContact, phone: e.target.value }) : setFormData(d => ({ ...d, phone: e.target.value }))} placeholder="Phone" className="px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
            <input type="text" value={formContact.title || ''} onChange={(e) => editing ? setEditing({ ...formContact, title: e.target.value }) : setFormData(d => ({ ...d, title: e.target.value }))} placeholder="Title" className="px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
            {!editing && (
              <select value={(formContact as { customerId?: string }).customerId || ''} onChange={(e) => setFormData(d => ({ ...d, customerId: e.target.value }))} className="px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600">
                <option value="">Select company...</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => { setShowCreate(false); setEditing(null); }} className="px-4 py-2 text-sm text-slate-500">Cancel</button>
            <button
              onClick={() => {
                if (editing) {
                  updateMutation.mutate({ ...formContact, customerId: formContact.customerId || '' } as Contact);
                } else {
                  const customerId = (formContact as { customerId?: string }).customerId;
                  if (!customerId) { toast.error('Select a company'); return; }
                  createMutation.mutate({
                    customerId,
                    firstName: formContact.firstName,
                    lastName: formContact.lastName,
                    email: formContact.email || undefined,
                    phone: formContact.phone || undefined,
                    title: formContact.title || undefined,
                  });
                }
              }}
              disabled={createMutation.isPending || updateMutation.isPending || !formContact.firstName || !formContact.lastName}
              className="bg-primary-500 hover:bg-primary-600 text-white px-5 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
            ><Save className="w-4 h-4 inline mr-1" /> Save</button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, email, company..." className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
        </div>
        <div className="flex gap-1.5">
          {[{ key: 'all', label: 'All' }, { key: 'customer', label: 'Customer' }, { key: 'carrier', label: 'Carrier' }, { key: 'insurance', label: 'Insurance' }].map(f => (
            <button key={f.key} onClick={() => setTypeFilter(f.key)} className={cn('px-3 py-1.5 rounded-lg text-xs font-medium border transition-all', typeFilter === f.key ? 'bg-primary-50 border-primary-200 text-primary-700 dark:bg-primary-500/10 dark:border-primary-500/30 dark:text-primary-400' : 'border-slate-200 dark:border-slate-700 text-slate-500')}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {contacts.length === 0 && !formContact ? (
        <EmptyState icon={Users} title="No contacts yet" description="Add your first contact to manage company relationships." />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Name</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase hidden sm:table-cell">Email</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Company</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase hidden lg:table-cell">Title</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-xs font-bold text-primary-600">{c.firstName[0]}{c.lastName[0]}</div>
                      <div>
                        <span className="font-medium text-slate-900 dark:text-white">{c.firstName} {c.lastName}</span>
                        {c.isPrimary && <span className="ml-1.5 text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-semibold">Primary</span>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-xs text-slate-500">{c.email}</td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <span className={cn('w-1.5 h-1.5 rounded-full', c.companyType === 'customer' ? 'bg-blue-500' : c.companyType === 'carrier' ? 'bg-purple-500' : 'bg-amber-500')} />
                      {c.companyName}
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-xs text-slate-500">{c.title || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <a href={`mailto:${c.email}`} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 inline-block"><Mail className="w-3.5 h-3.5" /></a>
                    <button onClick={() => { setEditing({ ...c, customerId: c.customerId }); setShowCreate(false); }} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => { if (confirm('Delete this contact?')) deleteMutation.mutate({ ...c, customerId: c.customerId } as Contact); }} disabled={deleteMutation.isPending} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-red-500 disabled:opacity-50"><Trash2 className="w-3.5 h-3.5" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
