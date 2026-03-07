'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { get, put, post, del } from '@/lib/api-client';
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
  address: { address1: string; city: string; state: string; zipCode: string; country: string };
  claimCount: number;
  totalClaimValue: number;
  openClaims: number;
  settledClaims: number;
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
  const [activeTab, setActiveTab] = useState<CompanyTab>('overview');

  const { data: company, isLoading: companyLoading } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => get<CompanyDetail>(`/customers/${id}`),
  });

  const { data: locations = [], isLoading: locationsLoading } = useQuery({
    queryKey: ['customer-locations', id],
    queryFn: () => get<Location[]>(`/customers/${id}/addresses`),
  });

  const { data: contacts = [], isLoading: contactsLoading } = useQuery({
    queryKey: ['customer-contacts', id],
    queryFn: () => get<Contact[]>(`/customers/${id}/contacts`),
  });

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['customer-products', id],
    queryFn: () => get<Product[]>(`/customers/${id}/products`),
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
    { key: 'claims', label: 'Claims', icon: FileText, count: company.claimCount },
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
              <div><p className="text-xl font-bold text-slate-900 dark:text-white">{company.openClaims}</p><p className="text-[10px] text-slate-500 uppercase">Open</p></div>
              <div><p className="text-xl font-bold text-emerald-500">{company.settledClaims}</p><p className="text-[10px] text-slate-500 uppercase">Settled</p></div>
            </div>
            <button className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"><Edit2 className="w-4 h-4 text-slate-400" /></button>
          </div>
        </div>
      </div>

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
        {activeTab === 'locations' && (locationsLoading ? <TableSkeleton /> : <LocationsTab locations={locations} />)}
        {activeTab === 'contacts' && (contactsLoading ? <TableSkeleton /> : <ContactsTab contacts={contacts} />)}
        {activeTab === 'products' && (productsLoading ? <TableSkeleton /> : <ProductsTab products={products} />)}
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
          <div className="flex justify-between"><span className="text-slate-500">Address</span><span className="font-medium text-right">{company.address.address1}<br />{company.address.city}, {company.address.state} {company.address.zipCode}</span></div>
        </div>
      </div>
      <div className="card p-6 md:col-span-2">
        <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Claims Summary</h3>
        <div className="grid grid-cols-4 gap-4 text-center">
          <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl"><p className="text-2xl font-bold">{company.claimCount}</p><p className="text-xs text-slate-500">Total Claims</p></div>
          <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl"><p className="text-2xl font-bold">{company.openClaims}</p><p className="text-xs text-slate-500">Open</p></div>
          <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl"><p className="text-2xl font-bold text-emerald-600">{company.settledClaims}</p><p className="text-xs text-slate-500">Settled</p></div>
          <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-xl"><p className="text-2xl font-bold">${(company.totalClaimValue / 1000).toFixed(1)}k</p><p className="text-xs text-slate-500">Total Value</p></div>
        </div>
      </div>
    </div>
  );
}

function LocationsTab({ locations }: { locations: Location[] }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end"><button className="flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium"><Plus className="w-4 h-4" /> Add Location</button></div>
      {locations.length === 0 ? (
        <EmptyState icon={MapPin} title="No locations" description="Add a location to this company." />
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {locations.map(loc => (
            <div key={loc.id} className="card p-5">
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
                <button className="text-xs text-primary-500 hover:text-primary-600 font-medium">Edit</button>
                <button className="text-xs text-red-500 hover:text-red-600 font-medium">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ContactsTab({ contacts }: { contacts: Contact[] }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end"><button className="flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium"><Plus className="w-4 h-4" /> Add Contact</button></div>
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
                <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-xs font-bold text-primary-600">{c.firstName[0]}{c.lastName[0]}</div>
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
                    <button className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
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

function ProductsTab({ products }: { products: Product[] }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{products.length} products in catalog</p>
        <div className="flex gap-2">
          <button className="flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800">
            <Upload className="w-4 h-4" /> Upload Catalog
          </button>
          <button className="flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
            <Plus className="w-4 h-4" /> Add Product
          </button>
        </div>
      </div>
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
                <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                  <td className="px-4 py-3">
                    <div><span className="font-medium text-slate-900 dark:text-white">{p.name}</span></div>
                    {p.description && <div className="text-xs text-slate-400">{p.description}</div>}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell font-mono text-xs text-slate-500">{p.sku || '—'}</td>
                  <td className="px-4 py-3 hidden md:table-cell text-xs">{p.value ? `$${p.value.toLocaleString()}` : '—'}</td>
                  <td className="px-4 py-3 hidden lg:table-cell text-xs text-slate-500">{p.weight ? `${p.weight} lbs` : '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <button className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400"><Edit2 className="w-3.5 h-3.5" /></button>
                    <button className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
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

function ClaimsTab({ companyId }: { companyId: string }) {
  return (
    <div className="card p-6 text-center py-12">
      <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
      <p className="text-sm text-slate-500 mb-3">Claims for this company will be loaded from the API</p>
      <Link href="/claims/list" className="text-sm text-primary-500 hover:text-primary-600 font-medium">View All Claims</Link>
    </div>
  );
}
