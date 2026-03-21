'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TagSelectorProps {
  tags: string[];
  selectedTags: string[];
  onChange: (tags: string[]) => void;
  isMulti?: boolean;
  placeholder?: string;
  label?: string;
}

export default function TagSelector({
  tags, selectedTags, onChange,
  isMulti = true, placeholder = 'Select tags...', label,
}: TagSelectorProps) {
  const displayLabel = label ?? (isMulti ? 'Tags' : 'Tag');
  const [open, setOpen] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearchKeyword('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filteredTags = useMemo(() => {
    if (!searchKeyword.trim()) return tags;
    const keyword = searchKeyword.toLowerCase();
    return tags.filter((tag) => tag.toLowerCase().includes(keyword));
  }, [tags, searchKeyword]);

  const toggleTag = (tag: string) => {
    if (isMulti) {
      onChange(
        selectedTags.includes(tag)
          ? selectedTags.filter((t) => t !== tag)
          : [...selectedTags, tag]
      );
    } else {
      onChange([tag]);
      setOpen(false);
    }
  };

  if (!isMulti) {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{displayLabel}</label>
        <select
          value={selectedTags[0] || ''}
          onChange={(e) => onChange(e.target.value ? [e.target.value] : [])}
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-[#5CE5A0] focus:outline-none focus:ring-1 focus:ring-[#5CE5A0]"
        >
          <option value="">{placeholder}</option>
          {tags.map((tag) => (
            <option key={tag} value={tag}>{tag}</option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-1">{displayLabel}</label>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-left hover:border-gray-400 focus:border-[#5CE5A0] focus:outline-none focus:ring-1 focus:ring-[#5CE5A0]"
      >
        <span className={selectedTags.length === 0 ? 'text-gray-400' : 'text-gray-900'}>
          {selectedTags.length === 0 ? placeholder : `${selectedTags.length} tag(s) selected`}
        </span>
        <ChevronDown size={16} className="text-gray-400" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg max-h-[300px] overflow-hidden">
          <div className="px-3 py-2 border-b border-gray-200">
            <div className="relative">
              <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                placeholder="Search tags..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="w-full pl-7 pr-2 py-1.5 text-sm border border-gray-200 rounded bg-white focus:border-[#5CE5A0] focus:outline-none"
              />
            </div>
          </div>
          <div className="overflow-y-auto max-h-[240px]">
            {filteredTags.length > 0 ? (
              filteredTags.map((tag) => {
                const selected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-50',
                      selected && 'bg-[#5CE5A0]/10 text-[#5CE5A0]'
                    )}
                  >
                    <div className={cn(
                      'w-4 h-4 rounded border flex items-center justify-center shrink-0',
                      selected ? 'bg-[#5CE5A0] border-[#5CE5A0]' : 'border-gray-300'
                    )}>
                      {selected && <Check size={12} className="text-white" />}
                    </div>
                    {tag}
                  </button>
                );
              })
            ) : (
              <div className="px-3 py-2 text-gray-500 text-sm">No tags found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
