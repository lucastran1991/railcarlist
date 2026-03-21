'use client';

import { format } from 'date-fns';

interface DateRangePickerProps {
  fromDate: string;
  toDate: string;
  onFromDateChange: (date: string) => void;
  onToDateChange: (date: string) => void;
}

export default function DateRangePicker({
  fromDate, toDate, onFromDateChange, onToDateChange,
}: DateRangePickerProps) {
  const formatForInput = (isoString: string): string => {
    try {
      return format(new Date(isoString), "yyyy-MM-dd'T'HH:mm");
    } catch {
      return '';
    }
  };

  const parseFromInput = (inputValue: string): string => {
    if (!inputValue) return '';
    try {
      return format(new Date(inputValue), "yyyy-MM-dd'T'HH:mm:ss");
    } catch {
      return inputValue;
    }
  };

  return (
    <div className="flex gap-4 items-end">
      <div className="flex-1">
        <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
        <input
          type="datetime-local"
          value={formatForInput(fromDate)}
          onChange={(e) => onFromDateChange(parseFromInput(e.target.value))}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#5CE5A0] focus:outline-none focus:ring-1 focus:ring-[#5CE5A0]"
        />
      </div>
      <div className="flex-1">
        <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
        <input
          type="datetime-local"
          value={formatForInput(toDate)}
          onChange={(e) => onToDateChange(parseFromInput(e.target.value))}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#5CE5A0] focus:outline-none focus:ring-1 focus:ring-[#5CE5A0]"
        />
      </div>
    </div>
  );
}
