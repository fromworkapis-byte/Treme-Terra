// ===== MOVEMENTS PAGE =====
import * as React from 'react';
import { useState } from 'react';
import { Search, Filter, Download, Plus, Minus, ArrowLeftRight, Edit, Trash } from 'lucide-react';
import { Button, Input, Select, Badge, Card, CardContent, CardHeader, CardTitle, Table, TableHeader, TableBody, TableRow, TableCell, TableHead, ScrollArea, Tabs, TabsList, TabsTrigger, TabsContent, Modal } from '../components/ui';
import { useEntries, useExpenses, useTransfers, useCreateTransfer, useUpdateTransfer, useDeleteTransfer } from '../hooks/useFinancialData';
import { useAccounts } from '../hooks/useFinancialData';
import { formatBRL, formatDateBR } from '../db';
import { TransferForm } from '../components/forms';
import type { Entry, Expense, Transfer, Account } from '../types';

type MovementType = 'all' | 'entry' | 'expense' | 'transfer';

export function Movements() {
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<MovementType>('all');
  const [selectedAccount, setSelectedAccount] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [activeTab, setActiveTab] = useState<MovementType>('all');
  const [showTransferForm, setShowTransferForm] = useState(false);
  const [editingTransfer, setEditingTransfer] = useState<Transfer | null>(null);
  const [deletingTransfer, setDeletingTransfer] = useState<Transfer | null>(null);

  const { data: entries } = useEntries({
    search: search || undefined,
    accountId: selectedAccount || undefined,
    dateRange: dateRange.start && dateRange.end ? dateRange : undefined,
  });
  const { data: expenses } = useExpenses({
    search: search || undefined,
    accountId: selectedAccount || undefined,
    dateRange: dateRange.start && dateRange.end ? dateRange : undefined,
  });
  const { data: transfers } = useTransfers({
    accountId: selectedAccount || undefined,
    dateRange: dateRange.start && dateRange.end ? dateRange : undefined,
  });
  const { data: accounts } = useAccounts();
  const createTransfer = useCreateTransfer();
  const updateTransfer = useUpdateTransfer();
  const deleteTransfer = useDeleteTransfer();

  const activeAccounts = accounts?.filter(a => a.isActive) || [];

  // Combine all movements
  const allMovements = React.useMemo(() => {
    const movements = [
      ...(entries || []).map(e => ({ ...e, type: 'entry' as const, categoryName: e.category?.name, accountName: e.account?.name })),
      ...(expenses || []).map(e => ({ ...e, type: 'expense' as const, categoryName: e.category?.name, accountName: e.account?.name })),
      ...(transfers || []).map(t => ({ 
        ...t, 
        type: 'transfer' as const, 
        description: `Transferência: ${t.fromAccount?.name} → ${t.toAccount?.name}`,
        categoryName: 'Transferência',
        accountName: t.fromAccount?.name,
        amount: t.amount,
      }))
    ];
    return movements.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [entries, expenses, transfers]);

  const filteredMovements = allMovements.filter(m => {
    if (activeTab !== 'all' && m.type !== activeTab) return false;
    return true;
  });

  const handleOpenCreateTransfer = () => {
    setEditingTransfer(null);
    setShowTransferForm(true);
  };

  const handleOpenEditTransfer = (transfer: Transfer) => {
    setEditingTransfer(transfer);
    setShowTransferForm(true);
  };

  const handleOpenDeleteTransfer = (transfer: Transfer) => {
    setDeletingTransfer(transfer);
  };

  const handleCloseTransferForm = () => {
    setShowTransferForm(false);
    setEditingTransfer(null);
  };

  const handleCloseDeleteTransfer = () => {
    setDeletingTransfer(null);
  };

  const handleConfirmDeleteTransfer = async () => {
    if (deletingTransfer) {
      await deleteTransfer.mutateAsync(deletingTransfer.id);
      handleCloseDeleteTransfer();
    }
  };

  const handleTransferSuccess = () => {
    handleCloseTransferForm();
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'entry': return <Badge variant="success">Entrada</Badge>;
      case 'expense': return <Badge variant="danger">Despesa</Badge>;
      case 'transfer': return <Badge variant="warning">Transferência</Badge>;
      default: return <Badge variant="gray">{type}</Badge>;
    }
  };

  const getAmountDisplay = (type: string, amount: number) => {
    switch (type) {
      case 'entry': return <span className="text-success font-mono font-medium">+{formatBRL(amount)}</span>;
      case 'expense': return <span className="text-danger font-mono font-medium">-{formatBRL(amount)}</span>;
      case 'transfer': return <span className="text-warning font-mono font-medium">{formatBRL(amount)}</span>;
      default: return <span>{formatBRL(amount)}</span>;
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-text-primary">Movimentações</h1>
          <p className="text-text-secondary mt-1">Histórico completo de todas as operações financeiras</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleOpenCreateTransfer}>
            <ArrowLeftRight className="w-4 h-4 mr-2" />
            Nova Transferência
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <form className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            <Input
              placeholder="Buscar descrição..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="lg:col-span-2"
            />
            <Select
              label="Tipo"
              options={[
                { value: 'all', label: 'Todos' },
                { value: 'entry', label: 'Entradas' },
                { value: 'expense', label: 'Despesas' },
                { value: 'transfer', label: 'Transferências' },
              ]}
              value={selectedType}
              onChange={e => setSelectedType(e.target.value as MovementType)}
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
            <div className="flex items-end gap-2">
              <Button type="button" variant="outline" className="w-full">
                <Download className="w-4 h-4 mr-2" />
                Exportar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">Todas</TabsTrigger>
          <TabsTrigger value="entry">Entradas</TabsTrigger>
          <TabsTrigger value="expense">Despesas</TabsTrigger>
          <TabsTrigger value="transfer">Transferências</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <MovementTable movements={filteredMovements} onEditTransfer={handleOpenEditTransfer} onDeleteTransfer={handleOpenDeleteTransfer} />
        </TabsContent>
        <TabsContent value="entry">
          <MovementTable movements={filteredMovements.filter(m => m.type === 'entry')} onEditTransfer={handleOpenEditTransfer} onDeleteTransfer={handleOpenDeleteTransfer} />
        </TabsContent>
        <TabsContent value="expense">
          <MovementTable movements={filteredMovements.filter(m => m.type === 'expense')} onEditTransfer={handleOpenEditTransfer} onDeleteTransfer={handleOpenDeleteTransfer} />
        </TabsContent>
        <TabsContent value="transfer">
          <MovementTable movements={filteredMovements.filter(m => m.type === 'transfer')} onEditTransfer={handleOpenEditTransfer} onDeleteTransfer={handleOpenDeleteTransfer} />
        </TabsContent>
      </Tabs>

      {/* Transfer Form Modal */}
      <Modal
        open={showTransferForm}
        onOpenChange={setShowTransferForm}
        title={editingTransfer ? 'Editar Transferência' : 'Nova Transferência'}
        size="lg"
      >
        <TransferForm
          initialData={editingTransfer || undefined}
          accounts={activeAccounts}
          onSuccess={handleTransferSuccess}
          onCancel={handleCloseTransferForm}
        />
      </Modal>

      {/* Delete Transfer Modal */}
      <Modal
        open={!!deletingTransfer}
        onOpenChange={handleCloseDeleteTransfer}
        title="Confirmar Exclusão"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-text-secondary">
            Tem certeza que deseja excluir a transferência <strong>{deletingTransfer?.description}</strong> de <strong>{formatBRL(deletingTransfer?.amount || 0)}</strong>?
          </p>
          <p className="text-sm text-text-muted">
            Esta ação será registrada na auditoria e os saldos das contas serão atualizados.
          </p>
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button variant="outline" onClick={handleCloseDeleteTransfer}>Cancelar</Button>
            <Button variant="danger" onClick={handleConfirmDeleteTransfer}>Excluir</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

interface MovementTableProps {
  movements: Array<Entry | Expense | Transfer & { categoryName?: string; accountName?: string }>;
  onEditTransfer: (transfer: Transfer) => void;
  onDeleteTransfer: (transfer: Transfer) => void;
}

function MovementTable({ movements, onEditTransfer, onDeleteTransfer }: MovementTableProps) {
  return (
    <Card>
      <CardContent>
        <ScrollArea className="h-[500px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Conta</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="w-24">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {movements.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-text-muted">
                    Nenhuma movimentação encontrada
                  </TableCell>
                </TableRow>
              ) : (
                movements.map(m => (
                  <TableRow key={`${m.type}-${m.id}`}>
                    <TableCell className="text-text-secondary">{formatDateBR(m.date)}</TableCell>
                    <TableCell className="font-medium">{m.description}</TableCell>
                    <TableCell>
                      {m.type === 'transfer' ? (
                        <Badge variant="warning">{m.categoryName || 'Transferência'}</Badge>
                      ) : m.type === 'entry' ? (
                        <Badge variant="success">{m.categoryName || '-'}</Badge>
                      ) : (
                        <Badge variant="danger">{m.categoryName || '-'}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono font-medium">
                      {m.type === 'entry' && <span className="text-success">+{formatBRL(m.amount)}</span>}
                      {m.type === 'expense' && <span className="text-danger">-{formatBRL(m.amount)}</span>}
                      {m.type === 'transfer' && <span className="text-warning">{formatBRL(m.amount)}</span>}
                    </TableCell>
                    <TableCell className="text-text-secondary">{m.accountName || '-'}</TableCell>
                    <TableCell>{getTypeBadge(m.type)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {m.type === 'transfer' && (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => onEditTransfer(m as Transfer)} aria-label="Editar">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => onDeleteTransfer(m as Transfer)} aria-label="Excluir" className="text-danger hover:text-danger">
                              <Trash className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

const getTypeBadge = (type: string) => {
  switch (type) {
    case 'entry': return <Badge variant="success">Entrada</Badge>;
    case 'expense': return <Badge variant="danger">Despesa</Badge>;
    case 'transfer': return <Badge variant="warning">Transferência</Badge>;
    default: return <Badge variant="gray">{type}</Badge>;
  }
};