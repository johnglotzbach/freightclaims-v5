'use client';

import { useState, useRef, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { get, getList, post } from '@/lib/api-client';
import { fetchDocumentBlob } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { PdfViewer } from '@/components/pdf-viewer';
import {
  ArrowLeft, Send, Loader2, CheckCircle, AlertTriangle,
  Mail, Eye, FileText, Bold, Italic, Underline,
  Sparkles, ChevronDown, BellRing, Workflow, Clock,
  Users, Check, X, ExternalLink, CalendarDays,
  Package, DollarSign, Truck, Hash, MapPin,
} from 'lucide-react';
import type { Claim, ClaimParty, ClaimDocument } from 'shared';
import { formatCurrency, formatDate } from 'shared';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
}

interface WorkflowTemplate {
  id: string;
  name: string;
  description?: string;
}

type FilingStatus = 'pending' | 'sent' | 'acknowledged' | 'declined' | 'error';
type ReminderOption = 'none' | 'at_event' | '1_day' | '3_days' | '1_week' | '2_weeks' | '1_month';

const REMINDER_OPTIONS: { value: ReminderOption; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'at_event', label: 'At event' },
  { value: '1_day', label: '1 day before' },
  { value: '3_days', label: '3 days before' },
  { value: '1_week', label: '1 week before' },
  { value: '2_weeks', label: '2 weeks before' },
  { value: '1_month', label: '1 month before' },
];

