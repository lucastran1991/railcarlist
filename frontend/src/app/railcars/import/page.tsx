'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { AlertCircle, UploadCloud, FileText, CheckCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { importRailcarsXLSX } from '@/lib/api';
import { cn } from '@/lib/utils';

export default function ImportRailcarsPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [result, setResult] = useState<{ created: number; errors?: string[] } | null>(null);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' | 'warning' } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 3000); return () => clearTimeout(t); } }, [toast]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { setFile(e.target.files?.[0] || null); setResult(null); };
  const handleDrag = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragActive(e.type === 'dragenter' || e.type === 'dragover'); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setDragActive(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped && (dropped.name.endsWith('.xlsx') || dropped.name.endsWith('.xls'))) { setFile(dropped); setResult(null); }
    else if (dropped) setToast({ text: 'Please use .xlsx or .xls file', type: 'warning' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) { setToast({ text: 'Choose an XLSX file', type: 'warning' }); return; }
    setLoading(true); setResult(null);
    try {
      const res = await importRailcarsXLSX(file);
      setResult({ created: res.created, errors: res.errors });
      if (res.created > 0) setToast({ text: `Imported ${res.created} railcar(s)`, type: 'success' });
      if (inputRef.current) inputRef.current.value = '';
      setFile(null);
    } catch (err) { setToast({ text: err instanceof Error ? err.message : 'Import failed', type: 'error' }); }
    finally { setLoading(false); }
  };

  return (
    <div className="bg-gray-50 min-h-[calc(100vh-64px)]">
      <div className="max-w-xl mx-auto px-4 py-8">
        {toast && (
          <div className={cn('fixed top-20 right-6 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white animate-[slideIn_0.2s_ease-out]',
            toast.type === 'success' ? 'bg-green-600' : toast.type === 'error' ? 'bg-red-600' : 'bg-yellow-600'
          )}>{toast.text}</div>
        )}

        <Link href="/railcars" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors">
          <ArrowLeft size={14} /> Back to list
        </Link>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-6">
          <div className="px-6 py-5 border-b border-gray-100">
            <h1 className="text-xl font-bold text-gray-900">Import railcar list</h1>
            <p className="text-sm text-gray-500 mt-1">
              Upload a spreadsheet with columns: <strong>name</strong>, <strong>startTime</strong>, <strong>endTime</strong>. First row = header.
            </p>
          </div>

          <form onSubmit={handleSubmit} onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}>
            <label className={cn(
              'flex flex-col items-center justify-center min-h-[220px] px-6 py-10 mx-5 my-5 cursor-pointer',
              'border-2 border-dashed rounded-xl transition-all',
              dragActive ? 'bg-brand-50 border-brand-400 scale-[1.01]' : 'bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
            )}>
              <input ref={inputRef} type="file" accept=".xlsx,.xls" onChange={handleFileChange} className="absolute w-0 h-0 opacity-0" aria-hidden="true" />
              {file ? (
                <div className="flex flex-col items-center gap-2 text-center">
                  <div className="w-14 h-14 rounded-full bg-green-50 flex items-center justify-center">
                    <FileText size={28} className="text-green-500" />
                  </div>
                  <p className="font-semibold text-gray-800">{file.name}</p>
                  <p className="text-xs text-gray-500">Click or drop another file to replace</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 text-center">
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                    <UploadCloud size={32} className="text-gray-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-600">Drag & drop your file here</p>
                    <p className="text-sm text-gray-400 mt-1">or <span className="text-brand-500 font-medium">click to browse</span> (.xlsx, .xls)</p>
                  </div>
                </div>
              )}
            </label>
            <div className="flex gap-3 px-5 pb-5">
              <button type="submit" disabled={loading || !file} className="px-5 py-2.5 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 disabled:opacity-40 shadow-sm flex items-center gap-2 transition-all">
                {loading && <Loader2 size={14} className="animate-spin" />}
                {loading ? 'Importing...' : 'Import'}
              </button>
              <Link href="/railcars" className="px-5 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                Back to list
              </Link>
            </div>
          </form>
        </div>

        {result && (
          <div className="space-y-4 animate-[fadeIn_0.2s_ease-out]">
            <div className="flex items-center gap-2.5 p-4 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800">
              <CheckCircle size={18} className="shrink-0 text-green-500" />
              <span className="font-medium">Created {result.created} railcar(s) successfully.</span>
            </div>
            {result.errors && result.errors.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <div className="py-3 px-4 bg-orange-50 border-b border-orange-100">
                  <p className="font-semibold text-sm text-orange-800">{result.errors.length} row error(s)</p>
                </div>
                <div className="py-3 px-4 max-h-[200px] overflow-y-auto">
                  <ul className="space-y-2">
                    {result.errors.slice(0, 20).map((msg, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <AlertCircle size={14} className="text-orange-500 mt-0.5 shrink-0" />
                        {msg}
                      </li>
                    ))}
                    {result.errors.length > 20 && <li className="text-gray-400 text-sm">... and {result.errors.length - 20} more</li>}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
