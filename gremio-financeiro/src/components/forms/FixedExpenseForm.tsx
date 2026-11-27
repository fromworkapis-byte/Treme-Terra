// ===== FORMULÁRIO DE DESPESA FIXA MENSAL =====
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, Select, Switch } from '../ui';
import { useSaveFixedExpense } from '../../hooks/useFinancialData';
import { CURRENT_USER } from '../../lib/currentUser';
import { parseBRL } from '../../db';
import type { Account, Category, FixedExpense, PaymentMethod } from '../../types';

const fixedExpenseSchema = z.object({
  description: z.string().min(2, 'Descrição deve ter pelo menos 2 caracteres'),
  amount: z.string().min(1, 'Valor é obrigatório').refine(value => parseBRL(value) > 0, 'Valor deve ser maior que zero'),
  day: z.number().int().min(1, 'Dia deve ser entre 1 e 31').max(31, 'Dia deve ser entre 1 e 31'),
  categoryId: z.string().min(1, 'Categoria é obrigatória'),
  accountId: z.string().min(1, 'Conta é obrigatória'),
  paymentMethod: z.string().min(1, 'Forma de pagamento é obrigatória'),
  beneficiary: z.string().optional(),
  isActive: z.boolean(),
});

type FixedExpenseFormData = z.infer<typeof fixedExpenseSchema>;

interface FixedExpenseFormProps {
  initialData?: FixedExpense;
  categories: Category[];
  accounts: Account[];
  onSuccess?: () => void;
  onCancel?: () => void;
}

function formatAmount(value: string): string {
  const numeric = value.replace(/\D/g, '');
  if (!numeric) return '';
  return (Number(numeric) / 100).toFixed(2).replace('.', ',');
}

export function FixedExpenseForm({ initialData, categories, accounts, onSuccess, onCancel }: FixedExpenseFormProps) {
  const save = useSaveFixedExpense();
  const [saveError, setSaveError] = React.useState('');

  const defaultValues: FixedExpenseFormData = {
    description: initialData?.description || '',
    amount: initialData ? (initialData.amount / 100).toFixed(2).replace('.', ',') : '',
    day: initialData?.day || 1,
    categoryId: initialData?.categoryId || '',
    accountId: initialData?.accountId || '',
    paymentMethod: initialData?.paymentMethod || 'PIX',
    beneficiary: initialData?.beneficiary || '',
    isActive: initialData?.isActive ?? true,
  };

  const {
    register, handleSubmit, watch, setValue,
    formState: { errors, isSubmitting },
  } = useForm<FixedExpenseFormData>({ resolver: zodResolver(fixedExpenseSchema), defaultValues });

  const watchedAmount = watch('amount');
  const isActive = watch('isActive');
  const registeredAmount = register('amount');

  const handleSubmitForm = async (data: FixedExpenseFormData) => {
    setSaveError('');
    try {
      await save.mutateAsync({
        id: initialData?.id,
        data: {
          description: data.description.trim(),
          amount: parseBRL(data.amount),
          day: Number(data.day),
          categoryId: data.categoryId,
          accountId: data.accountId,
          paymentMethod: data.paymentMethod as PaymentMethod,
          beneficiary: data.beneficiary || undefined,
          isActive: data.isActive,
          createdById: initialData?.createdById || CURRENT_USER.id,
          lastGeneratedMonth: initialData?.lastGeneratedMonth,
        },
      });
      onSuccess?.();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Não foi possível salvar a despesa fixa');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{initialData ? 'Editar despesa fixa' : 'Nova despesa fixa'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(handleSubmitForm)} className="space-y-5">
          <Input
            label="Descrição *"
            placeholder="Ex.: Aluguel da sede"
            {...register('description')}
            error={errors.description?.message}
          />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Input
              label="Valor (R$) *"
              placeholder="0,00"
              inputMode="decimal"
              {...registeredAmount}
              value={watchedAmount}
              onChange={event => setValue('amount', formatAmount(event.target.value), { shouldValidate: true })}
              error={errors.amount?.message}
            />
            <Input
              label="Dia do mês *"
              type="number"
              min={1}
              max={31}
              {...register('day', { setValueAs: value => Number(value) })}
              error={errors.day?.message}
            />
            <Select
              label="Categoria *"
              options={categories.map(category => ({ value: category.id, label: category.name }))}
              placeholder="Selecione a categoria"
              {...register('categoryId')}
              error={errors.categoryId?.message}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Select
              label="Conta *"
              options={accounts.map(account => ({ value: account.id, label: account.name }))}
              placeholder="Selecione a conta"
              {...register('accountId')}
              error={errors.accountId?.message}
            />
            <Select
              label="Forma de pagamento *"
              options={[
                { value: 'PIX', label: 'PIX' },
                { value: 'CASH', label: 'Dinheiro' },
                { value: 'TRANSFER', label: 'Transferência' },
                { value: 'DEPOSIT', label: 'Depósito' },
                { value: 'CARD_DEBIT', label: 'Cartão débito' },
                { value: 'CARD_CREDIT', label: 'Cartão crédito' },
                { value: 'BOLETO', label: 'Boleto' },
                { value: 'OTHER', label: 'Outros' },
              ]}
              {...register('paymentMethod')}
              error={errors.paymentMethod?.message}
            />
          </div>
          <Input
            label="Fornecedor (opcional)"
            placeholder="Ex.: Prefeitura, energia, internet"
            {...register('beneficiary')}
          />
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div>
              <p className="text-sm font-medium text-text-primary">Ativa</p>
              <p className="text-xs text-text-muted">Desativada não gera lançamentos.</p>
            </div>
            <Switch checked={isActive} onCheckedChange={checked => setValue('isActive', checked)} />
          </div>
          {saveError && <p className="text-sm text-danger" role="alert">{saveError}</p>}
          <div className="flex justify-end gap-3 border-t border-border pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
            <Button type="submit" variant="danger" disabled={isSubmitting || save.isPending}>
              {isSubmitting || save.isPending ? 'Salvando...' : 'Salvar despesa fixa'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
