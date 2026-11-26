// ===== FORMULARIO DE PAGAMENTO VIA COMPROVANTE =====
import * as React from 'react';
import { useState } from 'react';
import { Camera, FileImage, Loader2 } from 'lucide-react';
import { Button, DatePicker, Input, Select } from '../ui';
import { useRecordMemberPayment } from '../../hooks/useFinancialData';
import { formatBRL, formatDateBR, parseBRL, parseDateBR } from '../../db';
import { analyzeReceipt, readReceipt } from '../../lib/receipt';
import type { Member } from '../../types';

interface ReceiptPaymentFormProps {
  members: Member[];
  monthYear: string;
  initialMemberId?: string;
  expectedAmountCents: number;
  onSaved?: () => void;
  onCancel: () => void;
}

export function ReceiptPaymentForm({
  members,
  monthYear,
  initialMemberId,
  expectedAmountCents,
  onSaved,
  onCancel,
}: ReceiptPaymentFormProps) {
  const activeMembers = members.filter(member => member.status === 'ACTIVE');
  const recordPayment = useRecordMemberPayment();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [reading, setReading] = useState(false);
  const [memberId, setMemberId] = useState(initialMemberId || activeMembers[0]?.id || '');
  const [amount, setAmount] = useState(formatBRL(expectedAmountCents).replace('R$\u00a0', '').replace('R$ ', ''));
  const [date, setDate] = useState(formatDateBR(new Date().toISOString().slice(0, 10)));
  const [ocrText, setOcrText] = useState('');
  const [error, setError] = useState('');

  const handleFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] || null;
    setFile(selected);
    setPreview(selected ? URL.createObjectURL(selected) : '');
    setOcrText('');
    setError('');
  };

  const handleRead = async () => {
    if (!file) return;
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
      await recordPayment.mutateAsync({
        memberId,
        monthYear,
        amount: amountCents,
        date: parseDateBR(date),
        notes: `Comprovante: ${file?.name || 'manual'}${ocrText ? ' (lido por OCR)' : ''}`,
      });
      onSaved?.();
      onCancel();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível registrar o pagamento');
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-text-secondary">
        Envie a foto do comprovante. O sistema lê valor, data e identificação, mas você confere antes de marcar como pago.
      </p>

      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1.5">Foto do comprovante</label>
        <label className="flex items-center justify-center gap-2 w-full px-4 py-6 border border-dashed border-border rounded-lg cursor-pointer hover:bg-tertiary/50 transition-colors text-text-secondary">
          <FileImage className="w-5 h-5" />
          {file ? file.name : 'Selecionar imagem (JPG ou PNG)'}
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
        </label>
      </div>

      {preview && (
        <div className="flex flex-col sm:flex-row gap-4">
          <img src={preview} alt="Prévia do comprovante" className="w-full sm:w-40 h-40 object-cover rounded-lg border border-border" />
          <Button variant="outline" onClick={handleRead} disabled={reading} className="self-start">
            {reading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Camera className="w-4 h-4 mr-2" />}
            {reading ? 'Lendo...' : 'Ler comprovante'}
          </Button>
        </div>
      )}

      {ocrText && (
        <details className="text-sm text-text-muted bg-tertiary/50 rounded-lg p-3">
          <summary className="cursor-pointer">Texto identificado na imagem</summary>
          <pre className="mt-2 whitespace-pre-wrap break-words max-h-40 overflow-auto">{ocrText}</pre>
        </details>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          label="Integrante *"
          options={activeMembers.map(member => ({ value: member.id, label: `${member.rank} ${member.name}` }))}
          value={memberId}
          onChange={event => setMemberId(event.target.value)}
        />
        <Input
          label="Valor (R$) *"
          inputMode="decimal"
          value={amount}
          onChange={event => setAmount(event.target.value)}
        />
        <DatePicker label="Data do pagamento *" value={date} onChange={event => setDate(event.target.value)} />
      </div>

      {error && <p className="text-sm text-danger" role="alert">{error}</p>}

      <div className="flex justify-end gap-3 pt-4 border-t border-border">
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="button" variant="success" onClick={handleConfirm} disabled={recordPayment.isPending}>
          {recordPayment.isPending ? 'Salvando...' : 'Confirmar pagamento'}
        </Button>
      </div>
    </div>
  );
}
