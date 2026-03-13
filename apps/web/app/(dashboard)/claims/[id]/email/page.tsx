'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { get, getList, post, uploadFile } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { TableSkeleton, EmptyState } from '@/components/ui/loading';
import { toast } from 'sonner';
import {
  Mail, Send, Paperclip, X, Plus, ArrowLeft,
  Bold, Italic, Underline, List, Link2,
  FileText, Loader2, Sparkles,
  FileUp, ChevronDown, Reply, Forward,
  Search, Copy, Check, Eye, Clock,
  CalendarDays, BellRing, Workflow,
  ChevronRight, Inbox, ArrowUpRight,
} from 'lucide-react';
import type { Claim, ClaimDocument } from 'shared';

interface Email {
  id: string;
  from: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  date: string;
  isRead: boolean;
  isInbound: boolean;
  direction?: 'IN' | 'OUT';
  openCount?: number;
  threadId?: string;
  inReplyTo?: string;
  attachments?: { id?: string; name: string; size: number }[];
}

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

interface EmailAttachment {
  id: string;
  name: string;
  size: number;
  source: 'upload' | 'claim';
}

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

export default function ClaimEmailPage() {
  const { id: claimId } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [recipientFilter, setRecipientFilter] = useState<string>('all');
  const [copiedAddress, setCopiedAddress] = useState(false);

  // Compose state
  const [to, setTo] = useState<string[]>([]);
  const [toInput, setToInput] = useState('');
  const [cc, setCc] = useState<string[]>([]);
  const [ccInput, setCcInput] = useState('');
  const [bcc, setBcc] = useState<string[]>([]);
  const [bccInput, setBccInput] = useState('');
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [attachments, setAttachments] = useState<EmailAttachment[]>([]);
  const [replyTo, setReplyTo] = useState<{ inReplyTo?: string; threadId?: string } | null>(null);

  // Template / documents
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [showDocumentsModal, setShowDocumentsModal] = useState(false);
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());

  // Reminders
  const [createFollowUp, setCreateFollowUp] = useState(false);
  const [followUpDate, setFollowUpDate] = useState('');
  const [reminderOption, setReminderOption] = useState<ReminderOption>('none');

  // Automation
  const [selectedWorkflow, setSelectedWorkflow] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const templatePickerRef = useRef<HTMLDivElement>(null);

  const { data: claim } = useQuery({
    queryKey: ['claim', claimId],
    queryFn: () => get<Claim>(`/claims/${claimId}`),
    enabled: !!claimId,
  });

  const { data: emails = [], isLoading } = useQuery({
    queryKey: ['claim-emails', claimId],
    queryFn: () => getList<Email>(`/email/claim/${claimId}`),
    enabled: !!claimId,
  });

  const { data: emailTemplates = [] } = useQuery({
    queryKey: ['email-templates'],
    queryFn: () => getList<EmailTemplate>('/users/templates/email'),
    enabled: showTemplatePicker,
  });

  const { data: claimDocuments = [] } = useQuery({
    queryKey: ['claim-documents', claimId],
    queryFn: () => {
      if (claim?.documents && claim.documents.length > 0) return Promise.resolve(claim.documents);
      return getList<ClaimDocument>(`/claims/${claimId}/documents`);
    },
    enabled: !!claimId && showDocumentsModal,
  });

  const { data: workflows = [] } = useQuery({
    queryKey: ['workflows'],
    queryFn: () => getList<WorkflowTemplate>('/workflows'),
    enabled: !!selectedWorkflow || selectedWorkflow === '',
  });

  const claimAddress = claim?.claimNumber
    ? `claim-${claim.claimNumber}@inbound.freightclaims.com`
    : '';

  const uniqueRecipients = Array.from(new Set(emails.flatMap((e) => {
    const addrs: string[] = [];
    if (e.to) addrs.push(e.to);
    if (e.from) addrs.push(e.from);
    return addrs;
  }).filter(Boolean)));

  const filteredEmails = emails.filter((e) => {
    if (recipientFilter !== 'all') {
      const matchesRecipient = e.to?.includes(recipientFilter) || e.from?.includes(recipientFilter);
      if (!matchesRecipient) return false;
    }
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      e.subject?.toLowerCase().includes(q) ||
      e.from?.toLowerCase().includes(q) ||
      e.body?.toLowerCase().includes(q)
    );
  });

  const selectedEmail = emails.find((e) => e.id === selectedEmailId) ?? null;
  const threadEmails = selectedEmail?.threadId
    ? emails.filter((e) => e.threadId === selectedEmail.threadId && e.id !== selectedEmail.id)
    : [];

  const sendMutation = useMutation({
    mutationFn: (payload: {
      to: string[];
      cc: string[];
      bcc: string[];
      subject: string;
      body: string;
      claimId: string;
      attachmentIds?: string[];
      inReplyTo?: string;
      threadId?: string;
    }) => post<{ sent: boolean }>('/email/send', payload),
    onSuccess: () => {
      toast.success('Email sent successfully');
      resetCompose();
      queryClient.invalidateQueries({ queryKey: ['claim-emails', claimId] });
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.error || err?.message || 'Failed to send email'),
  });

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
      if (result?.to) {
        const recipients = Array.isArray(result.to) ? result.to : [result.to];
        setTo(recipients);
      }
      toast.success('AI draft generated');
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.error || err?.message || 'AI draft failed'),
  });

  function resetCompose() {
    setComposing(false);
    setTo([]);
    setToInput('');
    setCc([]);
    setCcInput('');
    setBcc([]);
    setBccInput('');
    setShowCc(false);
    setShowBcc(false);
    setSubject('');
    setBody('');
    setAttachments([]);
    setReplyTo(null);
    setCreateFollowUp(false);
    setFollowUpDate('');
    setReminderOption('none');
    setSelectedWorkflow('');
    setShowTemplatePicker(false);
    setSelectedDocIds(new Set());
  }

  function handleNewEmail() {
    resetCompose();
    setComposing(true);
    setSubject(claim?.claimNumber ? `RE: Freight Claim - ${claim.claimNumber}` : '');
  }

  function handleReply(email: Email) {
    resetCompose();
    setComposing(true);
    const recipient = email.isInbound ? email.from : (email.to ?? []).join(', ');
    setTo(recipient ? [recipient] : []);
    setSubject(email.subject.startsWith('RE:') ? email.subject : `RE: ${email.subject}`);
    setBody(
      `\n\n---\nOn ${new Date(email.date).toLocaleDateString()}, ${email.from} wrote:\n\n${email.body}`,
    );
    setReplyTo({ inReplyTo: email.id, threadId: email.threadId });
  }

  function handleForward(email: Email) {
    resetCompose();
    setComposing(true);
    setSubject(`FW: ${email.subject}`);
    setBody(
      `\n\n--- Forwarded Message ---\nFrom: ${email.from}\nDate: ${new Date(email.date).toLocaleDateString()}\n\n${email.body}`,
    );
  }

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

  function addRecipient(
    value: string,
    list: string[],
    setList: (v: string[]) => void,
    setInput: (v: string) => void,
  ) {
    const trimmed = value.trim().replace(/[,;]$/, '').trim();
    if (trimmed && !list.includes(trimmed)) {
      setList([...list, trimmed]);
    }
    setInput('');
  }

  function handleRecipientKeyDown(
    e: React.KeyboardEvent,
    inputValue: string,
    list: string[],
    setList: (v: string[]) => void,
    setInput: (v: string) => void,
  ) {
    if (['Enter', 'Tab', ',', ';'].includes(e.key) && inputValue.trim()) {
      e.preventDefault();
      addRecipient(inputValue, list, setList, setInput);
    }
    if (e.key === 'Backspace' && !inputValue && list.length > 0) {
      setList(list.slice(0, -1));
    }
  }

  function handleSend() {
    if (to.length === 0) {
      toast.error('At least one recipient is required');
      return;
    }
    const attachmentIds = attachments.map((a) => a.id);
    sendMutation.mutate({
      to,
      cc,
      bcc,
      subject,
      body,
      claimId: claimId!,
      ...(attachmentIds.length > 0 && { attachmentIds }),
      ...(replyTo?.inReplyTo && { inReplyTo: replyTo.inReplyTo }),
      ...(replyTo?.threadId && { threadId: replyTo.threadId }),
    });
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    for (const file of files) {
      try {
        const formData = new FormData();
        formData.append('files', file);
        if (claimId) formData.append('claimId', claimId);
        formData.append('documentName', file.name);
        const result = await uploadFile('/documents/upload', formData);
        const doc = Array.isArray(result) ? result[0] : result;
        if (doc?.id) {
          setAttachments((prev) => [
            ...prev,
            { id: doc.id, name: file.name, size: file.size, source: 'upload' },
          ]);
          toast.success(`${file.name} attached`);
        }
      } catch {
        toast.error(`Failed to upload ${file.name}`);
      }
    }
    e.target.value = '';
  }

  function handleAttachSelectedDocuments() {
    const docs = claimDocuments.filter((d) => selectedDocIds.has(d.id));
    const newAttachments: EmailAttachment[] = docs
      .filter((d) => !attachments.some((a) => a.id === d.id))
      .map((d) => ({
        id: d.id,
        name: d.documentName,
        size: d.fileSize ?? 0,
        source: 'claim' as const,
      }));
    setAttachments((prev) => [...prev, ...newAttachments]);
    setShowDocumentsModal(false);
    setSelectedDocIds(new Set());
    if (newAttachments.length > 0) {
      toast.success(`${newAttachments.length} document(s) attached`);
    }
  }

  function applyTemplate(template: EmailTemplate) {
    setSubject(template.subject || subject);
    setBody(template.body || body);
    setShowTemplatePicker(false);
    toast.success(`Template "${template.name}" applied`);
  }

  async function copyClaimAddress() {
    try {
      await navigator.clipboard.writeText(claimAddress);
      setCopiedAddress(true);
      toast.success('Email address copied');
      setTimeout(() => setCopiedAddress(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (templatePickerRef.current && !templatePickerRef.current.contains(e.target as Node)) {
        setShowTemplatePicker(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const groupedDocuments = claimDocuments.reduce<Record<string, ClaimDocument[]>>((acc, doc) => {
    const category = doc.categoryId || 'Uncategorized';
    if (!acc[category]) acc[category] = [];
    acc[category].push(doc);
    return acc;
  }, {});

  if (isLoading) {
    return (
      <div className="space-y-6">
        <nav className="flex items-center gap-2 text-sm text-slate-500">
          <Link
            href={`/claims/${claimId}`}
            className="hover:text-primary-500 flex items-center gap-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Claim
          </Link>
        </nav>
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            Emails — Claim {claim?.claimNumber || claimId}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Loading emails...</p>
        </div>
        <TableSkeleton rows={4} cols={4} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-slate-500">
        <Link
          href={`/claims/${claimId}`}
          className="hover:text-primary-500 flex items-center gap-1"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Claim
        </Link>
      </nav>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            Emails — {claim?.claimNumber || `Claim ${claimId}`}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">{emails.length} email(s)</p>
        </div>
        <button
          onClick={handleNewEmail}
          className="flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" /> New Email
        </button>
      </div>

      {/* Claim inbound address */}
      {claimAddress && (
        <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
          <Inbox className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="text-sm text-slate-600 dark:text-slate-300 font-mono truncate">
            {claimAddress}
          </span>
          <button
            onClick={copyClaimAddress}
            className="ml-auto flex items-center gap-1 text-xs font-medium text-primary-500 hover:text-primary-600 shrink-0"
          >
            {copiedAddress ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            {copiedAddress ? 'Copied' : 'Copy'}
          </button>
        </div>
      )}

      <div className="flex gap-5 min-h-[600px]">
        {/* Left panel — email list */}
        <div className="w-[380px] shrink-0 flex flex-col card overflow-hidden">
          {/* Search + Recipients filter */}
          <div className="p-3 border-b border-slate-100 dark:border-slate-700 space-y-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search email contents..."
                className="w-full pl-8 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 placeholder:text-slate-400"
              />
            </div>
            <select
              value={recipientFilter}
              onChange={(e) => setRecipientFilter(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300"
            >
              <option value="all">All Recipients</option>
              {uniqueRecipients.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* Email list */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/50">
            {filteredEmails.length === 0 ? (
              <div className="p-8 text-center">
                <Mail className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-500">
                  {searchQuery ? 'No emails match your search' : 'No emails yet'}
                </p>
              </div>
            ) : (
              filteredEmails.map((email) => {
                const isInbound = email.isInbound || email.direction === 'IN';
                return (
                  <button
                    key={email.id}
                    onClick={() => {
                      setSelectedEmailId(email.id);
                      setComposing(false);
                    }}
                    className={cn(
                      'w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors',
                      selectedEmailId === email.id &&
                        'bg-primary-50 dark:bg-primary-500/10 border-l-2 border-primary-500',
                      !email.isRead && 'bg-blue-50/50 dark:bg-blue-500/5',
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={cn(
                          'text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0',
                          isInbound
                            ? 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400'
                            : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400',
                        )}
                      >
                        {isInbound ? 'IN' : 'OUT'}
                      </span>
                      <span className="text-sm font-medium text-slate-900 dark:text-white truncate">
                        {email.from}
                      </span>
                      <span className="text-[10px] text-slate-400 ml-auto shrink-0">
                        {new Date(email.date).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 truncate font-medium">
                      {email.subject || '(no subject)'}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-slate-500 truncate flex-1">
                        {email.body?.replace(/<[^>]+>/g, '').substring(0, 80)}
                      </p>
                      {(email.openCount ?? 0) > 0 && (
                        <span className="flex items-center gap-0.5 text-[10px] text-slate-400 shrink-0">
                          <Eye className="w-3 h-3" />
                          {email.openCount}
                        </span>
                      )}
                      {email.attachments && email.attachments.length > 0 && (
                        <Paperclip className="w-3 h-3 text-slate-400 shrink-0" />
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right panel — compose or detail */}
        <div className="flex-1 min-w-0">
          {composing ? (
            /* ──────── Compose Panel ──────── */
            <div className="card p-5 border-2 border-primary-200 dark:border-primary-500/30 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Mail className="w-4 h-4" /> Compose Email
                </h3>
                <button
                  onClick={resetCompose}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                >
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>

              {/* Recipients */}
              <RecipientField
                label="To"
                recipients={to}
                inputValue={toInput}
                onInputChange={setToInput}
                onAdd={(v) => addRecipient(v, to, setTo, setToInput)}
                onRemove={(v) => setTo(to.filter((r) => r !== v))}
                onKeyDown={(e) => handleRecipientKeyDown(e, toInput, to, setTo, setToInput)}
                actions={
                  <div className="flex gap-1 shrink-0">
                    {!showCc && (
                      <button
                        onClick={() => setShowCc(true)}
                        className="text-xs text-primary-500 font-medium px-1"
                      >
                        Cc
                      </button>
                    )}
                    {!showBcc && (
                      <button
                        onClick={() => setShowBcc(true)}
                        className="text-xs text-primary-500 font-medium px-1"
                      >
                        Bcc
                      </button>
                    )}
                  </div>
                }
              />
              {showCc && (
                <RecipientField
                  label="Cc"
                  recipients={cc}
                  inputValue={ccInput}
                  onInputChange={setCcInput}
                  onAdd={(v) => addRecipient(v, cc, setCc, setCcInput)}
                  onRemove={(v) => setCc(cc.filter((r) => r !== v))}
                  onKeyDown={(e) => handleRecipientKeyDown(e, ccInput, cc, setCc, setCcInput)}
                />
              )}
              {showBcc && (
                <RecipientField
                  label="Bcc"
                  recipients={bcc}
                  inputValue={bccInput}
                  onInputChange={setBccInput}
                  onAdd={(v) => addRecipient(v, bcc, setBcc, setBccInput)}
                  onRemove={(v) => setBcc(bcc.filter((r) => r !== v))}
                  onKeyDown={(e) => handleRecipientKeyDown(e, bccInput, bcc, setBcc, setBccInput)}
                />
              )}

              {/* Subject + template picker */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-slate-500 w-14 shrink-0">Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Subject line..."
                  className="flex-1 px-3 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700"
                />
                <div className="relative" ref={templatePickerRef}>
                  <button
                    onClick={() => setShowTemplatePicker(!showTemplatePicker)}
                    className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 border border-slate-200 dark:border-slate-600 rounded-lg px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700 shrink-0"
                  >
                    <FileText className="w-3.5 h-3.5" /> Template <ChevronDown className="w-3 h-3" />
                  </button>
                  {showTemplatePicker && (
                    <div className="absolute right-0 top-full mt-1 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-20 py-1 max-h-60 overflow-auto">
                      {emailTemplates.length === 0 ? (
                        <p className="px-3 py-3 text-xs text-slate-400 text-center">
                          No templates available
                        </p>
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
                <button
                  onClick={() => {
                    const ta = bodyRef.current;
                    if (!ta) return;
                    const start = ta.selectionStart;
                    const newBody = body.substring(0, start) + '\n<ul>\n  <li></li>\n</ul>' + body.substring(start);
                    setBody(newBody);
                  }}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                  title="List"
                >
                  <List className="w-4 h-4 text-slate-500" />
                </button>
                <button
                  onClick={() => {
                    const url = prompt('Enter URL:');
                    if (url) {
                      const ta = bodyRef.current;
                      if (!ta) return;
                      const start = ta.selectionStart;
                      const end = ta.selectionEnd;
                      const selectedText = body.substring(start, end) || 'link';
                      const newBody =
                        body.substring(0, start) +
                        `<a href="${url}">${selectedText}</a>` +
                        body.substring(end);
                      setBody(newBody);
                    }
                  }}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
                  title="Insert Link"
                >
                  <Link2 className="w-4 h-4 text-slate-500" />
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

              {/* Body */}
              <textarea
                ref={bodyRef}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={12}
                placeholder="Write your email..."
                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 resize-none font-sans focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-shadow"
              />

              {/* Attachments */}
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {attachments.map((att) => (
                    <span
                      key={att.id}
                      className="flex items-center gap-1.5 text-xs bg-slate-100 dark:bg-slate-700 px-2.5 py-1.5 rounded-lg"
                    >
                      <Paperclip className="w-3 h-3 text-slate-400" />
                      <span className="max-w-[140px] truncate">{att.name}</span>
                      <span className="text-slate-400">({(att.size / 1024).toFixed(0)}KB)</span>
                      <button
                        onClick={() => setAttachments(attachments.filter((a) => a.id !== att.id))}
                      >
                        <X className="w-3 h-3 text-slate-400 hover:text-red-500" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Attachment actions */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 border border-slate-200 dark:border-slate-600 rounded-lg px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  <FileUp className="w-3.5 h-3.5" /> Upload File
                </button>
                <button
                  onClick={() => setShowDocumentsModal(true)}
                  className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 border border-slate-200 dark:border-slate-600 rounded-lg px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  <FileText className="w-3.5 h-3.5" /> Add from Claim Documents
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>

              {/* Divider */}
              <div className="border-t border-slate-100 dark:border-slate-700" />

              {/* Reminders */}
              <div className="space-y-3">
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
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Automation */}
              <div className="flex items-center gap-3">
                <Workflow className="w-4 h-4 text-slate-400 shrink-0" />
                <div className="flex-1">
                  <label className="text-xs text-slate-500 block mb-1">
                    Workflow Automation
                  </label>
                  <select
                    value={selectedWorkflow}
                    onChange={(e) => setSelectedWorkflow(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700"
                  >
                    <option value="">No workflow</option>
                    {workflows.map((wf) => (
                      <option key={wf.id} value={wf.id}>
                        {wf.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Send actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                <button
                  onClick={resetCompose}
                  className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 font-medium"
                >
                  Discard
                </button>
                <button
                  onClick={handleSend}
                  disabled={sendMutation.isPending || to.length === 0}
                  className="flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {sendMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Send
                </button>
              </div>
            </div>
          ) : selectedEmail ? (
            /* ──────── Email Detail ──────── */
            <div className="card overflow-hidden">
              {/* Detail header */}
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-700">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">
                      {selectedEmail.subject || '(no subject)'}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <span
                        className={cn(
                          'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                          selectedEmail.isInbound
                            ? 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400'
                            : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400',
                        )}
                      >
                        {selectedEmail.isInbound ? 'INBOUND' : 'OUTBOUND'}
                      </span>
                      <span className="font-medium">{selectedEmail.from}</span>
                      <ChevronRight className="w-3 h-3 text-slate-400" />
                      <span className="truncate">{(selectedEmail.to ?? []).join(', ')}</span>
                    </div>
                    {selectedEmail.cc && selectedEmail.cc.length > 0 && (
                      <p className="text-xs text-slate-500 mt-0.5">
                        Cc: {selectedEmail.cc.join(', ')}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-slate-400">
                      {new Date(selectedEmail.date).toLocaleDateString()}{' '}
                      {new Date(selectedEmail.date).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                    {(selectedEmail.openCount ?? 0) > 0 && (
                      <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-0.5 justify-end">
                        <Eye className="w-3 h-3" /> Opened {selectedEmail.openCount} time(s)
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="px-5 py-4">
                <div
                  className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-sans leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: selectedEmail.body }}
                />
              </div>

              {/* Attachments */}
              {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
                <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-700/50">
                  <p className="text-xs text-slate-500 mb-2 font-medium">Attachments</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedEmail.attachments.map((a, i) => (
                      <span
                        key={i}
                        className="flex items-center gap-1.5 text-xs bg-slate-50 dark:bg-slate-700 px-2.5 py-1.5 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600 transition-colors"
                      >
                        <Paperclip className="w-3 h-3 text-slate-400" /> {a.name}{' '}
                        <span className="text-slate-400">({(a.size / 1024).toFixed(0)}KB)</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Thread */}
              {threadEmails.length > 0 && (
                <div className="border-t border-slate-100 dark:border-slate-700">
                  <div className="px-5 py-3">
                    <p className="text-xs text-slate-500 font-medium mb-2">
                      Thread ({threadEmails.length + 1} messages)
                    </p>
                  </div>
                  {threadEmails.map((te) => (
                    <div
                      key={te.id}
                      className="px-5 py-3 border-t border-slate-50 dark:border-slate-700/50"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                          {te.from}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(te.date).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
                        {te.body?.replace(/<[^>]+>/g, '').substring(0, 300)}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-700 flex gap-2">
                <button
                  onClick={() => handleReply(selectedEmail)}
                  className="flex items-center gap-1.5 text-sm text-primary-500 hover:text-primary-600 font-medium px-3 py-1.5 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-500/10 transition-colors"
                >
                  <Reply className="w-4 h-4" /> Reply
                </button>
                <button
                  onClick={() => handleForward(selectedEmail)}
                  className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 font-medium px-3 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  <Forward className="w-4 h-4" /> Forward
                </button>
              </div>
            </div>
          ) : (
            /* ──────── Empty state ──────── */
            <div className="card flex items-center justify-center h-full min-h-[400px]">
              <div className="text-center">
                <ArrowUpRight className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-sm text-slate-500 font-medium">
                  Select an email or compose a new one
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ──────── Claim Documents Modal ──────── */}
      {showDocumentsModal && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setShowDocumentsModal(false)}
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg max-h-[70vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="font-semibold text-slate-900 dark:text-white">
                Attach Claim Documents
              </h3>
              <button
                onClick={() => setShowDocumentsModal(false)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
              >
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-3">
              {claimDocuments.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-8">
                  No documents available for this claim
                </p>
              ) : (
                Object.entries(groupedDocuments).map(([category, docs]) => (
                  <div key={category} className="mb-4">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                      {category}
                    </p>
                    <div className="space-y-1">
                      {docs.map((doc) => {
                        const alreadyAttached = attachments.some((a) => a.id === doc.id);
                        return (
                          <label
                            key={doc.id}
                            className={cn(
                              'flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors',
                              selectedDocIds.has(doc.id)
                                ? 'bg-primary-50 dark:bg-primary-500/10'
                                : 'hover:bg-slate-50 dark:hover:bg-slate-700/50',
                              alreadyAttached && 'opacity-50 cursor-not-allowed',
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={selectedDocIds.has(doc.id)}
                              disabled={alreadyAttached}
                              onChange={(e) => {
                                const next = new Set(selectedDocIds);
                                if (e.target.checked) next.add(doc.id);
                                else next.delete(doc.id);
                                setSelectedDocIds(next);
                              }}
                              className="rounded border-slate-300 text-primary-500"
                            />
                            <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                            <span className="text-sm text-slate-700 dark:text-slate-300 truncate">
                              {doc.documentName}
                            </span>
                            {doc.fileSize != null && (
                              <span className="text-xs text-slate-400 ml-auto shrink-0">
                                {(doc.fileSize / 1024).toFixed(0)}KB
                              </span>
                            )}
                            {alreadyAttached && (
                              <span className="text-[10px] text-primary-500 font-medium shrink-0">
                                Added
                              </span>
                            )}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setShowDocumentsModal(false)}
                className="px-4 py-2 text-sm text-slate-500 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleAttachSelectedDocuments}
                disabled={selectedDocIds.size === 0}
                className="flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
              >
                <Paperclip className="w-4 h-4" /> Attach {selectedDocIds.size > 0 && `(${selectedDocIds.size})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Recipient Field Component ─── */

function RecipientField({
  label,
  recipients,
  inputValue,
  onInputChange,
  onAdd,
  onRemove,
  onKeyDown,
  actions,
}: {
  label: string;
  recipients: string[];
  inputValue: string;
  onInputChange: (v: string) => void;
  onAdd: (v: string) => void;
  onRemove: (v: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-sm text-slate-500 w-14 shrink-0">{label}</label>
      <div className="flex-1 flex flex-wrap items-center gap-1 px-2 py-1 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 min-h-[34px]">
        {recipients.map((r) => (
          <span
            key={r}
            className="flex items-center gap-1 bg-primary-50 dark:bg-primary-500/20 text-primary-700 dark:text-primary-300 text-xs font-medium px-2 py-0.5 rounded-md"
          >
            {r}
            <button onClick={() => onRemove(r)}>
              <X className="w-3 h-3 hover:text-red-500" />
            </button>
          </span>
        ))}
        <input
          type="email"
          value={inputValue}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => {
            if (inputValue.trim()) onAdd(inputValue);
          }}
          placeholder={recipients.length === 0 ? 'name@example.com' : ''}
          className="flex-1 min-w-[120px] text-sm bg-transparent outline-none py-0.5"
        />
      </div>
      {actions}
    </div>
  );
}
