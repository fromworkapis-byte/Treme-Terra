// ===== BAR CHART (ENTRADAS VS SAÍDAS) =====
import * as React from 'react';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { cn } from '../../utils/cn';
import { formatBRL } from '../../db';

interface DataPoint {
  month: string;
  income: number;
  expense: number;
}

interface BarChartProps {
  data: DataPoint[];
  className?: string;
  height?: number;
}

const COLORS = {
  income: '#10b981',
  expense: '#ef4444',
};

export function BarChart({ data, className, height = 280 }: BarChartProps) {
  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-secondary border border-border rounded-lg p-3 shadow-soft-lg">
        <p className="text-sm font-medium text-text-primary">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="flex items-center gap-2 mt-1">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-text-secondary">{entry.name}:</span>
            <span className="font-medium text-text-primary ml-auto">{formatBRL(entry.value)}</span>
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className={cn('w-full', className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsBarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          <XAxis
            dataKey="month"
            tick={{ fill: '#64748b', fontSize: 11, fontFamily: 'Inter' }}
            axisLine={{ stroke: '#1e293b' }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: '#64748b', fontSize: 11, fontFamily: 'Inter' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) => formatBRL(value).replace('R$\u00A0', '')}
            width={60}
          />
          <Tooltip content={<CustomTooltip />} wrapperStyle={{ outline: 'none' }} />
          <Legend />
          <Bar dataKey="income" name="Entradas" radius={[4, 4, 0, 0]} fill={COLORS.income}>
            <Cell fill={COLORS.income} />
          </Bar>
          <Bar dataKey="expense" name="Despesas" radius={[4, 4, 0, 0]} fill={COLORS.expense}>
            <Cell fill={COLORS.expense} />
          </Bar>
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}