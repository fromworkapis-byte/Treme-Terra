// ===== MEMBERS PAGE =====
import * as React from 'react';
import { useState } from 'react';
import {
  Plus, Search, Edit, Trash, ChevronLeft, ChevronRight, Camera, QrCode,
  AlertCircle, CheckCircle, X, Paperclip, ListChecks, Loader2, GripVertical, Upload, Filter, Clipboard,
} from 'lucide-react';
import {
  Button, Input, Select, Badge, Card, CardContent, Table, TableHeader, TableBody,
  TableRow, TableCell, TableHead, ScrollArea, Modal, Tabs, TabsList, TabsTrigger, TabsContent,
  Checkbox, DatePicker,
} from '../components/ui';
import { PageHeader } from '../components/layout';
import {
  useMembers, useDeleteMember, useMemberPaymentStatus, useRecordMemberPayment,
  useRecordMemberPaymentsBulk, useDeleteMemberPayment, useUploadAttachment, useReorderMembers,
} from '../hooks/useFinancialData';
import { useMemberDragReorder } from '../hooks/useMemberDragReorder';
import {
  formatBRL, formatDateBR, getCurrentMonthYear, getPreviousMonthYear, getNextMonthYear,
  parseBRL, parseDateBR,
} from '../db';
import {
  AttachmentList, MemberForm, MemberImportForm, ReceiptField, ReceiptPaymentForm,
} from '../components/forms';
import { buildCharge, buildGroupCharge, getBillingSettings, monthLabel, resolveGroupQr } from '../lib/billing';
import { buildPixQr } from '../lib/pix';
import { CURRENT_USER } from '../lib/currentUser';
import type { Member } from '../types';
import { ALLOWED_MILITARY_RANKS, isAllowedMilitaryRank, militaryRankLabel } from '../types';

const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function formatMonth(monthYear: string) {
  const [year, month] = monthYear.split('-');
  return `${months[Number(month) - 1]}/${year}`;
}

function amountInput(cents: number) {
  return (cents / 100).toFixed(2).replace('.', ',');
}

function rankBadgeVariant(rank: string): 'success' | 'warning' {
  return rank === 'CB' ? 'success' : 'warning';
}

async function copyTextAndImage(text: string, dataUrl: string) {
  if (typeof ClipboardItem === 'undefined') throw new Error('Imagem não suportada');
  const mime = dataUrl.slice(dataUrl.indexOf(':') + 1, dataUrl.indexOf(';')) || 'image/png';
  const bytes = await (await fetch(dataUrl)).arrayBuffer();
  await navigator.clipboard.write([new ClipboardItem({
    'text/plain': new Blob([text], { type: 'text/plain' }),
    [mime]: new Blob([bytes], { type: mime }),
  })]);
}

