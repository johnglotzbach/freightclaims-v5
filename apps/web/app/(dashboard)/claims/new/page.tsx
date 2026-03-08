'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import Link from 'next/link';
import { post, apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { CLAIM_TYPES } from 'shared';
import {
  FileText, Users, Package, Truck, Upload,
  Plus, Trash2, MapPin, DollarSign,
  X, Loader2, CheckCircle, AlertCircle,
  Mail,
} from 'lucide-react';

interface PartyEntry {
  type: string;
  name: string;
  email: string;
  phone: string;
  scacCode: string;
  contactName: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
}

interface ProductEntry {
  productName: string;
  claimType: string;
  claimCondition: string;
  quantity: number;
  weight: string;
  unitCost: string;
  claimAmount: string;
  sku: string;
  poNumber: string;
}

interface DocFile {
  file: File;
  category: string;
}

const CLAIM_MODES = ['LTL', 'FTL', 'Flatbed', 'Air', 'Ocean', 'Rail', 'Parcel', 'Intermodal'];
const CLAIM_CONDITIONS = ['Broken', 'Crushed', 'Water Damage', 'Missing Parts', 'Contaminated', 'Pilferage', 'Temperature Damage', 'Short', 'Refused', 'Other'];
const DOC_CATEGORIES = [
  { key: 'bol', label: 'Bill of Lading' },
  { key: 'freight-invoice', label: 'Freight Invoice' },
  { key: 'product-invoice', label: 'Product Invoice' },
  { key: 'pod', label: 'Delivery Receipt or Proof of Delivery' },
  { key: 'inspection', label: 'Inspection Report' },
  { key: 'photos', label: 'Freight Damage Photo' },
  { key: 'other', label: 'Other' },
  { key: 'concealed', label: 'Concealed Damage' },
  { key: 'reefer', label: 'Reefer Log' },
  { key: 'internal', label: 'Internal Pictures' },
  { key: 'insurance', label: 'Insurance Certificate' },
  { key: 'misc', label: 'Misc doc' },
];

const IDENTIFIER_TYPES = [
  { key: 'pro', label: 'PRO Number' },
  { key: 'bol', label: 'BOL Number' },
  { key: 'tracking', label: 'Tracking Number' },
  { key: 'po', label: 'PO Number' },
  { key: 'reference', label: 'Reference Number' },
  { key: 'freightclaims', label: 'FreightClaims ID' },
];

export default function NewClaimPage() {
  const router = useRouter();

  const [identifierType, setIdentifierType] = useState('pro');
  const [primaryIdentifier, setPrimaryIdentifier] = useState('');
  const [claimType, setClaimType] = useState('');
  const [claimMode, setClaimMode] = useState('LTL');
  const [companyDivision, setCompanyDivision] = useState('');
  const [description, setDescription] = useState('');
  const [note, setNote] = useState('');

  const [shipDate, setShipDate] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [filingDate, setFilingDate] = useState('');
  const [bolNumber, setBolNumber] = useState('');
  const [poNumber, setPoNumber] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');

  const [parties, setParties] = useState<PartyEntry[]>([]);
  const [showPartyForm, setShowPartyForm] = useState(false);
  const [partyDraft, setPartyDraft] = useState<PartyEntry>({ type: 'carrier', name: '', email: '', phone: '', scacCode: '', contactName: '', address: '', city: '', state: '', zipCode: '' });

  const [products, setProducts] = useState<ProductEntry[]>([{ productName: '', claimType: 'damage', claimCondition: '', quantity: 0, weight: '', unitCost: '', claimAmount: '', sku: '', poNumber: '' }]);

  const [salvageAllowance, setSalvageAllowance] = useState('');

  const [documents, setDocuments] = useState<DocFile[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [agreeTerms, setAgreeTerms] = useState(false);

  const totalCommodityAmount = products.reduce((sum, p) => sum + (parseFloat(p.claimAmount) || 0), 0);
  const totalClaimAmount = totalCommodityAmount - (parseFloat(salvageAllowance) || 0);

  const addParty = useCallback(() => {
    if (!partyDraft.name.trim()) return;
    setParties(prev => [...prev, { ...partyDraft }]);
    setPartyDraft({ type: 'carrier', name: '', email: '', phone: '', scacCode: '', contactName: '', address: '', city: '', state: '', zipCode: '' });
    setShowPartyForm(false);
  }, [partyDraft]);

  const addProductRow = () => {
    setProducts(prev => [...prev, { productName: '', claimType: 'damage', claimCondition: '', quantity: 0, weight: '', unitCost: '', claimAmount: '', sku: '', poNumber: '' }]);
  };

  const updateProduct = (idx: number, field: keyof ProductEntry, value: string | number) => {
    setProducts(prev => prev.map((p, i) => {
      if (i !== idx) return p;
      const updated = { ...p, [field]: value };
      if (field === 'unitCost' || field === 'quantity') {
        const cost = parseFloat(field === 'unitCost' ? String(value) : updated.unitCost) || 0;
        const qty = field === 'quantity' ? Number(value) : updated.quantity;
        updated.claimAmount = (cost * qty).toFixed(2);
      }
      return updated;
    }));
  };

  const removeProduct = (idx: number) => {
    if (products.length <= 1) return;
    setProducts(prev => prev.filter((_, i) => i !== idx));
  };

  const handleFileSelect = (files: FileList | File[], category: string) => {
    const newFiles = Array.from(files).map(file => ({ file, category }));
    setDocuments(prev => [...prev, ...newFiles]);
  };

  const handleBulkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFileSelect(e.target.files, 'other');
    }
  };

  const createClaim = useMutation({
    mutationFn: (data: Record<string, unknown>) => post('/claims', data) as Promise<{ id: string }>,
    onSuccess: async (result: { id: string }) => {
      if (documents.length > 0) {
        setUploadProgress({ current: 0, total: documents.length });
        let failed = 0;
        for (let i = 0; i < documents.length; i++) {
          setUploadProgress({ current: i + 1, total: documents.length });
          try {
            const formData = new FormData();
            formData.append('files', documents[i].file);
            formData.append('claimId', result.id);
            formData.append('documentName', documents[i].file.name);
            formData.append('categoryId', documents[i].category);
            await apiClient.post('/documents/upload', formData);
          } catch {
            failed++;
          }
        }
        setUploadProgress(null);
        if (failed > 0) {
          toast.warning(`${documents.length - failed} of ${documents.length} documents uploaded. ${failed} failed.`);
        }
      }
      toast.success('Claim created successfully');
      router.push(`/claims/${result.id}`);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Failed to create claim';
      toast.error(msg);
    },
  });

  const isSubmitting = createClaim.isPending || uploadProgress !== null;

  function handleSubmit() {
    if (!claimType) { toast.error('Select a claim type'); return; }
    if (totalClaimAmount <= 0 && products.every(p => !p.claimAmount)) { toast.error('Add at least one product with an amount'); return; }

    createClaim.mutate({
      primaryIdentifier,
      identifierType,
      proNumber: identifierType === 'pro' ? primaryIdentifier : referenceNumber || primaryIdentifier,
      bolNumber: identifierType === 'bol' ? primaryIdentifier : bolNumber,
      claimType,
      claimMode,
      companyDivision: companyDivision || undefined,
      claimAmount: totalClaimAmount > 0 ? totalClaimAmount : Number(products[0]?.claimAmount) || 0,
      description: description || undefined,
      note: note || undefined,
      shipDate: shipDate || undefined,
      deliveryDate: deliveryDate || undefined,
      filingDate: filingDate || undefined,
      poNumber: poNumber || undefined,
      referenceNumber: referenceNumber || undefined,
      salvageAllowance: parseFloat(salvageAllowance) || undefined,
      status: 'draft',
      parties,
      products: products
        .filter(p => p.productName.trim())
        .map(p => ({
          description: p.productName,
          quantity: p.quantity || 1,
          weight: p.weight || undefined,
          value: p.claimAmount || p.unitCost || undefined,
          damageType: p.claimCondition || undefined,
        })),
    });
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <nav className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/claims" className="hover:text-primary-500">Claims</Link>
        <span>/</span>
        <span className="text-slate-900 dark:text-white font-medium">New Claim</span>
      </nav>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Create New Claim</h1>
        <div className="text-xs text-slate-400">* Required fields</div>
      </div>

      {/* ── SECTION: Claim Identification ── */}
      <section className="card p-6 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <FileText className="w-5 h-5 text-primary-500" />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Claim Identification</h2>
        </div>

        <div className="grid md:grid-cols-4 gap-4">
          <div>
            <label className="label">Identifier Type</label>
            <select value={identifierType} onChange={e => setIdentifierType(e.target.value)} className="input">
              {IDENTIFIER_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="label">{IDENTIFIER_TYPES.find(t => t.key === identifierType)?.label} *</label>
            <input value={primaryIdentifier} onChange={e => setPrimaryIdentifier(e.target.value)} className="input font-mono" placeholder="Enter identifier..." />
          </div>
          <div>
            <label className="label">Filing Date</label>
            <input type="date" value={filingDate} onChange={e => setFilingDate(e.target.value)} className="input" />
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="label">Claim Mode *</label>
            <select value={claimMode} onChange={e => setClaimMode(e.target.value)} className="input">
              {CLAIM_MODES.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Company Division</label>
            <input value={companyDivision} onChange={e => setCompanyDivision(e.target.value)} className="input" placeholder="Optional" />
          </div>
          <div>
            <label className="label">Claim Type *</label>
            <select value={claimType} onChange={e => setClaimType(e.target.value)} className="input">
              <option value="">Select type...</option>
              {Object.entries(CLAIM_TYPES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="label">Ship Date</label>
            <input type="date" value={shipDate} onChange={e => setShipDate(e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">Delivery Date</label>
            <input type="date" value={deliveryDate} onChange={e => setDeliveryDate(e.target.value)} className="input" />
          </div>
          <div>
            <label className="label">Description</label>
            <input value={description} onChange={e => setDescription(e.target.value)} className="input" placeholder="Brief description..." />
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="label">BOL Number</label>
            <input value={bolNumber} onChange={e => setBolNumber(e.target.value)} className="input font-mono" />
          </div>
          <div>
            <label className="label">PO Number</label>
            <input value={poNumber} onChange={e => setPoNumber(e.target.value)} className="input font-mono" />
          </div>
          <div>
            <label className="label">Reference Number</label>
            <input value={referenceNumber} onChange={e => setReferenceNumber(e.target.value)} className="input font-mono" />
          </div>
        </div>
      </section>

      {/* ── SECTION: Shipment Parties ── */}
      <section className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary-500" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Shipment Parties</h2>
          </div>
          <button onClick={() => setShowPartyForm(true)} className="flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium">
            <Plus className="w-3.5 h-3.5" /> Add Shipment Party
          </button>
        </div>

        {parties.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-700">
                  <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 uppercase">Role</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 uppercase">Company Name</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Contact</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500 uppercase hidden lg:table-cell">SCAC</th>
                  <th className="text-right px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                {parties.map((p, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                    <td className="px-3 py-2.5"><span className={cn('text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full', p.type === 'carrier' ? 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400' : p.type === 'customer' ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300')}>{p.type}</span></td>
                    <td className="px-3 py-2.5 font-medium text-slate-900 dark:text-white">{p.name}</td>
                    <td className="px-3 py-2.5 text-xs text-slate-500 hidden md:table-cell">{p.contactName || p.email || '—'}</td>
                    <td className="px-3 py-2.5 text-xs text-slate-500 font-mono hidden lg:table-cell">{p.scacCode || '—'}</td>
                    <td className="px-3 py-2.5 text-right">
                      <button onClick={() => setParties(prev => prev.filter((_, i) => i !== idx))} className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {parties.length === 0 && !showPartyForm && (
          <p className="text-sm text-slate-400 text-center py-4">No parties added yet. Click "Add Shipment Party" to add a carrier, customer, or other party.</p>
        )}

        {showPartyForm && (
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-5 border border-slate-200 dark:border-slate-700 space-y-3">
            <div className="grid md:grid-cols-3 gap-3">
              <div>
                <label className="label">Role</label>
                <select value={partyDraft.type} onChange={e => setPartyDraft({ ...partyDraft, type: e.target.value })} className="input">
                  {['customer', 'carrier', 'consignee', 'shipper', 'payee', '3pl', 'insurance'].map(t => <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Company Name *</label>
                <input value={partyDraft.name} onChange={e => setPartyDraft({ ...partyDraft, name: e.target.value })} className="input" placeholder="Company Name" />
              </div>
              <div>
                <label className="label">Contact Name</label>
                <input value={partyDraft.contactName} onChange={e => setPartyDraft({ ...partyDraft, contactName: e.target.value })} className="input" />
              </div>
            </div>
            <div className="grid md:grid-cols-3 gap-3">
              <div>
                <label className="label">Email</label>
                <input value={partyDraft.email} onChange={e => setPartyDraft({ ...partyDraft, email: e.target.value })} className="input" />
              </div>
              <div>
                <label className="label">Phone</label>
                <input value={partyDraft.phone} onChange={e => setPartyDraft({ ...partyDraft, phone: e.target.value })} className="input" />
              </div>
              <div>
                <label className="label">SCAC Code</label>
                <input value={partyDraft.scacCode} onChange={e => setPartyDraft({ ...partyDraft, scacCode: e.target.value })} className="input font-mono" />
              </div>
            </div>
            <div className="grid md:grid-cols-4 gap-3">
              <input value={partyDraft.address} onChange={e => setPartyDraft({ ...partyDraft, address: e.target.value })} placeholder="Address" className="input md:col-span-2" />
              <input value={partyDraft.city} onChange={e => setPartyDraft({ ...partyDraft, city: e.target.value })} placeholder="City" className="input" />
              <div className="flex gap-2">
                <input value={partyDraft.state} onChange={e => setPartyDraft({ ...partyDraft, state: e.target.value })} placeholder="ST" className="input w-16" />
                <input value={partyDraft.zipCode} onChange={e => setPartyDraft({ ...partyDraft, zipCode: e.target.value })} placeholder="Zip" className="input flex-1" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setShowPartyForm(false)} className="px-4 py-1.5 text-xs text-slate-500 hover:text-slate-700">Cancel</button>
              <button onClick={addParty} disabled={!partyDraft.name.trim()} className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-40">Add Party</button>
            </div>
          </div>
        )}
      </section>

      {/* ── SECTION: Documents ── */}
      <section className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary-500" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Supporting Documents</h2>
          </div>
          <label className="flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer">
            <Upload className="w-3.5 h-3.5" /> Bulk Upload
            <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.tiff,.doc,.docx,.xlsx,.mp4,.wav,.eml,.msg" onChange={handleBulkUpload} className="hidden" />
          </label>
        </div>

        <p className="text-xs text-slate-500">Supported document formats include PDF, PPTX, DOCX, PNG, JPG, JPEG, XLSX, MP4, TIF, WAV, EML, MSG and JFIF.</p>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {DOC_CATEGORIES.map(cat => {
            const catDocs = documents.filter(d => d.category === cat.key);
            return (
              <div key={cat.key} className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300 truncate">{cat.label}</span>
                  <label className="text-xs text-primary-500 hover:text-primary-600 cursor-pointer font-semibold">
                    Upload
                    <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.tiff,.doc,.docx,.xlsx" onChange={e => e.target.files && handleFileSelect(e.target.files, cat.key)} className="hidden" />
                  </label>
                </div>
                <div className="min-h-[60px] border border-dashed border-slate-200 dark:border-slate-600 rounded p-2 text-center">
                  {catDocs.length === 0 ? (
                    <label className="text-[10px] text-slate-400 cursor-pointer block py-2 hover:text-primary-500">
                      Drop documents or select documents
                      <input type="file" multiple onChange={e => e.target.files && handleFileSelect(e.target.files, cat.key)} className="hidden" />
                    </label>
                  ) : (
                    <div className="space-y-1">
                      {catDocs.map((d, i) => (
                        <div key={i} className="flex items-center justify-between text-[10px]">
                          <span className="text-slate-600 dark:text-slate-300 truncate flex-1">{d.file.name}</span>
                          <button onClick={() => setDocuments(prev => prev.filter(x => !(x.file === d.file && x.category === d.category)))} className="text-slate-400 hover:text-red-500 ml-1"><X className="w-3 h-3" /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-slate-400">{catDocs.length === 0 ? 'No documents uploaded.' : `${catDocs.length} file(s)`}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── SECTION: Products / Commodities ── */}
      <section className="card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary-500" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Commodities</h2>
          </div>
        </div>

        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="bg-red-600 text-white">
                <th className="text-left px-3 py-2 text-xs font-semibold">Claim Type *</th>
                <th className="text-left px-3 py-2 text-xs font-semibold">Condition *</th>
                <th className="text-left px-3 py-2 text-xs font-semibold">PO</th>
                <th className="text-left px-3 py-2 text-xs font-semibold">SKU</th>
                <th className="text-left px-3 py-2 text-xs font-semibold">Product Name *</th>
                <th className="text-center px-3 py-2 text-xs font-semibold">Unit Weight</th>
                <th className="text-right px-3 py-2 text-xs font-semibold">Unit Cost *</th>
                <th className="text-center px-3 py-2 text-xs font-semibold">Quantity *</th>
                <th className="text-right px-3 py-2 text-xs font-semibold">Claim Amount *</th>
                <th className="px-2 py-2 w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {products.map((p, idx) => (
                <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-700/20">
                  <td className="px-2 py-1.5">
                    <select value={p.claimType} onChange={e => updateProduct(idx, 'claimType', e.target.value)} className="input-sm">
                      <option value="">—</option>
                      {Object.entries(CLAIM_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-1.5">
                    <select value={p.claimCondition} onChange={e => updateProduct(idx, 'claimCondition', e.target.value)} className="input-sm">
                      <option value="">—</option>
                      {CLAIM_CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </td>
                  <td className="px-2 py-1.5"><input value={p.poNumber} onChange={e => updateProduct(idx, 'poNumber', e.target.value)} className="input-sm w-20" /></td>
                  <td className="px-2 py-1.5"><input value={p.sku} onChange={e => updateProduct(idx, 'sku', e.target.value)} className="input-sm w-20 font-mono" /></td>
                  <td className="px-2 py-1.5"><input value={p.productName} onChange={e => updateProduct(idx, 'productName', e.target.value)} className="input-sm" placeholder="Product name" /></td>
                  <td className="px-2 py-1.5">
                    <div className="flex items-center gap-1">
                      <input value={p.weight} onChange={e => updateProduct(idx, 'weight', e.target.value)} className="input-sm w-16 text-right" placeholder="0" />
                      <span className="text-[10px] text-slate-400">LBS</span>
                    </div>
                  </td>
                  <td className="px-2 py-1.5">
                    <div className="flex items-center gap-0.5">
                      <span className="text-slate-400 text-xs">$</span>
                      <input value={p.unitCost} onChange={e => updateProduct(idx, 'unitCost', e.target.value)} type="number" step="0.01" className="input-sm w-24 text-right" placeholder="0.00" />
                    </div>
                  </td>
                  <td className="px-2 py-1.5"><input value={p.quantity || ''} onChange={e => updateProduct(idx, 'quantity', Number(e.target.value) || 0)} type="number" min="0" className="input-sm w-16 text-center" placeholder="0" /></td>
                  <td className="px-2 py-1.5">
                    <div className="flex items-center gap-0.5">
                      <span className="text-slate-400 text-xs">$</span>
                      <input value={p.claimAmount} onChange={e => updateProduct(idx, 'claimAmount', e.target.value)} type="number" step="0.01" className="input-sm w-24 text-right font-medium" placeholder="0.00" />
                    </div>
                  </td>
                  <td className="px-2 py-1.5">
                    <button onClick={() => removeProduct(idx)} disabled={products.length <= 1} className="p-1 rounded hover:bg-red-50 text-slate-300 hover:text-red-500 disabled:opacity-20"><Trash2 className="w-3.5 h-3.5" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center gap-4 text-xs">
          <button onClick={addProductRow} className="flex items-center gap-1 text-primary-500 hover:text-primary-600 font-semibold"><Plus className="w-3.5 h-3.5" /> Add Commodity</button>
        </div>

        <div className="flex justify-end">
          <div className="w-72 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Total Commodity Amount</span>
              <span className="font-mono">${totalCommodityAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Salvage Allowance (-)</span>
              <div className="flex items-center gap-0.5">
                <span className="text-slate-400 text-xs">$</span>
                <input value={salvageAllowance} onChange={e => setSalvageAllowance(e.target.value)} type="number" step="0.01" className="input-sm w-24 text-right" placeholder="0" />
              </div>
            </div>
            <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
              <span className="font-semibold text-slate-900 dark:text-white">Total Claim Amount</span>
              <span className="font-bold font-mono text-lg">${totalClaimAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION: Claim Form Notes ── */}
      <section className="card p-6 space-y-3">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-300">Claim Form Notes</h2>
        <textarea value={note} onChange={e => setNote(e.target.value)} rows={3} maxLength={150} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600 resize-none" placeholder="Additional notes about this claim..." />
        <p className="text-[10px] text-slate-400">Max 150 characters</p>
      </section>

      {/* ── Upload Progress ── */}
      {uploadProgress && (
        <div className="card p-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-300">Uploading documents...</span>
            <span className="text-slate-500">{uploadProgress.current} / {uploadProgress.total}</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
            <div className="bg-primary-500 h-2 rounded-full transition-all" style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }} />
          </div>
        </div>
      )}

      {/* ── Terms & Submit ── */}
      <section className="card p-6 space-y-4">
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" checked={agreeTerms} onChange={e => setAgreeTerms(e.target.checked)} className="rounded border-slate-300 text-primary-500 mt-0.5" />
          <span className="text-sm text-slate-600 dark:text-slate-400">
            I agree to the <a href="/terms" target="_blank" className="text-primary-500 underline hover:text-primary-600">Terms and Conditions</a>
          </span>
        </label>

        <div className="flex items-center justify-between pt-2">
          <button onClick={() => router.push('/claims')} className="px-5 py-2.5 text-sm font-medium text-slate-600 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800">
            Clear
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !agreeTerms}
            className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-2.5 rounded-lg text-sm font-bold disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-primary-500/20"
          >
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            {uploadProgress ? 'Uploading...' : createClaim.isPending ? 'Creating...' : 'Submit Claim'}
          </button>
        </div>
      </section>

      {/* Inline styles for the compact form inputs */}
      <style jsx global>{`
        .label {
          display: block;
          font-size: 0.75rem;
          font-weight: 500;
          color: rgb(100 116 139);
          margin-bottom: 0.25rem;
        }
        .dark .label { color: rgb(203 213 225); }
        .input {
          width: 100%;
          padding: 0.5rem 0.75rem;
          border: 1px solid rgb(226 232 240);
          border-radius: 0.5rem;
          font-size: 0.875rem;
          background: white;
          transition: border-color 0.15s;
        }
        .input:focus { outline: none; border-color: rgb(99 102 241); box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.15); }
        .dark .input { background: rgb(51 65 85); border-color: rgb(71 85 105); color: white; }
        .input-sm {
          width: 100%;
          padding: 0.25rem 0.5rem;
          border: 1px solid rgb(226 232 240);
          border-radius: 0.375rem;
          font-size: 0.75rem;
          background: white;
          transition: border-color 0.15s;
        }
        .input-sm:focus { outline: none; border-color: rgb(99 102 241); box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.15); }
        .dark .input-sm { background: rgb(51 65 85); border-color: rgb(71 85 105); color: white; }
      `}</style>
    </div>
  );
}
