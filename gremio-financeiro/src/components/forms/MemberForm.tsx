// ===== MEMBER FORM =====
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input, Select, DatePicker, Card, CardContent, CardHeader, CardTitle, Checkbox, Label } from '../ui';
import { useCreateMember, useUpdateMember } from '../../hooks/useFinancialData';
import { formatDateBR } from '../../db';
import type { Member, MilitaryRank } from '../../types';
import { MILITARY_RANKS } from '../../types';

const memberSchema = z.object({
  rank: z.string().min(1, 'Post/Grad é obrigatório'),
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  ordem: z.number().int().positive('Ordem deve ser um número positivo'),
  phone: z.string().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']),
  joinedAt: z.string().min(1, 'Data de ingresso é obrigatória'),
});

type MemberFormData = z.infer<typeof memberSchema>;

interface MemberFormProps {
  initialData?: Member;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function MemberForm({ initialData, onSuccess, onCancel }: MemberFormProps) {
  const isEditing = !!initialData;
  const createMember = useCreateMember();
  const updateMember = useUpdateMember();

  const defaultValues: MemberFormData = {
    rank: initialData?.rank || 'SD',
    name: initialData?.name || '',
    ordem: initialData?.ordem || 1,
    phone: initialData?.phone || '',
    status: initialData?.status || 'ACTIVE',
    joinedAt: initialData ? formatDateBR(initialData.joinedAt) : formatDateBR(new Date().toISOString().split('T')[0]),
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

  const handleSubmitForm = async (data: MemberFormData) => {
    const memberData = {
      rank: data.rank as MilitaryRank,
      name: data.name,
      ordem: data.ordem,
      phone: data.phone || undefined,
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
      console.error('Erro ao salvar integrante:', error);
    }
  };

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
              options={MILITARY_RANKS.map(r => ({ value: r.value, label: `${r.value} - ${r.label}` }))}
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Telefone"
              placeholder="(11) 99999-9999"
              {...register('phone')}
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
              {watchedStatus === 'ACTIVE' ? 'Integrante ativo no efetivo' : 'Integrante inativo (não aparece em listas padrão)'}
            </p>
          </div>

          <p className="text-xs text-text-muted bg-tertiary/50 p-3 rounded-lg">
            <strong>Nota:</strong> O campo "Ordem" determina a antiguidade do integrante (menor número = mais antigo). 
            Este número não é exibido nas listagens, serve apenas para ordenação interna.
          </p>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
            )}
            <Button type="submit" variant="primary" disabled={isSubmitting || createMember.isPending || updateMember.isPending}>
              {isSubmitting || createMember.isPending || updateMember.isPending ? 'Salvando...' : isEditing ? 'Atualizar' : 'Cadastrar'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}