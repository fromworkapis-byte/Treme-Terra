// ===== LINE CHART (HISTÓRICO ANUAL) =====
import * as React from 'react';
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Dot,
} from 'recharts';
import { cn } from '../../utils/cn';
import { formatBRL } from '../../db';

interface DataPoint {
  year: number;
  income: number;
  expense: number;
}

interface LineChartProps {
  data: DataPoint[];
  className?: string;
  height?: number;
}

const COLORS = {
  income: '#10b981',
  expense: '#ef4444',
};

export function LineChart({ data, className, height = 280 }: LineChartProps) {
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

  const CustomDot = (props: any) => {
    const { cx, cy, fill, payload } = props;
    if (!payload) return null;
    return (
      <g>
        <circle cx={cx} cy={cy} r={5} fill="#0a0f1a" />
        <circle cx={cx} cy={cy} r={3} fill={fill || payload.color || COLORS.income} />
      </g>
    );
  };

  return (
    <div className={cn('w-full', className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsLineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          <XAxis
            dataKey="year"
            type="category"
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
          <Line
            type="monotone"
            dataKey="income"
            name="Entradas"
            stroke={COLORS.income}
            strokeWidth={3}
            dot={<CustomDot />}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="expense"
            name="Despesas"
            stroke={COLORS.expense}
            strokeWidth={3}
            dot={<CustomDot />}
            activeDot={{ r: 6 }}
          />
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  );
}