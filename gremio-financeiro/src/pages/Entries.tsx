// ===== ENTRIES PAGE =====
import * as React from 'react';
import { useState } from 'react';
import { Plus, Edit, Trash } from 'lucide-react';
import { Button, Input, Select, Badge, Card, CardContent, CardHeader, CardTitle, Table, TableHeader, TableBody, TableRow, TableCell, TableHead, ScrollArea, Modal } from '../components/ui';
import { PageHeader } from '../components/layout';
import { useEntries, useCreateEntry, useUpdateEntry, useDeleteEntry } from '../hooks/useFinancialData';
import { useCategories } from '../hooks/useFinancialData';
import { useAccounts } from '../hooks/useFinancialData';
import { formatBRL, formatDateBR, getCurrentMonthYear } from '../db';
import { EntryForm } from '../components/forms';
import type { Entry, Category, Account } from '../types';

export function Entries() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<Entry | null>(null);

  const { data: entries, isLoading } = useEntries({
    search: search || undefined,
    categoryId: selectedCategory || undefined,
    accountId: selectedAccount || undefined,
    dateRange: dateRange.start && dateRange.end ? dateRange : undefined,
  });

  const { data: categories } = useCategories('INCOME');
  const { data: accounts } = useAccounts();
  const createEntry = useCreateEntry();
  const updateEntry = useUpdateEntry();
  const deleteEntry = useDeleteEntry();

  const incomeCategories = categories?.filter(c => c.type === 'INCOME') || [];
  const activeAccounts = accounts?.filter(a => a.isActive) || [];

  const handleOpenCreate = () => {
    setEditingEntry(null);
    setShowForm(true);
  };

  const handleOpenEdit = (entry: Entry) => {
    setEditingEntry(entry);
    setShowForm(true);
  };

  const handleOpenDelete = (entry: Entry) => {
    setDeletingEntry(entry);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingEntry(null);
  };

  const handleCloseDelete = () => {
    setDeletingEntry(null);
  };

  const handleConfirmDelete = async () => {
    if (deletingEntry) {
      await deleteEntry.mutateAsync(deletingEntry.id);
      handleCloseDelete();
    }
  };

  const handleFormSuccess = () => {
    handleCloseForm();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Entradas"
        description="Registre e gerencie todos os recebimentos do grêmio"
        actions={
          <Button variant="primary" onClick={handleOpenCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Entrada
          </Button>
        }
      />

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <form className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <Input
              placeholder="Buscar descrição..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="lg:col-span-2"
            />
            <Select
              label="Categoria"
              options={[{ value: '', label: 'Todas' }, ...incomeCategories.map(c => ({ value: c.id, label: c.name }))]}
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
                    <TableHead className="w-24">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-text-muted">
                        Nenhuma entrada encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    entries?.map(entry => (
                      <TableRow key={entry.id}>
                        <TableCell className="text-text-secondary">{formatDateBR(entry.date)}</TableCell>
                        <TableCell className="font-medium">{entry.description}</TableCell>
                        <TableCell>
                          <Badge variant="success">{entry.category?.name || '-'}</Badge>
                        </TableCell>
                        <TableCell className="font-mono font-medium text-success">+{formatBRL(entry.amount)}</TableCell>
                        <TableCell className="text-text-secondary">{entry.paymentMethod}</TableCell>
                        <TableCell className="text-text-secondary">{entry.account?.name || '-'}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(entry)} aria-label="Editar">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleOpenDelete(entry)} aria-label="Excluir" className="text-danger hover:text-danger">
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
        title={editingEntry ? 'Editar Entrada' : 'Nova Entrada'}
        size="lg"
      >
        <EntryForm
          initialData={editingEntry || undefined}
          categories={incomeCategories}
          accounts={activeAccounts}
          onSuccess={handleFormSuccess}
          onCancel={handleCloseForm}
        />
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        open={!!deletingEntry}
        onOpenChange={handleCloseDelete}
        title="Confirmar Exclusão"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-text-secondary">
            Tem certeza que deseja excluir a entrada <strong>{deletingEntry?.description}</strong> de <strong>{formatBRL(deletingEntry?.amount || 0)}</strong>?
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