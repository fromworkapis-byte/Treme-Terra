// ===== MEMBERS PAGE =====
import * as React from 'react';
import { useState } from 'react';
import {
  Plus, Search, Edit, Trash, ChevronLeft, ChevronRight, Camera, QrCode, Send,
  AlertCircle, CheckCircle, X,
} from 'lucide-react';
import {
  Button, Input, Select, Badge, Card, CardContent, Table, TableHeader, TableBody,
  TableRow, TableCell, TableHead, ScrollArea, Modal, Tabs, TabsList, TabsTrigger, TabsContent,
} from '../components/ui';
import {
  useMembers, useDeleteMember, useMemberPaymentStatus, useRecordMemberPayment, useDeleteMemberPayment,
} from '../hooks/useFinancialData';
import { formatBRL, formatDateBR, getCurrentMonthYear, getPreviousMonthYear, getNextMonthYear, parseBRL, parseDateBR } from '../db';
import { MemberForm, ReceiptPaymentForm } from '../components/forms';
import { buildCharge, getBillingSettings, monthLabel, sendMonthlyCharges } from '../lib/billing';
import { buildPixQr } from '../lib/pix';
import type { Member } from '../types';
import { MILITARY_RANKS } from '../types';

const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function formatMonth(monthYear: string) {
  const [year, month] = monthYear.split('-');
  return `${months[Number(month) - 1]}/${year}`;
}

