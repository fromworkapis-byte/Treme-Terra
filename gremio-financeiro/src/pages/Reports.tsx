// ===== REPORTS PAGE =====
import * as React from 'react';
import { useState } from 'react';
import { Calendar, Download, FileText, BarChart2, Users, Printer } from 'lucide-react';
import { Button, Input, Select, Card, CardContent, CardHeader, CardTitle, Table, TableHeader, TableBody, TableRow, TableCell, TableHead, ScrollArea, Tabs, TabsList, TabsTrigger, TabsContent, DatePicker, Badge } from '../components/ui';
import { useEntries, useExpenses, useTransfers, useAccounts, useCategories, useMembers, useMemberPaymentStatus } from '../hooks/useFinancialData';
import { formatBRL, formatDateBR, getCurrentMonthYear } from '../db';
import { downloadCsv } from '../lib/export';
import type { Entry, Expense, Transfer, Account, Category, Member } from '../types';

interface ReportFilters {
  startDate: string;
  endDate: string;
  categoryId: string;
  accountId: string;
  type: 'all' | 'entry' | 'expense' | 'transfer';
  responsibleId: string;
}

export function Reports() {
  const [filters, setFilters] = useState<ReportFilters>({
    startDate: '',
    endDate: '',
    categoryId: '',
    accountId: '',
    type: 'all',
    responsibleId: '',
  });
  const [reportType, setReportType] = useState<'general' | 'accountability' | 'members'>('general');
  const [generatedReport, setGeneratedReport] = useState<any>(null);

  const { data: entries } = useEntries({
    dateRange: filters.startDate && filters.endDate ? { start: filters.startDate, end: filters.endDate } : undefined,
    categoryId: filters.categoryId || undefined,
    accountId: filters.accountId || undefined,
  });
  const { data: expenses } = useExpenses({
    dateRange: filters.startDate && filters.endDate ? { start: filters.startDate, end: filters.endDate } : undefined,
    categoryId: filters.categoryId || undefined,
    accountId: filters.accountId || undefined,
  });
  const { data: transfers } = useTransfers({
    dateRange: filters.startDate && filters.endDate ? { start: filters.startDate, end: filters.endDate } : undefined,
    accountId: filters.accountId || undefined,
  });
  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories();
  const { data: members } = useMembers({ status: 'ACTIVE' });
  const { data: paymentStatus } = useMemberPaymentStatus(getCurrentMonthYear());

  const activeAccounts = accounts?.filter(a => a.isActive) || [];
  const allCategories = categories || [];

  const handleFilterChange = (key: keyof ReportFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleGenerateReport = () => {
    setGeneratedReport(generateReportData());
  };

  const generateReportData = () => {
    const filteredEntries = entries?.filter(e => {
      if (filters.type !== 'all' && filters.type !== 'entry') return false;
      return true;
    }) || [];
    const filteredExpenses = expenses?.filter(e => {
      if (filters.type !== 'all' && filters.type !== 'expense') return false;
      return true;
    }) || [];
    const filteredTransfers = transfers?.filter(t => {
      if (filters.type !== 'all' && filters.type !== 'transfer') return false;
      return true;
    }) || [];

    const totalIncome = filteredEntries.reduce((s, e) => s + e.amount, 0);
    const totalExpense = filteredExpenses.reduce((s, e) => s + e.amount, 0);
    const totalTransfersIn = filteredTransfers.filter(t => t.toAccountId).reduce((s, t) => s + t.amount, 0);
    const totalTransfersOut = filteredTransfers.filter(t => t.fromAccountId).reduce((s, t) => s + t.amount, 0);

    // Get initial balance (before start date)
    const startDate = filters.startDate || '2000-01-01';
    const previousEntries = entries?.filter(e => e.date < startDate) || [];
    const previousExpenses = expenses?.filter(e => e.date < startDate) || [];
    const previousTransfersIn = transfers?.filter(t => t.date < startDate && t.toAccountId).reduce((s, t) => s + t.amount, 0) || 0;
    const previousTransfersOut = transfers?.filter(t => t.date < startDate && t.fromAccountId).reduce((s, t) => s + t.amount, 0) || 0;
    
    const initialBalance = previousEntries.reduce((s, e) => s + e.amount, 0) - 
      previousExpenses.reduce((s, e) => s + e.amount, 0) + 
      previousTransfersIn - previousTransfersOut;

    const allMovements = [
      ...filteredEntries.map(e => ({ ...e, type: 'entry' as const })),
      ...filteredExpenses.map(e => ({ ...e, type: 'expense' as const })),
      ...filteredTransfers.map(t => ({ ...t, type: 'transfer' as const }))
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return {
      period: { start: filters.startDate, end: filters.endDate },
      initialBalance,
      totalIncome,
      totalExpense,
      totalTransfers: totalTransfersIn - totalTransfersOut,
      finalBalance: initialBalance + totalIncome - totalExpense + totalTransfersIn - totalTransfersOut,
      movements: allMovements,
      generatedAt: new Date().toISOString(),
      generatedBy: 'Administrador',
    };
  };

  const toCurrency = (cents: number) => (cents / 100).toFixed(2).replace('.', ',');

  const handleExportCsv = (kind: 'general' | 'accountability' | 'members') => {
    const filename = `relatorio-${kind}-${new Date().toISOString().slice(0, 10)}.csv`;

    if (kind === 'general') {
      if (!generatedReport) return;
      downloadCsv(filename, [
        ['Relatório Geral'],
        ['Período', `${generatedReport.period.start || 'início'} a ${generatedReport.period.end || 'hoje'}`],
        ['Saldo inicial', toCurrency(generatedReport.initialBalance)],
        ['Total entradas', toCurrency(generatedReport.totalIncome)],
        ['Total despesas', toCurrency(generatedReport.totalExpense)],
        ['Transferências', toCurrency(generatedReport.totalTransfers)],
        ['Saldo final', toCurrency(generatedReport.finalBalance)],
        [],
        ['Data', 'Descrição', 'Categoria', 'Tipo', 'Valor (R$)', 'Conta'],
        ...generatedReport.movements.map((item: any) => [
          item.date,
          item.description,
          item.category?.name || '',
          item.type,
          toCurrency(item.amount),
          item.account?.name || (item.fromAccount ? `${item.fromAccount.name} → ${item.toAccount?.name || ''}` : ''),
        ]),
      ]);
      return;
    }

    if (kind === 'accountability') {
      const movements = [
        ...(entries || []).map(item => ({ ...item, type: 'Entrada', categoryName: item.category?.name || '', accountName: item.account?.name || '' })),
        ...(expenses || []).map(item => ({ ...item, type: 'Despesa', categoryName: item.category?.name || '', accountName: item.account?.name || '' })),
        ...(transfers || []).map(item => ({ ...item, type: 'Transferência', categoryName: 'Transferência', accountName: `${item.fromAccount?.name || ''} → ${item.toAccount?.name || ''}` })),
      ].sort((a, b) => a.date.localeCompare(b.date));
      downloadCsv(filename, [
        ['Data', 'Descrição', 'Categoria', 'Tipo', 'Valor (R$)', 'Conta'],
        ...movements.map(item => [item.date, item.description, item.categoryName, item.type, toCurrency(item.amount), item.accountName]),
      ]);
      return;
    }

    downloadCsv(filename, [
      ['Posto/Grad', 'Nome', 'Ordem', 'Status', 'Valor (R$)', 'Data do pagamento'],
      ...(paymentStatus || []).map(status => [
        status.member.rank,
        status.member.name,
        status.member.ordem,
        status.paid ? 'Pago' : 'Pendente',
        toCurrency(status.amount),
        status.date || '',
      ]),
    ]);
  };

  const handlePrint = () => {
    window.print();
  };

  const defaultStartDate = React.useMemo(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    return firstDay.toISOString().split('T')[0];
  }, []);

  const defaultEndDate = React.useMemo(() => {
    return new Date().toISOString().split('T')[0];
  }, []);

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-text-primary">Relatórios</h1>
          <p className="text-text-secondary mt-1">Gere relatórios em PDF e Excel para prestação de contas</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros do Relatório</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            <DatePicker
              label="Data Inicial"
              value={filters.startDate || defaultStartDate}
              onChange={e => handleFilterChange('startDate', e.target.value)}
            />
            <DatePicker
              label="Data Final"
              value={filters.endDate || defaultEndDate}
              onChange={e => handleFilterChange('endDate', e.target.value)}
            />
            <Select
              label="Categoria"
              options={[{ value: '', label: 'Todas' }, ...allCategories.map(c => ({ value: c.id, label: `${c.type === 'INCOME' ? '🟢' : '🔴'} ${c.name}` }))]}
              value={filters.categoryId}
              onChange={e => handleFilterChange('categoryId', e.target.value)}
            />
            <Select
              label="Conta"
              options={[{ value: '', label: 'Todas' }, ...activeAccounts.map(a => ({ value: a.id, label: a.name }))]}
              value={filters.accountId}
              onChange={e => handleFilterChange('accountId', e.target.value)}
            />
            <Select
              label="Tipo"
              options={[
                { value: 'all', label: 'Todos' },
                { value: 'entry', label: 'Entradas' },
                { value: 'expense', label: 'Despesas' },
                { value: 'transfer', label: 'Transferências' },
              ]}
              value={filters.type}
              onChange={e => handleFilterChange('type', e.target.value as any)}
            />
            <div className="flex items-end gap-2">
              <Button type="button" variant="primary" onClick={handleGenerateReport} className="w-full">
                Gerar Relatório
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Report Type Tabs */}
      <Tabs value={reportType} onValueChange={setReportType} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="general">Relatório Geral</TabsTrigger>
          <TabsTrigger value="accountability">Prestação de Contas</TabsTrigger>
          <TabsTrigger value="members">Contribuições</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          {generatedReport ? (
            <GeneralReportView report={generatedReport} onExportCsv={() => handleExportCsv('general')} onPrint={handlePrint} />
          ) : (
            <div className="text-center py-12 text-text-muted">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Nenhum relatório gerado</p>
              <p className="text-sm mt-1">Configure os filtros e clique em "Gerar Relatório"</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="accountability">
          <AccountabilityReportView 
            entries={entries || []} 
            expenses={expenses || []} 
            transfers={transfers || []} 
            accounts={accounts || []}
            members={members || []}
            paymentStatus={paymentStatus || []}
            onExportCsv={() => handleExportCsv('accountability')}
            onPrint={handlePrint}
          />
        </TabsContent>

        <TabsContent value="members">
          <MembersReportView 
            paymentStatus={paymentStatus || []}
            members={members || []}
            onExportCsv={() => handleExportCsv('members')}
            onPrint={handlePrint}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function GeneralReportView({ report, onExportCsv, onPrint }: any) {
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card><CardContent className="pt-6 text-center"><p className="text-sm text-text-muted">Saldo Inicial</p><p className="text-2xl font-bold text-text-primary mt-1">{formatBRL(report.initialBalance)}</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><p className="text-sm text-text-muted">Total Entradas</p><p className="text-2xl font-bold text-success mt-1">+{formatBRL(report.totalIncome)}</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><p className="text-sm text-text-muted">Total Despesas</p><p className="text-2xl font-bold text-danger mt-1">-{formatBRL(report.totalExpense)}</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><p className="text-sm text-text-muted">Transferências</p><p className="text-2xl font-bold text-warning mt-1">{formatBRL(report.totalTransfers)}</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><p className="text-sm text-text-muted">Saldo Final</p><p className="text-2xl font-bold text-text-primary mt-1">{formatBRL(report.finalBalance)}</p></CardContent></Card>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button variant="outline" onClick={onExportCsv}><Download className="w-4 h-4 mr-2" /> Exportar CSV</Button>
        <Button variant="ghost" onClick={onPrint}><Printer className="w-4 h-4 mr-2" /> Imprimir</Button>
      </div>

      {/* Details Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detalhamento das Movimentações</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Conta</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.movements.map((m: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell className="text-text-secondary">{formatDateBR(m.date)}</TableCell>
                    <TableCell className="font-medium">{m.description}</TableCell>
                    <TableCell>
                      {m.type === 'entry' && <Badge variant="success">{m.category?.name || '-'}</Badge>}
                      {m.type === 'expense' && <Badge variant="danger">{m.category?.name || '-'}</Badge>}
                      {m.type === 'transfer' && <Badge variant="warning">Transferência</Badge>}
                    </TableCell>
                    <TableCell>
                      {m.type === 'entry' && <Badge variant="success">Entrada</Badge>}
                      {m.type === 'expense' && <Badge variant="danger">Despesa</Badge>}
                      {m.type === 'transfer' && <Badge variant="warning">Transferência</Badge>}
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium">
                      {m.type === 'entry' && <span className="text-success">+{formatBRL(m.amount)}</span>}
                      {m.type === 'expense' && <span className="text-danger">-{formatBRL(m.amount)}</span>}
                      {m.type === 'transfer' && <span className="text-warning">{formatBRL(m.amount)}</span>}
                    </TableCell>
                    <TableCell className="text-text-secondary">{m.account?.name || (m.fromAccount ? `${m.fromAccount?.name} → ${m.toAccount?.name}` : '-')}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

function AccountabilityReportView({ entries, expenses, transfers, accounts, members, paymentStatus, onExportCsv, onPrint }: any) {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  
  const totalIncome = entries.reduce((s, e) => s + e.amount, 0);
  const totalExpense = expenses.reduce((s, e) => s + e.amount, 0);
  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);
  const paidMembers = paymentStatus.filter(p => p.paid).length;
  const totalMembers = paymentStatus.length;

  return (
    <div className="space-y-6 max-w-3xl mx-auto p-8 bg-white text-black" style={{ fontFamily: 'Times New Roman, serif' }}>
      {/* Header */}
      <div className="text-center border-b-2 border-black pb-6">
        <h1 className="text-3xl font-bold uppercase">1ª Companhia de Fuzileiros - Treme Terra</h1>
        <h2 className="text-xl font-bold mt-2">PRESTAÇÃO DE CONTAS MENSAL</h2>
        <p className="text-lg mt-1">Período: {month}/{year}</p>
        <p className="text-sm text-gray-600 mt-2">Gerado em: {now.toLocaleDateString('pt-BR')} às {now.toLocaleTimeString('pt-BR')}</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="border border-gray-300 p-4">
          <h3 className="font-bold text-lg mb-2 border-b border-gray-300 pb-2">RESUMO FINANCEIRO</h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between"><span>Saldo Inicial</span><span className="font-bold">{formatBRL(totalBalance - totalIncome + totalExpense)}</span></div>
            <div className="flex justify-between text-green-700"><span>Total Entradas</span><span className="font-bold">+{formatBRL(totalIncome)}</span></div>
            <div className="flex justify-between text-red-700"><span>Total Despesas</span><span className="font-bold">-{formatBRL(totalExpense)}</span></div>
            <div className="flex justify-between border-t border-gray-300 pt-2"><span className="font-bold">Saldo Final</span><span className="font-bold text-lg">{formatBRL(totalBalance)}</span></div>
          </div>
        </div>
        <div className="border border-gray-300 p-4">
          <h3 className="font-bold text-lg mb-2 border-b border-gray-300 pb-2">SITUAÇÃO DO EFETIVO</h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between"><span>Total de Integrantes</span><span className="font-bold">{totalMembers}</span></div>
            <div className="flex justify-between text-green-700"><span>Contribuições Pagas</span><span className="font-bold">{paidMembers}</span></div>
            <div className="flex justify-between text-red-700"><span>Contribuições Pendentes</span><span className="font-bold">{totalMembers - paidMembers}</span></div>
            <div className="flex justify-between"><span>Taxa de Adimplência</span><span className="font-bold">{totalMembers > 0 ? ((paidMembers / totalMembers) * 100).toFixed(1) : 0}%</span></div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mb-6">
        <Button variant="outline" onClick={onExportCsv}><Download className="w-4 h-4 mr-2" /> Exportar CSV</Button>
        <Button variant="ghost" onClick={onPrint}><Printer className="w-4 h-4 mr-2" /> Imprimir</Button>
      </div>

      {/* Details */}
      <div className="border border-gray-300 p-4">
        <h3 className="font-bold text-lg mb-4 border-b border-gray-300 pb-2">DETALHAMENTO DAS MOVIMENTAÇÕES</h3>
        <ScrollArea className="h-[400px]">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-300">
                <th className="text-left p-2">Data</th>
                <th className="text-left p-2">Descrição</th>
                <th className="text-left p-2">Categoria</th>
                <th className="text-left p-2">Tipo</th>
                <th className="text-right p-2">Valor</th>
                <th className="text-left p-2">Conta</th>
              </tr>
            </thead>
            <tbody>
              {[
                ...entries.map(e => ({ ...e, type: 'entry' as const })),
                ...expenses.map(e => ({ ...e, type: 'expense' as const })),
                ...transfers.map(t => ({ ...t, type: 'transfer' as const }))
              ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map((m, i) => (
                <tr key={i} className="border-b border-gray-200">
                  <td className="p-2">{formatDateBR(m.date)}</td>
                  <td className="p-2">{m.description}</td>
                  <td className="p-2">{m.type === 'transfer' ? 'Transferência' : m.category?.name || '-'}</td>
                  <td className="p-2">{m.type === 'entry' ? 'Entrada' : m.type === 'expense' ? 'Despesa' : 'Transferência'}</td>
                  <td className="p-2 text-right font-mono">
                    {m.type === 'entry' ? '+' : m.type === 'expense' ? '-' : ''}{formatBRL(m.amount)}
                  </td>
                  <td className="p-2">{m.account?.name || (m.fromAccount ? `${m.fromAccount?.name} → ${m.toAccount?.name}` : '-')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollArea>
      </div>

      {/* Signature */}
      <div className="mt-8 grid grid-cols-2 gap-8">
        <div className="border-t border-black pt-4 text-center">
          <p className="font-bold">Tesoureiro</p>
          <p className="text-sm text-gray-600">________________________________</p>
          <p className="text-sm text-gray-600">Nome: __________________________</p>
          <p className="text-sm text-gray-600">Data: ___/___/_____</p>
        </div>
        <div className="border-t border-black pt-4 text-center">
          <p className="font-bold">Comandante da Unidade</p>
          <p className="text-sm text-gray-600">________________________________</p>
          <p className="text-sm text-gray-600">Nome: __________________________</p>
          <p className="text-sm text-gray-600">Data: ___/___/_____</p>
        </div>
      </div>
    </div>
  );
}

function MembersReportView({ paymentStatus, members, onExportCsv, onPrint }: any) {
  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <Button variant="outline" onClick={onExportCsv}><Download className="w-4 h-4 mr-2" /> Exportar CSV</Button>
        <Button variant="ghost" onClick={onPrint}><Printer className="w-4 h-4 mr-2" /> Imprimir</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Relatório de Contribuições - {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Post/Grad</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Ordem</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Data Pagamento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentStatus?.map((status: any) => (
                  <TableRow key={status.member.id}>
                    <TableCell><Badge variant="info">{status.member.rank}</Badge></TableCell>
                    <TableCell className="font-medium">{status.member.name}</TableCell>
                    <TableCell className="text-text-secondary font-mono">#{status.member.ordem}</TableCell>
                    <TableCell>{status.paid ? <Badge variant="success">Pago</Badge> : <Badge variant="danger">Pendente</Badge>}</TableCell>
                    <TableCell className="font-mono font-medium text-text-primary">{formatBRL(status.amount)}</TableCell>
                    <TableCell className="text-text-secondary">{status.date ? formatDateBR(status.date) : '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}