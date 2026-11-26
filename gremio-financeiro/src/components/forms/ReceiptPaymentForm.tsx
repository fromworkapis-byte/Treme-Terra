// ===== FORMULARIO DE PAGAMENTO VIA COMPROVANTE =====
import * as React from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { Button, DatePicker, Input, Select } from '../ui';
import { useRecordMemberPayment, useUploadAttachment } from '../../hooks/useFinancialData';
import { CURRENT_USER } from '../../lib/currentUser';
import { formatBRL, formatDateBR, parseBRL, parseDateBR } from '../../db';
import { analyzeReceipt, readReceipt } from '../../lib/receipt';
import { militaryRankLabel } from '../../types';
import type { Member } from '../../types';
import { AttachmentList } from './AttachmentList';
import { ReceiptField } from './ReceiptField';

interface ReceiptPaymentFormProps {
  members: Member[];
  monthYear: string;
  initialMemberId?: string;
  paymentId?: string;
  expectedAmountCents: number;
  onSaved?: () => void;
  onCancel: () => void;
}

export function ReceiptPaymentForm({
  members,
  monthYear,
  initialMemberId,
  paymentId,
  expectedAmountCents,
  onSaved,
  onCancel,
}: ReceiptPaymentFormProps) {
  const activeMembers = members.filter(member => member.status === 'ACTIVE');
  const recordPayment = useRecordMemberPayment();
  const uploadAttachment = useUploadAttachment();

  const [file, setFile] = React.useState<File | null>(null);
  const [reading, setReading] = React.useState(false);
  const [memberId, setMemberId] = React.useState(initialMemberId || activeMembers[0]?.id || '');
  const [amount, setAmount] = React.useState((expectedAmountCents / 100).toFixed(2).replace('.', ','));
  const [date, setDate] = React.useState(formatDateBR(new Date().toISOString().slice(0, 10)));
  const [ocrText, setOcrText] = React.useState('');
  const [error, setError] = React.useState('');

  const handleRead = async () => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('A leitura automática funciona com imagens. O PDF pode ser anexado normalmente.');
      return;
    }

    setReading(true);
    setError('');
    try {
      const text = await readReceipt(file);
      const analysis = analyzeReceipt(text, activeMembers, expectedAmountCents);
      setOcrText(text.trim());
      if (analysis.memberId) setMemberId(analysis.memberId);
      if (analysis.amountCents) setAmount((analysis.amountCents / 100).toFixed(2).replace('.', ','));
      if (analysis.date) setDate(formatDateBR(analysis.date));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível ler o comprovante');
    } finally {
      setReading(false);
    }
  };

  const handleConfirm = async () => {
    const amountCents = parseBRL(amount);
    if (!memberId || amountCents <= 0 || date.length !== 10) {
      setError('Confira integrante, valor e data antes de confirmar.');
      return;
    }
    setError('');
    try {
      const savedPaymentId = await recordPayment.mutateAsync({
        memberId,
        monthYear,
        amount: amountCents,
        date: parseDateBR(date),
        notes: `Comprovante: ${file?.name || 'manual'}${ocrText ? ' (lido por OCR)' : ''}`,
        recordedById: CURRENT_USER.id,
      });

      if (file && savedPaymentId) {
        await uploadAttachment.mutateAsync({
          file,
          entityType: 'MEMBER_PAYMENT',
          entityId: savedPaymentId,
          uploadedById: CURRENT_USER.id,
        });
      }

      onSaved?.();
      onCancel();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível registrar o pagamento');
    }
  };

  const saving = recordPayment.isPending || uploadAttachment.isPending;

  return (
    <div className="space-y-5">
      <p className="text-sm text-text-secondary">
        Envie o comprovante PIX. A leitura sugere integrante, valor e data, mas a confirmação é manual.
      </p>

      <ReceiptField
        label="Foto ou PDF do comprovante"
        file={file}
        onFileChange={nextFile => {
          setFile(nextFile);
          setOcrText('');
          setError('');
        }}
        onRead={handleRead}
        reading={reading}
        hint={`Valor padrão: ${formatBRL(expectedAmountCents)}. Se houver meses atrasados, digite o valor total pago.`}
      />

      {ocrText && (
        <details className="rounded-lg bg-tertiary/40 p-3 text-sm text-text-muted">
          <summary className="cursor-pointer text-text-secondary">Texto identificado na imagem</summary>
          <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-words">{ocrText}</pre>
        </details>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Select
          label="Integrante *"
          options={activeMembers.map(member => ({
            value: member.id,
            label: `${militaryRankLabel(member.rank)} — ${member.name}`,
          }))}
          value={memberId}
          onChange={event => setMemberId(event.target.value)}
        />
        <Input
          label="Valor pago (R$) *"
          inputMode="decimal"
          value={amount}
          onChange={event => setAmount(event.target.value)}
        />
        <DatePicker label="Data do pagamento *" value={date} onChange={event => setDate(event.target.value)} />
      </div>

      {paymentId && <AttachmentList entityType="MEMBER_PAYMENT" entityId={paymentId} />}

      {error && <p className="text-sm text-danger" role="alert">{error}</p>}

      <div className="flex flex-wrap justify-end gap-3 border-t border-border/70 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="button" variant="success" onClick={handleConfirm} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
          {saving ? 'Salvando...' : 'Confirmar pagamento'}
        </Button>
      </div>
    </div>
  );
}
