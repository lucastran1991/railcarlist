'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { AlertCircle, UploadCloud, FileText, CheckCircle } from 'lucide-react';
import { importRailcarsXLSX } from '@/lib/api';
import { cn } from '@/lib/utils';

export default function ImportRailcarsPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [result, setResult] = useState<{ created: number; errors?: string[] } | null>(null);
  const [toast, setToast] = useState<{ text: string; type: 'success' | 'error' | 'warning' } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] || null); setResult(null);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setDragActive(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped && (dropped.name.endsWith('.xlsx') || dropped.name.endsWith('.xls'))) {
      setFile(dropped); setResult(null);
    } else if (dropped) {
      setToast({ text: 'Please use .xlsx or .xls file', type: 'warning' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) { setToast({ text: 'Choose an XLSX file', type: 'warning' }); return; }
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setToast({ text: 'File must be .xlsx or .xls', type: 'warning' }); return;
    }
    setLoading(true); setResult(null);
    try {
      const res = await importRailcarsXLSX(file);
      setResult({ created: res.created, errors: res.errors });
      if (res.created > 0) setToast({ text: `Imported ${res.created} railcar(s)`, type: 'success' });
      if (inputRef.current) inputRef.current.value = '';
      setFile(null);
    } catch (err) {
      setToast({ text: err instanceof Error ? err.message : 'Import failed', type: 'error' });
    } finally { setLoading(false); }
  };

  return (
    <div className="bg-gray-50 min-h-[calc(100vh-64px)]">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Toast */}
        {toast && (
          <div className={cn('fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white',
            toast.type === 'success' ? 'bg-green-600' : toast.type === 'error' ? 'bg-red-600' : 'bg-yellow-600'
          )}>{toast.text}</div>
        )}

        <h1 className="text-2xl font-bold text-gray-800 mb-2">Import railcar list</h1>
        <p className="text-sm text-gray-600 mb-6">
          Upload a spreadsheet with columns: <strong>name</strong>, <strong>startTime</strong> (or start_time), <strong>endTime</strong> (or end_time). First row is the header.
        </p>

        <div className="border border-gray-200 rounded-xl shadow-sm bg-white overflow-hidden mb-6">
          <form onSubmit={handleSubmit} onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}>
            <label className={cn(
              'flex flex-col items-center justify-center min-h-[200px] px-6 py-8 m-4 cursor-pointer',
              'border-2 border-dashed rounded-lg transition-all',
              dragActive ? 'bg-brand-50 border-brand-400' : 'bg-gray-50 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
            )}>
              <input ref={inputRef} type="file" accept=".xlsx,.xls" onChange={handleFileChange} className="absolute w-0 h-0 opacity-0" aria-hidden="true" />
              {file ? (
                <div className="flex flex-col items-center gap-2">
                  <FileText size={40} className="text-green-500" />
                  <p className="font-medium text-gray-700">{file.name}</p>
                  <p className="text-sm text-gray-500">Click the area or drop another file to replace</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <UploadCloud size={48} className="text-gray-400" />
                  <p className="font-medium text-gray-600">Drag & drop your file here, or click to browse</p>
                  <p className="text-sm text-gray-500">.xlsx or .xls only</p>
                </div>
              )}
            </label>
            <div className="flex gap-3 px-4 pb-4">
              <button type="submit" disabled={loading || !file} className="px-4 py-2 rounded-md bg-brand-500 text-white text-sm font-medium hover:bg-brand-600 disabled:opacity-50">
                {loading ? 'Importing...' : 'Import'}
              </button>
              <Link href="/railcars" className="px-4 py-2 rounded-md border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50">
                Back to list
              </Link>
            </div>
          </form>
        </div>

        {result && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
              <CheckCircle size={16} className="shrink-0" />
              Created {result.created} railcar(s).
            </div>
            {result.errors && result.errors.length > 0 && (
              <div className="border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                <div className="py-3 px-4 bg-orange-50 border-b border-gray-200">
                  <p className="font-bold text-sm text-orange-800">{result.errors.length} row error(s)</p>
                </div>
                <div className="py-3 px-4">
                  <ul className="space-y-2">
                    {result.errors.slice(0, 20).map((msg, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <AlertCircle size={14} className="text-orange-500 mt-0.5 shrink-0" />
                        {msg}
                      </li>
                    ))}
                    {result.errors.length > 20 && (
                      <li className="text-gray-500 text-sm">... and {result.errors.length - 20} more</li>
                    )}
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
