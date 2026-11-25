// ===== ACCOUNT FORM =====
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input, Select, Textarea, Card, CardContent, CardHeader, CardTitle, Checkbox, Label } from '../ui';
import { useCreateAccount, useUpdateAccount } from '../../hooks/useFinancialData';
import type { Account, AccountType } from '../../types';

const accountSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  type: z.string().min(1, 'Tipo é obrigatório'),
  balance: z.string().optional().refine(val => !val || parseFloat(val.replace(/[^\d,.-]/g, '').replace(',', '.')) >= 0, 'Saldo não pode ser negativo'),
  isActive: z.boolean(),
  description: z.string().optional(),
});

type AccountFormData = z.infer<typeof accountSchema>;

interface AccountFormProps {
  initialData?: Account;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: 'CASH', label: 'Caixa Físico (dinheiro em espécie)' },
  { value: 'BANK', label: 'Conta Bancária' },
  { value: 'PIX', label: 'PIX' },
  { value: 'OTHER', label: 'Outras' },
];

export function AccountForm({ initialData, onSuccess, onCancel }: AccountFormProps) {
  const isEditing = !!initialData;
  const createAccount = useCreateAccount();
  const updateAccount = useUpdateAccount();

  const defaultValues: AccountFormData = {
    name: initialData?.name || '',
    type: initialData?.type || 'CASH',
    balance: initialData ? (initialData.balance / 100).toFixed(2).replace('.', ',') : '',
    isActive: initialData?.isActive ?? true,
    description: initialData?.description || '',
  };

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema),
    defaultValues,
  });

  const watchedBalance = watch('balance');

  const handleSubmitForm = async (data: AccountFormData) => {
    const balanceCents = data.balance ? Math.round(parseFloat(data.balance.replace(/\./g, '').replace(',', '.')) * 100) : 0;
    
    const accountData = {
      name: data.name,
      type: data.type as AccountType,
      balance: balanceCents,
      isActive: data.isActive,
      description: data.description,
    };

    try {
      if (isEditing && initialData) {
        await updateAccount.mutateAsync({ id: initialData.id, data: accountData });
      } else {
        await createAccount.mutateAsync(accountData);
      }
      onSuccess?.();
    } catch (error) {
      console.error('Erro ao salvar conta:', error);
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
        <CardTitle>{isEditing ? 'Editar Conta' : 'Nova Conta'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(handleSubmitForm)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Nome da Conta *"
              placeholder="Ex: Caixa Tesouraria, Banco do Brasil, PIX Grêmio"
              {...register('name')}
              error={errors.name?.message}
            />
            <Select
              label="Tipo *"
              options={ACCOUNT_TYPES.map(t => ({ value: t.value, label: t.label }))}
              placeholder="Selecione o tipo"
              {...register('type')}
              error={errors.type?.message}
            />
          </div>

          <Input
            label="Saldo Inicial (R$)"
            placeholder="0,00"
            value={watchedBalance}
            onChange={(e) => setValue('balance', formatAmount(e.target.value))}
            {...register('balance')}
            error={errors.balance?.message}
            inputMode="decimal"
          />

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="isActive"
                checked={watch('isActive')}
                onCheckedChange={checked => setValue('isActive', checked)}
              />
              <Label htmlFor="isActive" className="cursor-pointer text-sm text-text-secondary">
                Conta Ativa
              </Label>
            </div>
            <p className="text-xs text-text-muted">
              Contas inativas não aparecem nas listas de seleção
            </p>
          </div>

          <Textarea
            label="Descrição"
            placeholder="Observações sobre esta conta..."
            {...register('description')}
            rows={3}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
            )}
            <Button type="submit" variant="primary" disabled={isSubmitting || createAccount.isPending || updateAccount.isPending}>
              {isSubmitting || createAccount.isPending || updateAccount.isPending ? 'Salvando...' : isEditing ? 'Atualizar' : 'Cadastrar'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

const formatAmount = (value: string) => {
  const numeric = value.replace(/\D/g, '');
  if (!numeric) return '';
  const formatted = (parseInt(numeric) / 100).toFixed(2);
  return formatted.replace('.', ',');
};