const FILING_STATUS_CONFIG: Record<FilingStatus, { label: string; color: string; icon: typeof CheckCircle }> = {
  pending: { label: 'Pending', color: 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400', icon: Clock },
  sent: { label: 'Sent', color: 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400', icon: Send },
  acknowledged: { label: 'Acknowledged', color: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400', icon: CheckCircle },
  declined: { label: 'Declined', color: 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400', icon: X },
  error: { label: 'Error', color: 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400', icon: AlertTriangle },
};

interface PartyFilingState {
  selected: boolean;
  contactEmail: string;
  cc: string;
  bcc: string;
  filingStatus: FilingStatus;
}

export default function FileClaimPage() {
  const { id: claimId } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const [partyStates, setPartyStates] = useState<Record<string, PartyFilingState>>({});
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const templatePickerRef = useRef<HTMLDivElement>(null);

  // Reminders
  const [createFollowUp, setCreateFollowUp] = useState(false);
  const [followUpDate, setFollowUpDate] = useState('');
  const [reminderOption, setReminderOption] = useState<ReminderOption>('none');

  // Automation
  const [selectedWorkflow, setSelectedWorkflow] = useState('');

  // PDF viewer
  const [pdfViewerData, setPdfViewerData] = useState<{
    url: string;
    fileName: string;
    contentType?: string;
  } | null>(null);

  const { data: claim, isLoading } = useQuery({
    queryKey: ['claim', claimId],
    queryFn: () => get<Claim>(`/claims/${claimId}`),
    enabled: !!claimId,
  });

  const { data: emailTemplates = [] } = useQuery({
    queryKey: ['email-templates'],
    queryFn: () => getList<EmailTemplate>('/users/templates/email'),
    enabled: showTemplatePicker,
  });

  const { data: workflows = [] } = useQuery({
    queryKey: ['workflows'],
    queryFn: () => getList<WorkflowTemplate>('/workflows'),
  });

  const parties = claim?.parties || [];
  const carrierParties = parties.filter((p) => p.type === 'carrier');
  const documents = claim?.documents || [];

  // Initialize party states when claim loads
  useMemo(() => {
    if (carrierParties.length > 0 && Object.keys(partyStates).length === 0) {
      const initial: Record<string, PartyFilingState> = {};
      carrierParties.forEach((p) => {
        initial[p.id] = {
          selected: true,
          contactEmail: p.email || '',
          cc: '',
          bcc: '',
          filingStatus: (claim?.filingDate ? 'sent' : 'pending') as FilingStatus,
        };
      });
      setPartyStates(initial);
      if (claim?.claimNumber) {
        setSubject(`Freight Claim Filing - ${claim.claimNumber}`);
      }
    }
  }, [carrierParties.length, claim?.claimNumber]);

  function updatePartyState(partyId: string, updates: Partial<PartyFilingState>) {
    setPartyStates((prev) => ({
      ...prev,
      [partyId]: { ...prev[partyId], ...updates },
    }));
  }

  const selectedPartyIds = Object.entries(partyStates)
    .filter(([, s]) => s.selected)
    .map(([id]) => id);

  const aiComposeMutation = useMutation({
    mutationFn: () =>
      post<any>('/ai/run', {
        agentType: 'communication',
        input: { claimId, task: 'compose_email' },
      }),
    onSuccess: (data) => {
      const result = data?.result ?? data?.structuredOutput?.plan?.draftEmail ?? data;
      if (result?.body) setBody(result.body);
      if (result?.subject) setSubject(result.subject);
      toast.success('AI draft generated');
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.error || err?.message || 'AI draft failed'),
  });

  const fileMutation = useMutation({
    mutationFn: () => {
      const partyData = selectedPartyIds.map((pid) => {
        const ps = partyStates[pid];
        return {
          partyId: pid,
          to: ps.contactEmail ? [ps.contactEmail] : [],
          cc: ps.cc ? ps.cc.split(/[,;\s]+/).filter(Boolean) : [],
          bcc: ps.bcc ? ps.bcc.split(/[,;\s]+/).filter(Boolean) : [],
          subject,
          body,
        };
      });
      return post(`/claims/${claimId}/file`, {
        parties: partyData,
        subject,
        body,
        ...(createFollowUp && {
          followUp: {
            dueDate: followUpDate || undefined,
            reminder: reminderOption,
          },
        }),
        ...(selectedWorkflow && { workflowId: selectedWorkflow }),
      });
    },
    onSuccess: () => {
      toast.success('Claim filed successfully!');
      queryClient.invalidateQueries({ queryKey: ['claim', claimId] });
      selectedPartyIds.forEach((pid) => {
        updatePartyState(pid, { filingStatus: 'sent' });
      });
      router.push(`/claims/${claimId}`);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || err?.message || 'Failed to file claim');
      selectedPartyIds.forEach((pid) => {
        updatePartyState(pid, { filingStatus: 'error' });
      });
    },
  });

  function applyFormat(tag: string) {
    const ta = bodyRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = body.substring(start, end);
    const wrapped = `<${tag}>${selected}</${tag}>`;
    const newBody = body.substring(0, start) + wrapped + body.substring(end);
    setBody(newBody);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + tag.length + 2, end + tag.length + 2);
    }, 0);
  }

  function applyTemplate(template: EmailTemplate) {
    setSubject(template.subject || subject);
    setBody(template.body || body);
    setShowTemplatePicker(false);
    toast.success(`Template "${template.name}" applied`);
  }

  async function openDocumentPreview(doc: ClaimDocument) {
    try {
      const { blobUrl, contentType } = await fetchDocumentBlob(doc.id);
      setPdfViewerData({ url: blobUrl, fileName: doc.documentName, contentType });
    } catch {
      toast.error('Failed to load document preview');
    }
  }

  const validationIssues: string[] = [];
  if (!claim?.claimAmount || claim.claimAmount <= 0) validationIssues.push('Claim amount must be greater than $0');
  if (carrierParties.length === 0) validationIssues.push('At least one carrier party is required');
  if (selectedPartyIds.length === 0) validationIssues.push('Select at least one party to file with');
  if (documents.length === 0) validationIssues.push('At least one document is required');

  const missingDocs: string[] = [];
  if (!documents.some((d) => d.mimeType?.includes('bol') || d.documentName?.toLowerCase().includes('bol')))
    missingDocs.push('Bill of Lading');
  if (!documents.some((d) => d.mimeType?.includes('invoice') || d.documentName?.toLowerCase().includes('invoice')))
    missingDocs.push('Invoice');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-slate-500">
        <Link href={`/claims/${claimId}`} className="hover:text-primary-500 flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Claim
        </Link>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            File Claim {claim?.claimNumber}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Review details and file with carrier(s)
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Link
            href={`/claims/${claimId}`}
            className="px-4 py-2.5 text-sm text-slate-500 hover:text-slate-700 font-medium border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </Link>
          <button
            onClick={() => fileMutation.mutate()}
            disabled={validationIssues.length > 0 || fileMutation.isPending}
            className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
          >
            {fileMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            File Claim
          </button>
        </div>
      </div>

      {/* Validation warnings */}
      {validationIssues.length > 0 && (
        <div className="card p-4 border-l-4 border-red-500 bg-red-50 dark:bg-red-500/5">
          <h3 className="text-sm font-semibold text-red-800 dark:text-red-300 mb-2 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4" /> Filing Issues
          </h3>
          <ul className="space-y-1">
            {validationIssues.map((issue) => (
              <li key={issue} className="text-xs text-red-700 dark:text-red-400">• {issue}</li>
            ))}
          </ul>
        </div>
      )}

      {missingDocs.length > 0 && (
        <div className="card p-4 border-l-4 border-amber-500 bg-amber-50 dark:bg-amber-500/5">
          <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-2 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4" /> Missing Recommended Documents
          </h3>
          <ul className="space-y-1">
            {missingDocs.map((doc) => (
              <li key={doc} className="text-xs text-amber-700 dark:text-amber-400">• {doc}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Two-column layout */}
      <div className="flex gap-5">
        {/* ──────── Left Panel ──────── */}
        <div className="flex-1 min-w-0 space-y-5">
          {/* Party selection */}
          <div className="card p-5">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-400" /> Carrier Parties
            </h3>

            {carrierParties.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">
                No carrier parties added to this claim
              </p>
            ) : (
              <div className="space-y-3">
                {carrierParties.map((party) => {
                  const ps = partyStates[party.id];
                  if (!ps) return null;
                  const statusConfig = FILING_STATUS_CONFIG[ps.filingStatus];
                  const StatusIcon = statusConfig.icon;

                  return (
                    <div
                      key={party.id}
                      className={cn(
                        'rounded-xl border transition-all',
                        ps.selected
                          ? 'border-primary-200 dark:border-primary-500/30 bg-primary-50/30 dark:bg-primary-500/5'
                          : 'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50',
                      )}
                    >
                      {/* Party header */}
                      <div className="flex items-center gap-3 p-4">
                        <input
                          type="checkbox"
                          checked={ps.selected}
                          onChange={(e) => updatePartyState(party.id, { selected: e.target.checked })}
                          className="rounded border-slate-300 text-primary-500 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-slate-900 dark:text-white">
                              {party.name}
                            </p>
                            <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5', statusConfig.color)}>
                              <StatusIcon className="w-3 h-3" />
                              {statusConfig.label}
                            </span>
                          </div>
                          {party.scacCode && (
                            <p className="text-xs text-slate-500 font-mono">{party.scacCode}</p>
                          )}
                        </div>
                      </div>

                      {/* Per-party fields (visible when selected) */}
                      {ps.selected && (
                        <div className="px-4 pb-4 space-y-2.5 border-t border-slate-100 dark:border-slate-700/50 pt-3">
                          <div>
                            <label className="text-xs text-slate-500 mb-1 block">Contact Email</label>
                            <select
                              value={ps.contactEmail}
                              onChange={(e) => updatePartyState(party.id, { contactEmail: e.target.value })}
                              className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700"
                            >
                              <option value="">Select contact...</option>
                              {party.email && <option value={party.email}>{party.email}</option>}
                              {party.phone && (
                                <option value={party.phone}>{party.phone} (phone)</option>
                              )}
                            </select>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-xs text-slate-500 mb-1 block">CC</label>
                              <input
                                type="text"
                                value={ps.cc}
                                onChange={(e) => updatePartyState(party.id, { cc: e.target.value })}
                                placeholder="cc@example.com"
                                className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-slate-500 mb-1 block">BCC</label>
                              <input
                                type="text"
                                value={ps.bcc}
                                onChange={(e) => updatePartyState(party.id, { bcc: e.target.value })}
                                placeholder="bcc@example.com"
                                className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Email template + subject */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-400" /> Email Content
              </h3>
              <div className="relative" ref={templatePickerRef}>
                <button
                  onClick={() => setShowTemplatePicker(!showTemplatePicker)}
                  className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 border border-slate-200 dark:border-slate-600 rounded-lg px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  <FileText className="w-3.5 h-3.5" /> Template <ChevronDown className="w-3 h-3" />
                </button>
                {showTemplatePicker && (
                  <div className="absolute right-0 top-full mt-1 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-20 py-1 max-h-60 overflow-auto">
                    {emailTemplates.length === 0 ? (
                      <p className="px-3 py-3 text-xs text-slate-400 text-center">No templates available</p>
                    ) : (
                      emailTemplates.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => applyTemplate(t)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 truncate"
                        >
                          {t.name}
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-500 mb-1 block">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject..."
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700"
              />
            </div>

            {/* Formatting toolbar */}
            <div className="flex items-center gap-0.5 border-b border-slate-100 dark:border-slate-700 pb-2">
              <button
                onClick={() => applyFormat('b')}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                title="Bold"
              >
                <Bold className="w-4 h-4 text-slate-500" />
              </button>
              <button
                onClick={() => applyFormat('i')}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                title="Italic"
              >
                <Italic className="w-4 h-4 text-slate-500" />
              </button>
              <button
                onClick={() => applyFormat('u')}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                title="Underline"
              >
                <Underline className="w-4 h-4 text-slate-500" />
              </button>
              <div className="flex-1" />
              <button
                onClick={() => aiComposeMutation.mutate()}
                disabled={aiComposeMutation.isPending}
                className="flex items-center gap-1 text-xs text-purple-500 hover:text-purple-600 font-medium px-2.5 py-1.5 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-500/10 disabled:opacity-50 transition-colors"
              >
                {aiComposeMutation.isPending ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                Compose with AI
              </button>
            </div>

            <textarea
              ref={bodyRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={10}
              placeholder="Write the filing email body..."
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 resize-none font-sans focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-shadow"
            />
          </div>

          {/* Reminders */}
          <div className="card p-5 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={createFollowUp}
                onChange={(e) => setCreateFollowUp(e.target.checked)}
                className="rounded border-slate-300 text-primary-500"
              />
              <BellRing className="w-4 h-4 text-slate-400" />
              <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">
                Create a task to follow up
              </span>
            </label>
            {createFollowUp && (
              <div className="ml-6 flex flex-wrap gap-3">
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Due Date</label>
                  <input
                    type="date"
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    className="px-2.5 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">Reminder</label>
                  <select
                    value={reminderOption}
                    onChange={(e) => setReminderOption(e.target.value as ReminderOption)}
                    className="px-2.5 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700"
                  >
                    {REMINDER_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Automation */}
          <div className="card p-5">
            <div className="flex items-center gap-3">
              <Workflow className="w-4 h-4 text-slate-400 shrink-0" />
              <div className="flex-1">
                <label className="text-xs text-slate-500 block mb-1">Workflow Automation</label>
                <select
                  value={selectedWorkflow}
                  onChange={(e) => setSelectedWorkflow(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700"
                >
                  <option value="">No workflow</option>
                  {workflows.map((wf) => (
                    <option key={wf.id} value={wf.id}>{wf.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Acknowledge description */}
          <div className="card p-5 bg-emerald-50/50 dark:bg-emerald-500/5 border border-emerald-200 dark:border-emerald-500/20">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                  Click here to Acknowledge Claim
                </h4>
                <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1 leading-relaxed">
                  Filing will include an acknowledgment link in the email to the carrier. When the
                  carrier clicks the link, the claim status will be updated to "Acknowledged" and a
                  timestamp will be recorded. This provides proof that the carrier received and
                  acknowledged the claim filing.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ──────── Right Panel ──────── */}
        <div className="w-[400px] shrink-0 space-y-5">
          {/* Claim summary */}
          <div className="card p-5">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-4">Claim Details</h3>
            <div className="space-y-3">
              <DetailRow icon={Hash} label="Claim #" value={claim?.claimNumber || '—'} />
              <DetailRow icon={Truck} label="PRO #" value={claim?.proNumber || '—'} mono />
              <DetailRow
                icon={DollarSign}
                label="Amount"
                value={formatCurrency(claim?.claimAmount || 0)}
                highlight
              />
              <DetailRow
                icon={Package}
                label="Type"
                value={claim?.claimType?.replace(/_/g, ' ') || '—'}
              />
              <DetailRow
                icon={CalendarDays}
                label="Ship Date"
                value={claim?.shipDate ? formatDate(claim.shipDate) : '—'}
              />
              <DetailRow
                icon={CalendarDays}
                label="Delivery Date"
                value={claim?.deliveryDate ? formatDate(claim.deliveryDate) : '—'}
              />
              <DetailRow icon={FileText} label="Documents" value={`${documents.length} attached`} />
              {claim?.status && (
                <DetailRow
                  icon={Clock}
                  label="Status"
                  value={claim.status.replace(/_/g, ' ')}
                />
              )}
            </div>

            {claim?.description && (
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                <p className="text-xs text-slate-500 mb-1">Description</p>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                  {claim.description}
                </p>
              </div>
            )}

            {/* Products */}
            {claim?.products && claim.products.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                <p className="text-xs text-slate-500 mb-2">Products</p>
                <div className="space-y-2">
                  {claim.products.map((p) => (
                    <div key={p.id} className="flex items-center justify-between text-sm">
                      <span className="text-slate-700 dark:text-slate-300 truncate">
                        {p.description}
                      </span>
                      <span className="text-slate-500 shrink-0 ml-2">
                        x{p.quantity} {p.value ? `· ${formatCurrency(p.value)}` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Documents / PDF preview */}
          <div className="card p-5">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-400" /> Documents
            </h3>
            {documents.length === 0 ? (
              <p className="text-sm text-slate-400 py-4 text-center">No documents attached</p>
            ) : (
              <div className="space-y-1.5">
                {documents.map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => openDocumentPreview(doc)}
                    className="w-full flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-left group"
                  >
                    <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-700 dark:text-slate-300 truncate group-hover:text-primary-500 transition-colors">
                        {doc.documentName}
                      </p>
                      {doc.fileSize != null && (
                        <p className="text-xs text-slate-400">
                          {(doc.fileSize / 1024).toFixed(0)}KB
                          {doc.mimeType && ` · ${doc.mimeType.split('/').pop()}`}
                        </p>
                      )}
                    </div>
                    <Eye className="w-4 h-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Filing status tracking */}
          {carrierParties.length > 0 && (
            <div className="card p-5">
              <h3 className="font-semibold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" /> Filing Status
              </h3>
              <div className="space-y-2">
                {carrierParties.map((party) => {
                  const ps = partyStates[party.id];
                  if (!ps) return null;
                  const statusConfig = FILING_STATUS_CONFIG[ps.filingStatus];
                  const StatusIcon = statusConfig.icon;
                  return (
                    <div
                      key={party.id}
                      className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-50 dark:bg-slate-800/50"
                    >
                      <span className="text-sm text-slate-700 dark:text-slate-300 font-medium truncate">
                        {party.name}
                      </span>
                      <span
                        className={cn(
                          'text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5 shrink-0',
                          statusConfig.color,
                        )}
                      >
                        <StatusIcon className="w-3 h-3" />
                        {statusConfig.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* PDF Viewer modal */}
      {pdfViewerData && (
        <PdfViewer
          url={pdfViewerData.url}
          fileName={pdfViewerData.fileName}
          contentType={pdfViewerData.contentType}
          onClose={() => {
            if (pdfViewerData.url.startsWith('blob:')) URL.revokeObjectURL(pdfViewerData.url);
            setPdfViewerData(null);
          }}
        />
      )}
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
  mono,
  highlight,
}: {
  icon: typeof Hash;
  label: string;
  value: string;
  mono?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <Icon className="w-4 h-4 text-slate-400 shrink-0" />
      <span className="text-xs text-slate-500 w-24 shrink-0">{label}</span>
      <span
        className={cn(
          'text-sm truncate',
          highlight
            ? 'font-semibold text-emerald-600 dark:text-emerald-400'
            : 'text-slate-700 dark:text-slate-300',
          mono && 'font-mono',
        )}
      >
        {value}
      </span>
    </div>
  );
}
