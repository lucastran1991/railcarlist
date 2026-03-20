'use client';

import { useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, TooltipProps,
} from 'recharts';
import { AlertCircle } from 'lucide-react';
import { TimeseriesResponse } from '@/types/api';
import { format } from 'date-fns';

const MAX_DATA_POINTS = 2000;

function sampleDataPoints<T>(data: T[], maxPoints: number): T[] {
  if (data.length <= maxPoints) return data;
  const step = Math.ceil(data.length / maxPoints);
  const sampled: T[] = [data[0]];
  for (let i = step; i < data.length - 1; i += step) sampled.push(data[i]);
  if (data.length > 1) sampled.push(data[data.length - 1]);
  return sampled;
}

function formatYAxisValue(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1e9) return (value / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
  if (abs >= 1e6) return (value / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
  if (abs >= 1e3) return (value / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(1);
}

const CHART_COLORS = [
  '#0969da', '#38A169', '#DD6B20', '#E53E3E',
  '#805AD5', '#319795', '#D53F8C', '#00B5D8',
];

function formatTooltipLabel(label: string): string {
  if (!label) return '';
  const d = new Date(label);
  if (isNaN(d.getTime())) return label;
  return format(d, 'yyyy-MM-dd HH:mm:ss');
}

function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length || !label) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-md shadow-md px-3 py-2 text-sm">
      <p className="font-semibold text-gray-700 mb-1">{formatTooltipLabel(String(label))}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} style={{ color: entry.color }}>
          {entry.name}: {typeof entry.value === 'number' ? entry.value.toFixed(2) : 'N/A'}
        </p>
      ))}
    </div>
  );
}

interface TimeseriesChartProps {
  data: TimeseriesResponse;
  disableAnimation?: boolean;
  aggregateMode?: 'raw' | string;
}

export default function TimeseriesChart({ data, disableAnimation = false, aggregateMode }: TimeseriesChartProps) {
  const { chartData, isSampled, originalCount } = useMemo(() => {
    const tags = Object.keys(data.result);
    if (tags.length === 0) return { chartData: [], isSampled: false, originalCount: 0 };

    const allTimestamps = new Set<string>();
    tags.forEach((tag) => data.result[tag].forEach((point) => allTimestamps.add(point.timestamp)));

    const sortedTimestamps = Array.from(allTimestamps).sort();
    const originalCount = sortedTimestamps.length;
    const sampledTimestamps = sampleDataPoints(sortedTimestamps, MAX_DATA_POINTS);
    const isSampled = sampledTimestamps.length < sortedTimestamps.length;

    const chartDataArray: Array<Record<string, unknown>> = [];
    sampledTimestamps.forEach((timestamp) => {
      const point: Record<string, unknown> = { timestamp };
      tags.forEach((tag) => {
        const tagData = data.result[tag].find((p) => p.timestamp === timestamp);
        point[tag] = tagData ? tagData.value : null;
      });
      chartDataArray.push(point);
    });

    return { chartData: chartDataArray, isSampled, originalCount };
  }, [data]);

  const tags = Object.keys(data.result);

  if (tags.length === 0) {
    return (
      <div className="p-12 text-center">
        <p className="text-gray-500">No data available</p>
      </div>
    );
  }

  const formatXTick = (timestamp: string) => {
    const d = new Date(timestamp);
    if (isNaN(d.getTime())) return timestamp;
    return aggregateMode === 'raw' ? format(d, 'HH:mm') : format(d, 'dd/MM');
  };

  return (
    <div className={`w-full ${isSampled ? 'h-[600px]' : 'h-[520px]'} px-6 py-4 bg-gray-50 flex flex-col`}>
      {isSampled && (
        <div className="flex items-start gap-2 mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md text-sm shrink-0">
          <AlertCircle size={16} className="text-blue-500 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-blue-800">
              Large dataset detected ({originalCount.toLocaleString()} points)
            </p>
            <p className="text-xs text-blue-600 mt-1">
              Displaying {chartData.length.toLocaleString()} sampled points for better performance.
              Use aggregation (Daily/Monthly) for smoother visualization.
            </p>
          </div>
        </div>
      )}
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 16, right: 24, left: 8, bottom: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
            <XAxis
              dataKey="timestamp"
              tick={{ fontSize: 12, fill: '#4A5568' }}
              axisLine={{ stroke: '#E2E8F0' }}
              tickLine={{ stroke: '#E2E8F0' }}
              interval="preserveStartEnd"
              tickFormatter={formatXTick}
            />
            <YAxis
              tick={{ fontSize: 12, fill: '#4A5568' }}
              axisLine={{ stroke: '#E2E8F0' }}
              tickLine={{ stroke: '#E2E8F0' }}
              tickFormatter={(v) => formatYAxisValue(Number(v))}
            />
            <Tooltip content={({ active, payload, label }) => (
              <CustomTooltip
                active={active}
                payload={payload as TooltipProps<number, string>['payload']}
                label={label}
              />
            )} />
            <Legend
              wrapperStyle={{ paddingTop: 8 }}
              iconType="line"
              iconSize={10}
              formatter={(value) => <span className="text-sm text-gray-700">{value}</span>}
            />
            {tags.map((tag, index) => (
              <Line
                key={tag}
                type="monotone"
                dataKey={tag}
                stroke={CHART_COLORS[index % CHART_COLORS.length]}
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2 }}
                name={tag}
                connectNulls
                isAnimationActive={!disableAnimation}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
