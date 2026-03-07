'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from 'next-themes';
import { get } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import {
  Menu, Search, Sun, Moon, Bell, LogOut, Bot,
  X, FileText, Building2, Truck, Users, Clock,
  CheckCircle, AlertCircle, Mail, MessageSquare,
  ChevronDown, Eye, Settings,
} from 'lucide-react';

interface HeaderProps {
  onMenuClick?: () => void;
}

interface SearchResult {
  id: string;
  type: 'claim' | 'customer' | 'carrier' | 'contact';
  title: string;
  subtitle?: string;
  href: string;
}

interface Notification {
  id: string;
  type: 'claim' | 'task' | 'email' | 'comment' | 'system';
  title: string;
  body: string;
  timestamp: string;
  isRead: boolean;
  href?: string;
}

interface CorporateAccount {
  id: string;
  name: string;
  code: string;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifOpen, setNotifOpen] = useState(false);
  const [impersonateOpen, setImpersonateOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const impRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => get<Notification[]>('/email/notifications'),
    refetchInterval: 30_000,
  });

  const { data: corporateAccounts = [] } = useQuery({
    queryKey: ['corporate-accounts'],
    queryFn: () => get<CorporateAccount[]>('/customers?type=corporate'),
  });

  const { data: searchResults = [] } = useQuery({
    queryKey: ['search', searchQuery],
    queryFn: () => get<SearchResult[]>(`/search?q=${encodeURIComponent(searchQuery)}`),
    enabled: searchQuery.length >= 2,
  });

  const [currentCorporateId, setCurrentCorporateId] = useState<string | null>(null);
  const currentCorporate = corporateAccounts.find(a => a.id === currentCorporateId) || corporateAccounts[0];

  const unreadCount = notifications.filter(n => !n.isRead).length;

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setSearchOpen(true); }
      if (e.key === 'Escape') { setSearchOpen(false); setNotifOpen(false); setImpersonateOpen(false); setUserMenuOpen(false); }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  useEffect(() => {
    if (searchOpen) setTimeout(() => searchInputRef.current?.focus(), 50);
  }, [searchOpen]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (impRef.current && !impRef.current.contains(e.target as Node)) setImpersonateOpen(false);
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserMenuOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleSearchSelect(result: SearchResult) {
    setSearchOpen(false);
    setSearchQuery('');
    router.push(result.href);
  }

  const typeIcons: Record<string, typeof FileText> = {
    claim: FileText, customer: Building2, carrier: Truck, contact: Users,
    email: Mail, task: CheckCircle, comment: MessageSquare, system: AlertCircle,
  };

  return (
    <>
      <header className="flex items-center justify-between px-3 sm:px-6 py-2.5 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 sticky top-0 z-30">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <button onClick={onMenuClick} className="lg:hidden p-2 -ml-1 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 touch-manipulation" aria-label="Open menu">
            <Menu className="w-5 h-5" />
          </button>

          <button onClick={() => setSearchOpen(true)} className="relative flex-1 max-w-md hidden sm:flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-sm text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-text">
            <Search className="w-4 h-4" />
            <span>Search claims, customers, carriers...</span>
            <kbd className="ml-auto text-[10px] bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded px-1.5 py-0.5 font-mono">⌘K</kbd>
          </button>
          <button onClick={() => setSearchOpen(true)} className="sm:hidden p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <Search className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 ml-2">
          {corporateAccounts.length > 1 && (
            <div ref={impRef} className="relative hidden sm:block">
              <button onClick={() => setImpersonateOpen(!impersonateOpen)} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                <Eye className="w-3.5 h-3.5" />
                <span className="max-w-[100px] truncate">{currentCorporate?.name || 'Account'}</span>
                <ChevronDown className="w-3 h-3" />
              </button>
              {impersonateOpen && (
                <div className="absolute right-0 top-full mt-1 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 py-1.5">
                  <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700">
                    <p className="text-[10px] font-semibold uppercase text-slate-400">Switch Corporate Account</p>
                  </div>
                  {corporateAccounts.map(acc => (
                    <button key={acc.id} onClick={() => { setCurrentCorporateId(acc.id); setImpersonateOpen(false); }} className={cn('w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors', currentCorporate?.id === acc.id && 'bg-primary-50 dark:bg-primary-500/10')}>
                      <Building2 className="w-4 h-4 text-slate-400" />
                      <span className="flex-1 text-left font-medium text-slate-700 dark:text-slate-300">{acc.name}</span>
                      <span className="text-xs text-slate-400 font-mono">{acc.code}</span>
                      {currentCorporate?.id === acc.id && <CheckCircle className="w-3.5 h-3.5 text-primary-500" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <Link href="/ai" className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-primary-50 dark:bg-primary-950 text-primary-600 dark:text-primary-400 rounded-lg text-xs font-medium hover:bg-primary-100 dark:hover:bg-primary-900 transition-colors">
            <Bot className="w-3.5 h-3.5" /><span>AI</span>
          </Link>

          <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" aria-label="Toggle theme">
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <div ref={notifRef} className="relative">
            <button onClick={() => setNotifOpen(!notifOpen)} className="relative p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" aria-label="Notifications">
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && <span className="absolute top-1 right-1 w-4 h-4 bg-accent-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center">{unreadCount}</span>}
            </button>
            {notifOpen && (
              <div className="absolute right-0 top-full mt-1 w-80 sm:w-96 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 max-h-[480px] flex flex-col">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Notifications</h3>
                  <button className="text-xs text-primary-500 font-medium hover:text-primary-600">Mark all read</button>
                </div>
                <div className="overflow-y-auto flex-1">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center"><p className="text-sm text-slate-400">No notifications</p></div>
                  ) : notifications.map(notif => {
                    const Icon = typeIcons[notif.type] || Bell;
                    return (
                      <button key={notif.id} onClick={() => { if (notif.href) router.push(notif.href); setNotifOpen(false); }} className={cn('w-full flex gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border-b border-slate-50 dark:border-slate-700/50 last:border-0', !notif.isRead && 'bg-primary-50/50 dark:bg-primary-500/5')}>
                        <div className={cn('w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0', !notif.isRead ? 'bg-primary-100 dark:bg-primary-900' : 'bg-slate-100 dark:bg-slate-700')}>
                          <Icon className={cn('w-4 h-4', !notif.isRead ? 'text-primary-500' : 'text-slate-400')} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={cn('text-sm', !notif.isRead ? 'font-semibold text-slate-900 dark:text-white' : 'font-medium text-slate-600 dark:text-slate-400')}>{notif.title}</p>
                          <p className="text-xs text-slate-500 truncate">{notif.body}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1"><Clock className="w-3 h-3" />{notif.timestamp}</p>
                        </div>
                        {!notif.isRead && <div className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0 mt-2" />}
                      </button>
                    );
                  })}
                </div>
                <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-700">
                  <Link href="/settings/profile" onClick={() => setNotifOpen(false)} className="text-xs text-primary-500 font-medium hover:text-primary-600">View all &amp; manage preferences</Link>
                </div>
              </div>
            )}
          </div>

          <div ref={userRef} className="relative">
            <button onClick={() => setUserMenuOpen(!userMenuOpen)} className="flex items-center gap-2 pl-2 sm:pl-3 ml-1 sm:ml-2 border-l border-slate-200 dark:border-slate-700">
              <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-primary-700 dark:text-primary-300 text-xs font-semibold">{user?.firstName?.[0]}{user?.lastName?.[0]}</span>
              </div>
              <div className="hidden md:block min-w-0">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{user?.firstName} {user?.lastName}</p>
                <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
              </div>
              <ChevronDown className="w-3 h-3 text-slate-400 hidden md:block" />
            </button>
            {userMenuOpen && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 py-1">
                <Link href="/settings/profile" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"><Settings className="w-4 h-4 text-slate-400" /> Personal Settings</Link>
                <Link href="/settings" onClick={() => setUserMenuOpen(false)} className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300"><Settings className="w-4 h-4 text-slate-400" /> System Settings</Link>
                <div className="border-t border-slate-100 dark:border-slate-700 my-1" />
                <button onClick={() => { logout(); setUserMenuOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-red-50 dark:hover:bg-red-500/10 text-red-500 font-medium"><LogOut className="w-4 h-4" /> Sign Out</button>
              </div>
            )}
          </div>
        </div>
      </header>

      {searchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setSearchOpen(false)} />
          <div ref={searchRef} className="relative w-full max-w-2xl mx-4 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-700">
              <Search className="w-5 h-5 text-slate-400" />
              <input ref={searchInputRef} type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search claims, customers, carriers, contacts..." className="flex-1 bg-transparent text-lg text-slate-900 dark:text-white placeholder-slate-400 outline-none" />
              <button onClick={() => setSearchOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>

            {searchResults.length > 0 ? (
              <div className="max-h-80 overflow-y-auto py-2">
                {searchResults.map(result => {
                  const Icon = typeIcons[result.type] || FileText;
                  return (
                    <button key={result.id} onClick={() => handleSearchSelect(result)} className="w-full flex items-center gap-3 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-left">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center"><Icon className="w-4 h-4 text-slate-500" /></div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-900 dark:text-white">{result.title}</p>
                        {result.subtitle && <p className="text-xs text-slate-400 truncate">{result.subtitle}</p>}
                      </div>
                      <span className="text-[10px] uppercase font-semibold text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">{result.type}</span>
                    </button>
                  );
                })}
              </div>
            ) : searchQuery.length >= 2 ? (
              <div className="py-12 text-center"><p className="text-sm text-slate-400">No results found for &ldquo;{searchQuery}&rdquo;</p></div>
            ) : (
              <div className="py-8 px-5">
                <p className="text-xs text-slate-400 mb-3">Quick Links</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'New Claim', href: '/claims/new', icon: FileText },
                    { label: 'AI Entry', href: '/ai-entry', icon: Bot },
                    { label: 'Tasks', href: '/tasks', icon: CheckCircle },
                    { label: 'Companies', href: '/companies', icon: Building2 },
                  ].map(link => (
                    <button key={link.href} onClick={() => { router.push(link.href); setSearchOpen(false); }} className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 dark:bg-slate-700/50 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                      <link.icon className="w-4 h-4" /> {link.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-4 px-5 py-2.5 border-t border-slate-100 dark:border-slate-700 text-[10px] text-slate-400">
              <span><kbd className="bg-slate-100 dark:bg-slate-700 px-1 rounded font-mono">↑↓</kbd> Navigate</span>
              <span><kbd className="bg-slate-100 dark:bg-slate-700 px-1 rounded font-mono">↵</kbd> Open</span>
              <span><kbd className="bg-slate-100 dark:bg-slate-700 px-1 rounded font-mono">Esc</kbd> Close</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
