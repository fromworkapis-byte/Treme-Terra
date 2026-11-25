// ===== TRANSFER FORM =====
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input, Select, Textarea, DatePicker, Card, CardContent, CardHeader, CardTitle } from '../ui';
import { useAccounts } from '../../hooks/useFinancialData';
import { useCreateTransfer, useUpdateTransfer } from '../../hooks/useFinancialData';
import { formatDateBR, getCurrentMonthYear } from '../../db';
import type { Transfer, Account } from '../../types';

const transferSchema = z.object({
  date: z.string().min(1, 'Data é obrigatória'),
  amount: z.string().min(1, 'Valor é obrigatório').refine(val => parseFloat(val.replace(/[^\d,.-]/g, '').replace(',', '.')) > 0, 'Valor deve ser maior que zero'),
  fromAccountId: z.string().min(1, 'Conta de origem é obrigatória'),
  toAccountId: z.string().min(1, 'Conta de destino é obrigatória'),
  notes: z.string().optional(),
}).refine(data => data.fromAccountId !== data.toAccountId, {
  message: 'Conta de origem e destino devem ser diferentes',
  path: ['toAccountId'],
});

type TransferFormData = z.infer<typeof transferSchema>;

interface TransferFormProps {
  initialData?: Transfer;
  accounts: Account[];
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function TransferForm({ initialData, accounts, onSuccess, onCancel }: TransferFormProps) {
  const isEditing = !!initialData;
  const createTransfer = useCreateTransfer();
  const updateTransfer = useUpdateTransfer();

  const defaultValues: TransferFormData = {
    date: initialData ? formatDateBR(initialData.date) : formatDateBR(getCurrentMonthYear() + '-01'),
    amount: initialData ? (initialData.amount / 100).toFixed(2).replace('.', ',') : '',
    fromAccountId: initialData?.fromAccountId || '',
    toAccountId: initialData?.toAccountId || '',
    notes: initialData?.notes || '',
  };

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<TransferFormData>({
    resolver: zodResolver(transferSchema),
    defaultValues,
  });

  const watchedAmount = watch('amount');
  const activeAccounts = accounts.filter(a => a.isActive);

  const handleSubmitForm = async (data: TransferFormData) => {
    const amountCents = Math.round(parseFloat(data.amount.replace(/\./g, '').replace(',', '.')) * 100);
    
    const transferData = {
      date: data.date.split('/').reverse().join('-'),
      amount: amountCents,
      fromAccountId: data.fromAccountId,
      toAccountId: data.toAccountId,
      createdById: 'admin-001',
      notes: data.notes,
    };

    try {
      if (isEditing && initialData) {
        await updateTransfer.mutateAsync({ id: initialData.id, data: transferData });
      } else {
        await createTransfer.mutateAsync(transferData);
      }
      onSuccess?.();
      if (!isEditing) {
        setValue('amount', '');
        setValue('fromAccountId', '');
        setValue('toAccountId', '');
        setValue('notes', '');
        setValue('date', formatDateBR(getCurrentMonthYear() + '-01'));
      }
    } catch (error) {
      console.error('Erro ao salvar transferência:', error);
    }
  };

  const formatAmount = (value: string) => {
    const numeric = value.replace(/\D/g, '');
    if (!numeric) return '';
    const formatted = (parseInt(numeric) / 100).toFixed(2);
    return formatted.replace('.', ',');
  };

  const getAccountTypeLabel = (type: string) => {
    switch (type) {
      case 'CASH': return 'Caixa';
      case 'BANK': return 'Banco';
      case 'PIX': return 'PIX';
      default: return 'Outras';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditing ? 'Editar Transferência' : 'Nova Transferência'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(handleSubmitForm)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DatePicker
              label="Data *"
              {...register('date')}
              error={errors.date?.message}
            />
            <Input
              label="Valor (R$) *"
              placeholder="0,00"
              value={watchedAmount}
              onChange={(e) => setValue('amount', formatAmount(e.target.value))}
              {...register('amount')}
              error={errors.amount?.message}
              inputMode="decimal"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Conta de Origem *"
              options={activeAccounts.map(a => ({ value: a.id, label: `${a.name} (${getAccountTypeLabel(a.type)})` }))}
              placeholder="Selecione a conta de origem"
              {...register('fromAccountId')}
              error={errors.fromAccountId?.message}
            />
            <Select
              label="Conta de Destino *"
              options={activeAccounts.map(a => ({ value: a.id, label: `${a.name} (${getAccountTypeLabel(a.type)})` }))}
              placeholder="Selecione a conta de destino"
              {...register('toAccountId')}
              error={errors.toAccountId?.message}
            />
          </div>

          <Textarea
            label="Observações"
            placeholder="Motivo da transferência..."
            {...register('notes')}
            rows={3}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
            )}
            <Button type="submit" variant="primary" disabled={isSubmitting || createTransfer.isPending || updateTransfer.isPending}>
              {isSubmitting || createTransfer.isPending || updateTransfer.isPending ? 'Salvando...' : isEditing ? 'Atualizar' : 'Transferir'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}