// ===== EXPENSE FORM =====
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input, Select, Textarea, DatePicker, Card, CardContent, CardHeader, CardTitle } from '../ui';
import { useCategories } from '../../hooks/useFinancialData';
import { useAccounts } from '../../hooks/useFinancialData';
import { useCreateExpense, useUpdateExpense } from '../../hooks/useFinancialData';
import { formatDateBR, getCurrentMonthYear } from '../../db';
import type { Expense, Category, Account } from '../../types';

const expenseSchema = z.object({
  date: z.string().min(1, 'Data é obrigatória'),
  description: z.string().min(2, 'Descrição deve ter pelo menos 2 caracteres'),
  categoryId: z.string().min(1, 'Categoria é obrigatória'),
  amount: z.string().min(1, 'Valor é obrigatório').refine(val => parseFloat(val.replace(/[^\d,.-]/g, '').replace(',', '.')) > 0, 'Valor deve ser maior que zero'),
  paymentMethod: z.string().min(1, 'Forma de pagamento é obrigatória'),
  accountId: z.string().min(1, 'Conta de origem é obrigatória'),
  beneficiary: z.string().optional(),
  receiptNumber: z.string().optional(),
  notes: z.string().optional(),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;

interface ExpenseFormProps {
  initialData?: Expense;
  categories: Category[];
  accounts: Account[];
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ExpenseForm({ initialData, categories, accounts, onSuccess, onCancel }: ExpenseFormProps) {
  const isEditing = !!initialData;
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();

  const defaultValues: ExpenseFormData = {
    date: initialData ? formatDateBR(initialData.date) : formatDateBR(getCurrentMonthYear() + '-01'),
    description: initialData?.description || '',
    categoryId: initialData?.categoryId || '',
    amount: initialData ? (initialData.amount / 100).toFixed(2).replace('.', ',') : '',
    paymentMethod: initialData?.paymentMethod || 'PIX',
    accountId: initialData?.accountId || '',
    beneficiary: initialData?.beneficiary || '',
    receiptNumber: initialData?.receiptNumber || '',
    notes: initialData?.notes || '',
  };

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues,
  });

  const watchedAmount = watch('amount');
  const expenseCategories = categories.filter(c => c.type === 'EXPENSE');
  const activeAccounts = accounts.filter(a => a.isActive);

  const handleSubmitForm = async (data: ExpenseFormData) => {
    const amountCents = Math.round(parseFloat(data.amount.replace(/\./g, '').replace(',', '.')) * 100);
    
    const expenseData = {
      date: data.date.split('/').reverse().join('-'),
      description: data.description,
      categoryId: data.categoryId,
      amount: amountCents,
      paymentMethod: data.paymentMethod as any,
      accountId: data.accountId,
      createdById: 'admin-001',
      beneficiary: data.beneficiary || undefined,
      receiptNumber: data.receiptNumber || undefined,
      notes: data.notes,
    };

    try {
      if (isEditing && initialData) {
        await updateExpense.mutateAsync({ id: initialData.id, data: expenseData });
      } else {
        await createExpense.mutateAsync(expenseData);
      }
      onSuccess?.();
      if (!isEditing) {
        setValue('description', '');
        setValue('amount', '');
        setValue('beneficiary', '');
        setValue('receiptNumber', '');
        setValue('notes', '');
        setValue('date', formatDateBR(getCurrentMonthYear() + '-01'));
      }
    } catch (error) {
      console.error('Erro ao salvar despesa:', error);
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
        <CardTitle>{isEditing ? 'Editar Despesa' : 'Nova Despesa'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(handleSubmitForm)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DatePicker
              label="Data da Despesa *"
              {...register('date')}
              error={errors.date?.message}
            />
            <Select
              label="Categoria *"
              options={expenseCategories.map(c => ({ value: c.id, label: c.name }))}
              placeholder="Selecione a categoria"
              {...register('categoryId')}
              error={errors.categoryId?.message}
            />
          </div>

          <Input
            label="Descrição *"
            placeholder="Ex: Churrasco confraternização, Material limpeza..."
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
              label="Forma de Pagamento *"
              options={[
                { value: 'CASH', label: 'Dinheiro' },
                { value: 'PIX', label: 'PIX' },
                { value: 'TRANSFER', label: 'Transferência' },
                { value: 'DEPOSIT', label: 'Depósito' },
                { value: 'CARD_DEBIT', label: 'Cartão Débito' },
                { value: 'CARD_CREDIT', label: 'Cartão Crédito' },
                { value: 'BOLETO', label: 'Boleto' },
              ]}
              placeholder="Selecione"
              {...register('paymentMethod')}
              error={errors.paymentMethod?.message}
            />
            <Select
              label="Conta de Origem *"
              options={activeAccounts.map(a => ({ value: a.id, label: `${a.name} (${a.type === 'CASH' ? 'Caixa' : a.type === 'BANK' ? 'Banco' : a.type})` }))}
              placeholder="Selecione a conta"
              {...register('accountId')}
              error={errors.accountId?.message}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Beneficiário/Fornecedor"
              placeholder="Nome do fornecedor ou beneficiário"
              {...register('beneficiary')}
            />
            <Input
              label="Nº Comprovante"
              placeholder="Número da nota fiscal ou recibo"
              {...register('receiptNumber')}
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
            <Button type="submit" variant="danger" disabled={isSubmitting || createExpense.isPending || updateExpense.isPending}>
              {isSubmitting || createExpense.isPending || updateExpense.isPending ? 'Salvando...' : isEditing ? 'Atualizar' : 'Cadastrar'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}