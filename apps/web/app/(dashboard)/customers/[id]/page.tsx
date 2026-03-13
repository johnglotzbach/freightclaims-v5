'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { get, put, getList } from '@/lib/api-client';
import { formatDate, formatCurrency } from 'shared';
import {
  ArrowLeft, Building2, Mail, Phone, Globe, MapPin,
  FileText, Package, Users, Save, X, Plus, Pencil,
  Trash2, Star, ScrollText, ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type Tab = 'overview' | 'contacts' | 'addresses' | 'contracts';

interface Contact {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  title: string;
  isPrimary: boolean;
}

interface Address {
  id?: string;
  type: 'billing' | 'shipping';
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  isPrimary: boolean;
}

interface Contract {
  id: string;
  name: string;
  type: string;
  startDate: string;
  endDate: string;
  maxLiability: number;
  isActive: boolean;
}

interface Customer {
  id: string;
  name: string;
  code: string;
  email: string;
  phone: string;
  website: string;
  industry: string;
  billingEmail: string;
  planType: string;
  isActive: boolean;
  contacts: Contact[];
  addresses: Address[];
}

const TABS: { key: Tab; label: string; icon: typeof Building2 }[] = [
  { key: 'overview', label: 'Overview', icon: Building2 },
  { key: 'contacts', label: 'Contacts', icon: Users },
  { key: 'addresses', label: 'Addresses', icon: MapPin },
  { key: 'contracts', label: 'Contracts', icon: ScrollText },
];

const emptyContact = (): Contact => ({ firstName: '', lastName: '', email: '', phone: '', title: '', isPrimary: false });
const emptyAddress = (): Address => ({ type: 'shipping', street: '', city: '', state: '', zip: '', country: 'US', isPrimary: false });

export default function CustomerDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [isEditing, setIsEditing] = useState(false);

  const { data: customer, isLoading } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => get<Customer>(`/customers/${id}`),
  });

  const [form, setForm] = useState<Partial<Customer>>({});

  function startEdit() {
    if (!customer) return;
    setForm({ ...customer });
    setIsEditing(true);
  }

  function cancelEdit() {
    setForm({});
    setIsEditing(false);
  }

  const updateMutation = useMutation({
    mutationFn: (data: Partial<Customer>) => put(`/customers/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', id] });
      setIsEditing(false);
      toast.success('Customer updated');
    },
    onError: () => toast.error('Failed to update customer'),
  });

  function handleSave() {
    updateMutation.mutate(form);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-3 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-16">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Customer Not Found</h2>
        <p className="text-slate-500 mt-2">This customer may have been removed or you don&apos;t have access.</p>
        <Link href="/customers" className="text-primary-500 hover:underline mt-4 inline-block">Back to Customers</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <Link href="/customers" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-500" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{customer.name || 'Customer'}</h1>
          {customer.code && <p className="text-slate-500 text-sm font-mono">{customer.code}</p>}
        </div>
        <span className={cn('px-3 py-1 rounded-full text-xs font-medium', customer.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600')}>
          {customer.isActive ? 'Active' : 'Inactive'}
        </span>
        {!isEditing && (
          <button onClick={startEdit} className="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
            <Pencil className="w-4 h-4" /> Edit
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-700">
        <nav className="flex gap-6">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-colors',
                activeTab === tab.key
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300',
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'overview' && (
        <OverviewTab
          customer={customer}
          form={form}
          isEditing={isEditing}
          onChange={(field, value) => setForm((prev) => ({ ...prev, [field]: value }))}
        />
      )}
      {activeTab === 'contacts' && (
        <ContactsTab
          contacts={isEditing ? (form.contacts || []) : (customer.contacts || [])}
          isEditing={isEditing}
          onChange={(contacts) => setForm((prev) => ({ ...prev, contacts }))}
        />
      )}
      {activeTab === 'addresses' && (
        <AddressesTab
          addresses={isEditing ? (form.addresses || []) : (customer.addresses || [])}
          isEditing={isEditing}
          onChange={(addresses) => setForm((prev) => ({ ...prev, addresses }))}
        />
      )}
      {activeTab === 'contracts' && <ContractsTab customerId={id as string} />}

      {isEditing && (
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
          <button onClick={cancelEdit} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors">
            <X className="w-4 h-4" /> Cancel
          </button>
          <button onClick={handleSave} disabled={updateMutation.isPending} className="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors">
            <Save className="w-4 h-4" />
            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      )}

      {/* Quick Actions sidebar (below tabs on detail) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Quick Actions</h3>
          <div className="space-y-2">
            <Link href={`/claims/new?customerId=${id}`} className="flex items-center gap-2 text-sm text-primary-500 hover:text-primary-600 py-1.5">
              <FileText className="w-4 h-4" /> File New Claim
            </Link>
            <Link href={`/shipments/new?customerId=${id}`} className="flex items-center gap-2 text-sm text-primary-500 hover:text-primary-600 py-1.5">
              <Package className="w-4 h-4" /> Add Shipment
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Overview Tab ---------- */

function OverviewTab({ customer, form, isEditing, onChange }: {
  customer: Customer;
  form: Partial<Customer>;
  isEditing: boolean;
  onChange: (field: string, value: string) => void;
}) {
  const val = (field: keyof Customer) => (isEditing ? (form[field] as string) ?? '' : (customer[field] as string) ?? '');

  const Field = ({ label, field, type = 'text' }: { label: string; field: keyof Customer; type?: string }) => (
    <div>
      <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">{label}</p>
      {isEditing ? (
        <input
          type={type}
          value={val(field)}
          onChange={(e) => onChange(field, e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white text-sm"
        />
      ) : (
        <p className="text-slate-900 dark:text-white font-medium text-sm">
          {val(field) || '—'}
        </p>
      )}
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="card p-6 md:col-span-2">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="w-5 h-5 text-primary-500" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Company Information</h2>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Company Name" field="name" />
          <Field label="Company Code" field="code" />
          <Field label="Email" field="email" type="email" />
          <Field label="Phone" field="phone" type="tel" />
          <Field label="Website" field="website" type="url" />
          <Field label="Industry" field="industry" />
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Mail className="w-5 h-5 text-primary-500" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Billing</h2>
        </div>
        <div className="space-y-4">
          <Field label="Billing Email" field="billingEmail" type="email" />
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <ScrollText className="w-5 h-5 text-primary-500" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Plan</h2>
        </div>
        <div className="space-y-4">
          <div>
            <p className="text-slate-400 text-xs uppercase tracking-wider mb-1">Plan Type</p>
            {isEditing ? (
              <select
                value={val('planType')}
                onChange={(e) => onChange('planType', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white text-sm"
              >
                <option value="">Select plan</option>
                <option value="starter">Starter</option>
                <option value="team">Team</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            ) : (
              <p className="text-slate-900 dark:text-white font-medium text-sm capitalize">{val('planType') || '—'}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Contacts Tab ---------- */

function ContactsTab({ contacts, isEditing, onChange }: {
  contacts: Contact[];
  isEditing: boolean;
  onChange: (contacts: Contact[]) => void;
}) {
  const [showNew, setShowNew] = useState(false);
  const [newContact, setNewContact] = useState<Contact>(emptyContact());
  const [editIdx, setEditIdx] = useState<number | null>(null);

  function addContact() {
    if (!newContact.firstName || !newContact.email) {
      toast.error('First name and email are required');
      return;
    }
    onChange([...contacts, { ...newContact }]);
    setNewContact(emptyContact());
    setShowNew(false);
  }

  function updateContact(idx: number, field: keyof Contact, value: string | boolean) {
    const updated = contacts.map((c, i) => (i === idx ? { ...c, [field]: value } : c));
    onChange(updated);
  }

  function deleteContact(idx: number) {
    onChange(contacts.filter((_, i) => i !== idx));
  }

  return (
    <div className="card overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
        <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <Users className="w-4 h-4 text-primary-500" /> Contacts
        </h3>
        {isEditing && (
          <button onClick={() => setShowNew(!showNew)} className="inline-flex items-center gap-1 text-sm font-medium text-primary-500 hover:text-primary-600">
            <Plus className="w-4 h-4" /> New Contact
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
              <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Email</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Phone</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Title</th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Primary</th>
              {isEditing && <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {contacts.length === 0 && (
              <tr>
                <td colSpan={isEditing ? 6 : 5} className="px-4 py-8 text-center text-slate-400 text-sm">No contacts yet</td>
              </tr>
            )}
            {contacts.map((c, idx) => (
              <tr key={c.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                {editIdx === idx && isEditing ? (
                  <>
                    <td className="px-4 py-2">
                      <div className="flex gap-1">
                        <input value={c.firstName} onChange={(e) => updateContact(idx, 'firstName', e.target.value)} className="w-20 px-2 py-1 border rounded text-sm dark:bg-slate-700 dark:border-slate-600" placeholder="First" />
                        <input value={c.lastName} onChange={(e) => updateContact(idx, 'lastName', e.target.value)} className="w-20 px-2 py-1 border rounded text-sm dark:bg-slate-700 dark:border-slate-600" placeholder="Last" />
                      </div>
                    </td>
                    <td className="px-4 py-2"><input value={c.email} onChange={(e) => updateContact(idx, 'email', e.target.value)} className="w-full px-2 py-1 border rounded text-sm dark:bg-slate-700 dark:border-slate-600" /></td>
                    <td className="px-4 py-2"><input value={c.phone} onChange={(e) => updateContact(idx, 'phone', e.target.value)} className="w-full px-2 py-1 border rounded text-sm dark:bg-slate-700 dark:border-slate-600" /></td>
                    <td className="px-4 py-2"><input value={c.title} onChange={(e) => updateContact(idx, 'title', e.target.value)} className="w-full px-2 py-1 border rounded text-sm dark:bg-slate-700 dark:border-slate-600" /></td>
                    <td className="px-4 py-2 text-center">
                      <input type="checkbox" checked={c.isPrimary} onChange={(e) => updateContact(idx, 'isPrimary', e.target.checked)} />
                    </td>
                    <td className="px-4 py-2 text-center">
                      <button onClick={() => setEditIdx(null)} className="text-xs text-primary-500 font-medium">Done</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3 font-medium text-slate-900 dark:text-white whitespace-nowrap">{c.firstName} {c.lastName}</td>
                    <td className="px-4 py-3 text-slate-500">{c.email}</td>
                    <td className="px-4 py-3 text-slate-500">{c.phone || '—'}</td>
                    <td className="px-4 py-3 text-slate-500">{c.title || '—'}</td>
                    <td className="px-4 py-3 text-center">
                      {c.isPrimary && <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-full"><Star className="w-3 h-3" /> Primary</span>}
                    </td>
                    {isEditing && (
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => setEditIdx(idx)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-blue-500"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => deleteContact(idx)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    )}
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showNew && isEditing && (
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 space-y-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">New Contact</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <input placeholder="First Name *" value={newContact.firstName} onChange={(e) => setNewContact({ ...newContact, firstName: e.target.value })} className="px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
            <input placeholder="Last Name" value={newContact.lastName} onChange={(e) => setNewContact({ ...newContact, lastName: e.target.value })} className="px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
            <input placeholder="Email *" type="email" value={newContact.email} onChange={(e) => setNewContact({ ...newContact, email: e.target.value })} className="px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
            <input placeholder="Phone" value={newContact.phone} onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })} className="px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
            <input placeholder="Title" value={newContact.title} onChange={(e) => setNewContact({ ...newContact, title: e.target.value })} className="px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <input type="checkbox" checked={newContact.isPrimary} onChange={(e) => setNewContact({ ...newContact, isPrimary: e.target.checked })} />
              Primary Contact
            </label>
          </div>
          <div className="flex gap-2">
            <button onClick={addContact} className="bg-primary-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors">Add Contact</button>
            <button onClick={() => { setShowNew(false); setNewContact(emptyContact()); }} className="px-4 py-2 border rounded-lg text-sm text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Addresses Tab ---------- */

function AddressesTab({ addresses, isEditing, onChange }: {
  addresses: Address[];
  isEditing: boolean;
  onChange: (addresses: Address[]) => void;
}) {
  const [showNew, setShowNew] = useState(false);
  const [newAddr, setNewAddr] = useState<Address>(emptyAddress());
  const [editIdx, setEditIdx] = useState<number | null>(null);

  function addAddress() {
    if (!newAddr.street || !newAddr.city) {
      toast.error('Street and city are required');
      return;
    }
    onChange([...addresses, { ...newAddr }]);
    setNewAddr(emptyAddress());
    setShowNew(false);
  }

  function updateAddress(idx: number, field: keyof Address, value: string | boolean) {
    const updated = addresses.map((a, i) => (i === idx ? { ...a, [field]: value } : a));
    onChange(updated);
  }

  function deleteAddress(idx: number) {
    onChange(addresses.filter((_, i) => i !== idx));
  }

  return (
    <div className="card overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
        <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary-500" /> Addresses
        </h3>
        {isEditing && (
          <button onClick={() => setShowNew(!showNew)} className="inline-flex items-center gap-1 text-sm font-medium text-primary-500 hover:text-primary-600">
            <Plus className="w-4 h-4" /> New Address
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
              <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Street</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">City</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">State</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">ZIP</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Country</th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Primary</th>
              {isEditing && <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {addresses.length === 0 && (
              <tr>
                <td colSpan={isEditing ? 8 : 7} className="px-4 py-8 text-center text-slate-400 text-sm">No addresses yet</td>
              </tr>
            )}
            {addresses.map((a, idx) => (
              <tr key={a.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                {editIdx === idx && isEditing ? (
                  <>
                    <td className="px-4 py-2">
                      <select value={a.type} onChange={(e) => updateAddress(idx, 'type', e.target.value)} className="px-2 py-1 border rounded text-sm dark:bg-slate-700 dark:border-slate-600">
                        <option value="billing">Billing</option>
                        <option value="shipping">Shipping</option>
                      </select>
                    </td>
                    <td className="px-4 py-2"><input value={a.street} onChange={(e) => updateAddress(idx, 'street', e.target.value)} className="w-full px-2 py-1 border rounded text-sm dark:bg-slate-700 dark:border-slate-600" /></td>
                    <td className="px-4 py-2"><input value={a.city} onChange={(e) => updateAddress(idx, 'city', e.target.value)} className="w-full px-2 py-1 border rounded text-sm dark:bg-slate-700 dark:border-slate-600" /></td>
                    <td className="px-4 py-2"><input value={a.state} onChange={(e) => updateAddress(idx, 'state', e.target.value)} className="w-16 px-2 py-1 border rounded text-sm dark:bg-slate-700 dark:border-slate-600" /></td>
                    <td className="px-4 py-2"><input value={a.zip} onChange={(e) => updateAddress(idx, 'zip', e.target.value)} className="w-20 px-2 py-1 border rounded text-sm dark:bg-slate-700 dark:border-slate-600" /></td>
                    <td className="px-4 py-2"><input value={a.country} onChange={(e) => updateAddress(idx, 'country', e.target.value)} className="w-16 px-2 py-1 border rounded text-sm dark:bg-slate-700 dark:border-slate-600" /></td>
                    <td className="px-4 py-2 text-center"><input type="checkbox" checked={a.isPrimary} onChange={(e) => updateAddress(idx, 'isPrimary', e.target.checked)} /></td>
                    <td className="px-4 py-2 text-center"><button onClick={() => setEditIdx(null)} className="text-xs text-primary-500 font-medium">Done</button></td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-3">
                      <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', a.type === 'billing' ? 'bg-violet-100 text-violet-700 dark:bg-violet-500/10 dark:text-violet-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400')}>
                        {a.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-900 dark:text-white">{a.street}</td>
                    <td className="px-4 py-3 text-slate-500">{a.city}</td>
                    <td className="px-4 py-3 text-slate-500">{a.state}</td>
                    <td className="px-4 py-3 text-slate-500 font-mono">{a.zip}</td>
                    <td className="px-4 py-3 text-slate-500">{a.country}</td>
                    <td className="px-4 py-3 text-center">
                      {a.isPrimary && <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-full"><Star className="w-3 h-3" /> Primary</span>}
                    </td>
                    {isEditing && (
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => setEditIdx(idx)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-blue-500"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => deleteAddress(idx)} className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    )}
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showNew && isEditing && (
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 space-y-3">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">New Address</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <select value={newAddr.type} onChange={(e) => setNewAddr({ ...newAddr, type: e.target.value as 'billing' | 'shipping' })} className="px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600">
              <option value="shipping">Shipping</option>
              <option value="billing">Billing</option>
            </select>
            <input placeholder="Street *" value={newAddr.street} onChange={(e) => setNewAddr({ ...newAddr, street: e.target.value })} className="px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600 md:col-span-2" />
            <input placeholder="City *" value={newAddr.city} onChange={(e) => setNewAddr({ ...newAddr, city: e.target.value })} className="px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
            <input placeholder="State" maxLength={2} value={newAddr.state} onChange={(e) => setNewAddr({ ...newAddr, state: e.target.value.toUpperCase() })} className="px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
            <input placeholder="ZIP" value={newAddr.zip} onChange={(e) => setNewAddr({ ...newAddr, zip: e.target.value })} className="px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
            <input placeholder="Country" value={newAddr.country} onChange={(e) => setNewAddr({ ...newAddr, country: e.target.value })} className="px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
            <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
              <input type="checkbox" checked={newAddr.isPrimary} onChange={(e) => setNewAddr({ ...newAddr, isPrimary: e.target.checked })} />
              Primary Address
            </label>
          </div>
          <div className="flex gap-2">
            <button onClick={addAddress} className="bg-primary-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors">Add Address</button>
            <button onClick={() => { setShowNew(false); setNewAddr(emptyAddress()); }} className="px-4 py-2 border rounded-lg text-sm text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Contracts Tab ---------- */

function ContractsTab({ customerId }: { customerId: string }) {
  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ['customer-contracts', customerId],
    queryFn: () => getList<Contract>(`/contracts?customerId=${customerId}`),
  });

  if (isLoading) {
    return (
      <div className="card p-8 text-center">
        <div className="w-6 h-6 border-2 border-primary-200 border-t-primary-500 rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  if (contracts.length === 0) {
    return (
      <div className="card p-8 text-center">
        <ScrollText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <p className="text-sm text-slate-400">No contracts found for this customer</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {contracts.map((contract) => (
        <div key={contract.id} className="card p-5 flex items-center justify-between hover:border-primary-200 dark:hover:border-primary-800 transition-colors">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold text-slate-900 dark:text-white truncate">{contract.name}</h4>
              {contract.isActive ? (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">Active</span>
              ) : (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">Expired</span>
              )}
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span className="capitalize">{contract.type}</span>
              <span>{formatDate(contract.startDate)} — {formatDate(contract.endDate)}</span>
              {contract.maxLiability > 0 && <span>Max Liability: {formatCurrency(contract.maxLiability)}</span>}
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
        </div>
      ))}
    </div>
  );
}
