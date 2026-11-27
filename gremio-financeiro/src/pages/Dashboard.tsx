// ===== DASHBOARD PAGE =====
import * as React from 'react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Wallet, ArrowDown, ArrowUp, CheckCircle, AlertCircle, QrCode } from 'lucide-react';
import { Button, Badge, Card, CardContent, CardHeader, CardTitle } from '../components/ui';
import { PageHeader } from '../components/layout';
import { useDashboardKPIs, useMemberPaymentStatus } from '../hooks/useFinancialData';
import { formatBRL, getCurrentMonthYear, getPreviousMonthYear, getNextMonthYear } from '../db';
import { militaryRankLabel } from '../types';

const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

function monthTitle(monthYear: string) {
  const [year, month] = monthYear.split('-');
  return `${monthNames[Number(month) - 1] || month} de ${year}`;
}

export function Dashboard() {
  const [monthYear, setMonthYear] = useState(getCurrentMonthYear());
  const { data: kpis, isLoading } = useDashboardKPIs();
  const { data: paymentStatus } = useMemberPaymentStatus(monthYear);

  const paid = paymentStatus?.filter(status => status.paid) || [];
  const pending = paymentStatus?.filter(status => !status.paid) || [];
  const collected = paid.reduce((total, status) => total + status.amount, 0);

  if (isLoading) {
    return (
      <div>
        <p className="text-text-secondary">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Visão rápida do caixa e das mensalidades"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setMonthYear(getPreviousMonthYear(monthYear))} aria-label="Mês anterior">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="px-3 py-2 text-sm font-medium text-text-primary bg-tertiary/50 rounded-lg">{monthTitle(monthYear)}</span>
            <Button variant="ghost" size="icon" onClick={() => setMonthYear(getNextMonthYear(monthYear))} aria-label="Próximo mês">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-text-secondary">Saldo total</p>
            <p className="text-2xl font-bold text-text-primary mt-1">{formatBRL(kpis?.totalBalance || 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-text-secondary">Entradas do mês</p>
            <p className="text-2xl font-bold text-success mt-1">{formatBRL(kpis?.monthIncome || 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-text-secondary">Despesas do mês</p>
            <p className="text-2xl font-bold text-danger mt-1">{formatBRL(kpis?.monthExpense || 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-text-secondary">Mensalidades recebidas</p>
            <p className="text-2xl font-bold text-text-primary mt-1">{formatBRL(collected)}</p>
            <p className="text-xs text-text-muted mt-1">{paid.length} pagos · {pending.length} pendentes</p>
            <p className="text-xs text-text-muted">Já incluídas nas entradas do mês</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><AlertCircle className="w-5 h-5 text-danger" /> Faltam pagar ({pending.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {pending.length === 0 ? (
              <div className="flex items-center gap-2 text-success text-sm">
                <CheckCircle className="w-4 h-4" /> Todos os integrantes pagaram neste mês.
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {pending.slice(0, 8).map(status => (
                  <li key={status.member.id} className="py-2 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-text-primary">{militaryRankLabel(status.member.rank)} {status.member.name}</p>
                      <p className="text-xs text-text-muted">{status.member.phone || 'Sem WhatsApp cadastrado'}</p>
                    </div>
                    <Badge variant="danger">Pendente</Badge>
                  </li>
                ))}
                {pending.length > 8 && <li className="pt-3 text-sm text-text-muted">+ {pending.length - 8} integrantes</li>}
              </ul>
            )}
            <Button asChild variant="outline" className="w-full mt-4">
              <Link to="/members">Ir para pagamentos</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-success" /> Já pagaram ({paid.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {paid.length === 0 ? (
              <p className="text-sm text-text-muted">Nenhum pagamento registrado neste mês.</p>
            ) : (
              <ul className="divide-y divide-border">
                {paid.slice(0, 8).map(status => (
                  <li key={status.member.id} className="py-2 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-text-primary">{militaryRankLabel(status.member.rank)} {status.member.name}</p>
                      <p className="text-xs text-text-muted">{formatBRL(status.amount)}</p>
                    </div>
                    <Badge variant="success">Pago</Badge>
                  </li>
                ))}
                {paid.length > 8 && <li className="pt-3 text-sm text-text-muted">+ {paid.length - 8} integrantes</li>}
              </ul>
            )}
            <Button asChild variant="outline" className="w-full mt-4">
              <Link to="/members"><QrCode className="w-4 h-4 mr-2" /> Ver QR e comprovantes</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-secondary">Caixa físico</p>
                <p className="text-xl font-bold text-text-primary mt-1">{formatBRL(kpis?.cashBalance || 0)}</p>
              </div>
              <Wallet className="w-6 h-6 text-success" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-secondary">Conta bancária</p>
                <p className="text-xl font-bold text-text-primary mt-1">{formatBRL(kpis?.bankBalance || 0)}</p>
              </div>
              <ArrowDown className="w-6 h-6 text-info" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-secondary">Resultado do mês</p>
                <p className={`text-xl font-bold mt-1 ${(kpis?.monthResult || 0) >= 0 ? 'text-success' : 'text-danger'}`}>
                  {formatBRL(kpis?.monthResult || 0)}
                </p>
              </div>
              <ArrowUp className="w-6 h-6 text-text-secondary" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