export function Members() {
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'ACTIVE' | 'INACTIVE' | ''>('');
  const [selectedRank, setSelectedRank] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [deletingMember, setDeletingMember] = useState<Member | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthYear());
  const [manualMemberId, setManualMemberId] = useState<string | null>(null);
  const [receiptMemberId, setReceiptMemberId] = useState<string | null>(null);
  const [qr, setQr] = useState<{ name: string; dataUrl: string; payload: string } | null>(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [monthlyAmount, setMonthlyAmount] = useState(3000);

  React.useEffect(() => {
    getBillingSettings().then(settings => setMonthlyAmount(settings.monthlyAmount));
  }, []);

  const { data: members, isLoading } = useMembers();
  const { data: paymentStatus, isLoading: statusLoading } = useMemberPaymentStatus(selectedMonth);
  const deleteMember = useDeleteMember();
  const deletePayment = useDeleteMemberPayment();

  const filteredMembers = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    return (members || []).filter(member => {
      if (selectedStatus && member.status !== selectedStatus) return false;
      if (selectedRank && member.rank !== selectedRank) return false;
      if (term && !`${member.rank} ${member.name}`.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [members, search, selectedStatus, selectedRank]);

  const paidCount = paymentStatus?.filter(status => status.paid).length || 0;
  const pendingCount = paymentStatus?.filter(status => !status.paid).length || 0;
  const collected = paymentStatus?.reduce((total, status) => total + status.amount, 0) || 0;

  const handleSendCharges = async () => {
    setMessage('');
    setSending(true);
    try {
      const settings = await getBillingSettings();
      const state = await sendMonthlyCharges(selectedMonth, settings, { force: false });
      const entries = state.log.filter(entry => entry.month === selectedMonth);
      const failures = entries.filter(entry => !entry.ok);
      setMessage(
        entries.length === 0
          ? 'Nenhuma cobrança nova para enviar neste mês.'
          : `Cobranças processadas: ${entries.length - failures.length} enviadas, ${failures.length} falhas.`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível enviar as cobranças');
    } finally {
      setSending(false);
    }
  };

  const handleShowQr = async (member: Member) => {
    setMessage('');
    try {
      const settings = await getBillingSettings();
      const { payload } = buildCharge(member.id, selectedMonth, settings);
      const dataUrl = await buildPixQr(payload);
      setQr({ name: member.name, dataUrl, payload });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível gerar o QR Code');
    }
  };

  const handleDelete = async () => {
    if (!deletingMember) return;
    try {
      await deleteMember.mutateAsync(deletingMember.id);
      setDeletingMember(null);
    } catch {
      setMessage('Não foi possível excluir o integrante');
    }
  };

  const handleUndoPayment = async (paymentId?: string) => {
    if (!paymentId) return;
    await deletePayment.mutateAsync(paymentId);
  };

  return (
    <div className="p-4 lg:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-text-primary">Efetivo</h1>
          <p className="text-text-secondary mt-1">Integrantes e mensalidades de {monthLabel(selectedMonth)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleSendCharges} disabled={sending}>
            <Send className="w-4 h-4 mr-2" /> {sending ? 'Enviando...' : 'Enviar cobranças'}
          </Button>
          <Button variant="primary" onClick={() => { setEditingMember(null); setShowForm(true); }}>
            <Plus className="w-4 h-4 mr-2" /> Novo Integrante
          </Button>
        </div>
      </div>

      {message && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-tertiary/50 text-sm text-text-secondary">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {message}
          <button className="ml-auto" onClick={() => setMessage('')} aria-label="Fechar aviso"><X className="w-4 h-4" /></button>
        </div>
      )}

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => setSelectedMonth(getPreviousMonthYear(selectedMonth))} aria-label="Mês anterior">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="px-4 py-2 text-lg font-medium text-text-primary bg-tertiary/50 rounded-lg">{formatMonth(selectedMonth)}</span>
              <Button variant="ghost" size="icon" onClick={() => setSelectedMonth(getNextMonthYear(selectedMonth))} aria-label="Próximo mês">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-success"><strong>{paidCount}</strong> pagos</span>
              <span className="text-danger"><strong>{pendingCount}</strong> faltam</span>
              <span className="text-text-secondary">Arrecadado: <strong>{formatBRL(collected)}</strong></span>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 bg-tertiary/50 rounded-lg text-center">
              <p className="text-xl font-bold text-text-primary">{members?.length || 0}</p>
              <p className="text-xs text-text-muted">Integrantes cadastrados</p>
            </div>
            <div className="p-3 bg-tertiary/50 rounded-lg text-center">
              <p className="text-xl font-bold text-success">{paidCount}</p>
              <p className="text-xs text-text-muted"> Pagos no mês</p>
            </div>
            <div className="p-3 bg-tertiary/50 rounded-lg text-center">
              <p className="text-xl font-bold text-danger">{pendingCount}</p>
              <p className="text-xs text-text-muted">Faltam pagar</p>
            </div>
            <div className="p-3 bg-tertiary/50 rounded-lg text-center">
              <p className="text-xl font-bold text-text-primary">{formatBRL(collected)}</p>
              <p className="text-xs text-text-muted">Total recebido</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="contributions" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="contributions">Pagamentos do mês</TabsTrigger>
          <TabsTrigger value="list">Cadastro do efetivo</TabsTrigger>
        </TabsList>

        <TabsContent value="contributions">
          <Card>
            <CardContent className="pt-6">
              {statusLoading ? (
                <p className="py-8 text-center text-text-muted">Carregando...</p>
              ) : (
                <ScrollArea className="h-[520px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Post/Grad</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Valor / Data</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(paymentStatus?.length || 0) === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-text-muted">
                            Nenhum integrante ativo. Cadastre o efetivo para acompanhar as mensalidades.
                          </TableCell>
                        </TableRow>
                      ) : (
                        paymentStatus?.map(status => (
                          <TableRow key={status.member.id}>
                            <TableCell><Badge variant="info">{status.member.rank}</Badge></TableCell>
                            <TableCell className="font-medium">{status.member.name}</TableCell>
                            <TableCell>
                              {status.paid ? <Badge variant="success">Pago</Badge> : <Badge variant="danger">Falta pagar</Badge>}
                            </TableCell>
                            <TableCell className="text-text-secondary">
                              {status.paid ? `${formatBRL(status.amount)} · ${formatDateBR(status.date || '')}` : '—'}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap justify-end gap-1">
                                <Button variant="ghost" size="icon" onClick={() => handleShowQr(status.member)} aria-label="Ver QR PIX" title="Ver QR PIX">
                                  <QrCode className="w-4 h-4" />
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => setReceiptMemberId(status.member.id)}>
                                  <Camera className="w-4 h-4 mr-1" /> Comprovante
                                </Button>
                                <Button
                                  variant={status.paid ? 'outline' : 'success'}
                                  size="sm"
                                  onClick={() => status.paid ? handleUndoPayment(status.paymentId) : setManualMemberId(status.member.id)}
                                >
                                  {status.paid ? 'Estornar' : 'Registrar'}
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

        <TabsContent value="list">
          <Card className="mb-4">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Input placeholder="Buscar por nome ou posto..." value={search} onChange={event => setSearch(event.target.value)} className="lg:col-span-2" />
                <Select
                  label="Status"
                  options={[{ value: '', label: 'Todos' }, { value: 'ACTIVE', label: 'Ativos' }, { value: 'INACTIVE', label: 'Inativos' }]}
                  value={selectedStatus}
                  onChange={event => setSelectedStatus(event.target.value as 'ACTIVE' | 'INACTIVE' | '')}
                />
                <Select
                  label="Post/Grad"
                  options={[{ value: '', label: 'Todos' }, ...MILITARY_RANKS.map(rank => ({ value: rank.value, label: `${rank.value} - ${rank.label}` }))]}
                  value={selectedRank}
                  onChange={event => setSelectedRank(event.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              {isLoading ? (
                <p className="py-8 text-center text-text-muted">Carregando...</p>
              ) : (
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Post/Grad</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Ordem</TableHead>
                        <TableHead>WhatsApp</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMembers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-text-muted">Nenhum integrante encontrado</TableCell>
                        </TableRow>
                      ) : (
                        filteredMembers.map(member => (
                          <TableRow key={member.id}>
                            <TableCell><Badge variant="info">{member.rank}</Badge></TableCell>
                            <TableCell className="font-medium">{member.name}</TableCell>
                            <TableCell className="font-mono text-text-secondary">#{member.ordem}</TableCell>
                            <TableCell className={member.phone ? 'text-text-secondary' : 'text-danger'}>{member.phone || 'Não informado'}</TableCell>
                            <TableCell>
                              {member.status === 'ACTIVE' ? <Badge variant="success">Ativo</Badge> : <Badge variant="gray">Inativo</Badge>}
                            </TableCell>
                            <TableCell>
                              <div className="flex justify-end gap-1">
                                <Button variant="ghost" size="icon" onClick={() => { setEditingMember(member); setShowForm(true); }} aria-label="Editar">
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="text-danger hover:text-danger" onClick={() => setDeletingMember(member)} aria-label="Excluir">
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
      </Tabs>

      <Modal open={showForm} onOpenChange={setShowForm} title={editingMember ? 'Editar Integrante' : 'Novo Integrante'} size="lg">
        <MemberForm
          initialData={editingMember || undefined}
          onSuccess={() => setShowForm(false)}
          onCancel={() => setShowForm(false)}
        />
      </Modal>

      <Modal open={!!deletingMember} onOpenChange={() => setDeletingMember(null)} title="Confirmar Exclusão" size="sm">
        <div className="space-y-4">
          <p className="text-text-secondary">Excluir <strong>{deletingMember?.name}</strong> do efetivo?</p>
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button variant="outline" onClick={() => setDeletingMember(null)}>Cancelar</Button>
            <Button variant="danger" onClick={handleDelete}>Excluir</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!manualMemberId} onOpenChange={() => setManualMemberId(null)} title="Registrar pagamento" size="sm">
        {manualMemberId && (
          <ManualPaymentForm
            member={members?.find(member => member.id === manualMemberId)}
            monthYear={selectedMonth}
            expectedAmountCents={monthlyAmount}
            onCancel={() => setManualMemberId(null)}
          />
        )}
      </Modal>

      <Modal open={!!receiptMemberId} onOpenChange={() => setReceiptMemberId(null)} title="Confirmar pagamento pelo comprovante" size="lg">
        {receiptMemberId && (
          <ReceiptPaymentForm
            members={members || []}
            monthYear={selectedMonth}
            initialMemberId={receiptMemberId}
            expectedAmountCents={paymentStatus?.find(status => status.member.id === receiptMemberId)?.amount || monthlyAmount}
            onCancel={() => setReceiptMemberId(null)}
          />
        )}
      </Modal>

      <Modal open={!!qr} onOpenChange={() => setQr(null)} title={`QR PIX — ${qr?.name || ''}`} size="sm">
        {qr && (
          <div className="space-y-4 text-center">
            <img src={qr.dataUrl} alt="QR Code PIX" className="mx-auto w-64 h-64 bg-white p-2 rounded-lg" />
            <p className="text-sm text-text-secondary break-all text-left">{qr.payload}</p>
            <Button variant="outline" onClick={() => navigator.clipboard.writeText(qr.payload)}>Copiar código PIX</Button>
          </div>
        )}
      </Modal>
    </div>
  );
}

function ManualPaymentForm({ member, monthYear, expectedAmountCents, onCancel }: {
  member?: Member;
  monthYear: string;
  expectedAmountCents: number;
  onCancel: () => void;
}) {
  const recordPayment = useRecordMemberPayment();
  const [amount, setAmount] = useState((expectedAmountCents / 100).toFixed(2).replace('.', ','));
  const [date, setDate] = useState(formatDateBR(new Date().toISOString().slice(0, 10)));
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    if (!member) return;
    const amountCents = parseBRL(amount);
    if (amountCents <= 0 || date.length !== 10) {
      setError('Informe valor e data válidos.');
      return;
    }
    try {
      await recordPayment.mutateAsync({ memberId: member.id, monthYear, amount: amountCents, date: parseDateBR(date) });
      onCancel();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível registrar o pagamento');
    }
  };

  return (
    <div className="space-y-4">
      <div className="p-3 bg-tertiary/50 rounded-lg">
        <p className="font-medium text-text-primary">{member?.rank} {member?.name}</p>
        <p className="text-xs text-text-muted">Mês de referência: {monthLabel(monthYear)}</p>
      </div>
      <Input label="Valor (R$) *" inputMode="decimal" value={amount} onChange={event => setAmount(event.target.value)} />
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1.5">Data do pagamento *</label>
        <input
          type="date"
          value={parseDateBR(date)}
          onChange={event => setDate(formatDateBR(event.target.value))}
          className="w-full px-4 py-2.5 bg-primary border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-info"
        />
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button variant="success" onClick={handleConfirm} disabled={recordPayment.isPending}>
          {recordPayment.isPending ? 'Salvando...' : 'Confirmar pagamento'}
        </Button>
      </div>
    </div>
  );
}
