'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import Link from 'next/link';
import { post, apiClient } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { CLAIM_TYPES } from 'shared';
import {
  FileText, Users, Package, Truck, Upload,
  CheckCircle, Plus, Trash2, MapPin, DollarSign,
  Search, X, Loader2,
} from 'lucide-react';

const claimInfoSchema = z.object({
  primaryIdentifier: z.string().min(1, 'PRO/Identifier is required'),
  identifierType: z.string().default('pro'),
  claimType: z.string().min(1, 'Claim type is required'),
  claimMode: z.string().default('LTL'),
  companyDivision: z.string().optional(),
  claimAmount: z.coerce.number().positive('Amount must be > $0'),
  description: z.string().optional(),
  shipDate: z.string().optional(),
  deliveryDate: z.string().optional(),
  filingDate: z.string().optional(),
  bolNumber: z.string().optional(),
  poNumber: z.string().optional(),
  referenceNumber: z.string().optional(),
  customIdentifier2: z.string().optional(),
  customIdentifier3: z.string().optional(),
  freightCharges: z.coerce.number().optional(),
  contingencyCharges: z.coerce.number().optional(),
  salvageAllowance: z.coerce.number().optional(),
  isPrivateFreightCharges: z.boolean().default(false),
  note: z.string().optional(),
});

type ClaimInfoForm = z.infer<typeof claimInfoSchema>;

interface PartyEntry {
  type: string;
  name: string;
  email: string;
  phone: string;
  scacCode: string;
  dotNumber: string;
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
  unitOfMeasure: string;
  weight: string;
  cost: string;
  sku: string;
  poNumber: string;
  currency: string;
}

interface LocationEntry {
  type: 'origin' | 'destination';
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  contactName: string;
  contactPhone: string;
}

const steps = [
  { label: 'Claim Info', icon: FileText },
  { label: 'Parties', icon: Users },
  { label: 'Shipment', icon: Truck },
  { label: 'Products', icon: Package },
  { label: 'Documents', icon: Upload },
  { label: 'Review', icon: CheckCircle },
];

const IDENTIFIER_TYPES = [
  { key: 'pro', label: 'PRO Number' },
  { key: 'bol', label: 'BOL Number' },
  { key: 'tracking', label: 'Tracking Number' },
  { key: 'po', label: 'PO Number' },
  { key: 'reference', label: 'Reference Number' },
];

const CLAIM_MODES = ['LTL', 'FTL', 'Parcel', 'Intermodal', 'Air Freight', 'Ocean'];
const CLAIM_CONDITIONS = ['Broken', 'Crushed', 'Water Damage', 'Missing Parts', 'Contaminated', 'Pilferage', 'Temperature Damage', 'Short', 'Other'];
const UNITS_OF_MEASURE = ['Each', 'Case', 'Pallet', 'Carton', 'Bundle', 'Roll', 'Drum', 'Other'];

