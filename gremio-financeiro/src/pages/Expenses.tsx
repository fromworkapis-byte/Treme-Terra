// ===== EXPENSES PAGE =====
import * as React from 'react';
import { useState } from 'react';
import { Plus, Search, Filter, Edit, Trash } from 'lucide-react';
import { Button, Input, Select, Badge, Card, CardContent, CardHeader, CardTitle, Table, TableHeader, TableBody, TableRow, TableCell, TableHead, ScrollArea, Modal } from '../components/ui';
import { useExpenses, useCreateExpense, useUpdateExpense, useDeleteExpense } from '../hooks/useFinancialData';
import { useCategories } from '../hooks/useFinancialData';
import { useAccounts } from '../hooks/useFinancialData';
import { formatBRL, formatDateBR } from '../db';
import { ExpenseForm } from '../components/forms';
import type { Expense, Category, Account } from '../types';

export function Expenses() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);

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

  const expenseCategories = categories?.filter(c => c.type === 'EXPENSE') || [];
  const activeAccounts = accounts?.filter(a => a.isActive) || [];

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

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-text-primary">Despesas</h1>
          <p className="text-text-secondary mt-1">Controle todos os gastos e anexe comprovantes</p>
        </div>
        <Button variant="danger" onClick={handleOpenCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Despesa
        </Button>
      </div>

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
            <div className="flex items-end gap-2">
              <Button type="button" variant="outline" className="w-full">
                <Filter className="w-4 h-4 mr-2" />
                Filtrar
              </Button>
            </div>
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
    </div>
  );
}