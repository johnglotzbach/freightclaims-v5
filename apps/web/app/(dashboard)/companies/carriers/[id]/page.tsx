'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, put, post, del } from '@/lib/api-client';
import { toast } from 'sonner';
import { useRouter, useParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { TableSkeleton } from '@/components/ui/loading';
import {
  ArrowLeft, Truck, Save, X, Plus, Edit2, Trash2,
  Building2, Users, Globe, Phone, Mail, MapPin, Check,
} from 'lucide-react';

interface Contact {
  id: string;
  title?: string;
  firstName?: string;
  lastName?: string;
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  email?: string;
  phone?: string;
  department?: string;
}

interface CarrierDetail {
  id: string;
  name: string;
  scacCode?: string;
  dotNumber?: string;
  mcNumber?: string;
  email?: string;
  phone?: string;
  website?: string;
  isActive?: boolean;
  isInternational?: boolean;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  capacityType?: string;
  contacts?: Contact[];
}

const EMPTY_CONTACT: Omit<Contact, 'id'> = {
  title: '', firstName: '', lastName: '', address: '',
  city: '', state: '', zip: '', email: '', phone: '', department: '',
};

export default function CarrierDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'overview' | 'contacts'>('overview');
  const [editForm, setEditForm] = useState<Partial<CarrierDetail> | null>(null);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [contactForm, setContactForm] = useState<Omit<Contact, 'id'>>(EMPTY_CONTACT);
  const [showNewContact, setShowNewContact] = useState(false);

  const { data: carrier, isLoading } = useQuery({
    queryKey: ['carrier', id],
    queryFn: () => get<CarrierDetail>(`/carriers/${id}`),
    enabled: !!id,
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<CarrierDetail>) => put(`/carriers/${id}`, data),
    onSuccess: () => {
      toast.success('Carrier updated');
      setEditForm(null);
      queryClient.invalidateQueries({ queryKey: ['carrier', id] });
      queryClient.invalidateQueries({ queryKey: ['carriers'] });
    },
    onError: () => toast.error('Failed to update carrier'),
  });

  const createContactMutation = useMutation({
    mutationFn: (data: Omit<Contact, 'id'>) => post(`/carriers/${id}/contacts`, data),
    onSuccess: () => {
      toast.success('Contact added');
      setShowNewContact(false);
      setContactForm(EMPTY_CONTACT);
      queryClient.invalidateQueries({ queryKey: ['carrier', id] });
    },
    onError: () => toast.error('Failed to add contact'),
  });

  const updateContactMutation = useMutation({
    mutationFn: ({ contactId, data }: { contactId: string; data: Omit<Contact, 'id'> }) =>
      put(`/carriers/${id}/contacts/${contactId}`, data),
    onSuccess: () => {
      toast.success('Contact updated');
      setEditingContactId(null);
      setContactForm(EMPTY_CONTACT);
      queryClient.invalidateQueries({ queryKey: ['carrier', id] });
    },
    onError: () => toast.error('Failed to update contact'),
  });

  const deleteContactMutation = useMutation({
    mutationFn: (contactId: string) => del(`/carriers/${id}/contacts/${contactId}`),
    onSuccess: () => {
      toast.success('Contact deleted');
      queryClient.invalidateQueries({ queryKey: ['carrier', id] });
    },
    onError: () => toast.error('Failed to delete contact'),
  });

  function startEditing() {
    if (!carrier) return;
    setEditForm({
      name: carrier.name,
      scacCode: carrier.scacCode || '',
      dotNumber: carrier.dotNumber || '',
      mcNumber: carrier.mcNumber || '',
      email: carrier.email || '',
      phone: carrier.phone || '',
      website: carrier.website || '',
      address: carrier.address || '',
      city: carrier.city || '',
      state: carrier.state || '',
      zip: carrier.zip || '',
      capacityType: carrier.capacityType || '',
      isInternational: carrier.isInternational || false,
      isActive: carrier.isActive !== false,
    });
  }

  function startEditingContact(contact: Contact) {
    setEditingContactId(contact.id);
    setContactForm({
      title: contact.title || '',
      firstName: contact.firstName || '',
      lastName: contact.lastName || '',
      address: contact.address || '',
      city: contact.city || '',
      state: contact.state || '',
      zip: contact.zip || '',
      email: contact.email || '',
      phone: contact.phone || '',
      department: contact.department || '',
    });
  }

  if (isLoading) return <div className="space-y-6"><TableSkeleton /></div>;
  if (!carrier) {
    return (
      <div className="text-center py-16">
        <Truck className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Carrier not found</h2>
        <button onClick={() => router.push('/companies/carriers')} className="mt-4 text-primary-500 hover:text-primary-600 text-sm font-medium">
          Back to Carriers
        </button>
      </div>
    );
  }

  const contacts = carrier.contacts || [];
  const isEditing = editForm !== null;
  const form = editForm || carrier;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/companies/carriers')} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-500" />
          </button>
          <div className="w-10 h-10 rounded-xl bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center">
            <Truck className="w-5 h-5 text-primary-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">{carrier.name}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              {carrier.scacCode && <span className="font-mono text-xs font-semibold text-slate-500">{carrier.scacCode}</span>}
              {carrier.isActive !== false ? (
                <span className="text-[9px] font-bold bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 px-1.5 py-0.5 rounded">ACTIVE</span>
              ) : (
                <span className="text-[9px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded">INACTIVE</span>
              )}
              {carrier.isInternational && <span className="text-[9px] font-bold bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 px-1.5 py-0.5 rounded">INTL</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <button
                onClick={() => setEditForm(null)}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" /> Cancel
              </button>
              <button
                onClick={() => { if (editForm) updateMutation.mutate(editForm); }}
                disabled={updateMutation.isPending}
                className="flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors"
              >
                <Save className="w-4 h-4" /> {updateMutation.isPending ? 'Saving...' : 'Update Capacity Provider'}
              </button>
            </>
          ) : (
            <button
              onClick={startEditing}
              className="flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            >
              <Edit2 className="w-4 h-4" /> Edit Carrier
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-700">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('overview')}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
              activeTab === 'overview'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            )}
          >
            <Building2 className="w-4 h-4" /> Overview
          </button>
          <button
            onClick={() => setActiveTab('contacts')}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px',
              activeTab === 'contacts'
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            )}
          >
            <Users className="w-4 h-4" /> Contacts
            {contacts.length > 0 && (
              <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-700 text-slate-500 px-1.5 py-0.5 rounded-full">{contacts.length}</span>
            )}
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="card p-6">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-5">Company Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
            <FormField
              label="Carrier Name"
              value={form.name || ''}
              editing={isEditing}
              onChange={v => setEditForm(prev => prev ? { ...prev, name: v } : prev)}
              required
            />
            <FormField
              label="SCAC Code"
              value={form.scacCode || ''}
              editing={isEditing}
              onChange={v => setEditForm(prev => prev ? { ...prev, scacCode: v } : prev)}
              mono
            />
            <FormField
              label="DOT Number"
              value={form.dotNumber || ''}
              editing={isEditing}
              onChange={v => setEditForm(prev => prev ? { ...prev, dotNumber: v } : prev)}
              mono
            />
            <FormField
              label="MC Number"
              value={form.mcNumber || ''}
              editing={isEditing}
              onChange={v => setEditForm(prev => prev ? { ...prev, mcNumber: v } : prev)}
              mono
            />

            <div className="md:col-span-2">
              <div className="border-t border-slate-100 dark:border-slate-700 my-2" />
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4 mt-4">Address</h4>
            </div>

            <div className="md:col-span-2">
              <FormField
                label="Street Address"
                value={form.address || ''}
                editing={isEditing}
                onChange={v => setEditForm(prev => prev ? { ...prev, address: v } : prev)}
              />
            </div>
            <FormField
              label="City"
              value={form.city || ''}
              editing={isEditing}
              onChange={v => setEditForm(prev => prev ? { ...prev, city: v } : prev)}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                label="State"
                value={form.state || ''}
                editing={isEditing}
                onChange={v => setEditForm(prev => prev ? { ...prev, state: v } : prev)}
              />
              <FormField
                label="ZIP Code"
                value={form.zip || ''}
                editing={isEditing}
                onChange={v => setEditForm(prev => prev ? { ...prev, zip: v } : prev)}
              />
            </div>

            <div className="md:col-span-2">
              <div className="border-t border-slate-100 dark:border-slate-700 my-2" />
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4 mt-4">Contact & Details</h4>
            </div>

            <FormField
              label="Email"
              value={form.email || ''}
              editing={isEditing}
              onChange={v => setEditForm(prev => prev ? { ...prev, email: v } : prev)}
              type="email"
            />
            <FormField
              label="Phone"
              value={form.phone || ''}
              editing={isEditing}
              onChange={v => setEditForm(prev => prev ? { ...prev, phone: v } : prev)}
              type="tel"
            />
            <FormField
              label="Website"
              value={form.website || ''}
              editing={isEditing}
              onChange={v => setEditForm(prev => prev ? { ...prev, website: v } : prev)}
            />
            <FormField
              label="Capacity Type"
              value={form.capacityType || ''}
              editing={isEditing}
              onChange={v => setEditForm(prev => prev ? { ...prev, capacityType: v } : prev)}
            />

            {isEditing && (
              <div className="md:col-span-2 flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm?.isInternational || false}
                    onChange={e => setEditForm(prev => prev ? { ...prev, isInternational: e.target.checked } : prev)}
                    className="rounded border-slate-300 text-primary-500"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">International Carrier</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm?.isActive !== false}
                    onChange={e => setEditForm(prev => prev ? { ...prev, isActive: e.target.checked } : prev)}
                    className="rounded border-slate-300 text-primary-500"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">Active</span>
                </label>
              </div>
            )}
            {!isEditing && (
              <div className="md:col-span-2 flex items-center gap-4 pt-2">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-600 dark:text-slate-400">
                    {carrier.isInternational ? 'International' : 'Domestic'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'contacts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-900 dark:text-white">Contacts ({contacts.length})</h3>
            <button
              onClick={() => { setShowNewContact(true); setContactForm(EMPTY_CONTACT); }}
              className="flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-white px-3 py-2 rounded-lg text-sm font-semibold transition-colors"
            >
              <Plus className="w-4 h-4" /> New Contact
            </button>
          </div>

          {showNewContact && (
            <div className="card p-4 border-2 border-primary-200 dark:border-primary-500/30">
              <h4 className="font-semibold text-slate-900 dark:text-white text-sm mb-4">Add New Contact</h4>
              <ContactFormGrid form={contactForm} onChange={setContactForm} />
              <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-700">
                <button onClick={() => setShowNewContact(false)} className="px-3 py-1.5 text-sm text-slate-500 hover:text-slate-700">Cancel</button>
                <button
                  onClick={() => createContactMutation.mutate(contactForm)}
                  disabled={createContactMutation.isPending}
                  className="flex items-center gap-1 bg-primary-500 hover:bg-primary-600 text-white px-3 py-1.5 rounded-lg text-sm font-semibold disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" /> {createContactMutation.isPending ? 'Adding...' : 'Add Contact'}
                </button>
              </div>
            </div>
          )}

          {contacts.length === 0 && !showNewContact ? (
            <div className="card p-12 text-center">
              <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm text-slate-500 font-medium">No contacts on file</p>
              <p className="text-xs text-slate-400 mt-1">Add contacts to keep track of key people at this carrier.</p>
            </div>
          ) : (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-700">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Title</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Name</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Address</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">City / State / Zip</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Email</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden lg:table-cell">Phone</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase hidden lg:table-cell">Dept</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                    {contacts.map(contact => {
                      const isEditingThis = editingContactId === contact.id;
                      const displayName = contact.name || [contact.firstName, contact.lastName].filter(Boolean).join(' ') || '—';
                      if (isEditingThis) {
                        return (
                          <tr key={contact.id} className="bg-primary-50/30 dark:bg-primary-500/5">
                            <td colSpan={8} className="p-4">
                              <ContactFormGrid form={contactForm} onChange={setContactForm} />
                              <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                                <button onClick={() => setEditingContactId(null)} className="px-3 py-1.5 text-sm text-slate-500 hover:text-slate-700">Cancel</button>
                                <button
                                  onClick={() => updateContactMutation.mutate({ contactId: contact.id, data: contactForm })}
                                  disabled={updateContactMutation.isPending}
                                  className="flex items-center gap-1 bg-primary-500 hover:bg-primary-600 text-white px-3 py-1.5 rounded-lg text-sm font-semibold disabled:opacity-50"
                                >
                                  <Check className="w-3.5 h-3.5" /> {updateContactMutation.isPending ? 'Saving...' : 'Save'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      }
                      return (
                        <tr key={contact.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                          <td className="px-4 py-3 text-slate-500">{contact.title || '—'}</td>
                          <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{displayName}</td>
                          <td className="px-4 py-3 text-slate-500 hidden md:table-cell">{contact.address || '—'}</td>
                          <td className="px-4 py-3 text-slate-500 hidden md:table-cell">
                            {[contact.city, contact.state, contact.zip].filter(Boolean).join(', ') || '—'}
                          </td>
                          <td className="px-4 py-3">
                            {contact.email ? (
                              <a href={`mailto:${contact.email}`} className="text-primary-500 hover:text-primary-600 hover:underline">{contact.email}</a>
                            ) : '—'}
                          </td>
                          <td className="px-4 py-3 text-slate-500 hidden lg:table-cell">{contact.phone || '—'}</td>
                          <td className="px-4 py-3 text-slate-500 hidden lg:table-cell">{contact.department || '—'}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => startEditingContact(contact)}
                                className="p-1.5 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-500/10 text-slate-400 hover:text-primary-500 transition-colors"
                                title="Edit contact"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => { if (window.confirm('Delete this contact?')) deleteContactMutation.mutate(contact.id); }}
                                className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-slate-400 hover:text-red-500 transition-colors"
                                title="Delete contact"
                              >
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
            </div>
          )}
        </div>
      )}

      {/* Footer action bar */}
      {isEditing && (
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={() => { setEditForm(null); router.push('/companies/carriers'); }}
            className="px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => { if (editForm) updateMutation.mutate(editForm); }}
            disabled={updateMutation.isPending}
            className="flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50 transition-colors"
          >
            <Save className="w-4 h-4" /> {updateMutation.isPending ? 'Saving...' : 'Update Capacity Provider'}
          </button>
        </div>
      )}
    </div>
  );
}

function FormField({
  label,
  value,
  editing,
  onChange,
  type = 'text',
  required,
  mono,
}: {
  label: string;
  value: string;
  editing: boolean;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  mono?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
        {label}{required && editing && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {editing ? (
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          className={cn(
            'w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-sm transition-colors focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500',
            mono && 'font-mono'
          )}
        />
      ) : (
        <p className={cn('text-sm text-slate-900 dark:text-white py-2', mono && 'font-mono', !value && 'text-slate-400')}>
          {value || '—'}
        </p>
      )}
    </div>
  );
}

function ContactFormGrid({
  form,
  onChange,
}: {
  form: Omit<Contact, 'id'>;
  onChange: (f: Omit<Contact, 'id'>) => void;
}) {
  const set = (key: keyof typeof form, value: string) => onChange({ ...form, [key]: value });
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <input placeholder="Title" value={form.title || ''} onChange={e => set('title', e.target.value)} className="px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
      <input placeholder="First Name" value={form.firstName || ''} onChange={e => set('firstName', e.target.value)} className="px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
      <input placeholder="Last Name" value={form.lastName || ''} onChange={e => set('lastName', e.target.value)} className="px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
      <input placeholder="Department" value={form.department || ''} onChange={e => set('department', e.target.value)} className="px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
      <input placeholder="Email" value={form.email || ''} onChange={e => set('email', e.target.value)} className="px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
      <input placeholder="Phone" value={form.phone || ''} onChange={e => set('phone', e.target.value)} className="px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
      <input placeholder="Address" value={form.address || ''} onChange={e => set('address', e.target.value)} className="px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600 col-span-2" />
      <input placeholder="City" value={form.city || ''} onChange={e => set('city', e.target.value)} className="px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
      <div className="grid grid-cols-2 gap-2">
        <input placeholder="State" value={form.state || ''} onChange={e => set('state', e.target.value)} className="px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
        <input placeholder="Zip" value={form.zip || ''} onChange={e => set('zip', e.target.value)} className="px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
      </div>
    </div>
  );
}
