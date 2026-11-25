// ===== MEMBERS PAGE =====
import * as React from 'react';
import { useState } from 'react';
import { Plus, Search, Filter, Edit, Trash, Calendar, CreditCard, Download, Upload, AlertCircle, CheckCircle } from 'lucide-react';
import { Button, Input, Select, Badge, Card, CardContent, CardHeader, CardTitle, Table, TableHeader, TableBody, TableRow, TableCell, TableHead, ScrollArea, Modal, Tabs, TabsList, TabsTrigger, TabsContent, Checkbox, Label } from '../components/ui';
import { useMembers, useCreateMember, useUpdateMember, useDeleteMember, useMemberPayments, useMemberPaymentStatus, useCreateMemberPayment, useUpdateMemberPayment, useDeleteMemberPayment } from '../hooks/useFinancialData';
import { formatBRL, formatDateBR, getCurrentMonthYear, getPreviousMonthYear, getNextMonthYear } from '../db';
import { MemberForm } from '../components/forms';
import type { Member, MemberPayment, MilitaryRank } from '../types';
import { MILITARY_RANKS } from '../types';

export function Members() {
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'ACTIVE' | 'INACTIVE' | ''>('');
  const [selectedRank, setSelectedRank] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [deletingMember, setDeletingMember] = useState<Member | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthYear());
  const [paymentMemberId, setPaymentMemberId] = useState<string | null>(null);

  const { data: members, isLoading } = useMembers({
    search: search || undefined,
    status: selectedStatus || undefined,
    rank: selectedRank || undefined,
  });

  const { data: paymentStatus } = useMemberPaymentStatus(selectedMonth);
  const { data: payments } = useMemberPayments(undefined, selectedMonth);
  const createMember = useCreateMember();
  const updateMember = useUpdateMember();
  const deleteMember = useDeleteMember();
  const createPayment = useCreateMemberPayment();
  const updatePayment = useUpdateMemberPayment();
  const deletePayment = useDeleteMemberPayment();

  const handleOpenCreate = () => {
    setEditingMember(null);
    setShowForm(true);
  };

  const handleOpenEdit = (member: Member) => {
    setEditingMember(member);
    setShowForm(true);
  };

  const handleOpenDelete = (member: Member) => {
    setDeletingMember(member);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingMember(null);
  };

  const handleCloseDelete = () => {
    setDeletingMember(null);
  };

  const handleConfirmDelete = async () => {
    if (deletingMember) {
      await deleteMember.mutateAsync(deletingMember.id);
      handleCloseDelete();
    }
  };

  const handleFormSuccess = () => {
    handleCloseForm();
  };

  const handleOpenPayment = (memberId: string) => {
    setPaymentMemberId(memberId);
  };

  const handleClosePayment = () => {
    setPaymentMemberId(null);
  };

  const handleRecordPayment = async (member: Member, amount: string) => {
    const amountCents = Math.round(parseFloat(amount.replace(/\./g, '').replace(',', '.')) * 100);
    if (amountCents <= 0) return;
    
    const existingPayment = payments?.find(p => p.memberId === member.id && p.referenceMonth === selectedMonth);
    
    try {
      if (existingPayment) {
        await updatePayment.mutateAsync({ id: existingPayment.id, data: { amount: amountCents } });
      } else {
        await createPayment.mutateAsync({
          memberId: member.id,
          date: new Date().toISOString().split('T')[0],
          amount: amountCents,
          referenceMonth: selectedMonth,
          recordedById: 'admin-001',
        });
      }
      handleClosePayment();
    } catch (error) {
      console.error('Erro ao registrar pagamento:', error);
    }
  };

  const formatMonthYear = (my: string) => {
    const [year, month] = my.split('-');
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${months[Number(month) - 1]}/${year}`;
  };

  const getPreviousMonth = () => getPreviousMonthYear(selectedMonth);
  const getNextMonth = () => getNextMonthYear(selectedMonth);

  const activeMembers = members?.filter(m => m.status === 'ACTIVE') || [];
  const inactiveMembers = members?.filter(m => m.status === 'INACTIVE') || [];

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-text-primary">Efetivo</h1>
          <p className="text-text-secondary mt-1">Cadastre integrantes e acompanhe contribuições mensais</p>
        </div>
        <Button variant="primary" onClick={handleOpenCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Integrante
        </Button>
      </div>

      {/* Month Selector & Stats */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => setSelectedMonth(getPreviousMonth())} aria-label="Mês anterior">
                <ChevronUp className="w-4 h-4" />
              </Button>
              <span className="px-4 py-2 text-lg font-medium text-text-primary bg-tertiary/50 rounded-lg">
                {formatMonthYear(selectedMonth)}
              </span>
              <Button variant="ghost" size="icon" onClick={() => setSelectedMonth(getNextMonth())} aria-label="Próximo mês">
                <ChevronDown className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm"><Download className="w-4 h-4 mr-2" /> Exportar</Button>
              <Button variant="outline" size="sm"><Upload className="w-4 h-4 mr-2" /> Importar</Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-tertiary/50 rounded-lg text-center">
              <p className="text-2xl font-bold text-success">{paymentStatus?.filter(p => p.paid).length || 0}</p>
              <p className="text-sm text-text-muted">Pagos</p>
            </div>
            <div className="p-4 bg-tertiary/50 rounded-lg text-center">
              <p className="text-2xl font-bold text-danger">{paymentStatus?.filter(p => !p.paid).length || 0}</p>
              <p className="text-sm text-text-muted">Pendentes</p>
            </div>
            <div className="p-4 bg-tertiary/50 rounded-lg text-center">
              <p className="text-2xl font-bold text-info">{paymentStatus?.length || 0}</p>
              <p className="text-sm text-text-muted">Total Efetivo</p>
            </div>
            <div className="p-4 bg-tertiary/50 rounded-lg text-center">
              <p className="text-2xl font-bold text-text-primary">{formatBRL(paymentStatus?.reduce((s, p) => s + p.amount, 0) || 0)}</p>
              <p className="text-sm text-text-muted">Arrecadado</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={paymentMemberId ? 'payment' : 'list'} onValueChange={v => v === 'list' && setPaymentMemberId(null)} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="list">Lista de Integrantes</TabsTrigger>
          <TabsTrigger value="contributions">Contribuições</TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          {/* Filters */}
          <Card className="mb-4">
            <CardContent className="pt-6">
              <form className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <Input
                  placeholder="Buscar nome..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="lg:col-span-2"
                />
                <Select
                  label="Status"
                  options={[{ value: '', label: 'Todos' }, { value: 'ACTIVE', label: 'Ativos' }, { value: 'INACTIVE', label: 'Inativos' }]}
                  value={selectedStatus}
                  onChange={e => setSelectedStatus(e.target.value as any)}
                />
                <Select
                  label="Post/Grad"
                  options={[{ value: '', label: 'Todos' }, ...MILITARY_RANKS.map(r => ({ value: r.value, label: `${r.value} - ${r.label}` }))]}
                  value={selectedRank}
                  onChange={e => setSelectedRank(e.target.value)}
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

          {/* Members Table */}
          <Card>
            <CardContent>
              {isLoading ? (
                <div className="py-8 text-center text-text-muted">Carregando...</div>
              ) : (
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Post/Grad</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Ordem</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Ingresso</TableHead>
                        <TableHead className="w-24">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {members?.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-text-muted">
                            Nenhum integrante encontrado
                          </TableCell>
                        </TableRow>
                      ) : (
                        members?.map(member => (
                          <TableRow key={member.id}>
                            <TableCell>
                              <Badge variant="info">{member.rank}</Badge>
                            </TableCell>
                            <TableCell className="font-medium">{member.name}</TableCell>
                            <TableCell className="text-text-secondary font-mono">#{member.ordem}</TableCell>
                            <TableCell>
                              {member.status === 'ACTIVE' ? (
                                <Badge variant="success">Ativo</Badge>
                              ) : (
                                <Badge variant="gray">Inativo</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-text-secondary">{formatDateBR(member.joinedAt)}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(member)} aria-label="Editar">
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleOpenDelete(member)} aria-label="Excluir" className="text-danger hover:text-danger">
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
        </TabsContent>

        <TabsContent value="contributions">
          <Card>
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
                      <TableHead className="w-24">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentStatus?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-text-muted">
                          Nenhum integrante ativo
                        </TableCell>
                      </TableRow>
                    ) : (
                      paymentStatus?.map(status => (
                        <TableRow key={status.member.id}>
                          <TableCell>
                            <Badge variant="info">{status.member.rank}</Badge>
                          </TableCell>
                          <TableCell className="font-medium">{status.member.name}</TableCell>
                          <TableCell className="text-text-secondary font-mono">#{status.member.ordem}</TableCell>
                          <TableCell>
                            {status.paid ? (
                              <Badge variant="success">Pago</Badge>
                            ) : (
                              <Badge variant="danger">Pendente</Badge>
                            )}
                          </TableCell>
                          <TableCell className="font-mono font-medium text-text-primary">
                            {formatBRL(status.amount)}
                          </TableCell>
                          <TableCell className="text-text-secondary">
                            {status.date ? formatDateBR(status.date) : '-'}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant={status.paid ? 'outline' : 'success'}
                              size="sm"
                              onClick={() => handleOpenPayment(status.member.id)}
                            >
                              {status.paid ? 'Alterar' : 'Registrar'}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Member Modal */}
      <Modal
        open={showForm}
        onOpenChange={setShowForm}
        title={editingMember ? 'Editar Integrante' : 'Novo Integrante'}
        size="lg"
      >
        <MemberForm
          initialData={editingMember || undefined}
          onSuccess={handleFormSuccess}
          onCancel={handleCloseForm}
        />
      </Modal>

      {/* Delete Member Modal */}
      <Modal
        open={!!deletingMember}
        onOpenChange={handleCloseDelete}
        title="Confirmar Exclusão"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-text-secondary">
            Tem certeza que deseja excluir o integrante <strong>{deletingMember?.rank} {deletingMember?.name}</strong>?
          </p>
          <p className="text-sm text-text-muted">
            Esta ação será registrada na auditoria.
          </p>
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button variant="outline" onClick={handleCloseDelete}>Cancelar</Button>
            <Button variant="danger" onClick={handleConfirmDelete}>Excluir</Button>
          </div>
        </div>
      </Modal>

      {/* Payment Modal */}
      <Modal
        open={!!paymentMemberId}
        onOpenChange={handleClosePayment}
        title="Registrar Pagamento"
        size="sm"
      >
        <PaymentModal
          member={members?.find(m => m.id === paymentMemberId)!}
          month={selectedMonth}
          existingPayment={payments?.find(p => p.memberId === paymentMemberId && p.referenceMonth === selectedMonth)}
          onSubmit={handleRecordPayment}
          onClose={handleClosePayment}
        />
      </Modal>
    </div>
  );
}

interface PaymentModalProps {
  member: Member;
  month: string;
  existingPayment?: MemberPayment;
  onSubmit: (member: Member, amount: string) => void;
  onClose: () => void;
}

function PaymentModal({ member, month, existingPayment, onSubmit, onClose }: PaymentModalProps) {
  const [amount, setAmount] = useState(existingPayment ? (existingPayment.amount / 100).toFixed(2).replace('.', ',') : '');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;
    setSubmitting(true);
    onSubmit(member, amount);
    setSubmitting(false);
  };

  const formatAmount = (value: string) => {
    const numeric = value.replace(/\D/g, '');
    if (!numeric) return '';
    const formatted = (parseInt(numeric) / 100).toFixed(2);
    return formatted.replace('.', ',');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-4 bg-tertiary/50 rounded-lg">
        <p className="text-sm text-text-secondary">Integrante:</p>
        <p className="font-medium text-text-primary">{member.rank} {member.name}</p>
        <p className="text-xs text-text-muted">Ordem: #{member.ordem}</p>
      </div>

      <div>
        <Label className="block text-sm font-medium text-text-secondary mb-1.5">
          Valor (R$) {existingPayment ? '(alterar)' : '*'}
        </Label>
        <input
          type="text"
          placeholder="0,00"
          value={amount}
          onChange={e => setAmount(formatAmount(e.target.value))}
          className="w-full px-4 py-2.5 bg-primary border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-info focus:border-transparent transition-all inputMode='decimal'"
          inputMode="decimal"
          required={!existingPayment}
        />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
        <Button type="submit" variant="success" disabled={submitting || !amount}>
          {submitting ? 'Salvando...' : existingPayment ? 'Atualizar' : 'Registrar'}
        </Button>
      </div>
    </form>
  );
}