export function Members() {
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'ACTIVE' | 'INACTIVE' | ''>('');
  const [selectedRank, setSelectedRank] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [deletingMember, setDeletingMember] = useState<Member | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthYear());
  const [manualMemberId, setManualMemberId] = useState<string | null>(null);
  const [receiptMemberId, setReceiptMemberId] = useState<string | null>(null);
  const [viewReceiptPaymentId, setViewReceiptPaymentId] = useState<string | null>(null);
  const [qr, setQr] = useState<{ name: string; dataUrl: string; payload: string } | null>(null);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('contributions');
  const [showFilters, setShowFilters] = useState(false);
  const [monthlyAmount, setMonthlyAmount] = useState(2000);

  const [selectedPendingIds, setSelectedPendingIds] = useState<string[]>([]);
  const [bulkAmount, setBulkAmount] = useState(amountInput(2000));
  const [bulkDate, setBulkDate] = useState(formatDateBR(new Date().toISOString().slice(0, 10)));
  const [bulkError, setBulkError] = useState('');
  const [orderError, setOrderError] = useState('');

  React.useEffect(() => {
    getBillingSettings().then(settings => {
      setMonthlyAmount(settings.monthlyAmount);
      setBulkAmount(amountInput(settings.monthlyAmount));
    });
  }, []);

  React.useEffect(() => {
    setSelectedPendingIds([]);
    setBulkError('');
  }, [selectedMonth]);

  const { data: members, isLoading } = useMembers();
  const { data: paymentStatus, isLoading: statusLoading } = useMemberPaymentStatus(selectedMonth);
  const deleteMember = useDeleteMember();
  const deletePayment = useDeleteMemberPayment();
  const bulkRecordPayment = useRecordMemberPaymentsBulk();
  const uploadAttachment = useUploadAttachment();
  const reorderMembers = useReorderMembers();

  const filteredMembers = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    return (members || []).filter(member => {
      if (selectedStatus && member.status !== selectedStatus) return false;
      if (selectedRank && member.rank !== selectedRank) return false;
      if (term && !`${militaryRankLabel(member.rank)} ${member.name}`.toLowerCase().includes(term)) return false;
      return true;
    });
  }, [members, search, selectedStatus, selectedRank]);

  const rankOptions = React.useMemo(() => {
    const options = ALLOWED_MILITARY_RANKS.map(rank => ({
      value: rank.value as string,
      label: rank.label,
    }));
    const legacyRanks = Array.from(new Set((members || []).map(member => member.rank)))
      .filter(rank => !isAllowedMilitaryRank(rank));
    for (const rank of legacyRanks) {
      options.push({ value: rank, label: militaryRankLabel(rank) });
    }
    return options;
  }, [members]);

  const drag = useMemberDragReorder({
    members: members || [],
    visibleMembers: filteredMembers,
    onReorder: orderedIds => {
      setOrderError('');
      reorderMembers.mutate(orderedIds, {
        onError: () => setOrderError('Não foi possível salvar a nova ordem de antiguidade.'),
      });
    },
  });

  const pendingStatuses = paymentStatus?.filter(status => !status.paid) || [];
  const paidCount = paymentStatus?.filter(status => status.paid).length || 0;
  const pendingCount = pendingStatuses.length;
  const collected = paymentStatus?.reduce((total, status) => total + status.amount, 0) || 0;
  const allPendingSelected = pendingCount > 0 && selectedPendingIds.length === pendingCount;
  const activeFilterCount = [search.trim(), selectedStatus, selectedRank].filter(Boolean).length;

  const handleGenerateCharge = async () => {
    setMessage('');
    try {
      const settings = await getBillingSettings();
      if (!settings.qrCodeImage.trim() && !settings.pixKey.trim()) {
        throw new Error('Configure a chave PIX ou salve a imagem do QR Code em Configurações → Cobrança.');
      }
      const { txid, message: chargeText } = buildGroupCharge({
        monthYear: selectedMonth,
        description: settings.chargeDescription,
        amountCents: settings.monthlyAmount,
        customMessage: settings.chargeMessage,
      });
      const qrDataUrl = await resolveGroupQr({
        settings,
        txid,
        description: settings.chargeDescription,
        amountCents: settings.monthlyAmount,
      });
      try {
        await copyTextAndImage(chargeText, qrDataUrl);
        setMessage(`Texto e QR Code de ${monthLabel(selectedMonth)} copiados. Cole no WhatsApp.`);
      } catch {
        await navigator.clipboard.writeText(chargeText);
        setMessage(`Texto de ${monthLabel(selectedMonth)} copiado. O navegador não copiou a imagem; baixe o QR Code em Configurações → Cobrança.`);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Não foi possível copiar a cobrança');
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

  const handleBulkPay = async () => {
    setBulkError('');
    if (selectedPendingIds.length === 0) {
      setBulkError('Selecione pelo menos um integrante pendente.');
      return;
    }
    const amountCents = parseBRL(bulkAmount);
    if (amountCents <= 0 || bulkDate.length !== 10) {
      setBulkError('Informe valor e data válidos.');
      return;
    }

    try {
      const paymentIds = await bulkRecordPayment.mutateAsync({
        memberIds: selectedPendingIds,
        monthYear: selectedMonth,
        amount: amountCents,
        date: parseDateBR(bulkDate),
        notes: 'Pagamento registrado em lote',
        recordedById: CURRENT_USER.id,
      });

      setMessage(`${paymentIds.length} pagamento(s) registrado(s) em ${monthLabel(selectedMonth)}.`);
      setSelectedPendingIds([]);
    } catch (error) {
      setBulkError(error instanceof Error ? error.message : 'Não foi possível registrar os pagamentos');
    }
  };

  const togglePendingId = (memberId: string, checked: boolean) => {
    setSelectedPendingIds(current => checked
      ? Array.from(new Set([...current, memberId]))
      : current.filter(id => id !== memberId));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Efetivo"
        title="Integrantes e mensalidades"
        description={`Acompanhe e registre os pagamentos de ${monthLabel(selectedMonth)}.`}
        actions={
          <>
            <Button variant="outline" onClick={() => { setActiveTab('list'); setShowFilters(true); }}>
              <Filter className="mr-2 h-4 w-4" /> Filtrar efetivo
            </Button>
            <Button variant="outline" onClick={() => setShowImport(true)}>
              <Upload className="mr-2 h-4 w-4" /> Importar lista
            </Button>
            <Button variant="outline" onClick={handleGenerateCharge}>
              <Clipboard className="mr-2 h-4 w-4" /> Gerar cobrança
            </Button>
            <Button variant="primary" onClick={() => { setEditingMember(null); setShowForm(true); }}>
              <Plus className="mr-2 h-4 w-4" /> Novo integrante
            </Button>
          </>
        }
      />

      {message && (
        <div className="flex items-start gap-2 rounded-lg border border-border bg-tertiary/40 p-3 text-sm text-text-secondary">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="flex-1">{message}</span>
          <button onClick={() => setMessage('')} aria-label="Fechar aviso"><X className="h-4 w-4" /></button>
        </div>
      )}

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={() => setSelectedMonth(getPreviousMonthYear(selectedMonth))} aria-label="Mês anterior">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="min-w-[112px] px-4 py-2 text-center text-base font-semibold text-text-primary bg-tertiary/50 rounded-lg">
                {formatMonth(selectedMonth)}
              </span>
              <Button variant="ghost" size="icon" onClick={() => setSelectedMonth(getNextMonthYear(selectedMonth))} aria-label="Próximo mês">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
              <span className="text-success"><strong>{paidCount}</strong> pagos</span>
              <span className="text-danger"><strong>{pendingCount}</strong> faltam</span>
              <span className="text-text-secondary">Arrecadado: <strong>{formatBRL(collected)}</strong></span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-lg border border-border/70 bg-tertiary/30 p-3">
              <p className="text-xl font-semibold text-text-primary">{members?.length || 0}</p>
              <p className="text-xs text-text-muted">Integrantes cadastrados</p>
            </div>
            <div className="rounded-lg border border-border/70 bg-tertiary/30 p-3">
              <p className="text-xl font-semibold text-success">{paidCount}</p>
              <p className="text-xs text-text-muted">Pagos no mês</p>
            </div>
            <div className="rounded-lg border border-border/70 bg-tertiary/30 p-3">
              <p className="text-xl font-semibold text-danger">{pendingCount}</p>
              <p className="text-xs text-text-muted">Faltam pagar</p>
            </div>
            <div className="rounded-lg border border-border/70 bg-tertiary/30 p-3">
              <p className="text-xl font-semibold text-text-primary">{formatBRL(collected)}</p>
              <p className="text-xs text-text-muted">Total recebido</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="contributions">Pagamentos do mês</TabsTrigger>
          <TabsTrigger value="list">Cadastro do efetivo</TabsTrigger>
        </TabsList>

        <TabsContent value="contributions" className="space-y-4">
          {pendingCount > 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <ListChecks className="h-4 w-4 text-warning" />
                    <p className="text-sm font-medium text-text-primary">Atualizar vários pagamentos</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedPendingIds(pendingStatuses.map(status => status.member.id))}
                  >
                    Selecionar todos os pendentes
                  </Button>
                </div>
                <p className="mb-3 text-xs text-text-muted">
                  Valor padrão: {formatBRL(monthlyAmount)}. Digite outro valor se houver atraso.
                </p>
                <div className="mx-auto flex max-w-3xl flex-col gap-4 sm:flex-row sm:items-end sm:justify-center">
                  <Input
                    label="Valor por integrante (R$)"
                    inputMode="decimal"
                    value={bulkAmount}
                    onChange={event => setBulkAmount(event.target.value)}
                    className="sm:w-56"
                  />
                  <DatePicker label="Data do pagamento" value={bulkDate} onChange={event => setBulkDate(event.target.value)} className="sm:w-56" />
                  <Button type="button" variant="success" className="shrink-0" onClick={handleBulkPay} disabled={bulkRecordPayment.isPending}>
                    {bulkRecordPayment.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Marcar como pagos ({selectedPendingIds.length})
                  </Button>
                </div>
                {bulkError && <p className="mt-3 text-sm text-danger" role="alert">{bulkError}</p>}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="pt-6">
              {statusLoading ? (
                <p className="py-8 text-center text-text-muted">Carregando...</p>
              ) : (
                <ScrollArea className="h-[520px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">
                          <Checkbox
                            checked={allPendingSelected}
                            disabled={pendingCount === 0}
                            onCheckedChange={checked => setSelectedPendingIds(checked ? pendingStatuses.map(status => status.member.id) : [])}
                            aria-label="Selecionar todos os pendentes"
                          />
                        </TableHead>
                        <TableHead>Posto/Grad</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Valor / Data</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(paymentStatus?.length || 0) === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="py-8 text-center text-text-muted">
                            Nenhum integrante ativo. Cadastre o efetivo para acompanhar as mensalidades.
                          </TableCell>
                        </TableRow>
                      ) : (
                        paymentStatus?.map(status => (
                          <TableRow key={status.member.id}>
                            <TableCell>
                              <Checkbox
                                checked={selectedPendingIds.includes(status.member.id)}
                                disabled={status.paid}
                                onCheckedChange={checked => togglePendingId(status.member.id, checked === true)}
                                aria-label={`Selecionar ${status.member.name}`}
                              />
                            </TableCell>
                            <TableCell><Badge variant={rankBadgeVariant(status.member.rank)}>{militaryRankLabel(status.member.rank)}</Badge></TableCell>
                            <TableCell className="font-medium">{status.member.name}</TableCell>
                            <TableCell>
                              {status.paid ? <Badge variant="success">Pago</Badge> : <Badge variant="danger">Falta pagar</Badge>}
                            </TableCell>
                            <TableCell className="text-text-secondary">
                              {status.paid ? (
                                <span className="flex items-center gap-2">
                                  {formatBRL(status.amount)} · {formatDateBR(status.date || '')}
                                  {status.hasReceipt && <Paperclip className="h-3.5 w-3.5 text-info" aria-label="Comprovante anexado" />}
                                </span>
                              ) : '—'}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap justify-end gap-1">
                                <Button variant="ghost" size="icon" onClick={() => handleShowQr(status.member)} aria-label="Ver QR PIX" title="Ver QR PIX">
                                  <QrCode className="h-4 w-4" />
                                </Button>
                                {status.hasReceipt && status.paymentId && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setViewReceiptPaymentId(status.paymentId || null)}
                                    aria-label="Ver comprovante"
                                    title="Ver comprovante"
                                  >
                                    <Paperclip className="h-4 w-4 text-info" />
                                  </Button>
                                )}
                                <Button variant="outline" size="sm" onClick={() => setReceiptMemberId(status.member.id)}>
                                  <Camera className="mr-1 h-4 w-4" />
                                  {status.hasReceipt ? 'Editar comprovante' : 'Comprovante'}
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

        <TabsContent value="list" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-medium text-text-primary">Filtros do efetivo</p>
                <div className="flex flex-wrap items-center gap-2">
                  {activeFilterCount > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => { setSearch(''); setSelectedStatus(''); setSelectedRank(''); }}
                    >
                      <X className="mr-1 h-4 w-4" /> Limpar filtros
                    </Button>
                  )}
                  {showFilters && (
                    <Button type="button" variant="outline" size="sm" onClick={() => setShowFilters(false)}>
                      Ocultar filtros
                    </Button>
                  )}
                </div>
              </div>
              {showFilters && (
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <Input
                    placeholder="Buscar por nome ou posto..."
                    value={search}
                    onChange={event => setSearch(event.target.value)}
                    className="lg:col-span-2"
                  />
                  <Select
                    label="Status"
                    options={[{ value: '', label: 'Todos' }, { value: 'ACTIVE', label: 'Ativos' }, { value: 'INACTIVE', label: 'Inativos' }]}
                    value={selectedStatus}
                    onChange={event => setSelectedStatus(event.target.value as 'ACTIVE' | 'INACTIVE' | '')}
                  />
                  <Select
                    label="Posto/Grad"
                    options={[{ value: '', label: 'Todos' }, ...rankOptions]}
                    value={selectedRank}
                    onChange={event => setSelectedRank(event.target.value)}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-3">
              <p className="text-xs text-text-muted">
                Arraste pelo ícone <GripVertical className="inline h-3.5 w-3.5 align-text-bottom" /> para mudar a antiguidade. Com o ícone focado, use ↑ e ↓.
              </p>
              {orderError && <p className="text-sm text-danger" role="alert">{orderError}</p>}
              {isLoading ? (
                <p className="py-8 text-center text-text-muted">Carregando...</p>
              ) : (
                <ScrollArea className="h-[500px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-28">Antiguidade</TableHead>
                        <TableHead>Posto/Grad</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>WhatsApp</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredMembers.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="py-8 text-center text-text-muted">Nenhum integrante encontrado</TableCell>
                        </TableRow>
                      ) : (
                        filteredMembers.map(member => (
                          <TableRow
                            key={member.id}
                            {...drag.rowProps(member.id)}
                            className={[
                              drag.draggingId === member.id ? 'opacity-40' : '',
                              drag.overId === member.id && drag.draggingId !== member.id ? 'bg-info/10 ring-1 ring-inset ring-info' : '',
                            ].filter(Boolean).join(' ')}
                          >
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  className="cursor-grab rounded p-1 text-text-muted transition-colors hover:bg-tertiary hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-info active:cursor-grabbing"
                                  style={{ touchAction: 'none' }}
                                  aria-label={`Arrastar ${member.name} para mudar a antiguidade`}
                                  title="Arrastar para reordenar"
                                  {...drag.handleProps(member.id)}
                                >
                                  <GripVertical className="h-4 w-4" />
                                </button>
                                <span className="font-mono text-xs text-text-secondary">#{member.ordem}</span>
                              </div>
                            </TableCell>
                            <TableCell><Badge variant={rankBadgeVariant(member.rank)}>{militaryRankLabel(member.rank)}</Badge></TableCell>
                            <TableCell className="font-medium">{member.name}</TableCell>
                            <TableCell className={member.phone ? 'text-text-secondary' : 'text-danger'}>
                              {member.phone || 'Não informado'}
                            </TableCell>
                            <TableCell>
                              {member.status === 'ACTIVE' ? <Badge variant="success">Ativo</Badge> : <Badge variant="gray">Inativo</Badge>}
                            </TableCell>
                            <TableCell>
                              <div className="flex justify-end gap-1">
                                <Button variant="ghost" size="icon" onClick={() => { setEditingMember(member); setShowForm(true); }} aria-label="Editar">
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="text-danger hover:text-danger" onClick={() => setDeletingMember(member)} aria-label="Excluir">
                                  <Trash className="h-4 w-4" />
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

      <Modal open={showForm} onOpenChange={setShowForm} title={editingMember ? 'Editar integrante' : 'Novo integrante'} size="lg">
        <MemberForm
          initialData={editingMember || undefined}
          onSuccess={() => setShowForm(false)}
          onCancel={() => setShowForm(false)}
        />
      </Modal>

      <Modal open={showImport} onOpenChange={setShowImport} title="Importar lista de integrantes" size="lg">
        <MemberImportForm
          onSuccess={count => setMessage(`${count} integrante(s) cadastrado(s) no efetivo.`)}
          onCancel={() => setShowImport(false)}
        />
      </Modal>

      <Modal open={!!deletingMember} onOpenChange={() => setDeletingMember(null)} title="Confirmar exclusão" size="sm">
        <div className="space-y-4">
          <p className="text-text-secondary">Excluir <strong>{deletingMember?.name}</strong> do efetivo?</p>
          <div className="flex justify-end gap-3 border-t border-border/70 pt-4">
            <Button variant="outline" onClick={() => setDeletingMember(null)}>Cancelar</Button>
            <Button variant="danger" onClick={handleDelete}>Excluir</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!manualMemberId} onOpenChange={() => setManualMemberId(null)} title="Registrar pagamento" size="md">
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
            paymentId={paymentStatus?.find(status => status.member.id === receiptMemberId)?.paymentId}
            expectedAmountCents={paymentStatus?.find(status => status.member.id === receiptMemberId)?.amount || monthlyAmount}
            onCancel={() => setReceiptMemberId(null)}
          />
        )}
      </Modal>

      <Modal open={!!viewReceiptPaymentId} onOpenChange={() => setViewReceiptPaymentId(null)} title="Comprovante do pagamento" size="xl">
        <AttachmentList entityType="MEMBER_PAYMENT" entityId={viewReceiptPaymentId || undefined} autoView />
      </Modal>

      <Modal open={!!qr} onOpenChange={() => setQr(null)} title={`QR PIX — ${qr?.name || ''}`} size="sm">
        {qr && (
          <div className="space-y-4 text-center">
            <img src={qr.dataUrl} alt="QR Code PIX" className="mx-auto h-64 w-64 rounded-lg bg-white p-2" />
            <p className="break-all text-left text-sm text-text-secondary">{qr.payload}</p>
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
  const uploadAttachment = useUploadAttachment();
  const [amount, setAmount] = useState(amountInput(expectedAmountCents));
  const [date, setDate] = useState(formatDateBR(new Date().toISOString().slice(0, 10)));
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    if (!member) return;
    const amountCents = parseBRL(amount);
    if (amountCents <= 0 || date.length !== 10) {
      setError('Informe valor e data válidos.');
      return;
    }
    setError('');
    try {
      const paymentId = await recordPayment.mutateAsync({
        memberId: member.id,
        monthYear,
        amount: amountCents,
        date: parseDateBR(date),
        recordedById: CURRENT_USER.id,
      });
      if (file && paymentId) {
        await uploadAttachment.mutateAsync({
          file,
          entityType: 'MEMBER_PAYMENT',
          entityId: paymentId,
          uploadedById: CURRENT_USER.id,
        });
      }
      onCancel();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível registrar o pagamento');
    }
  };

  const saving = recordPayment.isPending || uploadAttachment.isPending;

  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-tertiary/40 p-3">
        <p className="font-medium text-text-primary">{militaryRankLabel(member?.rank || '')} {member?.name}</p>
        <p className="text-xs text-text-muted">Mês de referência: {monthLabel(monthYear)}</p>
        <p className="mt-1 text-xs text-text-muted">Padrão: {formatBRL(expectedAmountCents)}. Você pode digitar outro valor.</p>
      </div>
      <Input label="Valor pago (R$) *" inputMode="decimal" value={amount} onChange={event => setAmount(event.target.value)} />
      <DatePicker label="Data do pagamento *" value={date} onChange={event => setDate(event.target.value)} />
      <ReceiptField compact label="Comprovante (opcional)" file={file} onFileChange={setFile} />
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex flex-wrap justify-end gap-3 border-t border-border/70 pt-4">
        <Button variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button variant="success" onClick={handleConfirm} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {saving ? 'Salvando...' : 'Confirmar pagamento'}
        </Button>
      </div>
    </div>
  );
}
