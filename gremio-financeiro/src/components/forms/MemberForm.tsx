// ===== MEMBER FORM =====
import * as React from 'react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input, Select, DatePicker, Card, CardContent, CardHeader, CardTitle, Checkbox, Label } from '../ui';
import { useCreateMember, useUpdateMember } from '../../hooks/useFinancialData';
import { formatDateBR } from '../../db';
import type { Member, MilitaryRank } from '../../types';
import { ALLOWED_MILITARY_RANKS, isAllowedMilitaryRank, militaryRankLabel } from '../../types';

const memberSchema = z.object({
  rank: z.string().min(1, 'Post/Grad é obrigatório'),
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  ordem: z.number().int().positive('Ordem deve ser um número positivo'),
  phone: z
    .string()
    .optional()
    .refine(value => !value || value.replace(/\D/g, '').length >= 10, 'Use DDD + número (10 ou 11 dígitos)'),
  status: z.enum(['ACTIVE', 'INACTIVE']),
  joinedAt: z.string().min(10, 'Data de ingresso é obrigatória'),
});

type MemberFormData = z.infer<typeof memberSchema>;

interface MemberFormProps {
  initialData?: Member;
  onSuccess?: () => void;
  onCancel?: () => void;
}

function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits ? `(${digits}` : '';
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function MemberForm({ initialData, onSuccess, onCancel }: MemberFormProps) {
  const isEditing = !!initialData;
  const createMember = useCreateMember();
  const updateMember = useUpdateMember();
  const [saveError, setSaveError] = useState('');

  const defaultValues: MemberFormData = {
    rank: initialData?.rank || 'SD_RC',
    name: initialData?.name || '',
    ordem: initialData?.ordem || 1,
    phone: initialData?.phone || '',
    status: initialData?.status || 'ACTIVE',
    joinedAt: formatDateBR(initialData?.joinedAt || new Date().toISOString().slice(0, 10)),
  };

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<MemberFormData>({
    resolver: zodResolver(memberSchema),
    defaultValues,
  });

  const watchedStatus = watch('status');
  const phoneField = register('phone');

  const rankOptions = ALLOWED_MILITARY_RANKS.map(rank => ({
    value: rank.value,
    label: rank.label,
  }));
  if (initialData && !isAllowedMilitaryRank(initialData.rank)) {
    rankOptions.unshift({
      value: initialData.rank,
      label: `Manter cadastro antigo: ${militaryRankLabel(initialData.rank)}`,
    });
  }

  const handleSubmitForm = async (data: MemberFormData) => {
    setSaveError('');
    if (!isAllowedMilitaryRank(data.rank) && data.rank !== initialData?.rank) {
      setSaveError('Escolha um dos postos permitidos: Soldado Recruta, Soldado Engajado ou Cabo.');
      return;
    }
    const memberData = {
      rank: data.rank as MilitaryRank,
      name: data.name.trim(),
      ordem: data.ordem,
      phone: data.phone ? maskPhone(data.phone) : undefined,
      status: data.status,
      joinedAt: data.joinedAt.split('/').reverse().join('-'),
    };

    try {
      if (isEditing && initialData) {
        await updateMember.mutateAsync({ id: initialData.id, data: memberData });
      } else {
        await createMember.mutateAsync(memberData);
      }
      onSuccess?.();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Não foi possível salvar. Tente novamente.');
    }
  };

  const submitting = isSubmitting || createMember.isPending || updateMember.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditing ? 'Editar Integrante' : 'Novo Integrante'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(handleSubmitForm)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select
              label="Post/Grad *"
              options={rankOptions}
              placeholder="Selecione o posto/graduação"
              {...register('rank')}
              error={errors.rank?.message}
            />
            <Input
              label="Nome Completo *"
              placeholder="Nome completo do integrante"
              {...register('name')}
              error={errors.name?.message}
            />
            <Input
              label="Ordem (Antiguidade) *"
              type="number"
              placeholder="1"
              {...register('ordem', { valueAsNumber: true })}
              error={errors.ordem?.message}
            />
          </div>
          <p className="-mt-2 text-xs text-text-muted">
            Postos permitidos: Soldado Recruta, Soldado Engajado e Cabo. Cadastros antigos com outro posto podem ser mantidos ou convertidos.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="WhatsApp"
              placeholder="(11) 99999-9999"
              inputMode="tel"
              hint="Necessário para receber o QR Code da mensalidade"
              {...phoneField}
              onChange={event => {
                event.target.value = maskPhone(event.target.value);
                phoneField.onChange(event);
              }}
              error={errors.phone?.message}
            />
            <DatePicker
              label="Data de Ingresso *"
              {...register('joinedAt')}
              error={errors.joinedAt?.message}
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="status"
                checked={watchedStatus === 'ACTIVE'}
                onCheckedChange={checked => setValue('status', checked ? 'ACTIVE' : 'INACTIVE')}
              />
              <Label htmlFor="status" className="cursor-pointer text-sm text-text-secondary">
                {watchedStatus === 'ACTIVE' ? 'Ativo' : 'Inativo'}
              </Label>
            </div>
            <p className="text-xs text-text-muted">
              {watchedStatus === 'ACTIVE' ? 'Entra na cobrança mensal' : 'Não entra na cobrança mensal'}
            </p>
          </div>

          {saveError && <p className="text-sm text-danger" role="alert">{saveError}</p>}

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
            )}
            <Button type="submit" variant="primary" disabled={submitting}>
              {submitting ? 'Salvando...' : isEditing ? 'Atualizar' : 'Cadastrar'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
