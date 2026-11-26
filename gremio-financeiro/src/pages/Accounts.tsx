// ===== ACCOUNTS PAGE =====
import * as React from 'react';
import { useState } from 'react';
import { Plus, Edit, Trash, Wallet, CreditCard, Smartphone, Building, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { Button, Input, Select, Badge, Card, CardContent, CardHeader, CardTitle, Table, TableHeader, TableBody, TableRow, TableCell, TableHead, ScrollArea, Modal, Switch, Label } from '../components/ui';
import { PageHeader } from '../components/layout';
import { useAccounts, useCreateAccount, useUpdateAccount, useDeleteAccount, useRecalculateAccountBalances } from '../hooks/useFinancialData';
import { formatBRL, formatDateBR } from '../db';
import { AccountForm } from '../components/forms';
import type { Account, Entry, Expense, Transfer } from '../types';

const ACCOUNT_TYPE_ICONS = {
  CASH: Wallet,
  BANK: CreditCard,
  PIX: Smartphone,
  OTHER: Building,
};

const ACCOUNT_TYPE_LABELS = {
  CASH: 'Caixa Físico',
  BANK: 'Conta Bancária',
  PIX: 'PIX',
  OTHER: 'Outras',
};

export function Accounts() {
  const [showForm, setShowForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [deletingAccount, setDeletingAccount] = useState<Account | null>(null);
  const [viewingStatement, setViewingStatement] = useState<Account | null>(null);
  const [message, setMessage] = useState('');

  const { data: accounts, isLoading } = useAccounts();
  const createAccount = useCreateAccount();
  const updateAccount = useUpdateAccount();
  const deleteAccount = useDeleteAccount();
  const recalculate = useRecalculateAccountBalances();

  const handleOpenCreate = () => {
    setEditingAccount(null);
    setShowForm(true);
  };

  const handleOpenEdit = (account: Account) => {
    setEditingAccount(account);
    setShowForm(true);
  };

  const handleOpenDelete = (account: Account) => {
    setDeletingAccount(account);
  };

  const handleOpenStatement = (account: Account) => {
    setViewingStatement(account);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingAccount(null);
  };

  const handleCloseDelete = () => {
    setDeletingAccount(null);
  };

  const handleCloseStatement = () => {
    setViewingStatement(null);
  };

  const handleConfirmDelete = async () => {
    if (deletingAccount) {
      await deleteAccount.mutateAsync(deletingAccount.id);
      handleCloseDelete();
    }
  };

  const handleFormSuccess = () => {
    handleCloseForm();
  };

  const handleRecalculate = async () => {
    setMessage('');
    try {
      await recalculate.mutateAsync();
      setMessage('Saldos recalculados a partir das movimentações.');
    } catch {
      setMessage('Não foi possível recalcular os saldos.');
    }
  };

  const getTotalBalance = () => {
    return accounts?.reduce((sum, a) => sum + a.balance, 0) || 0;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contas e Caixa"
        description="Gerencie contas bancárias, caixa físico e transferências"
        actions={
          <Button variant="primary" onClick={handleOpenCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Conta
          </Button>
        }
      />

      {/* Total Balance */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="text-center sm:text-left">
              <p className="text-sm font-medium text-text-secondary">Saldo Total Consolidado</p>
              <p className="text-4xl font-bold text-text-primary mt-1">{formatBRL(getTotalBalance())}</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleRecalculate} disabled={recalculate.isPending}>
              <RefreshCw className={`w-4 h-4 mr-2 ${recalculate.isPending ? 'animate-spin' : ''}`} />
              {recalculate.isPending ? 'Recalculando...' : 'Recalcular'}
            </Button>
          </div>
          {message && <p className="mt-3 text-sm text-text-secondary">{message}</p>}
        </CardContent>
      </Card>

      {/* Accounts List */}
      <Card>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-text-muted">Carregando...</div>
          ) : (
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Conta</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Saldo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-32">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-text-muted">
                        Nenhuma conta cadastrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    accounts?.map(account => {
                      const Icon = ACCOUNT_TYPE_ICONS[account.type] || Building;
                      return (
                        <TableRow key={account.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-xl bg-tertiary">
                                <Icon className="w-5 h-5 text-text-secondary" />
                              </div>
                              <div>
                                <p className="font-medium text-text-primary">{account.name}</p>
                                {account.description && <p className="text-xs text-text-muted">{account.description}</p>}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="info">{ACCOUNT_TYPE_LABELS[account.type]}</Badge>
                          </TableCell>
                          <TableCell className="font-mono font-medium text-text-primary">
                            {formatBRL(account.balance)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Switch
                                id={`status-${account.id}`}
                                checked={account.isActive}
                                onCheckedChange={async (checked) => {
                                  await updateAccount.mutateAsync({ id: account.id, data: { isActive: checked } });
                                }}
                              />
                              <Label htmlFor={`status-${account.id}`} className="text-sm text-text-secondary cursor-pointer">
                                {account.isActive ? 'Ativa' : 'Inativa'}
                              </Label>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button variant="ghost" size="icon" onClick={() => handleOpenStatement(account)} aria-label="Ver extrato">
                                <ChevronDown className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(account)} aria-label="Editar">
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleOpenDelete(account)} aria-label="Excluir" className="text-danger hover:text-danger">
                                <Trash className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        open={showForm}
        onOpenChange={setShowForm}
        title={editingAccount ? 'Editar Conta' : 'Nova Conta'}
        size="lg"
      >
        <AccountForm
          initialData={editingAccount || undefined}
          onSuccess={handleFormSuccess}
          onCancel={handleCloseForm}
        />
      </Modal>

      {/* Delete Modal */}
      <Modal
        open={!!deletingAccount}
        onOpenChange={handleCloseDelete}
        title="Confirmar Exclusão"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-text-secondary">
            Tem certeza que deseja excluir a conta <strong>{deletingAccount?.name}</strong>?
          </p>
          <p className="text-sm text-danger">
            Esta ação não pode ser desfeita. Só é possível excluir contas sem movimentações.
          </p>
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button variant="outline" onClick={handleCloseDelete}>Cancelar</Button>
            <Button variant="danger" onClick={handleConfirmDelete}>Excluir</Button>
          </div>
        </div>
      </Modal>

      {/* Statement Modal */}
      <Modal
        open={!!viewingStatement}
        onOpenChange={handleCloseStatement}
        title={`Extrato: ${viewingStatement?.name}`}
        size="xl"
      >
        <AccountStatement account={viewingStatement!} onClose={handleCloseStatement} />
      </Modal>
    </div>
  );
}

interface AccountStatementProps {
  account: Account;
  onClose: () => void;
}

function AccountStatement({ account, onClose }: AccountStatementProps) {
  const { data: entries } = useEntries({ accountId: account.id });
  const { data: expenses } = useExpenses({ accountId: account.id });
  const { data: transfersIn } = useTransfers({ accountId: account.id }); // This needs fixing - we need separate hooks for in/out

  // For now, let's fetch all transfers and filter
  const { data: allTransfers } = useTransfers();

  const movements = React.useMemo(() => {
    const items = [
      ...(entries || []).map(e => ({ ...e, type: 'entry' as const })),
      ...(expenses || []).map(e => ({ ...e, type: 'expense' as const })),
      ...(allTransfers || []).filter(t => t.toAccountId === account.id).map(t => ({ ...t, type: 'transfer_in' as const })),
      ...(allTransfers || []).filter(t => t.fromAccountId === account.id).map(t => ({ ...t, type: 'transfer_out' as const })),
    ];
    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [entries, expenses, allTransfers, account.id]);

  const totalIn = entries?.reduce((s, e) => s + e.amount, 0) || 0;
  const totalOut = (expenses?.reduce((s, e) => s + e.amount, 0) || 0) + 
    (allTransfers?.filter(t => t.fromAccountId === account.id).reduce((s, t) => s + t.amount, 0) || 0);
  const totalInTransfers = allTransfers?.filter(t => t.toAccountId === account.id).reduce((s, t) => s + t.amount, 0) || 0;
  const totalOutTransfers = allTransfers?.filter(t => t.fromAccountId === account.id).reduce((s, t) => s + t.amount, 0) || 0;

  return (
    <div className="space-y-4 max-h-[60vh] overflow-y-auto">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-tertiary/50 rounded-lg">
        <div>
          <p className="text-sm text-text-muted">Saldo Inicial</p>
          <p className="font-medium text-text-primary">{formatBRL(account.balance - totalIn - totalInTransfers + totalOut + totalOutTransfers)}</p>
        </div>
        <div>
          <p className="text-sm text-text-muted">Total Entradas</p>
          <p className="font-medium text-success">+{formatBRL(totalIn + totalInTransfers)}</p>
        </div>
        <div>
          <p className="text-sm text-text-muted">Total Saídas</p>
          <p className="font-medium text-danger">-{formatBRL(totalOut + totalOutTransfers)}</p>
        </div>
        <div>
          <p className="text-sm text-text-muted">Saldo Atual</p>
          <p className="font-bold text-text-primary">{formatBRL(account.balance)}</p>
        </div>
      </div>

      {/* Movements */}
      <ScrollArea className="h-[400px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Saldo</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {movements.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-text-muted">
                  Nenhuma movimentação nesta conta
                </TableCell>
              </TableRow>
            ) : (
              movements.map((m, index) => {
                let amount = 0;
                let typeLabel = '';
                let typeColor = '';
                
                if (m.type === 'entry') {
                  amount = m.amount;
                  typeLabel = 'Entrada';
                  typeColor = 'text-success';
                } else if (m.type === 'expense') {
                  amount = m.amount;
                  typeLabel = 'Despesa';
                  typeColor = 'text-danger';
                } else if (m.type === 'transfer_in') {
                  amount = m.amount;
                  typeLabel = 'Transferência Recebida';
                  typeColor = 'text-info';
                } else {
                  amount = m.amount;
                  typeLabel = 'Transferência Enviada';
                  typeColor = 'text-warning';
                }

                return (
                  <TableRow key={`${m.type}-${m.id}`}>
                    <TableCell className="text-text-secondary">{formatDateBR(m.date)}</TableCell>
                    <TableCell className="font-medium">{m.description}</TableCell>
                    <TableCell><span className={typeColor}>{typeLabel}</span></TableCell>
                    <TableCell className="text-right font-mono font-medium {typeColor}">
                      {['entry', 'transfer_in'].includes(m.type) ? '+' : '-'}{formatBRL(amount)}
                    </TableCell>
                    <TableCell className="font-mono text-text-secondary">
                      {/* Running balance would need calculation */}
                      {formatBRL(account.balance)}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}