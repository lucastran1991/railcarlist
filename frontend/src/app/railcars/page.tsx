'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Upload, Trash2, Loader2, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import { getRailcarsPaginated, deleteRailcar, deleteAllRailcars } from '@/lib/api';
import { formatTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Railcar } from '@/types/api';

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [5, 10, 25, 50];
const SORT_BY = 'startTime';

function ConfirmDialog({
  open, title, message, onClose, onConfirm, loading, confirmLabel = 'Delete',
}: {
  open: boolean; title: string; message: string;
  onClose: () => void; onConfirm: () => void; loading: boolean; confirmLabel?: string;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-[fadeIn_0.15s_ease-out]">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 overflow-hidden animate-[scaleIn_0.2s_ease-out]">
        <div className="p-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
              <AlertTriangle size={20} className="text-red-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
              <p className="text-sm text-gray-500 mt-1">{message}</p>
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 bg-gray-50 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-white transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading} className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 flex items-center gap-2 transition-colors">
            {loading && <Loader2 size={14} className="animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RailcarsListPage() {
  const [railcars, setRailcars] = useState<Railcar[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [deleteAllLoading, setDeleteAllLoading] = useState(false);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const startItem = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);

  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 3000); return () => clearTimeout(t); } }, [toast]);

  const fetchList = async () => {
    setLoading(true); setError(null);
    try {
      const res = await getRailcarsPaginated(page, pageSize, SORT_BY);
      setRailcars(res.items); setTotal(res.total);
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchList(); }, [page, pageSize]);
  useEffect(() => { if (!loading && railcars.length === 0 && total > 0 && page > 1) setPage(p => p - 1); }, [loading, railcars.length, total, page]);

  const handleDeleteConfirm = async () => {
    if (!deleteId) return; setDeleteLoading(true);
    try { await deleteRailcar(deleteId); setToast({ text: 'Railcar deleted', type: 'success' }); setDeleteId(null); fetchList(); }
    catch (e) { setToast({ text: e instanceof Error ? e.message : 'Failed', type: 'error' }); }
    finally { setDeleteLoading(false); }
  };

  const handleDeleteAllConfirm = async () => {
    setDeleteAllLoading(true);
    try { const res = await deleteAllRailcars(); setToast({ text: `Deleted ${res.deleted} railcar(s)`, type: 'success' }); setDeleteAllOpen(false); setPage(1); fetchList(); }
    catch (e) { setToast({ text: e instanceof Error ? e.message : 'Failed', type: 'error' }); }
    finally { setDeleteAllLoading(false); }
  };

  return (
    <div className="bg-gray-50 min-h-[calc(100vh-64px)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Toast */}
        {toast && (
          <div className={cn('fixed top-20 right-6 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium animate-[slideIn_0.2s_ease-out]',
            toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
          )}>{toast.text}</div>
        )}

        {/* Header */}
        <div className="mb-8 flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Railcar Schedule</h1>
            <p className="text-sm text-gray-500 mt-1">{total} total railcar(s)</p>
          </div>
          <div className="flex gap-2">
            <Link href="/railcars/new" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 shadow-sm transition-all hover:shadow">
              <Plus size={16} /> Create new
            </Link>
            <Link href="/railcars/import" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm transition-all">
              <Upload size={16} /> Import
            </Link>
            <button onClick={() => setDeleteAllOpen(true)} disabled={total === 0} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-red-200 bg-white text-sm font-medium text-red-600 hover:bg-red-50 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all">
              <Trash2 size={16} /> Delete All
            </button>
          </div>
        </div>

        {/* Table Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="py-20 text-center">
              <Loader2 size={28} className="animate-spin text-brand-500 mx-auto mb-3" />
              <p className="text-sm text-gray-500">Loading railcars...</p>
            </div>
          ) : error ? (
            <div className="py-20 text-center">
              <p className="text-red-500 text-sm">{error}</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left py-3.5 px-5 font-semibold text-gray-600 text-xs uppercase tracking-wider">Name</th>
                      <th className="text-left py-3.5 px-5 font-semibold text-gray-600 text-xs uppercase tracking-wider">Start</th>
                      <th className="text-left py-3.5 px-5 font-semibold text-gray-600 text-xs uppercase tracking-wider">End</th>
                      <th className="text-left py-3.5 px-5 font-semibold text-gray-600 text-xs uppercase tracking-wider">Spot</th>
                      <th className="text-left py-3.5 px-5 font-semibold text-gray-600 text-xs uppercase tracking-wider">Product</th>
                      <th className="text-left py-3.5 px-5 font-semibold text-gray-600 text-xs uppercase tracking-wider">Tank</th>
                      <th className="text-right py-3.5 px-5 font-semibold text-gray-600 text-xs uppercase tracking-wider w-20"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {railcars.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-16">
                          <p className="text-gray-400 text-sm">No railcars yet</p>
                          <Link href="/railcars/new" className="text-brand-500 text-sm font-medium hover:underline mt-1 inline-block">Create your first railcar</Link>
                        </td>
                      </tr>
                    ) : railcars.map((rc) => (
                      <tr key={rc.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-3.5 px-5 font-medium text-gray-900">{rc.name}</td>
                        <td className="py-3.5 px-5 text-gray-600">{formatTime(rc.startTime)}</td>
                        <td className="py-3.5 px-5 text-gray-600">{formatTime(rc.endTime)}</td>
                        <td className="py-3.5 px-5 text-gray-600">{rc.spot || <span className="text-gray-300">—</span>}</td>
                        <td className="py-3.5 px-5">
                          {rc.product ? <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">{rc.product}</span> : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="py-3.5 px-5">
                          {rc.tank ? <span className="px-2 py-0.5 rounded-full bg-green-50 text-green-700 text-xs font-medium">Tank {rc.tank}</span> : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="py-3.5 px-5 text-right">
                          <button onClick={() => setDeleteId(rc.id)} className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors" aria-label="Delete">
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {total > 0 && (
                <div className="flex justify-between items-center px-5 py-3.5 border-t border-gray-100 bg-gray-50/50">
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <span>{startItem}–{endItem} of {total}</span>
                    <div className="flex items-center gap-1.5">
                      <span>Show</span>
                      <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                        className="rounded-md border border-gray-300 px-2 py-1 text-xs bg-white">
                        {PAGE_SIZE_OPTIONS.map(n => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                      className="p-1.5 rounded-md hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                      <ChevronLeft size={16} className="text-gray-600" />
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).slice(
                      Math.max(0, page - 3), Math.min(totalPages, page + 2)
                    ).map(p => (
                      <button key={p} onClick={() => setPage(p)}
                        className={cn('w-8 h-8 rounded-md text-xs font-medium transition-colors',
                          p === page ? 'bg-brand-500 text-white' : 'text-gray-600 hover:bg-gray-200'
                        )}>
                        {p}
                      </button>
                    ))}
                    <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                      className="p-1.5 rounded-md hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                      <ChevronRight size={16} className="text-gray-600" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <ConfirmDialog open={!!deleteId} title="Delete railcar" message="Are you sure? This cannot be undone." onClose={() => setDeleteId(null)} onConfirm={handleDeleteConfirm} loading={deleteLoading} />
        <ConfirmDialog open={deleteAllOpen} title="Delete all railcars" message={`This will permanently delete all ${total} railcar(s).`} onClose={() => setDeleteAllOpen(false)} onConfirm={handleDeleteAllConfirm} loading={deleteAllLoading} confirmLabel="Delete All" />
      </div>
    </div>
  );
}
