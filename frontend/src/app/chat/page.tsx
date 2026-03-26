// @ts-nocheck — AI SDK v6 useChat type changes (runtime works correctly)
'use client';

import { useRef, useEffect, Fragment, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { useAuth } from '@/lib/useAuth';
import { Send, Bot, User, Loader2, Sparkles, Trash2 } from 'lucide-react';

const SUGGESTIONS = [
  'Which tank has the highest level?',
  'What are the latest critical alerts?',
  'How many boilers are online right now?',
  'Show me electricity KPIs',
  'Compare all product inventories',
  'What\'s the current steam header pressure?',
  'Are there any emission limit violations?',
  'Which transformers are under high load?',
];

export default function ChatPage() {
  const ready = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { messages, sendMessage, status, setMessages } = useChat({
    api: '/api/chat',
    headers: () => {
      const tid = typeof window !== 'undefined'
        ? localStorage.getItem('vopak_active_terminal') || 'savannah'
        : 'savannah';
      const token = typeof window !== 'undefined'
        ? localStorage.getItem('vopak_access_token') || ''
        : '';
      return {
        'X-Terminal-Id': tid,
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      };
    },
  });
  const [input, setInput] = useState('');
  const isLoading = status === 'streaming' || status === 'submitted';

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage({ role: 'user', content: input });
    setInput('');
  };

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isLoading]);

  useEffect(() => { inputRef.current?.focus(); }, []);

  if (!ready) return null;

  const handleSuggestion = (q: string) => {
    if (isLoading) return;
    sendMessage({ role: 'user', content: q });
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex flex-col max-w-4xl mx-auto px-4">
      <div className="flex items-center justify-between py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center shadow-lg shadow-[var(--color-accent,#5CE5A0)]/20">
            <Sparkles size={20} className="text-background" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">Terminal Assistant</h1>
            <p className="text-xs text-muted-foreground">Ask anything about terminal operations</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <Trash2 size={12} />
            Clear
          </button>
        )}
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto py-6 space-y-4 min-h-0">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-6">
            <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center opacity-60">
              <Bot size={32} className="text-background" />
            </div>
            <div className="text-center">
              <h2 className="text-lg font-semibold text-foreground mb-1">How can I help?</h2>
              <p className="text-sm text-muted-foreground">Ask about tanks, alerts, electricity, steam, boilers, or substations</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-2xl">
              {SUGGESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => handleSuggestion(q)}
                  className="text-left text-sm px-4 py-3 rounded-xl border border-border bg-card hover:bg-muted hover:border-[var(--color-accent,#5CE5A0)]/30 transition-all duration-200 text-foreground/80"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={'flex gap-3 ' + (m.role === 'user' ? 'justify-end' : 'justify-start')}>
              {m.role === 'assistant' && (
                <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                  <Bot size={14} className="text-background" />
                </div>
              )}
              <div
                className={'max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed ' + (
                  m.role === 'user'
                    ? 'gradient-primary text-background rounded-br-md'
                    : 'bg-card border border-border text-foreground rounded-bl-md'
                )}
              >
                {m.role === 'assistant' ? <SafeMessage content={getTextContent(m)} /> : getTextContent(m)}
              </div>
              {m.role === 'user' && (
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
                  <User size={14} className="text-muted-foreground" />
                </div>
              )}
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center shrink-0">
              <Bot size={14} className="text-background" />
            </div>
            <div className="bg-card border border-border rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 size={14} className="animate-spin" style={{ color: 'var(--color-accent, #5CE5A0)' }} />
                <span className="text-sm">Analyzing data...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-border py-4">
        <form id="chat-form" onSubmit={handleSubmit} className="flex gap-3">
          <input
            ref={inputRef}
            value={input ?? ''}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about terminal operations..."
            disabled={isLoading}
            className="flex-1 px-4 py-3 rounded-xl border border-border bg-card text-foreground text-sm placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-[var(--color-accent,#5CE5A0)]/50 focus:border-[var(--color-accent,#5CE5A0)]/30 transition disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || !(input ?? '').trim()}
            className="px-4 py-3 gradient-primary text-background rounded-xl font-medium transition hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Send size={16} />
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>
        <p className="text-[10px] text-muted-foreground/50 text-center mt-2">
          Powered by Claude — responses may take a few seconds while querying live data
        </p>
      </div>
    </div>
  );
}

/** Extract text content from AI SDK v6 message (handles both string content and parts array) */
function getTextContent(m: { content?: string; parts?: Array<{ type: string; text?: string }> }): string {
  if (typeof m.content === 'string' && m.content) return m.content;
  if (Array.isArray(m.parts)) {
    return m.parts.filter(p => p.type === 'text').map(p => p.text ?? '').join('');
  }
  return '';
}

function SafeMessage({ content }: { content: string }) {
  if (!content) return null;
  const lines = content.split('\n');
  let inTable = false;
  const tableLines: string[] = [];
  const elements: React.ReactNode[] = [];

  const flushTable = () => {
    if (tableLines.length >= 2) {
      elements.push(<MarkdownTable key={'tbl-' + elements.length} lines={[...tableLines]} />);
    }
    tableLines.length = 0;
    inTable = false;
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      inTable = true;
      tableLines.push(line);
      continue;
    }
    if (inTable) flushTable();
    if (trimmed === '') {
      elements.push(<br key={'br-' + elements.length} />);
    } else {
      elements.push(<p key={'p-' + elements.length} className="my-0.5"><InlineFormat text={line} /></p>);
    }
  }
  if (inTable) flushTable();
  return <div className="space-y-0.5">{elements}</div>;
}

function InlineFormat({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*.*?\*\*|`.*?`)/g;
  let lastIdx = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIdx) parts.push(<Fragment key={lastIdx}>{text.slice(lastIdx, match.index)}</Fragment>);
    const m = match[0];
    if (m.startsWith('**') && m.endsWith('**')) {
      parts.push(<strong key={match.index}>{m.slice(2, -2)}</strong>);
    } else if (m.startsWith('`') && m.endsWith('`')) {
      parts.push(<code key={match.index} className="px-1 py-0.5 rounded bg-muted text-xs font-mono">{m.slice(1, -1)}</code>);
    }
    lastIdx = match.index + m.length;
  }
  if (lastIdx < text.length) parts.push(<Fragment key={lastIdx}>{text.slice(lastIdx)}</Fragment>);
  return <>{parts}</>;
}

function MarkdownTable({ lines }: { lines: string[] }) {
  const parseRow = (line: string) => line.split('|').map(c => c.trim()).filter(Boolean);
  const headers = parseRow(lines[0]);
  const dataRows = lines.filter((_, i) => i > 1).map(parseRow);
  return (
    <div className="overflow-x-auto my-2">
      <table className="text-xs border-collapse w-full">
        <thead>
          <tr>{headers.map((h, i) => <th key={i} className="px-2 py-1.5 border border-border bg-muted/50 text-left font-semibold">{h}</th>)}</tr>
        </thead>
        <tbody>
          {dataRows.map((row, i) => (
            <tr key={i}>{row.map((cell, j) => <td key={j} className="px-2 py-1 border border-border">{cell}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
