// ===== DONUT CHART (DESPESAS POR CATEGORIA) =====
import * as React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { cn } from '../../utils/cn';
import { formatBRL } from '../../db';

interface DataPoint {
  name: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  data: DataPoint[];
  className?: string;
  height?: number;
  innerRadius?: number;
  outerRadius?: number;
}

export function DonutChart({ data, className, height = 320, innerRadius = 60, outerRadius = 100 }: DonutChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0);

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }> }) => {
    if (!active || !payload?.length) return null;
    const entry = payload[0];
    const percentage = ((entry.value / total) * 100).toFixed(1);
    return (
      <div className="bg-secondary border border-border rounded-lg p-3 shadow-soft-lg">
        <p className="text-sm font-medium text-text-primary">{entry.name}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-text-secondary">{formatBRL(entry.value)}</span>
          <span className="text-text-muted">({percentage}%)</span>
        </div>
      </div>
    );
  };

  return (
    <div className={cn('w-full flex items-center justify-center', className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={2}
            dataKey="value"
            nameKey="name"
            label={({ name, percent }) => percent * 100 >= 5 ? `${(percent * 100).toFixed(0)}%` : null}
            labelLine={false}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} wrapperStyle={{ outline: 'none' }} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

// Custom Legend Component for external rendering
interface DonutLegendProps {
  data: DataPoint[];
}

export function DonutLegend({ data }: DonutLegendProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className="space-y-2">
      {data.map((item, index) => (
        <div key={index} className="flex items-center justify-between py-1.5">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-sm text-text-secondary truncate max-w-[150px]">{item.name}</span>
          </div>
          <div className="text-right min-w-[100px]">
            <p className="text-sm font-medium text-text-primary">{formatBRL(item.value)}</p>
            <p className="text-xs text-text-muted">{((item.value / total) * 100).toFixed(1)}%</p>
          </div>
        </div>
      ))}
    </div>
  );
}