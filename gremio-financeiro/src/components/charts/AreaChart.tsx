// ===== AREA CHART (EVOLUÇÃO DO SALDO) =====
import * as React from 'react';
import {
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { cn } from '../../utils/cn';
import { formatBRL } from '../../db';

interface DataPoint {
  month: string;
  balance: number;
  income?: number;
  expense?: number;
}

interface AreaChartProps {
  data: DataPoint[];
  color?: 'success' | 'info';
  className?: string;
  height?: number;
}

const COLORS = {
  success: { stroke: '#10b981', fill: 'rgba(16, 185, 129, 0.3)' },
  info: { stroke: '#3b82f6', fill: 'rgba(59, 130, 246, 0.3)' },
};

export function AreaChart({ data, color = 'success', className, height = 280 }: AreaChartProps) {
  const { stroke, fill } = COLORS[color];

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ value: number; name: string }> }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-secondary border border-border rounded-lg p-3 shadow-soft-lg">
        <p className="text-sm font-medium text-text-primary">{payload[0].name}</p>
        <p className="text-lg font-bold text-text-primary mt-1">{formatBRL(payload[0].value)}</p>
      </div>
    );
  };

  return (
    <div className={cn('w-full', className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsAreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={fill} stopOpacity={0.8} />
              <stop offset="95%" stopColor={fill} stopOpacity={0} />
            </linearGradient>
          </defs>
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
          <Area
            type="monotone"
            dataKey="balance"
            stroke={stroke}
            strokeWidth={2}
            fillOpacity={1}
            fill={`url(#gradient-${color})`}
          />
        </RechartsAreaChart>
      </ResponsiveContainer>
    </div>
  );
}