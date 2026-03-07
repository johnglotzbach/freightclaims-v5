'use client';

import { useState } from 'react';
import Link from 'next/link';
import { post } from '@/lib/api-client';
import { toast } from 'sonner';
import {
  Bot, Sparkles, TrendingUp, Shield, ShieldAlert, Gavel,
  MessageSquare, Brain, Send, ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const aiTools = [
  { label: 'Outcome Predictor', href: '/ai/predict', icon: TrendingUp, color: 'bg-blue-500', desc: 'Predict claim outcomes and settlement ranges' },
  { label: 'Carrier Risk', href: '/ai/risk', icon: Shield, color: 'bg-emerald-500', desc: 'Score carrier reliability from claims history' },
  { label: 'Fraud Detection', href: '/ai/fraud', icon: ShieldAlert, color: 'bg-red-500', desc: 'Detect anomalies and duplicate claims' },
  { label: 'Denial Response', href: '/ai/denial', icon: Gavel, color: 'bg-amber-500', desc: 'Generate appeal letters citing Carmack Amendment' },
  { label: 'Carrier Comms', href: '/ai/communication', icon: MessageSquare, color: 'bg-violet-500', desc: 'Automate carrier follow-ups and deadlines' },
  { label: 'Root Cause', href: '/ai/rootcause', icon: Brain, color: 'bg-pink-500', desc: 'Find systemic patterns across claims' },
];

export default function AiCopilotPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m your FreightClaims AI Copilot. I can help you with claim status, compliance deadlines, document requirements, and more. What can I help you with?',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSend() {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await post<{ response: string; conversationId: string }>('/ai/copilot/chat', {
        message: input,
      });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      toast.error('Failed to get AI response');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Bot className="w-6 h-6 text-primary-500" /> AI Tools
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            13 specialized AI agents for claims automation, analysis, and carrier management.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-sm text-emerald-600 dark:text-emerald-400">Online</span>
        </div>
      </div>

      {/* AI Tools Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {aiTools.map((tool) => {
          const Icon = tool.icon;
          return (
            <Link
              key={tool.href}
              href={tool.href}
              className="card p-4 hover:shadow-md transition-all group"
            >
              <div className="flex items-start gap-3">
                <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', tool.color)}>
                  <Icon className="w-4.5 h-4.5 text-white" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-primary-500 transition-colors">
                    {tool.label}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">{tool.desc}</div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-primary-400 ml-auto flex-shrink-0 mt-1 transition-colors" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Copilot Chat */}
      <div className="h-[calc(100vh-26rem)] flex flex-col">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-primary-500" />
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">AI Copilot Chat</h2>
        </div>

        <div className="flex-1 card overflow-y-auto p-5 space-y-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={cn(
                  'max-w-[70%] rounded-2xl px-4 py-3 text-sm',
                  msg.role === 'user'
                    ? 'bg-primary-500 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-white',
                )}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-slate-100 dark:bg-slate-700 rounded-2xl px-4 py-3 text-sm text-slate-500">
                <span className="inline-flex gap-1">
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about claims, compliance, or carrier status..."
            className="flex-1 px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-slate-800 dark:text-white text-sm"
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="bg-primary-500 hover:bg-primary-600 text-white px-5 py-3 rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <Send className="w-4 h-4" /> Send
          </button>
        </div>
      </div>
    </div>
  );
}
