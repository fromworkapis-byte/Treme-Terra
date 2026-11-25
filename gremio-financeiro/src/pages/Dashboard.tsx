// ===== DASHBOARD PAGE =====
import * as React from 'react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Minus, Download, Upload, TrendingUp, ArrowDown, ArrowUp, Wallet, CreditCard, Smartphone, RefreshCw } from 'lucide-react';
import { Button, Badge, Card, CardContent, CardHeader, CardTitle, Table, TableHeader, TableBody, TableRow, TableCell, TableHead, ScrollArea } from '../components/ui';
import { AreaChart, BarChart, DonutChart, DonutLegend, LineChart } from '../components/charts';
import { useDashboardKPIs, useMonthlyEvolution, useYearlyComparison, useCategoryExpenses, useEntries, useExpenses, useTransfers } from '../hooks/useFinancialData';
import { formatBRL, formatDateBR } from '../db';
import type { Entry, Expense, Transfer } from '../types';

export function Dashboard() {
  const [monthYear, setMonthYear] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const { data: kpis, isLoading: kpisLoading } = useDashboardKPIs();
  const { data: monthlyData } = useMonthlyEvolution();
  const { data: yearlyData } = useYearlyComparison();
  const { data: categoryData } = useCategoryExpenses(monthYear);
  const { data: recentEntries } = useEntries({ month: Number(monthYear.split('-')[1]), year: Number(monthYear.split('-')[0]), limit: 5 });
  const { data: recentExpenses } = useExpenses({ month: Number(monthYear.split('-')[1]), year: Number(monthYear.split('-')[0]), limit: 5 });
  const { data: recentTransfers } = useTransfers({ month: Number(monthYear.split('-')[1]), year: Number(monthYear.split('-')[0]), limit: 5 });

  const getPreviousMonth = () => {
    const [year, month] = monthYear.split('-').map(Number);
    const date = new Date(year, month - 2, 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  };

  const getNextMonth = () => {
    const [year, month] = monthYear.split('-').map(Number);
    const date = new Date(year, month, 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  };

  const formatMonthYear = (my: string) => {
    const [year, month] = my.split('-');
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${months[Number(month) - 1]}/${year}`;
  };

  // Combine and sort recent movements
  const recentMovements = React.useMemo(() => {
    const movements = [
      ...(recentEntries || []).map(e => ({ ...e, type: 'entry' as const })),
      ...(recentExpenses || []).map(e => ({ ...e, type: 'expense' as const })),
      ...(recentTransfers || []).map(t => ({ ...t, type: 'transfer' as const, description: `Transferência: ${t.fromAccount?.name} → ${t.toAccount?.name}`, category: 'Transferência', account: t.fromAccount?.name }))
    ];
    return movements
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);
  }, [recentEntries, recentExpenses, recentTransfers]);

  if (kpisLoading) {
    return (
      <div className="p-4 lg:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-text-primary">Dashboard</h1>
            <p className="text-text-secondary mt-1">Visão geral das finanças da 1ª CFz - Treme Terra</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-6">
                <div className="h-4 bg-tertiary rounded w-3/4 mb-4" />
                <div className="h-8 bg-tertiary rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-text-primary">Dashboard</h1>
          <p className="text-text-secondary mt-1">Visão geral das finanças da 1ª CFz - Treme Terra</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-2" /> Exportar PDF</Button>
          <Button variant="outline" size="sm"><Upload className="w-4 h-4 mr-2" /> Importar</Button>
          <Button variant="ghost" size="icon" onClick={() => setMonthYear(getPreviousMonth())} aria-label="Mês anterior">
            <ArrowUp className="w-4 h-4" />
          </Button>
          <span className="flex items-center px-3 py-2 text-sm font-medium text-text-primary bg-tertiary/50 rounded-lg">
            {formatMonthYear(monthYear)}
          </span>
          <Button variant="ghost" size="icon" onClick={() => setMonthYear(getNextMonth())} aria-label="Próximo mês">
            <ArrowDown className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-text-secondary">Saldo Total</p>
                <p className="text-3xl font-bold text-text-primary mt-1">{kpis?.totalBalance ? formatBRL(kpis.totalBalance) : 'R$ 0,00'}</p>
                <div className="flex items-center gap-1 mt-2">
                  <TrendingUp className="w-4 h-4 text-success" />
                  <span className="text-sm text-success">Atualizado</span>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-success/10">
                <Wallet className="w-6 h-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-text-secondary">Entradas no Mês</p>
                <p className="text-3xl font-bold text-text-primary mt-1">{kpis?.monthIncome ? formatBRL(kpis.monthIncome) : 'R$ 0,00'}</p>
                <div className="flex items-center gap-1 mt-2">
                  <span className="text-sm text-success">+12.5%</span>
                  <span className="text-xs text-text-muted">vs mês anterior</span>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-success/10">
                <Plus className="w-6 h-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-text-secondary">Despesas no Mês</p>
                <p className="text-3xl font-bold text-text-primary mt-1">{kpis?.monthExpense ? formatBRL(kpis.monthExpense) : 'R$ 0,00'}</p>
                <div className="flex items-center gap-1 mt-2">
                  <span className="text-sm text-danger">-8.2%</span>
                  <span className="text-xs text-text-muted">vs mês anterior</span>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-danger/10">
                <Minus className="w-6 h-6 text-danger" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-text-secondary">Resultado do Mês</p>
                <p className="text-3xl font-bold text-text-primary mt-1">
                  {kpis?.monthResult !== undefined ? formatBRL(kpis.monthResult) : 'R$ 0,00'}
                </p>
                <div className="flex items-center gap-1 mt-2">
                  <span className={`text-sm ${(kpis?.monthResult || 0) >= 0 ? 'text-success' : 'text-danger'}`}>
                    {(kpis?.monthResult || 0) >= 0 ? 'Superávit' : 'Déficit'}
                  </span>
                </div>
              </div>
              <div className={`p-3 rounded-xl ${(kpis?.monthResult || 0) >= 0 ? 'bg-success/10' : 'bg-danger/10'}`}>
                <TrendingUp className={`w-6 h-6 ${(kpis?.monthResult || 0) >= 0 ? 'text-success' : 'text-danger'}`} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="text-center">
                <p className="text-3xl font-bold text-text-primary">{kpis?.cashBalance ? formatBRL(kpis.cashBalance) : 'R$ 0,00'}</p>
                <p className="text-sm text-text-secondary mt-1">Caixa Físico</p>
              </div>
              <div className="p-3 rounded-xl bg-success/10 ml-auto">
                <Wallet className="w-7 h-7 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div className="text-center">
                <p className="text-3xl font-bold text-text-primary">{kpis?.bankBalance ? formatBRL(kpis.bankBalance) : 'R$ 0,00'}</p>
                <p className="text-sm text-text-secondary mt-1">Conta Bancária</p>
              </div>
              <div className="p-3 rounded-xl bg-info/10 ml-auto">
                <CreditCard className="w-7 h-7 text-info" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Evolução do Saldo (12 meses)</CardTitle>
            <Badge variant="success">Atualizado</Badge>
          </CardHeader>
          <CardContent>
            <AreaChart data={monthlyData || []} height={280} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Entradas vs Saídas</CardTitle>
            <Badge variant="info">Comparativo</Badge>
          </CardHeader>
          <CardContent>
            <BarChart data={monthlyData || []} height={280} />
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Despesas por Categoria</CardTitle>
            <Badge variant="warning">{formatMonthYear(monthYear)}</Badge>
          </CardHeader>
          <CardContent>
            <div className="flex h-[320px]">
              <div className="flex-1 flex items-center justify-center">
                <DonutChart data={categoryData || []} />
              </div>
              <div className="w-64 lg:w-72 p-4 border-l border-border">
                <DonutLegend data={categoryData || []} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Histórico Anual</CardTitle>
            <Badge variant="info">2023-2026</Badge>
          </CardHeader>
          <CardContent>
            <LineChart data={yearlyData || []} height={280} />
          </CardContent>
        </Card>
      </div>

      {/* Recent Movements */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Movimentações Recentes</CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/movements">Ver todas</Link>
          </Button>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Conta</TableHead>
                  <TableHead>Tipo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentMovements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-text-muted">
                      Nenhuma movimentação encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  recentMovements.map((m, i) => (
                    <TableRow key={`${m.type}-${m.id}`}>
                      <TableCell className="text-text-secondary">{formatDateBR(m.date)}</TableCell>
                      <TableCell className="font-medium">{m.description}</TableCell>
                      <TableCell>
                        {m.type === 'transfer' ? (
                          <Badge variant="warning">{m.category || 'Transferência'}</Badge>
                        ) : m.type === 'entry' ? (
                          <Badge variant="success">{m.category}</Badge>
                        ) : (
                          <Badge variant="danger">{m.category}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium">
                        {m.type === 'entry' && <span className="text-success">+{formatBRL(m.amount)}</span>}
                        {m.type === 'expense' && <span className="text-danger">-{formatBRL(m.amount)}</span>}
                        {m.type === 'transfer' && <span className="text-warning">{formatBRL(m.amount)}</span>}
                      </TableCell>
                      <TableCell className="text-text-secondary">{m.account || '-'}</TableCell>
                      <TableCell>
                        {m.type === 'entry' && <Badge variant="success">Entrada</Badge>}
                        {m.type === 'expense' && <Badge variant="danger">Despesa</Badge>}
                        {m.type === 'transfer' && <Badge variant="warning">Transferência</Badge>}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}