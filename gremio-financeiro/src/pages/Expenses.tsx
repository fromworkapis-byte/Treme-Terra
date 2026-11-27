// ===== EXPENSES PAGE =====
import * as React from 'react';
import { useState } from 'react';
import { Plus, Edit, Trash } from 'lucide-react';
import { Button, Input, Select, Badge, Card, CardContent, CardHeader, CardTitle, Table, TableHeader, TableBody, TableRow, TableCell, TableHead, ScrollArea, Modal } from '../components/ui';
import { PageHeader } from '../components/layout';
import {
  useAccounts, useCategories, useCreateExpense, useDeleteExpense, useDeleteFixedExpense,
  useExpenses, useFixedExpenses, useGenerateFixedExpenses, useUpdateExpense,
} from '../hooks/useFinancialData';
import { formatBRL, formatDateBR, formatMonthYear } from '../db';
import { ExpenseForm, FixedExpenseForm } from '../components/forms';
import type { Account, Category, Expense, FixedExpense } from '../types';

export function Expenses() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);
  const [showFixedForm, setShowFixedForm] = useState(false);
  const [editingFixed, setEditingFixed] = useState<FixedExpense | null>(null);
  const [deletingFixed, setDeletingFixed] = useState<FixedExpense | null>(null);
  const [fixedMessage, setFixedMessage] = useState('');

  const { data: expenses, isLoading } = useExpenses({
    search: search || undefined,
    categoryId: selectedCategory || undefined,
    accountId: selectedAccount || undefined,
  });

  const { data: categories } = useCategories('EXPENSE');
  const { data: accounts } = useAccounts();
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();
  const { data: fixedExpenses } = useFixedExpenses();
  const deleteFixedExpense = useDeleteFixedExpense();
  const generateFixed = useGenerateFixedExpenses();

  const expenseCategories = categories?.filter(c => c.type === 'EXPENSE') || [];
  const activeAccounts = accounts?.filter(a => a.isActive) || [];
  const categoryName = (id: string) => categories?.find(category => category.id === id)?.name || '-';
  const accountName = (id: string) => accounts?.find(account => account.id === id)?.name || '-';

  const handleOpenCreate = () => {
    setEditingExpense(null);
    setShowForm(true);
  };

  const handleOpenEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setShowForm(true);
  };

  const handleOpenDelete = (expense: Expense) => {
    setDeletingExpense(expense);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingExpense(null);
  };

  const handleCloseDelete = () => {
    setDeletingExpense(null);
  };

  const handleConfirmDelete = async () => {
    if (deletingExpense) {
      await deleteExpense.mutateAsync(deletingExpense.id);
      handleCloseDelete();
    }
  };

  const handleFormSuccess = () => {
    handleCloseForm();
  };

  const handleOpenCreateFixed = () => {
    setEditingFixed(null);
    setShowFixedForm(true);
  };

  const handleOpenEditFixed = (item: FixedExpense) => {
    setEditingFixed(item);
    setShowFixedForm(true);
  };

  const handleGenerateFixed = async () => {
    setFixedMessage('');
    try {
      const count = await generateFixed.mutateAsync();
      setFixedMessage(count > 0
        ? `${count} despesa(s) fixa(s) lançada(s) neste mês.`
        : 'Nenhuma despesa fixa nova para lançar neste mês.');
    } catch {
      setFixedMessage('Não foi possível lançar as despesas fixas.');
    }
  };

  const handleConfirmDeleteFixed = async () => {
    if (deletingFixed) {
      await deleteFixedExpense.mutateAsync(deletingFixed.id);
      setDeletingFixed(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Despesas"
        description="Controle todos os gastos e anexe comprovantes"
        actions={
          <Button variant="danger" onClick={handleOpenCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Despesa
          </Button>
        }
      />

      {/* Despesas fixas mensais */}
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Despesas fixas mensais</CardTitle>
            <p className="text-sm text-text-muted mt-1">Cadastradas uma vez, são lançadas automaticamente na data escolhida.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleGenerateFixed} disabled={generateFixed.isPending}>
              {generateFixed.isPending ? 'Lançando...' : 'Lançar mês atual'}
            </Button>
            <Button variant="danger" size="sm" onClick={handleOpenCreateFixed}>
              <Plus className="w-4 h-4 mr-2" /> Nova despesa fixa
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {fixedMessage && <p className="text-sm text-text-secondary" role="status">{fixedMessage}</p>}
          {(fixedExpenses || []).length === 0 ? (
            <p className="py-4 text-center text-sm text-text-muted">Nenhuma despesa fixa cadastrada.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {(fixedExpenses || []).map(item => (
                <div key={item.id} className="rounded-lg border border-border bg-tertiary/30 p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-text-primary">{item.description}</p>
                      <p className="text-sm font-mono text-danger">{formatBRL(item.amount)} · dia {item.day}</p>
                    </div>
                    <Badge variant={item.isActive ? 'success' : 'gray'}>{item.isActive ? 'Ativa' : 'Inativa'}</Badge>
                  </div>
                  <p className="text-xs text-text-muted">{categoryName(item.categoryId)} · {accountName(item.accountId)}</p>
                  <p className="text-xs text-text-muted">
                    {item.lastGeneratedMonth ? `Último lançamento: ${formatMonthYear(item.lastGeneratedMonth)}` : 'Ainda não lançada'}
                  </p>
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenEditFixed(item)} aria-label="Editar despesa fixa">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-danger hover:text-danger" onClick={() => setDeletingFixed(item)} aria-label="Excluir despesa fixa">
                      <Trash className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <form className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <Input
              placeholder="Buscar descrição, fornecedor..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="lg:col-span-2"
            />
            <Select
              label="Categoria"
              options={[{ value: '', label: 'Todas' }, ...expenseCategories.map(c => ({ value: c.id, label: c.name }))]}
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
            />
            <Select
              label="Conta"
              options={[{ value: '', label: 'Todas' }, ...activeAccounts.map(a => ({ value: a.id, label: a.name }))]}
              value={selectedAccount}
              onChange={e => setSelectedAccount(e.target.value)}
            />
          </form>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-text-muted">Carregando...</div>
          ) : (
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Forma</TableHead>
                    <TableHead>Conta</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead className="w-24">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-text-muted">
                        Nenhuma despesa encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    expenses?.map(expense => (
                      <TableRow key={expense.id}>
                        <TableCell className="text-text-secondary">{formatDateBR(expense.date)}</TableCell>
                        <TableCell className="font-medium">{expense.description}</TableCell>
                        <TableCell>
                          <Badge variant="danger">{expense.category?.name || '-'}</Badge>
                        </TableCell>
                        <TableCell className="font-mono font-medium text-danger">-{formatBRL(expense.amount)}</TableCell>
                        <TableCell className="text-text-secondary">{expense.paymentMethod}</TableCell>
                        <TableCell className="text-text-secondary">{expense.account?.name || '-'}</TableCell>
                        <TableCell className="text-text-secondary">{expense.beneficiary || '-'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(expense)} aria-label="Editar">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleOpenDelete(expense)} aria-label="Excluir" className="text-danger hover:text-danger">
                              <Trash className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
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
        title={editingExpense ? 'Editar Despesa' : 'Nova Despesa'}
        size="lg"
      >
        <ExpenseForm
          initialData={editingExpense || undefined}
          categories={expenseCategories}
          accounts={activeAccounts}
          onSuccess={handleFormSuccess}
          onCancel={handleCloseForm}
        />
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={!!deletingExpense}
        onOpenChange={handleCloseDelete}
        title="Confirmar Exclusão"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-text-secondary">
            Tem certeza que deseja excluir a despesa <strong>{deletingExpense?.description}</strong> de <strong>{formatBRL(deletingExpense?.amount || 0)}</strong>?
          </p>
          <p className="text-sm text-text-muted">
            Esta ação será registrada na auditoria e não poderá ser desfeita.
          </p>
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button variant="outline" onClick={handleCloseDelete}>Cancelar</Button>
            <Button variant="danger" onClick={handleConfirmDelete}>Excluir</Button>
          </div>
        </div>
      </Modal>

      {/* Create/Edit despesa fixa */}
      <Modal
        open={showFixedForm}
        onOpenChange={setShowFixedForm}
        title={editingFixed ? 'Editar despesa fixa' : 'Nova despesa fixa'}
        size="lg"
      >
        <FixedExpenseForm
          initialData={editingFixed || undefined}
          categories={expenseCategories}
          accounts={activeAccounts}
          onSuccess={() => { setShowFixedForm(false); setEditingFixed(null); }}
          onCancel={() => { setShowFixedForm(false); setEditingFixed(null); }}
        />
      </Modal>

      {/* Excluir despesa fixa */}
      <Modal
        open={!!deletingFixed}
        onOpenChange={() => setDeletingFixed(null)}
        title="Confirmar exclusão"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-text-secondary">
            Excluir a despesa fixa <strong>{deletingFixed?.description}</strong>?
          </p>
          <p className="text-sm text-text-muted">Os lançamentos já gerados não serão removidos.</p>
          <div className="flex justify-end gap-3 border-t border-border pt-4">
            <Button variant="outline" onClick={() => setDeletingFixed(null)}>Cancelar</Button>
            <Button variant="danger" onClick={handleConfirmDeleteFixed}>Excluir</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}