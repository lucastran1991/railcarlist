'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createRailcar } from '@/lib/api';
import { toDatetimeLocalValue, fromDatetimeLocalToISO } from '@/lib/format';
import { cn } from '@/lib/utils';

export default function NewRailcarPage() {
  const [name, setName] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [spot, setSpot] = useState('');
  const [product, setProduct] = useState('');
  const [tank, setTank] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' | 'warning' } | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setMsg({ text: 'Name is required', type: 'warning' }); return; }
    setLoading(true);
    try {
      await createRailcar({ name: name.trim(), startTime: startTime.trim(), endTime: endTime.trim(), spot: spot.trim(), product: product.trim(), tank: tank.trim() });
      router.push('/railcars');
    } catch (e) {
      setMsg({ text: e instanceof Error ? e.message : 'Create failed', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const inputCls = 'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500';

  return (
    <div className="bg-gray-50 min-h-[calc(100vh-64px)]">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Create new railcar</h1>
        {msg && (
          <div className={cn('mb-4 p-3 rounded-md text-sm', msg.type === 'error' ? 'bg-red-50 text-red-700' : msg.type === 'warning' ? 'bg-yellow-50 text-yellow-700' : 'bg-green-50 text-green-700')}>
            {msg.text}
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. RC-101" className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Start time</label>
            <input type="datetime-local" value={toDatetimeLocalValue(startTime)} onChange={(e) => setStartTime(fromDatetimeLocalToISO(e.target.value))} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">End time</label>
            <input type="datetime-local" value={toDatetimeLocalValue(endTime)} onChange={(e) => setEndTime(fromDatetimeLocalToISO(e.target.value))} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Spot (optional)</label>
            <input value={spot} onChange={(e) => setSpot(e.target.value)} placeholder="e.g. SPOT8" className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product (optional)</label>
            <input value={product} onChange={(e) => setProduct(e.target.value)} placeholder="e.g. ASPHALT" className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tank (optional)</label>
            <input value={tank} onChange={(e) => setTank(e.target.value)} placeholder="e.g. 20" className={inputCls} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading} className="px-4 py-2 rounded-md bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 disabled:opacity-50">
              {loading ? 'Creating...' : 'Create'}
            </button>
            <Link href="/railcars" className="px-4 py-2 rounded-md border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
