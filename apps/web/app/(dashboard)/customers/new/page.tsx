'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { post } from '@/lib/api-client';
import { ArrowLeft, Building2, Users, CreditCard, Check, ChevronRight, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

const STEPS = [
  { key: 'corporate', label: 'Corporate', icon: Building2 },
  { key: 'claimant', label: 'Claimant Contact', icon: Users },
  { key: 'payee', label: 'Payee & Billing', icon: CreditCard },
] as const;

type StepKey = (typeof STEPS)[number]['key'];

const COUNTRIES = [
  'United States', 'Canada', 'Mexico', 'United Kingdom', 'Germany',
  'France', 'Australia', 'Japan', 'Brazil', 'India', 'Other',
];

interface CorporateData {
  code: string;
  name: string;
  country: string;
  zipCode: string;
  city: string;
  state: string;
  address: string;
  industry: string;
}

interface ClaimantData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  title: string;
  isPrimary: boolean;
}

interface PayeeData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  billingEmail: string;
  paymentMethod: string;
}

export default function NewCustomerWizard() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const [corporate, setCorporate] = useState<CorporateData>({
    code: '', name: '', country: 'United States', zipCode: '', city: '', state: '', address: '', industry: '',
  });

  const [claimant, setClaimant] = useState<ClaimantData>({
    firstName: '', lastName: '', email: '', phone: '', title: '', isPrimary: true,
  });

  const [payee, setPayee] = useState<PayeeData>({
    firstName: '', lastName: '', email: '', phone: '', billingEmail: '', paymentMethod: 'ach',
  });

  function canProceed(): boolean {
    if (currentStep === 0) return !!(corporate.name && corporate.code);
    if (currentStep === 1) return !!(claimant.firstName && claimant.email);
    return true;
  }

  function goNext() {
    if (!canProceed()) {
      toast.error('Please fill in the required fields');
      return;
    }
    if (currentStep < STEPS.length - 1) setCurrentStep(currentStep + 1);
  }

  function goBack() {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  }

  async function handleZipLookup(zip: string) {
    setCorporate((prev) => ({ ...prev, zipCode: zip }));
    if (zip.length === 5 && corporate.country === 'United States') {
      try {
        const res = await fetch(`https://api.zippopotam.us/us/${zip}`);
        if (res.ok) {
          const data = await res.json();
          const place = data.places?.[0];
          if (place) {
            setCorporate((prev) => ({
              ...prev,
              city: place['place name'] || prev.city,
              state: place['state abbreviation'] || prev.state,
            }));
          }
        }
      } catch {
        // ZIP lookup is best-effort
      }
    }
  }

  async function handleCreate() {
    setIsLoading(true);
    try {
      await post('/customers', {
        name: corporate.name,
        code: corporate.code,
        country: corporate.country,
        industry: corporate.industry,
        address: corporate.address,
        city: corporate.city,
        state: corporate.state,
        zipCode: corporate.zipCode,
        contacts: [
          {
            firstName: claimant.firstName,
            lastName: claimant.lastName,
            email: claimant.email,
            phone: claimant.phone,
            title: claimant.title,
            isPrimary: claimant.isPrimary,
            type: 'claimant',
          },
          ...(payee.firstName ? [{
            firstName: payee.firstName,
            lastName: payee.lastName,
            email: payee.email,
            phone: payee.phone,
            type: 'payee',
          }] : []),
        ],
        billingEmail: payee.billingEmail || claimant.email,
        paymentMethod: payee.paymentMethod,
      });
      toast.success('Customer created successfully');
      router.push('/customers');
    } catch {
      toast.error('Failed to create customer. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/customers" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Add Customer</h1>
          <p className="text-slate-500 text-sm mt-0.5">Create a new customer organization</p>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center justify-between">
        {STEPS.map((step, idx) => {
          const isActive = idx === currentStep;
          const isCompleted = idx < currentStep;
          return (
            <div key={step.key} className="flex items-center flex-1 last:flex-initial">
              <button
                onClick={() => idx < currentStep && setCurrentStep(idx)}
                className={cn(
                  'flex items-center gap-2.5 px-4 py-2.5 rounded-xl transition-all',
                  isActive && 'bg-primary-50 dark:bg-primary-950 ring-2 ring-primary-500/30',
                  isCompleted && 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800',
                  !isActive && !isCompleted && 'opacity-50',
                )}
                disabled={idx > currentStep}
              >
                <div className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors',
                  isCompleted ? 'bg-emerald-500 text-white' :
                  isActive ? 'bg-primary-500 text-white' :
                  'bg-slate-200 dark:bg-slate-700 text-slate-500',
                )}>
                  {isCompleted ? <Check className="w-4 h-4" /> : idx + 1}
                </div>
                <div className="text-left hidden sm:block">
                  <p className={cn('text-xs font-semibold', isActive ? 'text-primary-600 dark:text-primary-400' : 'text-slate-500')}>
                    Step {idx + 1}
                  </p>
                  <p className={cn('text-sm font-medium', isActive ? 'text-slate-900 dark:text-white' : 'text-slate-500')}>
                    {step.label}
                  </p>
                </div>
              </button>
              {idx < STEPS.length - 1 && (
                <div className={cn('flex-1 h-0.5 mx-3 rounded-full', idx < currentStep ? 'bg-emerald-400' : 'bg-slate-200 dark:bg-slate-700')} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <div className="card p-6 space-y-6">
        {currentStep === 0 && (
          <CorporateStep data={corporate} onChange={setCorporate} onZipLookup={handleZipLookup} />
        )}
        {currentStep === 1 && (
          <ClaimantStep data={claimant} onChange={setClaimant} />
        )}
        {currentStep === 2 && (
          <PayeeStep data={payee} onChange={setPayee} />
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-2">
        <div>
          {currentStep > 0 ? (
            <button onClick={goBack} className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white border border-slate-300 dark:border-slate-600 rounded-lg transition-colors">
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
          ) : (
            <Link href="/customers" className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors">
              Cancel
            </Link>
          )}
        </div>
        <div>
          {currentStep < STEPS.length - 1 ? (
            <button onClick={goNext} disabled={!canProceed()} className="inline-flex items-center gap-2 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors">
              Next <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={handleCreate} disabled={isLoading} className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors">
              {isLoading ? 'Creating...' : 'Create Customer'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- Step 1: Corporate ---------- */

function CorporateStep({ data, onChange, onZipLookup }: {
  data: CorporateData;
  onChange: (data: CorporateData) => void;
  onZipLookup: (zip: string) => void;
}) {
  const update = (field: keyof CorporateData, value: string) => onChange({ ...data, [field]: value });

  return (
    <>
      <div className="flex items-center gap-2 pb-4 border-b border-slate-200 dark:border-slate-700">
        <Building2 className="w-5 h-5 text-primary-500" />
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Corporate Information</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Company Code *</label>
          <input
            type="text"
            required
            value={data.code}
            onChange={(e) => update('code', e.target.value.toUpperCase())}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white text-sm font-mono"
            placeholder="ACME-001"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Company Name *</label>
          <input
            type="text"
            required
            value={data.name}
            onChange={(e) => update('name', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white text-sm"
            placeholder="Acme Logistics Inc."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Country</label>
          <select
            value={data.country}
            onChange={(e) => update('country', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white text-sm"
          >
            {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Industry</label>
          <select
            value={data.industry}
            onChange={(e) => update('industry', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white text-sm"
          >
            <option value="">Select industry</option>
            <option>Manufacturing</option>
            <option>Retail</option>
            <option>E-Commerce</option>
            <option>Food & Beverage</option>
            <option>Automotive</option>
            <option>Electronics</option>
            <option>Pharmaceuticals</option>
            <option>Construction</option>
            <option>Agriculture</option>
            <option>Other</option>
          </select>
        </div>
      </div>

      <div className="pt-2">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Corporate Address</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Street Address</label>
            <input
              type="text"
              value={data.address}
              onChange={(e) => update('address', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white text-sm"
              placeholder="123 Main Street, Suite 100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">ZIP Code</label>
            <input
              type="text"
              maxLength={10}
              value={data.zipCode}
              onChange={(e) => onZipLookup(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white text-sm"
              placeholder="44101"
            />
            {data.country === 'United States' && (
              <p className="text-[10px] text-slate-400 mt-1">Enter 5-digit ZIP to auto-fill city/state</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">City</label>
            <input
              type="text"
              value={data.city}
              onChange={(e) => update('city', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">State</label>
            <input
              type="text"
              maxLength={2}
              value={data.state}
              onChange={(e) => update('state', e.target.value.toUpperCase())}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white text-sm"
              placeholder="OH"
            />
          </div>
        </div>
      </div>
    </>
  );
}

/* ---------- Step 2: Claimant ---------- */

function ClaimantStep({ data, onChange }: {
  data: ClaimantData;
  onChange: (data: ClaimantData) => void;
}) {
  const update = (field: keyof ClaimantData, value: string | boolean) => onChange({ ...data, [field]: value });

  return (
    <>
      <div className="flex items-center gap-2 pb-4 border-b border-slate-200 dark:border-slate-700">
        <Users className="w-5 h-5 text-primary-500" />
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Claimant Contact</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">First Name *</label>
          <input
            type="text"
            required
            value={data.firstName}
            onChange={(e) => update('firstName', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white text-sm"
            placeholder="John"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Last Name</label>
          <input
            type="text"
            value={data.lastName}
            onChange={(e) => update('lastName', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white text-sm"
            placeholder="Smith"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email *</label>
          <input
            type="email"
            required
            value={data.email}
            onChange={(e) => update('email', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white text-sm"
            placeholder="john.smith@acme.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Phone</label>
          <input
            type="tel"
            value={data.phone}
            onChange={(e) => update('phone', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white text-sm"
            placeholder="(555) 123-4567"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Title</label>
          <input
            type="text"
            value={data.title}
            onChange={(e) => update('title', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white text-sm"
            placeholder="Claims Manager"
          />
        </div>
        <div className="flex items-end pb-1">
          <label className="flex items-center gap-3 cursor-pointer">
            <div className="relative">
              <input
                type="checkbox"
                checked={data.isPrimary}
                onChange={(e) => update('isPrimary', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-slate-300 dark:bg-slate-600 rounded-full peer-checked:bg-primary-500 transition-colors" />
              <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5" />
            </div>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Primary Contact</span>
          </label>
        </div>
      </div>
    </>
  );
}

/* ---------- Step 3: Payee ---------- */

function PayeeStep({ data, onChange }: {
  data: PayeeData;
  onChange: (data: PayeeData) => void;
}) {
  const update = (field: keyof PayeeData, value: string) => onChange({ ...data, [field]: value });

  return (
    <>
      <div className="flex items-center gap-2 pb-4 border-b border-slate-200 dark:border-slate-700">
        <CreditCard className="w-5 h-5 text-primary-500" />
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Payee & Billing</h2>
      </div>

      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Payee Contact</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">First Name</label>
          <input
            type="text"
            value={data.firstName}
            onChange={(e) => update('firstName', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white text-sm"
            placeholder="Jane"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Last Name</label>
          <input
            type="text"
            value={data.lastName}
            onChange={(e) => update('lastName', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white text-sm"
            placeholder="Doe"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
          <input
            type="email"
            value={data.email}
            onChange={(e) => update('email', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white text-sm"
            placeholder="payee@acme.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Phone</label>
          <input
            type="tel"
            value={data.phone}
            onChange={(e) => update('phone', e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white text-sm"
          />
        </div>
      </div>

      <div className="pt-4 border-t border-slate-200 dark:border-slate-700 space-y-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Billing Settings</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Billing Email</label>
            <input
              type="email"
              value={data.billingEmail}
              onChange={(e) => update('billingEmail', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white text-sm"
              placeholder="billing@acme.com"
            />
            <p className="text-[10px] text-slate-400 mt-1">Defaults to claimant email if blank</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Payment Method Preference</label>
            <select
              value={data.paymentMethod}
              onChange={(e) => update('paymentMethod', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg dark:bg-slate-700 dark:text-white text-sm"
            >
              <option value="ach">ACH Transfer</option>
              <option value="check">Check</option>
              <option value="wire">Wire Transfer</option>
              <option value="credit_card">Credit Card</option>
            </select>
          </div>
        </div>
      </div>
    </>
  );
}
