// ===== ENTRY FORM =====
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Select, Textarea, DatePicker, Card, CardContent, CardHeader, CardTitle } from '../ui';
import { useCategories } from '../../hooks/useFinancialData';
import { useAccounts } from '../../hooks/useFinancialData';
import { useCreateEntry, useUpdateEntry } from '../../hooks/useFinancialData';
import { formatDateBR, getCurrentMonthYear } from '../../db';
import type { Entry, Category, Account } from '../../types';

const entrySchema = z.object({
  date: z.string().min(1, 'Data é obrigatória'),
  description: z.string().min(2, 'Descrição deve ter pelo menos 2 caracteres'),
  categoryId: z.string().min(1, 'Categoria é obrigatória'),
  amount: z.string().min(1, 'Valor é obrigatório').refine(val => parseFloat(val.replace(/[^\d,.-]/g, '').replace(',', '.')) > 0, 'Valor deve ser maior que zero'),
  paymentMethod: z.string().min(1, 'Forma de recebimento é obrigatória'),
  accountId: z.string().min(1, 'Conta de destino é obrigatória'),
  notes: z.string().optional(),
});

type EntryFormData = z.infer<typeof entrySchema>;

interface EntryFormProps {
  initialData?: Entry;
  categories: Category[];
  accounts: Account[];
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function EntryForm({ initialData, categories, accounts, onSuccess, onCancel }: EntryFormProps) {
  const navigate = useNavigate();
  const isEditing = !!initialData;
  const createEntry = useCreateEntry();
  const updateEntry = useUpdateEntry();

  const defaultValues: EntryFormData = {
    date: initialData ? formatDateBR(initialData.date) : formatDateBR(getCurrentMonthYear() + '-01'),
    description: initialData?.description || '',
    categoryId: initialData?.categoryId || '',
    amount: initialData ? (initialData.amount / 100).toFixed(2).replace('.', ',') : '',
    paymentMethod: initialData?.paymentMethod || 'PIX',
    accountId: initialData?.accountId || '',
    notes: initialData?.notes || '',
  };

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<EntryFormData>({
    resolver: zodResolver(entrySchema),
    defaultValues,
  });

  const watchedAmount = watch('amount');
  const incomeCategories = categories.filter(c => c.type === 'INCOME');
  const activeAccounts = accounts.filter(a => a.isActive);

  const handleSubmitForm = async (data: EntryFormData) => {
    const amountCents = Math.round(parseFloat(data.amount.replace(/\./g, '').replace(',', '.')) * 100);
    
    const entryData = {
      date: data.date.split('/').reverse().join('-'),
      description: data.description,
      categoryId: data.categoryId,
      amount: amountCents,
      paymentMethod: data.paymentMethod as any,
      accountId: data.accountId,
      createdById: 'admin-001', // TODO: pegar do auth
      notes: data.notes,
    };

    try {
      if (isEditing && initialData) {
        await updateEntry.mutateAsync({ id: initialData.id, data: entryData });
      } else {
        await createEntry.mutateAsync(entryData);
      }
      onSuccess?.();
      if (!isEditing) {
        // Reset form for new entry
        setValue('description', '');
        setValue('amount', '');
        setValue('notes', '');
        setValue('date', formatDateBR(getCurrentMonthYear() + '-01'));
      }
    } catch (error) {
      console.error('Erro ao salvar entrada:', error);
    }
  };

  const formatAmount = (value: string) => {
    const numeric = value.replace(/\D/g, '');
    if (!numeric) return '';
    const formatted = (parseInt(numeric) / 100).toFixed(2);
    return formatted.replace('.', ',');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditing ? 'Editar Entrada' : 'Nova Entrada'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(handleSubmitForm)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DatePicker
              label="Data do Recebimento *"
              {...register('date')}
              error={errors.date?.message}
            />
            <Select
              label="Categoria *"
              options={incomeCategories.map(c => ({ value: c.id, label: c.name }))}
              placeholder="Selecione a categoria"
              {...register('categoryId')}
              error={errors.categoryId?.message}
            />
          </div>

          <Input
            label="Descrição *"
            placeholder="Ex: Mensalidade Janeiro, Venda de ingressos..."
            {...register('description')}
            error={errors.description?.message}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Valor (R$) *"
              placeholder="0,00"
              value={watchedAmount}
              onChange={(e) => setValue('amount', formatAmount(e.target.value))}
              {...register('amount')}
              error={errors.amount?.message}
              inputMode="decimal"
            />
            <Select
              label="Forma de Recebimento *"
              options={[
                { value: 'CASH', label: 'Dinheiro' },
                { value: 'PIX', label: 'PIX' },
                { value: 'TRANSFER', label: 'Transferência' },
                { value: 'DEPOSIT', label: 'Depósito' },
              ]}
              placeholder="Selecione"
              {...register('paymentMethod')}
              error={errors.paymentMethod?.message}
            />
            <Select
              label="Conta de Destino *"
              options={activeAccounts.map(a => ({ value: a.id, label: `${a.name} (${a.type === 'CASH' ? 'Caixa' : a.type === 'BANK' ? 'Banco' : a.type})` }))}
              placeholder="Selecione a conta"
              {...register('accountId')}
              error={errors.accountId?.message}
            />
          </div>

          <Textarea
            label="Observações"
            placeholder="Informações adicionais..."
            {...register('notes')}
            rows={3}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
            )}
            <Button type="submit" variant="primary" disabled={isSubmitting || createEntry.isPending || updateEntry.isPending}>
              {isSubmitting || createEntry.isPending || updateEntry.isPending ? 'Salvando...' : isEditing ? 'Atualizar' : 'Cadastrar'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}