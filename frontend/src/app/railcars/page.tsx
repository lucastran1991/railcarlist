'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Plus, Upload, Trash2, Loader2 } from 'lucide-react';
import { getRailcarsPaginated, deleteRailcar, deleteAllRailcars } from '@/lib/api';
import { formatTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Railcar } from '@/types/api';

const DEFAULT_PAGE_SIZE = 5;
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
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-sm text-gray-600 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-md border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading} className="px-4 py-2 rounded-md bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 flex items-center gap-2">
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

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const fetchList = async () => {
    setLoading(true); setError(null);
    try {
      const res = await getRailcarsPaginated(page, pageSize, SORT_BY);
      setRailcars(res.items); setTotal(res.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load railcars');
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchList(); }, [page, pageSize]);

  useEffect(() => {
    if (!loading && railcars.length === 0 && total > 0 && page > 1) setPage((p) => p - 1);
  }, [loading, railcars.length, total, page]);

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    try {
      await deleteRailcar(deleteId);
      setToast({ text: 'Railcar deleted', type: 'success' });
      setDeleteId(null); fetchList();
    } catch (e) {
      setToast({ text: e instanceof Error ? e.message : 'Delete failed', type: 'error' });
    } finally { setDeleteLoading(false); }
  };

  const handleDeleteAllConfirm = async () => {
    setDeleteAllLoading(true);
    try {
      const res = await deleteAllRailcars();
      setToast({ text: `Deleted ${res.deleted} railcar(s)`, type: 'success' });
      setDeleteAllOpen(false); setPage(1); fetchList();
    } catch (e) {
      setToast({ text: e instanceof Error ? e.message : 'Delete all failed', type: 'error' });
    } finally { setDeleteAllLoading(false); }
  };

  return (
    <div className="bg-gray-50 min-h-[calc(100vh-64px)]">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Toast */}
        {toast && (
          <div className={cn('fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium', toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white')}>
            {toast.text}
          </div>
        )}

        {/* Toolbar */}
        <div className="mb-6 flex justify-between items-center flex-wrap gap-4">
          <h1 className="text-2xl font-bold text-gray-800">Railcar list</h1>
          <div className="flex gap-3">
            <Link href="/railcars/new" className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-brand-500 text-white text-sm font-medium hover:bg-brand-600">
              <Plus size={16} /> Create new
            </Link>
            <Link href="/railcars/import" className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50">
              <Upload size={16} /> Import XLSX
            </Link>
            <button onClick={() => setDeleteAllOpen(true)} disabled={total === 0} className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-red-300 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed">
              <Trash2 size={16} /> Delete All
            </button>
          </div>
        </div>

        {/* Content */}
        {loading && (
          <div className="py-8 text-center"><Loader2 size={32} className="animate-spin text-gray-400 mx-auto" /></div>
        )}
        {error && <p className="text-red-500 mb-4">{error}</p>}
        {!loading && !error && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Name</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Start time</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">End time</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Spot</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Product</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-600">Tank</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {railcars.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-8 text-gray-500">No railcars yet. Create one or import from XLSX.</td></tr>
                ) : (
                  railcars.map((rc) => (
                    <tr key={rc.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{rc.name}</td>
                      <td className="py-3 px-4">{formatTime(rc.startTime)}</td>
                      <td className="py-3 px-4">{formatTime(rc.endTime)}</td>
                      <td className="py-3 px-4">{rc.spot ?? '—'}</td>
                      <td className="py-3 px-4">{rc.product ?? '—'}</td>
                      <td className="py-3 px-4">{rc.tank ?? '—'}</td>
                      <td className="py-3 px-4 text-right">
                        <button onClick={() => setDeleteId(rc.id)} className="p-1.5 rounded text-red-500 hover:bg-red-50" aria-label="Delete">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && !error && total > 0 && (
          <div className="mt-4 flex justify-between items-center flex-wrap gap-3">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">Showing {startItem}–{endItem} of {total}</span>
              <div className="flex items-center gap-2">
                <label htmlFor="page-size" className="text-sm text-gray-600 whitespace-nowrap">Per page</label>
                <select id="page-size" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} className="rounded-md border border-gray-300 px-2 py-1 text-sm">
                  {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-3 py-1.5 rounded-md border border-gray-300 text-sm disabled:opacity-40 hover:bg-gray-50">Previous</button>
              <span className="text-sm px-2">Page {page} of {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="px-3 py-1.5 rounded-md border border-gray-300 text-sm disabled:opacity-40 hover:bg-gray-50">Next</button>
            </div>
          </div>
        )}

        {/* Dialogs */}
        <ConfirmDialog
          open={!!deleteId} title="Delete railcar" message="Are you sure? This cannot be undone."
          onClose={() => setDeleteId(null)} onConfirm={handleDeleteConfirm} loading={deleteLoading}
        />
        <ConfirmDialog
          open={deleteAllOpen} title="Delete all railcars" message={`This will permanently delete all ${total} railcar(s). This cannot be undone.`}
          onClose={() => setDeleteAllOpen(false)} onConfirm={handleDeleteAllConfirm} loading={deleteAllLoading} confirmLabel="Delete All"
        />
      </div>
    </div>
  );
}
