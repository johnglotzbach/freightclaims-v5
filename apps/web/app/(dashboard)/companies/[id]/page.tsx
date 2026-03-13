'use client';

import { useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { get, getList, put, post, del } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { TableSkeleton, StatsSkeleton, CardSkeleton, EmptyState } from '@/components/ui/loading';
import {
  Building2, MapPin, Users, Package, FileText,
  Plus, Edit2, Trash2, Phone, Mail, Globe,
  CheckCircle, XCircle, ArrowLeft, Save, MoreHorizontal, Upload,
} from 'lucide-react';

type CompanyTab = 'overview' | 'locations' | 'contacts' | 'products' | 'claims';

interface CompanyDetail {
  id: string;
  name: string;
  code: string;
  type: string;
  email: string;
  phone: string;
  website?: string;
  industry?: string;
  isActive: boolean;
  isCorporate?: boolean;
  address?: { address1?: string; city?: string; state?: string; zipCode?: string; country?: string } | null;
  claimCount?: number;
  totalClaimValue?: number;
  openClaims?: number;
  settledClaims?: number;
}

interface Location {
  id: string; name: string; address1: string; address2?: string; city: string; state: string; zipCode: string; country: string; isDefault: boolean;
}

interface Contact {
  id: string; firstName: string; lastName: string; email: string; phone?: string; title?: string; department?: string; isPrimary: boolean;
}

interface Product {
  id: string; name: string; sku?: string; description?: string; value?: number; weight?: number;
}

export default function CompanyEditorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<CompanyTab>('overview');
  const [isEditingCompany, setIsEditingCompany] = useState(false);
  const [editCompanyForm, setEditCompanyForm] = useState({ name: '', code: '', email: '', phone: '', industry: '' });

  const updateCompanyMut = useMutation({
    mutationFn: (data: typeof editCompanyForm) => put(`/customers/${id}`, data),
    onSuccess: () => {
      toast.success('Company updated');
      queryClient.invalidateQueries({ queryKey: ['customer', id] });
      setIsEditingCompany(false);
    },
    onError: () => toast.error('Failed to update company'),
  });

  const { data: company, isLoading: companyLoading } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => get<CompanyDetail>(`/customers/${id}`),
  });

  const { data: locations = [], isLoading: locationsLoading } = useQuery({
    queryKey: ['customer-locations', id],
    queryFn: () => getList<Location>(`/customers/${id}/addresses`),
  });

  const { data: contacts = [], isLoading: contactsLoading } = useQuery({
    queryKey: ['customer-contacts', id],
    queryFn: () => getList<Contact>(`/customers/${id}/contacts`),
  });

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['customer-products', id],
    queryFn: () => getList<Product>(`/customers/${id}/products`),
  });

  if (companyLoading) {
    return (
      <div className="space-y-6">
        <StatsSkeleton count={2} />
        <CardSkeleton />
        <TableSkeleton />
      </div>
    );
  }

  if (!company) {
    return (
      <div className="space-y-6">
        <nav className="flex items-center gap-2 text-sm text-slate-500">
          <Link href="/companies" className="hover:text-primary-500">Companies</Link>
          <span>/</span>
          <span className="text-slate-900 dark:text-white font-medium">Not Found</span>
        </nav>
        <EmptyState
          icon={Building2}
          title="Company not found"
          description="The company you're looking for doesn't exist or has been removed."
        />
      </div>
    );
  }

  const tabs: { key: CompanyTab; label: string; icon: typeof Building2; count?: number }[] = [
    { key: 'overview', label: 'Overview', icon: Building2 },
    { key: 'locations', label: 'Locations', icon: MapPin, count: locations.length },
    { key: 'contacts', label: 'Contacts', icon: Users, count: contacts.length },
    { key: 'products', label: 'Products', icon: Package, count: products.length },
    { key: 'claims', label: 'Claims', icon: FileText, count: company.claimCount ?? 0 },
  ];

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/companies" className="hover:text-primary-500">Companies</Link>
        <span>/</span>
        <span className="text-slate-900 dark:text-white font-medium">{company.name}</span>
      </nav>

      {/* Company Header */}
      <div className="card p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
              <Building2 className="w-7 h-7 text-primary-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">{company.name}</h1>
                <span className="font-mono text-xs text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">{company.code}</span>
                {company.isActive ? (
                  <span className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full"><CheckCircle className="w-3 h-3" /> Active</span>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-red-500 bg-red-50 px-2 py-0.5 rounded-full"><XCircle className="w-3 h-3" /> Inactive</span>
                )}
              </div>
              <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                {company.email && <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {company.email}</span>}
                {company.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {company.phone}</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div><p className="text-xl font-bold text-slate-900 dark:text-white">{company.openClaims ?? 0}</p><p className="text-[10px] text-slate-500 uppercase">Open</p></div>
              <div><p className="text-xl font-bold text-emerald-500">{company.settledClaims ?? 0}</p><p className="text-[10px] text-slate-500 uppercase">Settled</p></div>
            </div>
            <button onClick={() => { setEditCompanyForm({ name: company.name, code: company.code, email: company.email || '', phone: company.phone || '', industry: company.industry || '' }); setIsEditingCompany(!isEditingCompany); }} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"><Edit2 className="w-4 h-4 text-slate-400" /></button>
          </div>
        </div>
      </div>

      {isEditingCompany && (
        <div className="card p-6 space-y-4 animate-fade-in">
          <h3 className="font-semibold text-slate-900 dark:text-white">Edit Company</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Company Name</label>
              <input className="input w-full" value={editCompanyForm.name} onChange={e => setEditCompanyForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Code</label>
              <input className="input w-full" value={editCompanyForm.code} onChange={e => setEditCompanyForm(f => ({ ...f, code: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Email</label>
              <input type="email" className="input w-full" value={editCompanyForm.email} onChange={e => setEditCompanyForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Phone</label>
              <input className="input w-full" value={editCompanyForm.phone} onChange={e => setEditCompanyForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1">Industry</label>
              <input className="input w-full" value={editCompanyForm.industry} onChange={e => setEditCompanyForm(f => ({ ...f, industry: e.target.value }))} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setIsEditingCompany(false)} className="px-4 py-2 rounded-lg text-sm font-medium border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800">Cancel</button>
            <button onClick={() => updateCompanyMut.mutate(editCompanyForm)} disabled={updateCompanyMut.isPending} className="flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
              <Save className="w-4 h-4" /> {updateCompanyMut.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-slate-200 dark:border-slate-700 overflow-x-auto">
        <nav className="flex gap-0 -mb-px min-w-max">
          {tabs.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={cn(
              'flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
              activeTab === tab.key ? 'border-primary-500 text-primary-600 dark:text-primary-400' : 'border-transparent text-slate-500 hover:text-slate-700'
            )}>
              <tab.icon className="w-4 h-4" /> {tab.label}
              {tab.count !== undefined && <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full px-2 py-0.5 text-xs">{tab.count}</span>}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="animate-fade-in">
        {activeTab === 'overview' && <OverviewTab company={company} />}
        {activeTab === 'locations' && (locationsLoading ? <TableSkeleton /> : <LocationsTab locations={locations} companyId={id} />)}
        {activeTab === 'contacts' && (contactsLoading ? <TableSkeleton /> : <ContactsTab contacts={contacts} companyId={id} />)}
        {activeTab === 'products' && (productsLoading ? <TableSkeleton /> : <ProductsTab products={products} companyId={id} />)}
        {activeTab === 'claims' && <ClaimsTab companyId={id} />}
      </div>
    </div>
  );
}

function OverviewTab({ company }: { company: CompanyDetail }) {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="card p-6 space-y-4">
        <h3 className="font-semibold text-slate-900 dark:text-white">Company Information</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between"><span className="text-slate-500">Company Name</span><span className="font-medium text-slate-900 dark:text-white">{company.name}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Code</span><span className="font-mono font-medium">{company.code}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Type</span><span className="capitalize font-medium">{company.type}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Industry</span><span className="font-medium">{company.industry}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Corporate</span><span className="font-medium">{company.isCorporate ? 'Yes' : 'No'}</span></div>
        </div>
      </div>
      <div className="card p-6 space-y-4">
        <h3 className="font-semibold text-slate-900 dark:text-white">Contact & Address</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between"><span className="text-slate-500">Email</span><span className="font-medium">{company.email}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Phone</span><span className="font-medium">{company.phone}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Website</span><span className="font-medium text-primary-500">{company.website}</span></div>
          {company.address && <div className="flex justify-between"><span className="text-slate-500">Address</span><span className="font-medium text-right">{company.address.address1}<br />{company.address.city}, {company.address.state} {company.address.zipCode}</span></div>}
        </div>
      </div>
      <div className="card p-6 md:col-span-2">
        <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Claims Summary</h3>
        <div className="grid grid-cols-4 gap-4 text-center">
          <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl"><p className="text-2xl font-bold">{company.claimCount ?? 0}</p><p className="text-xs text-slate-500">Total Claims</p></div>
          <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl"><p className="text-2xl font-bold">{company.openClaims ?? 0}</p><p className="text-xs text-slate-500">Open</p></div>
          <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl"><p className="text-2xl font-bold text-emerald-600">{company.settledClaims ?? 0}</p><p className="text-xs text-slate-500">Settled</p></div>
          <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl"><p className="text-2xl font-bold">${((company.totalClaimValue ?? 0) / 1000).toFixed(1)}k</p><p className="text-xs text-slate-500">Total Value</p></div>
        </div>
      </div>
    </div>
  );
}

function LocationsTab({ locations, companyId }: { locations: Location[]; companyId: string }) {
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [locForm, setLocForm] = useState({ name: '', address1: '', city: '', state: '', zipCode: '', isDefault: false });
  const [editingLocId, setEditingLocId] = useState<string | null>(null);
  const [editLocForm, setEditLocForm] = useState({ name: '', address1: '', city: '', state: '', zipCode: '', isDefault: false });

  const createLocMut = useMutation({
    mutationFn: (data: typeof locForm) => post(`/customers/${companyId}/addresses`, data),
    onSuccess: () => {
      toast.success('Location added');
      queryClient.invalidateQueries({ queryKey: ['customer-locations'] });
      setShowAddForm(false);
      setLocForm({ name: '', address1: '', city: '', state: '', zipCode: '', isDefault: false });
    },
    onError: () => toast.error('Failed to add location'),
  });

  const updateLocMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof editLocForm }) => put(`/customers/${companyId}/addresses/${id}`, data),
    onSuccess: () => {
      toast.success('Location updated');
      queryClient.invalidateQueries({ queryKey: ['customer-locations'] });
      setEditingLocId(null);
    },
    onError: () => toast.error('Failed to update location'),
  });

  const deleteMut = useMutation({
    mutationFn: (locId: string) => del(`/customers/${companyId}/addresses/${locId}`),
    onSuccess: () => { toast.success('Location deleted'); queryClient.invalidateQueries({ queryKey: ['customer-locations'] }); },
    onError: () => toast.error('Failed to delete location'),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowAddForm(!showAddForm)} className="flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
          <Plus className="w-4 h-4" /> Add Location
        </button>
      </div>

      {showAddForm && (
        <div className="card p-5 space-y-4 animate-fade-in">
          <h4 className="font-semibold text-sm text-slate-900 dark:text-white">New Location</h4>
          <div className="grid md:grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium text-slate-500 mb-1">Name</label><input className="input w-full" value={locForm.name} onChange={e => setLocForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div><label className="block text-xs font-medium text-slate-500 mb-1">Address</label><input className="input w-full" value={locForm.address1} onChange={e => setLocForm(f => ({ ...f, address1: e.target.value }))} /></div>
            <div><label className="block text-xs font-medium text-slate-500 mb-1">City</label><input className="input w-full" value={locForm.city} onChange={e => setLocForm(f => ({ ...f, city: e.target.value }))} /></div>
            <div><label className="block text-xs font-medium text-slate-500 mb-1">State</label><input className="input w-full" value={locForm.state} onChange={e => setLocForm(f => ({ ...f, state: e.target.value }))} /></div>
            <div><label className="block text-xs font-medium text-slate-500 mb-1">Zip Code</label><input className="input w-full" value={locForm.zipCode} onChange={e => setLocForm(f => ({ ...f, zipCode: e.target.value }))} /></div>
            <div className="flex items-center gap-2 pt-5"><input type="checkbox" checked={locForm.isDefault} onChange={e => setLocForm(f => ({ ...f, isDefault: e.target.checked }))} className="rounded" /><label className="text-sm text-slate-700 dark:text-slate-300">Default location</label></div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowAddForm(false)} className="px-4 py-2 rounded-lg text-sm font-medium border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800">Cancel</button>
            <button onClick={() => createLocMut.mutate(locForm)} disabled={createLocMut.isPending} className="flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
              <Save className="w-4 h-4" /> {createLocMut.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {locations.length === 0 ? (
        <EmptyState icon={MapPin} title="No locations" description="Add a location to this company." />
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {locations.map(loc => (
            <div key={loc.id} className="card p-5">
              {editingLocId === loc.id ? (
                <div className="space-y-3">
                  <div><label className="block text-xs font-medium text-slate-500 mb-1">Name</label><input className="input w-full" value={editLocForm.name} onChange={e => setEditLocForm(f => ({ ...f, name: e.target.value }))} /></div>
                  <div><label className="block text-xs font-medium text-slate-500 mb-1">Address</label><input className="input w-full" value={editLocForm.address1} onChange={e => setEditLocForm(f => ({ ...f, address1: e.target.value }))} /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="block text-xs font-medium text-slate-500 mb-1">City</label><input className="input w-full" value={editLocForm.city} onChange={e => setEditLocForm(f => ({ ...f, city: e.target.value }))} /></div>
                    <div><label className="block text-xs font-medium text-slate-500 mb-1">State</label><input className="input w-full" value={editLocForm.state} onChange={e => setEditLocForm(f => ({ ...f, state: e.target.value }))} /></div>
                  </div>
                  <div><label className="block text-xs font-medium text-slate-500 mb-1">Zip Code</label><input className="input w-full" value={editLocForm.zipCode} onChange={e => setEditLocForm(f => ({ ...f, zipCode: e.target.value }))} /></div>
                  <div className="flex items-center gap-2"><input type="checkbox" checked={editLocForm.isDefault} onChange={e => setEditLocForm(f => ({ ...f, isDefault: e.target.checked }))} className="rounded" /><label className="text-sm text-slate-700 dark:text-slate-300">Default</label></div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button onClick={() => setEditingLocId(null)} className="text-xs text-slate-500 hover:text-slate-700 font-medium">Cancel</button>
                    <button onClick={() => updateLocMut.mutate({ id: loc.id, data: editLocForm })} disabled={updateLocMut.isPending} className="text-xs text-primary-500 hover:text-primary-600 font-medium">{updateLocMut.isPending ? 'Saving...' : 'Save'}</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-primary-500" />
                      <h4 className="font-semibold text-slate-900 dark:text-white text-sm">{loc.name}</h4>
                    </div>
                    {loc.isDefault && <span className="text-[10px] font-semibold bg-primary-100 text-primary-700 dark:bg-primary-500/10 dark:text-primary-400 px-2 py-0.5 rounded-full">Default</span>}
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{loc.address1}</p>
                  <p className="text-sm text-slate-500">{loc.city}, {loc.state} {loc.zipCode}</p>
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                    <button onClick={() => { setEditingLocId(loc.id); setEditLocForm({ name: loc.name, address1: loc.address1, city: loc.city, state: loc.state, zipCode: loc.zipCode, isDefault: loc.isDefault }); }} className="text-xs text-primary-500 hover:text-primary-600 font-medium">Edit</button>
                    <button onClick={() => { if (confirm('Delete this location?')) deleteMut.mutate(loc.id); }} className="text-xs text-red-500 hover:text-red-600 font-medium">Delete</button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ContactsTab({ contacts, companyId }: { contacts: Contact[]; companyId: string }) {
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [contactForm, setContactForm] = useState({ firstName: '', lastName: '', email: '', phone: '', title: '', isPrimary: false });
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const [editContactForm, setEditContactForm] = useState({ firstName: '', lastName: '', email: '', phone: '', title: '', isPrimary: false });

  const createContactMut = useMutation({
    mutationFn: (data: typeof contactForm) => post(`/customers/${companyId}/contacts`, data),
    onSuccess: () => {
      toast.success('Contact added');
      queryClient.invalidateQueries({ queryKey: ['customer-contacts'] });
      setShowAddForm(false);
      setContactForm({ firstName: '', lastName: '', email: '', phone: '', title: '', isPrimary: false });
    },
    onError: () => toast.error('Failed to add contact'),
  });

  const updateContactMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof editContactForm }) => put(`/customers/${companyId}/contacts/${id}`, data),
    onSuccess: () => {
      toast.success('Contact updated');
      queryClient.invalidateQueries({ queryKey: ['customer-contacts'] });
      setEditingContactId(null);
    },
    onError: () => toast.error('Failed to update contact'),
  });

  const deleteMut = useMutation({
    mutationFn: (cId: string) => del(`/customers/${companyId}/contacts/${cId}`),
    onSuccess: () => { toast.success('Contact deleted'); queryClient.invalidateQueries({ queryKey: ['customer-contacts'] }); },
    onError: () => toast.error('Failed to delete contact'),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button onClick={() => setShowAddForm(!showAddForm)} className="flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
          <Plus className="w-4 h-4" /> Add Contact
        </button>
      </div>

      {showAddForm && (
        <div className="card p-5 space-y-4 animate-fade-in">
          <h4 className="font-semibold text-sm text-slate-900 dark:text-white">New Contact</h4>
          <div className="grid md:grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium text-slate-500 mb-1">First Name</label><input className="input w-full" value={contactForm.firstName} onChange={e => setContactForm(f => ({ ...f, firstName: e.target.value }))} /></div>
            <div><label className="block text-xs font-medium text-slate-500 mb-1">Last Name</label><input className="input w-full" value={contactForm.lastName} onChange={e => setContactForm(f => ({ ...f, lastName: e.target.value }))} /></div>
            <div><label className="block text-xs font-medium text-slate-500 mb-1">Email</label><input type="email" className="input w-full" value={contactForm.email} onChange={e => setContactForm(f => ({ ...f, email: e.target.value }))} /></div>
            <div><label className="block text-xs font-medium text-slate-500 mb-1">Phone</label><input className="input w-full" value={contactForm.phone} onChange={e => setContactForm(f => ({ ...f, phone: e.target.value }))} /></div>
            <div><label className="block text-xs font-medium text-slate-500 mb-1">Title</label><input className="input w-full" value={contactForm.title} onChange={e => setContactForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div className="flex items-center gap-2 pt-5"><input type="checkbox" checked={contactForm.isPrimary} onChange={e => setContactForm(f => ({ ...f, isPrimary: e.target.checked }))} className="rounded" /><label className="text-sm text-slate-700 dark:text-slate-300">Primary contact</label></div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowAddForm(false)} className="px-4 py-2 rounded-lg text-sm font-medium border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800">Cancel</button>
            <button onClick={() => createContactMut.mutate(contactForm)} disabled={createContactMut.isPending} className="flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
              <Save className="w-4 h-4" /> {createContactMut.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {contacts.length === 0 ? (
        <EmptyState icon={Users} title="No contacts" description="Add a contact to this company." />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Name</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase hidden sm:table-cell">Email</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Phone</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase hidden lg:table-cell">Title</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
              {contacts.map(c => (
                editingContactId === c.id ? (
                  <tr key={c.id} className="bg-slate-50 dark:bg-slate-800/50">
                    <td colSpan={5} className="px-4 py-4">
                      <div className="grid md:grid-cols-3 gap-3">
                        <div><label className="block text-xs font-medium text-slate-500 mb-1">First Name</label><input className="input w-full" value={editContactForm.firstName} onChange={e => setEditContactForm(f => ({ ...f, firstName: e.target.value }))} /></div>
                        <div><label className="block text-xs font-medium text-slate-500 mb-1">Last Name</label><input className="input w-full" value={editContactForm.lastName} onChange={e => setEditContactForm(f => ({ ...f, lastName: e.target.value }))} /></div>
                        <div><label className="block text-xs font-medium text-slate-500 mb-1">Email</label><input type="email" className="input w-full" value={editContactForm.email} onChange={e => setEditContactForm(f => ({ ...f, email: e.target.value }))} /></div>
                        <div><label className="block text-xs font-medium text-slate-500 mb-1">Phone</label><input className="input w-full" value={editContactForm.phone} onChange={e => setEditContactForm(f => ({ ...f, phone: e.target.value }))} /></div>
                        <div><label className="block text-xs font-medium text-slate-500 mb-1">Title</label><input className="input w-full" value={editContactForm.title} onChange={e => setEditContactForm(f => ({ ...f, title: e.target.value }))} /></div>
                        <div className="flex items-center gap-2 pt-5"><input type="checkbox" checked={editContactForm.isPrimary} onChange={e => setEditContactForm(f => ({ ...f, isPrimary: e.target.checked }))} className="rounded" /><label className="text-sm text-slate-700 dark:text-slate-300">Primary</label></div>
                      </div>
                      <div className="flex justify-end gap-2 mt-3">
                        <button onClick={() => setEditingContactId(null)} className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700">Cancel</button>
                        <button onClick={() => updateContactMut.mutate({ id: c.id, data: editContactForm })} disabled={updateContactMut.isPending} className="flex items-center gap-1 bg-primary-500 hover:bg-primary-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50">
                          <Save className="w-3.5 h-3.5" /> {updateContactMut.isPending ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-xs font-bold text-primary-600">{(c.firstName || '?')[0]}{(c.lastName || '?')[0]}</div>
                        <div>
                          <span className="font-medium text-slate-900 dark:text-white">{c.firstName} {c.lastName}</span>
                          {c.isPrimary && <span className="ml-1.5 text-[10px] font-semibold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">Primary</span>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-xs text-slate-500">{c.email}</td>
                    <td className="px-4 py-3 hidden md:table-cell text-xs text-slate-500">{c.phone || '—'}</td>
                    <td className="px-4 py-3 hidden lg:table-cell text-xs text-slate-500">{c.title || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => c.email && window.open(`mailto:${c.email}`)} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400"><Mail className="w-3.5 h-3.5" /></button>
                      <button onClick={() => { setEditingContactId(c.id); setEditContactForm({ firstName: c.firstName, lastName: c.lastName, email: c.email, phone: c.phone || '', title: c.title || '', isPrimary: c.isPrimary }); }} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => { if (confirm('Delete this contact?')) deleteMut.mutate(c.id); }} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                    </td>
                  </tr>
                )
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ProductsTab({ products, companyId }: { products: Product[]; companyId: string }) {
  const queryClient = useQueryClient();
  const csvRef = useRef<HTMLInputElement>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [productForm, setProductForm] = useState({ name: '', description: '', sku: '', value: '', weight: '' });
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editProductForm, setEditProductForm] = useState({ name: '', description: '', sku: '', value: '', weight: '' });

  async function handleCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) { toast.error('CSV must have a header row and at least one data row'); return; }
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const nameIdx = headers.findIndex(h => h === 'name' || h === 'product' || h === 'item');
      const skuIdx = headers.findIndex(h => h === 'sku' || h === 'code' || h === 'part');
      const descIdx = headers.findIndex(h => h === 'description' || h === 'desc');
      const valueIdx = headers.findIndex(h => h === 'value' || h === 'price' || h === 'cost');
      const weightIdx = headers.findIndex(h => h === 'weight' || h === 'lbs');
      if (nameIdx === -1) { toast.error('CSV must have a "name" column'); return; }
      let imported = 0;
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim().replace(/^"|"$/g, ''));
        const name = cols[nameIdx];
        if (!name) continue;
        try {
          await post('/customers/products', {
            customerId: companyId,
            name,
            sku: skuIdx >= 0 ? cols[skuIdx] : undefined,
            description: descIdx >= 0 ? cols[descIdx] : undefined,
            value: valueIdx >= 0 && cols[valueIdx] ? Number(cols[valueIdx]) : undefined,
            weight: weightIdx >= 0 && cols[weightIdx] ? Number(cols[weightIdx]) : undefined,
          });
          imported++;
        } catch { /* skip individual failures */ }
      }
      queryClient.invalidateQueries({ queryKey: ['customer-products'] });
      toast.success(`Imported ${imported} products from CSV`);
    } catch { toast.error('Failed to parse CSV file'); }
    e.target.value = '';
  }

  const createProductMut = useMutation({
    mutationFn: (data: typeof productForm) => post('/customers/products', {
      ...data,
      customerId: companyId,
      value: data.value ? Number(data.value) : undefined,
      weight: data.weight ? Number(data.weight) : undefined,
    }),
    onSuccess: () => {
      toast.success('Product added');
      queryClient.invalidateQueries({ queryKey: ['customer-products'] });
      setShowAddForm(false);
      setProductForm({ name: '', description: '', sku: '', value: '', weight: '' });
    },
    onError: () => toast.error('Failed to add product'),
  });

  const updateProductMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof editProductForm }) => put(`/customers/products/${id}`, {
      ...data,
      customerId: companyId,
      value: data.value ? Number(data.value) : undefined,
      weight: data.weight ? Number(data.weight) : undefined,
    }),
    onSuccess: () => {
      toast.success('Product updated');
      queryClient.invalidateQueries({ queryKey: ['customer-products'] });
      setEditingProductId(null);
    },
    onError: () => toast.error('Failed to update product'),
  });

  const deleteMut = useMutation({
    mutationFn: (pId: string) => del(`/customers/products/${pId}?customerId=${companyId}`),
    onSuccess: () => { toast.success('Product deleted'); queryClient.invalidateQueries({ queryKey: ['customer-products'] }); },
    onError: () => toast.error('Failed to delete product'),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{products.length} products in catalog</p>
        <div className="flex gap-2">
          <button onClick={() => csvRef.current?.click()} className="flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800">
            <Upload className="w-4 h-4" /> Upload Catalog
          </button>
          <input ref={csvRef} type="file" accept=".csv" className="hidden" onChange={handleCsvUpload} />
          <button onClick={() => setShowAddForm(!showAddForm)} className="flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
            <Plus className="w-4 h-4" /> Add Product
          </button>
        </div>
      </div>

      {showAddForm && (
        <div className="card p-5 space-y-4 animate-fade-in">
          <h4 className="font-semibold text-sm text-slate-900 dark:text-white">New Product</h4>
          <div className="grid md:grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium text-slate-500 mb-1">Name</label><input className="input w-full" value={productForm.name} onChange={e => setProductForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div><label className="block text-xs font-medium text-slate-500 mb-1">SKU</label><input className="input w-full" value={productForm.sku} onChange={e => setProductForm(f => ({ ...f, sku: e.target.value }))} /></div>
            <div className="md:col-span-2"><label className="block text-xs font-medium text-slate-500 mb-1">Description</label><input className="input w-full" value={productForm.description} onChange={e => setProductForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div><label className="block text-xs font-medium text-slate-500 mb-1">Value ($)</label><input type="number" className="input w-full" value={productForm.value} onChange={e => setProductForm(f => ({ ...f, value: e.target.value }))} /></div>
            <div><label className="block text-xs font-medium text-slate-500 mb-1">Weight (lbs)</label><input type="number" className="input w-full" value={productForm.weight} onChange={e => setProductForm(f => ({ ...f, weight: e.target.value }))} /></div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowAddForm(false)} className="px-4 py-2 rounded-lg text-sm font-medium border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800">Cancel</button>
            <button onClick={() => createProductMut.mutate(productForm)} disabled={createProductMut.isPending} className="flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
              <Save className="w-4 h-4" /> {createProductMut.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {products.length === 0 ? (
        <EmptyState icon={Package} title="No products" description="Add products to this company's catalog." />
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Product</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase hidden sm:table-cell">SKU</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Value</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase hidden lg:table-cell">Weight</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
              {products.map(p => (
                editingProductId === p.id ? (
                  <tr key={p.id} className="bg-slate-50 dark:bg-slate-800/50">
                    <td colSpan={5} className="px-4 py-4">
                      <div className="grid md:grid-cols-3 gap-3">
                        <div><label className="block text-xs font-medium text-slate-500 mb-1">Name</label><input className="input w-full" value={editProductForm.name} onChange={e => setEditProductForm(f => ({ ...f, name: e.target.value }))} /></div>
                        <div><label className="block text-xs font-medium text-slate-500 mb-1">SKU</label><input className="input w-full" value={editProductForm.sku} onChange={e => setEditProductForm(f => ({ ...f, sku: e.target.value }))} /></div>
                        <div><label className="block text-xs font-medium text-slate-500 mb-1">Description</label><input className="input w-full" value={editProductForm.description} onChange={e => setEditProductForm(f => ({ ...f, description: e.target.value }))} /></div>
                        <div><label className="block text-xs font-medium text-slate-500 mb-1">Value ($)</label><input type="number" className="input w-full" value={editProductForm.value} onChange={e => setEditProductForm(f => ({ ...f, value: e.target.value }))} /></div>
                        <div><label className="block text-xs font-medium text-slate-500 mb-1">Weight (lbs)</label><input type="number" className="input w-full" value={editProductForm.weight} onChange={e => setEditProductForm(f => ({ ...f, weight: e.target.value }))} /></div>
                      </div>
                      <div className="flex justify-end gap-2 mt-3">
                        <button onClick={() => setEditingProductId(null)} className="px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700">Cancel</button>
                        <button onClick={() => updateProductMut.mutate({ id: p.id, data: editProductForm })} disabled={updateProductMut.isPending} className="flex items-center gap-1 bg-primary-500 hover:bg-primary-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50">
                          <Save className="w-3.5 h-3.5" /> {updateProductMut.isPending ? 'Saving...' : 'Save'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                    <td className="px-4 py-3">
                      <div><span className="font-medium text-slate-900 dark:text-white">{p.name}</span></div>
                      {p.description && <div className="text-xs text-slate-400">{p.description}</div>}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell font-mono text-xs text-slate-500">{p.sku || '—'}</td>
                    <td className="px-4 py-3 hidden md:table-cell text-xs">{p.value ? `$${p.value.toLocaleString()}` : '—'}</td>
                    <td className="px-4 py-3 hidden lg:table-cell text-xs text-slate-500">{p.weight ? `${p.weight} lbs` : '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => { setEditingProductId(p.id); setEditProductForm({ name: p.name, description: p.description || '', sku: p.sku || '', value: p.value?.toString() || '', weight: p.weight?.toString() || '' }); }} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => { if (confirm('Delete this product?')) deleteMut.mutate(p.id); }} className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                    </td>
                  </tr>
                )
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function ClaimsTab({ companyId }: { companyId: string }) {
  const { data: claims = [], isLoading } = useQuery({
    queryKey: ['company-claims', companyId],
    queryFn: () => getList<any>(`/claims?customerId=${companyId}`),
  });

  if (isLoading) return <TableSkeleton />;
  if (claims.length === 0) return (
    <div className="card p-6 text-center py-12">
      <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
      <p className="text-sm text-slate-500 mb-3">No claims found for this company</p>
      <Link href={`/claims/new?customerId=${companyId}`} className="text-sm text-primary-500 hover:text-primary-600 font-medium">File a Claim</Link>
    </div>
  );

  return (
    <div className="card overflow-hidden">
      <table className="w-full text-sm">
        <thead><tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Claim #</th>
          <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Status</th>
          <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Amount</th>
          <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500">Filed</th>
          <th className="text-right px-4 py-3"></th>
        </tr></thead>
        <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
          {claims.map((c: any) => (
            <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
              <td className="px-4 py-3 font-mono font-medium text-slate-900 dark:text-white">{c.claimNumber}</td>
              <td className="px-4 py-3"><span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary-100 text-primary-700 dark:bg-primary-500/10 dark:text-primary-400 capitalize">{c.status?.replace(/_/g, ' ')}</span></td>
              <td className="px-4 py-3 font-medium">${Number(c.claimAmount || 0).toLocaleString()}</td>
              <td className="px-4 py-3 text-xs text-slate-500">{c.filingDate ? new Date(c.filingDate).toLocaleDateString() : '—'}</td>
              <td className="px-4 py-3 text-right"><Link href={`/claims/${c.id}`} className="text-xs text-primary-500 hover:text-primary-600 font-medium">View</Link></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
