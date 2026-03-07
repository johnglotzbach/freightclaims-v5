'use client';

import { useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { getList, post } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { TableSkeleton, EmptyState } from '@/components/ui/loading';
import { toast } from 'sonner';
import {
  Mail, Send, Paperclip, X, Plus, ArrowLeft,
  Bold, Italic, Underline, List, Link2,
  FileText, Image, Loader2, Eye, Sparkles,
  FileUp, Trash2, ChevronDown, Reply, ReplyAll, Forward,
} from 'lucide-react';

interface EmailAttachment {
  id: string;
  name: string;
  size: number;
  source: 'computer' | 'documents' | 'template';
}

interface EmailThread {
  id: string;
  from: string;
  to: string[];
  cc?: string[];
  subject: string;
  body: string;
  date: string;
  isRead: boolean;
  isInbound: boolean;
  attachments?: { name: string; size: number }[];
}

interface ClaimDocument {
  id: string;
  documentName: string;
  fileSize?: number;
}

export default function ClaimEmailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [composing, setComposing] = useState(false);
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [attachments, setAttachments] = useState<EmailAttachment[]>([]);
  const [showCc, setShowCc] = useState(false);
  const [selectedThread, setSelectedThread] = useState<string | null>(null);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: threads = [], isLoading } = useQuery({
    queryKey: ['claim-emails', id],
    queryFn: () => getList<EmailThread>(`/email/claims/${id}`),
    enabled: !!id,
  });

  const { data: claimDocuments = [], isLoading: documentsLoading } = useQuery({
    queryKey: ['documents', 'claim', id],
    queryFn: () => getList<ClaimDocument>(`/documents?claimId=${id}&limit=50`),
    enabled: !!id && showAttachmentMenu,
  });

  const sendMutation = useMutation({
    mutationFn: (payload: { to: string[]; cc: string[]; subject: string; body: string; claimId: string }) =>
      post<{ sent: boolean }>('/email/send', payload),
    onSuccess: () => {
      toast.success('Email sent successfully');
      setComposing(false);
      queryClient.invalidateQueries({ queryKey: ['claim-emails', id] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || err?.message || 'Failed to send email'),
  });

  const aiDraftMutation = useMutation({
    mutationFn: () => post<any>('/ai/agents/communication', { claimId: id, actionType: 'draft_email' }),
    onSuccess: (data) => {
      const plan = data?.structuredOutput?.plan ?? data?.result ?? data;
      const draft = plan?.draftEmail;
      if (draft?.body) setBody(draft.body);
      if (draft?.subject) setSubject(draft.subject);
      if (draft?.to) setTo(draft.to);
      toast.success('AI draft generated');
    },
    onError: (err: any) => toast.error(err?.response?.data?.error || err?.message || 'AI draft failed'),
  });

  function handleNewEmail() {
    setComposing(true);
    setSubject(`RE: Freight Claim - CLM-${id}`);
    setTo('');
    setBody('');
    setAttachments([]);
  }

  function handleReply(thread: EmailThread) {
    setComposing(true);
    setTo(thread.isInbound ? thread.from : (thread.to ?? []).join(', '));
    setSubject(thread.subject.startsWith('RE:') ? thread.subject : `RE: ${thread.subject}`);
    setBody(`\n\n---\nOn ${new Date(thread.date).toLocaleDateString()}, ${thread.from} wrote:\n\n${thread.body}`);
  }

  function handleForward(thread: EmailThread) {
    setComposing(true);
    setTo('');
    setSubject(`FW: ${thread.subject}`);
    setBody(`\n\n--- Forwarded Message ---\nFrom: ${thread.from}\nDate: ${new Date(thread.date).toLocaleDateString()}\n\n${thread.body}`);
  }

  function handleSend() {
    if (!to.trim()) { toast.error('Recipient is required'); return; }
    sendMutation.mutate({
      to: to.split(/[\s,;]+/).filter(Boolean),
      cc: cc ? cc.split(/[\s,;]+/).filter(Boolean) : [],
      subject,
      body,
      claimId: id!,
    });
  }

  function handleAiDraft() {
    aiDraftMutation.mutate();
  }

  function handleFileAttach(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    const newAttachments: EmailAttachment[] = files.map(f => ({
      id: crypto.randomUUID(), name: f.name, size: f.size, source: 'computer',
    }));
    setAttachments([...attachments, ...newAttachments]);
    setShowAttachmentMenu(false);
  }

  function handleAttachDocument(doc: ClaimDocument) {
    if (attachments.some((a) => a.id === doc.id)) {
      toast.info('Document already attached');
      return;
    }
    setAttachments([
      ...attachments,
      { id: doc.id, name: doc.documentName, size: doc.fileSize ?? 0, source: 'documents' },
    ]);
    setShowAttachmentMenu(false);
    toast.success('Document attached from claim files');
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <nav className="flex items-center gap-2 text-sm text-slate-500">
          <Link href={`/claims/${id}`} className="hover:text-primary-500 flex items-center gap-1"><ArrowLeft className="w-3.5 h-3.5" /> Back to Claim</Link>
        </nav>
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Emails — Claim {id}</h1>
          <p className="text-xs text-slate-500 mt-0.5">Loading emails...</p>
        </div>
        <TableSkeleton rows={3} cols={4} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <nav className="flex items-center gap-2 text-sm text-slate-500">
        <Link href={`/claims/${id}`} className="hover:text-primary-500 flex items-center gap-1"><ArrowLeft className="w-3.5 h-3.5" /> Back to Claim</Link>
      </nav>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Emails — Claim {id}</h1>
          <p className="text-xs text-slate-500 mt-0.5">{threads.length} emails in thread</p>
        </div>
        <button onClick={handleNewEmail} className="flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
          <Plus className="w-4 h-4" /> New Email
        </button>
      </div>

      {composing && (
        <div className="card p-5 border-2 border-primary-200 dark:border-primary-500/30">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-900 dark:text-white">Compose Email</h3>
            <button onClick={() => setComposing(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"><X className="w-4 h-4 text-slate-400" /></button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-500 w-12">To:</label>
              <input type="text" value={to} onChange={(e) => setTo(e.target.value)} placeholder="recipient@company.com" className="flex-1 px-3 py-1.5 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
              {!showCc && <button onClick={() => setShowCc(true)} className="text-xs text-primary-500 font-medium">Cc</button>}
            </div>
            {showCc && (
              <div className="flex items-center gap-2">
                <label className="text-sm text-slate-500 w-12">Cc:</label>
                <input type="text" value={cc} onChange={(e) => setCc(e.target.value)} placeholder="cc@company.com" className="flex-1 px-3 py-1.5 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
              </div>
            )}
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-500 w-12">Subject:</label>
              <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} className="flex-1 px-3 py-1.5 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600" />
            </div>

            {/* Toolbar */}
            <div className="flex items-center gap-0.5 border-b border-slate-100 dark:border-slate-700 pb-2">
              <button className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"><Bold className="w-4 h-4 text-slate-500" /></button>
              <button className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"><Italic className="w-4 h-4 text-slate-500" /></button>
              <button className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"><Underline className="w-4 h-4 text-slate-500" /></button>
              <button className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"><List className="w-4 h-4 text-slate-500" /></button>
              <button className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"><Link2 className="w-4 h-4 text-slate-500" /></button>
              <div className="flex-1" />
              <button onClick={handleAiDraft} disabled={aiDraftMutation.isPending} className="flex items-center gap-1 text-xs text-purple-500 hover:text-purple-600 font-medium px-2 py-1 rounded hover:bg-purple-50 dark:hover:bg-purple-500/10 disabled:opacity-50">
                {aiDraftMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />} AI Draft
              </button>
            </div>

            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={10} placeholder="Write your email..." className="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:border-slate-600 resize-none font-sans" />

            {/* Attachments */}
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {attachments.map(att => (
                  <span key={att.id} className="flex items-center gap-1.5 text-xs bg-slate-100 dark:bg-slate-700 px-2.5 py-1.5 rounded-lg">
                    <Paperclip className="w-3 h-3 text-slate-400" />
                    {att.name} <span className="text-slate-400">({(att.size / 1024).toFixed(0)}KB)</span>
                    <button onClick={() => setAttachments(attachments.filter(a => a.id !== att.id))}><X className="w-3 h-3 text-slate-400 hover:text-red-500" /></button>
                  </span>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              <div className="relative">
                <button onClick={() => setShowAttachmentMenu(!showAttachmentMenu)} className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 font-medium">
                  <Paperclip className="w-4 h-4" /> Attach <ChevronDown className="w-3 h-3" />
                </button>
                {showAttachmentMenu && (
                  <div className="absolute left-0 top-full mt-1 w-64 max-h-72 overflow-auto bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-10 py-1">
                    <button onClick={() => fileInputRef.current?.click()} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"><FileUp className="w-4 h-4" /> From Computer</button>
                    <div className="border-t border-slate-100 dark:border-slate-700 my-1" />
                    <div className="px-3 py-1.5 text-xs font-medium text-slate-500 uppercase">Claim Documents</div>
                    {documentsLoading ? (
                      <div className="px-3 py-2 text-sm text-slate-400 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Loading...</div>
                    ) : claimDocuments.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-slate-400">No documents for this claim</div>
                    ) : (
                      claimDocuments.map((doc) => (
                        <button
                          key={doc.id}
                          onClick={() => handleAttachDocument(doc)}
                          disabled={attachments.some((a) => a.id === doc.id)}
                          className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <FileText className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">{doc.documentName}</span>
                          {doc.fileSize != null && <span className="text-xs text-slate-400 flex-shrink-0">({(doc.fileSize / 1024).toFixed(0)}KB)</span>}
                        </button>
                      ))
                    )}
                    <div className="border-t border-slate-100 dark:border-slate-700 my-1" />
                    <button onClick={() => { setShowAttachmentMenu(false); toast.info('Template attachments coming soon'); }} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-2"><Mail className="w-4 h-4" /> From Templates</button>
                  </div>
                )}
                <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileAttach} />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setComposing(false)} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 font-medium">Discard</button>
                <button onClick={handleSend} disabled={sendMutation.isPending} className="flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50">
                  {sendMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Send
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Email Thread */}
      {threads.length === 0 ? (
        <EmptyState icon={Mail} title="No emails yet" description="Start a conversation by sending the first email for this claim." />
      ) : (
        <div className="space-y-3">
          {threads.map(thread => (
            <div key={thread.id} className={cn('card p-5 transition-all', selectedThread === thread.id && 'ring-2 ring-primary-200 dark:ring-primary-500/30')}>
              <div className="flex items-start justify-between gap-3 cursor-pointer" onClick={() => setSelectedThread(selectedThread === thread.id ? null : thread.id)}>
                <div className="flex items-start gap-3 min-w-0">
                  <div className={cn('w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0', thread.isInbound ? 'bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400' : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400')}>
                    {thread.isInbound ? 'IN' : 'OUT'}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">{thread.from}</p>
                      <span className="text-[10px] text-slate-400 flex-shrink-0">{new Date(thread.date).toLocaleDateString()} {new Date(thread.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-xs text-slate-500 truncate">To: {(thread.to ?? []).join(', ')}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-400 truncate mt-0.5">{thread.subject}</p>
                  </div>
                </div>
                {thread.attachments && <span className="flex items-center gap-1 text-xs text-slate-400 flex-shrink-0"><Paperclip className="w-3 h-3" /> {thread.attachments.length}</span>}
              </div>

              {selectedThread === thread.id && (
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                  <pre className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap font-sans">{thread.body}</pre>
                  {thread.attachments && thread.attachments.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-50 dark:border-slate-700/50">
                      <p className="text-xs text-slate-500 mb-2">Attachments</p>
                      <div className="flex flex-wrap gap-2">
                        {thread.attachments.map((a, i) => (
                          <span key={i} className="flex items-center gap-1.5 text-xs bg-slate-50 dark:bg-slate-700 px-2.5 py-1.5 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600">
                            <Paperclip className="w-3 h-3 text-slate-400" /> {a.name} <span className="text-slate-400">({(a.size / 1024).toFixed(0)}KB)</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => handleReply(thread)} className="flex items-center gap-1 text-xs text-primary-500 hover:text-primary-600 font-medium"><Reply className="w-3.5 h-3.5" /> Reply</button>
                    <button onClick={() => handleForward(thread)} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-600 font-medium"><Forward className="w-3.5 h-3.5" /> Forward</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