export default function NewClaimPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [parties, setParties] = useState<PartyEntry[]>([]);
  const [products, setProducts] = useState<ProductEntry[]>([]);
  const [locations, setLocations] = useState<LocationEntry[]>([]);
  const [documents, setDocuments] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);

  const form = useForm<ClaimInfoForm>({
    resolver: zodResolver(claimInfoSchema),
    defaultValues: { primaryIdentifier: '', identifierType: 'pro', claimType: '', claimMode: 'LTL', claimAmount: 0 },
  });

  const createClaim = useMutation({
    mutationFn: (data: Record<string, unknown>) => post('/claims', data) as Promise<{ id: string }>,
    onSuccess: async (result: { id: string }) => {
      toast.success('Claim created successfully');

      if (documents.length > 0) {
        setUploadProgress({ current: 0, total: documents.length });
        let failed = 0;
        for (let i = 0; i < documents.length; i++) {
          setUploadProgress({ current: i + 1, total: documents.length });
          try {
            const formData = new FormData();
            formData.append('files', documents[i]);
            formData.append('claimId', result.id);
            formData.append('documentName', documents[i].name);
            await apiClient.post('/documents/upload', formData);
          } catch {
            failed++;
          }
        }
        setUploadProgress(null);
        if (failed > 0) {
          toast.warning(`${documents.length - failed} of ${documents.length} documents uploaded. ${failed} failed.`);
        } else {
          toast.success(`All ${documents.length} documents uploaded`);
        }
      }

      router.push(`/claims/${result.id}`);
    },
    onError: () => toast.error('Failed to create claim'),
  });

  const isSubmitting = createClaim.isPending || uploadProgress !== null;

  async function handleNext() {
    if (currentStep === 0) {
      const valid = await form.trigger();
      if (!valid) return;
    }
    setCurrentStep(s => Math.min(s + 1, steps.length - 1));
  }

  function handleBack() { setCurrentStep(s => Math.max(s - 1, 0)); }

  function handleSubmit() {
    const claimData = form.getValues();
    const origin = locations.find(l => l.type === 'origin');
    const destination = locations.find(l => l.type === 'destination');
    createClaim.mutate({
      proNumber: claimData.identifierType === 'pro' ? claimData.primaryIdentifier : claimData.referenceNumber,
      bolNumber: claimData.identifierType === 'bol' ? claimData.primaryIdentifier : claimData.bolNumber,
      ...claimData,
      status: 'draft',
      parties,
      products: products.map(p => ({ description: p.productName, quantity: p.quantity, weight: p.weight, value: p.cost, damageType: p.claimCondition })),
      originCity: origin?.city, originState: origin?.state,
      destinationCity: destination?.city, destinationState: destination?.state,
    });
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <nav className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/claims" className="hover:text-primary-500">Claims</Link><span>/</span>
        <span className="text-slate-900 dark:text-white font-medium">New Claim</span>
      </nav>

      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Create New Claim</h1>

      {/* Step indicator */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2">
        {steps.map((step, idx) => (
          <div key={step.label} className="flex items-center gap-1">
            <button onClick={() => idx < currentStep && setCurrentStep(idx)} className={cn('flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap', idx === currentStep ? 'bg-primary-500 text-white shadow-sm' : idx < currentStep ? 'bg-primary-50 text-primary-600 dark:bg-primary-950 dark:text-primary-400 cursor-pointer' : 'bg-slate-100 dark:bg-slate-800 text-slate-400')}>
              {idx < currentStep ? <CheckCircle className="w-3.5 h-3.5" /> : <step.icon className="w-3.5 h-3.5" />}
              {step.label}
            </button>
            {idx < steps.length - 1 && <div className={cn('w-4 h-0.5 mx-0.5', idx < currentStep ? 'bg-primary-400' : 'bg-slate-200 dark:bg-slate-700')} />}
          </div>
        ))}
      </div>

      <div className="card p-6 animate-fade-in">
        {currentStep === 0 && <StepClaimInfo form={form} />}
        {currentStep === 1 && <StepParties parties={parties} setParties={setParties} />}
        {currentStep === 2 && <StepShipment locations={locations} setLocations={setLocations} form={form} />}
        {currentStep === 3 && <StepProducts products={products} setProducts={setProducts} />}
        {currentStep === 4 && <StepDocuments documents={documents} setDocuments={setDocuments} />}
        {currentStep === 5 && <StepReview claimData={form.getValues()} parties={parties} products={products} locations={locations} documents={documents} />}
      </div>

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

      <div className="flex items-center justify-between">
        <button onClick={handleBack} disabled={currentStep === 0 || isSubmitting} className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-30">Back</button>
        {currentStep < steps.length - 1 ? (
          <button onClick={handleNext} className="bg-primary-500 hover:bg-primary-600 text-white px-6 py-2 rounded-lg text-sm font-semibold">Next</button>
        ) : (
          <button onClick={handleSubmit} disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 flex items-center gap-2">
            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
            {uploadProgress ? 'Uploading documents...' : createClaim.isPending ? 'Creating...' : 'Create Claim'}
          </button>
        )}
      </div>
    </div>
  );
}

