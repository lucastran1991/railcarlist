'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { createRailcar } from '@/lib/api';
import { toDatetimeLocalValue, fromDatetimeLocalToISO } from '@/lib/format';
import { cn } from '@/lib/utils';

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = 'w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm bg-white focus:border-[#5CE5A0] focus:outline-none focus:ring-2 focus:ring-[#5CE5A0]/20 transition-all placeholder:text-gray-400';

export default function NewRailcarPage() {
  const [name, setName] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [spot, setSpot] = useState('');
  const [product, setProduct] = useState('');
  const [tank, setTank] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'error' | 'warning' } | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setMsg({ text: 'Name is required', type: 'warning' }); return; }
    setLoading(true); setMsg(null);
    try {
      await createRailcar({ name: name.trim(), startTime: startTime.trim(), endTime: endTime.trim(), spot: spot.trim(), product: product.trim(), tank: tank.trim() });
      router.push('/railcars');
    } catch (e) {
      setMsg({ text: e instanceof Error ? e.message : 'Create failed', type: 'error' });
    } finally { setLoading(false); }
  };

  return (
    <div className="bg-gray-50 min-h-[calc(100vh-64px)]">
      <div className="max-w-xl mx-auto px-4 py-8">
        <Link href="/railcars" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors">
          <ArrowLeft size={14} /> Back to list
        </Link>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100">
            <h1 className="text-xl font-bold text-gray-900">Create new railcar</h1>
            <p className="text-sm text-gray-500 mt-1">Fill in the details below to add a new railcar entry.</p>
          </div>

          <form onSubmit={handleSubmit} className="px-6 py-6">
            {msg && (
              <div className={cn('mb-5 p-3 rounded-lg text-sm', msg.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-yellow-50 text-yellow-700 border border-yellow-200')}>
                {msg.text}
              </div>
            )}

            <div className="grid gap-5">
              <Field label="Name" required>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. RC-101" className={inputCls} />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Start time">
                  <input type="datetime-local" value={toDatetimeLocalValue(startTime)} onChange={e => setStartTime(fromDatetimeLocalToISO(e.target.value))} className={inputCls} />
                </Field>
                <Field label="End time">
                  <input type="datetime-local" value={toDatetimeLocalValue(endTime)} onChange={e => setEndTime(fromDatetimeLocalToISO(e.target.value))} className={inputCls} />
                </Field>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <Field label="Spot">
                  <input value={spot} onChange={e => setSpot(e.target.value)} placeholder="SPOT8" className={inputCls} />
                </Field>
                <Field label="Product">
                  <input value={product} onChange={e => setProduct(e.target.value)} placeholder="ASPHALT" className={inputCls} />
                </Field>
                <Field label="Tank">
                  <input value={tank} onChange={e => setTank(e.target.value)} placeholder="20" className={inputCls} />
                </Field>
              </div>
            </div>

            <div className="flex gap-3 pt-6 mt-6 border-t border-gray-100">
              <button type="submit" disabled={loading} className="px-5 py-2.5 rounded-lg bg-[#5CE5A0] text-[#080A11] text-sm font-medium hover:bg-[#56CDE7] disabled:opacity-50 shadow-sm flex items-center gap-2 transition-all">
                {loading && <Loader2 size={14} className="animate-spin" />}
                {loading ? 'Creating...' : 'Create railcar'}
              </button>
              <Link href="/railcars" className="px-5 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