function StepClaimInfo({ form }: { form: ReturnType<typeof useForm<ClaimInfoForm>> }) {
  const { register, formState: { errors }, watch, setValue } = form;
  const identifierType = watch('identifierType');

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Claim Information</h2>

      <div className="grid md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Identifier Type</label>
          <select {...register('identifierType')} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600">
            {IDENTIFIER_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">{IDENTIFIER_TYPES.find(t => t.key === identifierType)?.label} *</label>
          <input {...register('primaryIdentifier')} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600 font-mono" placeholder="Enter identifier..." />
          {errors.primaryIdentifier && <p className="text-red-500 text-xs mt-1">{errors.primaryIdentifier.message}</p>}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Claim Type *</label>
          <select {...register('claimType')} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600">
            <option value="">Select type...</option>
            {Object.entries(CLAIM_TYPES).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>
          {errors.claimType && <p className="text-red-500 text-xs mt-1">{errors.claimType.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Shipping Mode</label>
          <select {...register('claimMode')} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600">
            {CLAIM_MODES.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Company Division</label>
          <input {...register('companyDivision')} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" placeholder="Optional" />
        </div>
      </div>

      <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Financial Details</h3>
        <div className="grid md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Total Claim Amount *</label>
            <input {...register('claimAmount')} type="number" step="0.01" className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" placeholder="0.00" />
            {errors.claimAmount && <p className="text-red-500 text-xs mt-1">{errors.claimAmount.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Freight Charges</label>
            <input {...register('freightCharges')} type="number" step="0.01" className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" placeholder="0.00" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Contingency Charges</label>
            <input {...register('contingencyCharges')} type="number" step="0.01" className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" placeholder="0.00" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Salvage Allowance</label>
            <input {...register('salvageAllowance')} type="number" step="0.01" className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" placeholder="0.00" />
          </div>
        </div>
        <label className="flex items-center gap-2 mt-3 cursor-pointer">
          <input type="checkbox" {...register('isPrivateFreightCharges')} className="rounded border-slate-300 text-primary-500" />
          <span className="text-sm text-slate-600 dark:text-slate-400">Private freight charges (not visible to carrier)</span>
        </label>
      </div>

      <div className="border-t border-slate-100 dark:border-slate-700 pt-4">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">Dates & Identifiers</h3>
        <div className="grid md:grid-cols-3 gap-4">
          <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Ship Date</label><input {...register('shipDate')} type="date" className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" /></div>
          <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Delivery Date</label><input {...register('deliveryDate')} type="date" className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" /></div>
          <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Filing Date</label><input {...register('filingDate')} type="date" className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" /></div>
        </div>
        <div className="grid md:grid-cols-3 gap-4 mt-3">
          <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">BOL Number</label><input {...register('bolNumber')} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600 font-mono" /></div>
          <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">PO Number</label><input {...register('poNumber')} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600 font-mono" /></div>
          <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Reference Number</label><input {...register('referenceNumber')} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600 font-mono" /></div>
        </div>
      </div>

      <div><label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Notes</label><textarea {...register('note')} rows={3} className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" placeholder="Internal notes about this claim..." /></div>
    </div>
  );
}

function StepParties({ parties, setParties }: { parties: PartyEntry[]; setParties: (p: PartyEntry[]) => void }) {
  const empty: PartyEntry = { type: 'carrier', name: '', email: '', phone: '', scacCode: '', dotNumber: '', contactName: '', address: '', city: '', state: '', zipCode: '' };
  const [editing, setEditing] = useState<PartyEntry>(empty);
  const [showForm, setShowForm] = useState(parties.length === 0);

  function addParty() {
    if (!editing.name.trim()) return;
    setParties([...parties, { ...editing }]);
    setEditing(empty);
    setShowForm(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h2 className="text-lg font-semibold text-slate-900 dark:text-white">Claim Parties</h2><p className="text-xs text-slate-500 mt-0.5">Add claimant, carrier, shipper, consignee, and other involved parties</p></div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium"><Plus className="w-3.5 h-3.5" /> Add Party</button>
      </div>

      {parties.map((p, idx) => (
        <div key={idx} className="card p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={cn('text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full', p.type === 'carrier' ? 'bg-purple-100 text-purple-700' : p.type === 'claimant' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600')}>{p.type}</span>
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-white">{p.name}</p>
              <p className="text-xs text-slate-400">{[p.scacCode && `SCAC: ${p.scacCode}`, p.email, p.city && `${p.city}, ${p.state}`].filter(Boolean).join(' · ')}</p>
            </div>
          </div>
          <button onClick={() => setParties(parties.filter((_, i) => i !== idx))} className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
        </div>
      ))}

      {showForm && (
        <div className="card p-5 border-2 border-dashed border-primary-200 dark:border-primary-500/30 space-y-3">
          <div className="grid md:grid-cols-3 gap-3">
            <select value={editing.type} onChange={e => setEditing({ ...editing, type: e.target.value })} className="px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600">
              {['claimant', 'carrier', 'consignee', 'shipper', 'payee', '3pl'].map(t => <option key={t} value={t} className="capitalize">{t}</option>)}
            </select>
            <input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} placeholder="Company Name *" className="px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
            <input value={editing.contactName} onChange={e => setEditing({ ...editing, contactName: e.target.value })} placeholder="Contact Name" className="px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            <input value={editing.email} onChange={e => setEditing({ ...editing, email: e.target.value })} placeholder="Email" className="px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
            <input value={editing.phone} onChange={e => setEditing({ ...editing, phone: e.target.value })} placeholder="Phone" className="px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
            <input value={editing.scacCode} onChange={e => setEditing({ ...editing, scacCode: e.target.value })} placeholder="SCAC Code" className="px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600 font-mono" />
          </div>
          <div className="grid md:grid-cols-4 gap-3">
            <input value={editing.address} onChange={e => setEditing({ ...editing, address: e.target.value })} placeholder="Address" className="px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600 md:col-span-2" />
            <input value={editing.city} onChange={e => setEditing({ ...editing, city: e.target.value })} placeholder="City" className="px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
            <div className="flex gap-2">
              <input value={editing.state} onChange={e => setEditing({ ...editing, state: e.target.value })} placeholder="State" className="w-20 px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
              <input value={editing.zipCode} onChange={e => setEditing({ ...editing, zipCode: e.target.value })} placeholder="Zip" className="flex-1 px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setShowForm(false)} className="px-4 py-1.5 text-xs text-slate-500">Cancel</button>
            <button onClick={addParty} disabled={!editing.name.trim()} className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-40">Add Party</button>
          </div>
        </div>
      )}
    </div>
  );
}

function StepShipment({ locations, setLocations, form }: { locations: LocationEntry[]; setLocations: (l: LocationEntry[]) => void; form: any }) {
  const origin = locations.find(l => l.type === 'origin');
  const destination = locations.find(l => l.type === 'destination');

  function updateLocation(type: 'origin' | 'destination', field: string, value: string) {
    const existing = locations.find(l => l.type === type);
    if (existing) {
      setLocations(locations.map(l => l.type === type ? { ...l, [field]: value } : l));
    } else {
      setLocations([...locations, { type, name: '', address: '', city: '', state: '', zipCode: '', contactName: '', contactPhone: '', [field]: value }]);
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Shipment & Route</h2>

      <div className="grid md:grid-cols-2 gap-6">
        {(['origin', 'destination'] as const).map(type => {
          const loc = type === 'origin' ? origin : destination;
          return (
            <div key={type} className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"><MapPin className="w-4 h-4 text-primary-500" /> {type === 'origin' ? 'Origin' : 'Destination'}</h3>
              <input value={loc?.name || ''} onChange={e => updateLocation(type, 'name', e.target.value)} placeholder="Location Name" className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
              <input value={loc?.address || ''} onChange={e => updateLocation(type, 'address', e.target.value)} placeholder="Address" className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
              <div className="grid grid-cols-3 gap-2">
                <input value={loc?.city || ''} onChange={e => updateLocation(type, 'city', e.target.value)} placeholder="City" className="px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
                <input value={loc?.state || ''} onChange={e => updateLocation(type, 'state', e.target.value)} placeholder="State" className="px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
                <input value={loc?.zipCode || ''} onChange={e => updateLocation(type, 'zipCode', e.target.value)} placeholder="Zip" className="px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input value={loc?.contactName || ''} onChange={e => updateLocation(type, 'contactName', e.target.value)} placeholder="Contact Name" className="px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
                <input value={loc?.contactPhone || ''} onChange={e => updateLocation(type, 'contactPhone', e.target.value)} placeholder="Contact Phone" className="px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StepProducts({ products, setProducts }: { products: ProductEntry[]; setProducts: (p: ProductEntry[]) => void }) {
  const empty: ProductEntry = { productName: '', claimType: 'Damage', claimCondition: '', quantity: 1, unitOfMeasure: 'Each', weight: '', cost: '', sku: '', poNumber: '', currency: 'USD' };
  const [editing, setEditing] = useState<ProductEntry>(empty);
  const [showForm, setShowForm] = useState(products.length === 0);

  function addProduct() {
    if (!editing.productName.trim()) return;
    setProducts([...products, { ...editing }]);
    setEditing(empty);
    setShowForm(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div><h2 className="text-lg font-semibold text-slate-900 dark:text-white">Products / Line Items</h2><p className="text-xs text-slate-500 mt-0.5">Add each product affected by this claim</p></div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium"><Plus className="w-3.5 h-3.5" /> Add Product</button>
      </div>

      {products.length > 0 && (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-slate-100 dark:border-slate-700">
              <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500">Product</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500">Type</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500">Condition</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500">Qty</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500">Weight</th>
              <th className="text-left px-3 py-2 text-xs font-semibold text-slate-500">Cost</th>
              <th className="text-right px-3 py-2"></th>
            </tr></thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
              {products.map((p, idx) => (
                <tr key={idx}>
                  <td className="px-3 py-2 font-medium">{p.productName}</td>
                  <td className="px-3 py-2 text-xs">{p.claimType}</td>
                  <td className="px-3 py-2 text-xs">{p.claimCondition || '—'}</td>
                  <td className="px-3 py-2 text-xs">{p.quantity} {p.unitOfMeasure}</td>
                  <td className="px-3 py-2 text-xs">{p.weight || '—'}</td>
                  <td className="px-3 py-2 text-xs">{p.cost ? `$${p.cost}` : '—'}</td>
                  <td className="px-3 py-2 text-right"><button onClick={() => setProducts(products.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="card p-5 border-2 border-dashed border-primary-200 dark:border-primary-500/30 space-y-3">
          <div className="grid md:grid-cols-3 gap-3">
            <input value={editing.productName} onChange={e => setEditing({ ...editing, productName: e.target.value })} placeholder="Product Name *" className="px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600 md:col-span-2" />
            <input value={editing.sku} onChange={e => setEditing({ ...editing, sku: e.target.value })} placeholder="SKU" className="px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600 font-mono" />
          </div>
          <div className="grid md:grid-cols-4 gap-3">
            <select value={editing.claimType} onChange={e => setEditing({ ...editing, claimType: e.target.value })} className="px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600">
              {Object.entries(CLAIM_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select value={editing.claimCondition} onChange={e => setEditing({ ...editing, claimCondition: e.target.value })} className="px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600">
              <option value="">Condition...</option>
              {CLAIM_CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <div className="flex gap-2">
              <input value={editing.quantity} onChange={e => setEditing({ ...editing, quantity: Number(e.target.value) || 1 })} type="number" min="1" placeholder="Qty" className="w-20 px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
              <select value={editing.unitOfMeasure} onChange={e => setEditing({ ...editing, unitOfMeasure: e.target.value })} className="flex-1 px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600">
                {UNITS_OF_MEASURE.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <input value={editing.weight} onChange={e => setEditing({ ...editing, weight: e.target.value })} placeholder="Weight (lbs)" className="px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            <input value={editing.cost} onChange={e => setEditing({ ...editing, cost: e.target.value })} placeholder="Cost ($)" type="number" step="0.01" className="px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
            <input value={editing.poNumber} onChange={e => setEditing({ ...editing, poNumber: e.target.value })} placeholder="PO Number" className="px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600 font-mono" />
            <select value={editing.currency} onChange={e => setEditing({ ...editing, currency: e.target.value })} className="px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600">
              <option value="USD">USD</option><option value="CAD">CAD</option><option value="EUR">EUR</option><option value="GBP">GBP</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button onClick={() => setShowForm(false)} className="px-4 py-1.5 text-xs text-slate-500">Cancel</button>
            <button onClick={addProduct} disabled={!editing.productName.trim()} className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-40">Add Product</button>
          </div>
        </div>
      )}
    </div>
  );
}

function StepDocuments({ documents, setDocuments }: { documents: File[]; setDocuments: (d: File[]) => void }) {
  const [dragOver, setDragOver] = useState(false);
  const CATEGORIES = ['Bill of Lading', 'Invoice', 'Proof of Delivery', 'Photos', 'Inspection Report', 'Other'];

  function handleDrop(e: React.DragEvent) {
    e.preventDefault(); setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    setDocuments([...documents, ...files]);
  }

  function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    setDocuments([...documents, ...files]);
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Documents</h2>
      <p className="text-xs text-slate-500">Upload supporting documents — BOL, Invoice, POD, photos, inspection reports</p>

      <div onDrop={handleDrop} onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} className={cn('border-2 border-dashed rounded-xl p-8 text-center transition-all', dragOver ? 'border-primary-400 bg-primary-50/50 dark:bg-primary-500/5' : 'border-slate-200 dark:border-slate-700')}>
        <Upload className="w-10 h-10 text-slate-300 mx-auto mb-2" />
        <p className="text-sm text-slate-600 dark:text-slate-400">Drag & drop files here</p>
        <p className="text-xs text-slate-400 mt-1">or</p>
        <label className="inline-block mt-2 cursor-pointer bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-xs font-semibold">
          Browse Files <input type="file" multiple accept=".pdf,.jpg,.jpeg,.png,.tiff,.doc,.docx" onChange={handleSelect} className="hidden" />
        </label>
        <p className="text-[10px] text-slate-400 mt-2">PDF, JPG, PNG, TIFF, DOC (max 10MB each)</p>
      </div>

      {documents.length > 0 && (
        <div className="space-y-2">
          {documents.map((file, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <div className="flex items-center gap-3">
                <FileText className="w-4 h-4 text-slate-400" />
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white">{file.name}</p>
                  <p className="text-[10px] text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <select className="px-2 py-1 border rounded text-xs dark:bg-slate-700 dark:border-slate-600">
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <button onClick={() => setDocuments(documents.filter((_, i) => i !== idx))} className="text-red-400 hover:text-red-600"><X className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StepReview({ claimData, parties, products, locations, documents }: { claimData: ClaimInfoForm; parties: PartyEntry[]; products: ProductEntry[]; locations: LocationEntry[]; documents: File[] }) {
  const origin = locations.find(l => l.type === 'origin');
  const destination = locations.find(l => l.type === 'destination');

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Review & Submit</h2>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
          <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Claim Details</h3>
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">Identifier</dt><dd className="font-mono font-medium">{claimData.primaryIdentifier}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Type</dt><dd className="capitalize">{CLAIM_TYPES[claimData.claimType as keyof typeof CLAIM_TYPES] || claimData.claimType}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Mode</dt><dd>{claimData.claimMode}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Amount</dt><dd className="font-bold">${Number(claimData.claimAmount).toLocaleString()}</dd></div>
            {claimData.bolNumber && <div className="flex justify-between"><dt className="text-slate-500">BOL</dt><dd className="font-mono">{claimData.bolNumber}</dd></div>}
          </dl>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
          <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Route</h3>
          {origin && <p className="text-sm"><span className="text-slate-500">From:</span> {origin.city}, {origin.state}</p>}
          {destination && <p className="text-sm"><span className="text-slate-500">To:</span> {destination.city}, {destination.state}</p>}
          {claimData.shipDate && <p className="text-sm"><span className="text-slate-500">Ship:</span> {claimData.shipDate}</p>}
          {claimData.deliveryDate && <p className="text-sm"><span className="text-slate-500">Delivery:</span> {claimData.deliveryDate}</p>}
          {!origin && !destination && <p className="text-xs text-slate-400">No route information provided</p>}
        </div>
      </div>

      {parties.length > 0 && (
        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
          <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Parties ({parties.length})</h3>
          {parties.map((p, i) => <p key={i} className="text-sm"><span className="capitalize text-slate-500">{p.type}:</span> <span className="font-medium">{p.name}</span>{p.scacCode && <span className="text-xs font-mono text-slate-400 ml-1">({p.scacCode})</span>}</p>)}
        </div>
      )}

      {products.length > 0 && (
        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
          <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Products ({products.length})</h3>
          {products.map((p, i) => <p key={i} className="text-sm"><span className="font-medium">{p.productName}</span> — {p.quantity} {p.unitOfMeasure}{p.cost && `, $${p.cost}`}{p.claimCondition && ` (${p.claimCondition})`}</p>)}
        </div>
      )}

      {documents.length > 0 && (
        <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
          <h3 className="text-xs font-semibold text-slate-500 uppercase mb-2">Documents ({documents.length})</h3>
          {documents.map((d, i) => <p key={i} className="text-sm">{d.name} <span className="text-xs text-slate-400">({(d.size / 1024).toFixed(0)} KB)</span></p>)}
        </div>
      )}
    </div>
  );
}
