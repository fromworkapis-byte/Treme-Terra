// ===== CATEGORY FORM =====
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input, Select, Textarea, Card, CardContent, CardHeader, CardTitle, Checkbox, Label } from '../ui';
import { useCreateCategory, useUpdateCategory } from '../../hooks/useFinancialData';
import type { Category, CategoryType } from '../../types';

const categorySchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  type: z.enum(['INCOME', 'EXPENSE']),
  color: z.string().optional(),
  description: z.string().optional(),
  isActive: z.boolean(),
});

type CategoryFormData = z.infer<typeof categorySchema>;

interface CategoryFormProps {
  initialData?: Category;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const CATEGORY_COLORS = [
  '#3b82f6', '#10b981', '#8b5cf6', '#f97316', '#ec4899',
  '#22c55e', '#eab308', '#ef4444', '#06b6d4', '#64748b',
  '#a855f7', '#f43f5e', '#14b8a6', '#84cc16', '#f97316',
];

export function CategoryForm({ initialData, onSuccess, onCancel }: CategoryFormProps) {
  const isEditing = !!initialData;
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();

  const defaultValues: CategoryFormData = {
    name: initialData?.name || '',
    type: initialData?.type || 'INCOME',
    color: initialData?.color || CATEGORY_COLORS[0],
    description: initialData?.description || '',
    isActive: initialData?.isActive ?? true,
  };

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues,
  });

  const watchedColor = watch('color');

  const handleSubmitForm = async (data: CategoryFormData) => {
    const categoryData = {
      name: data.name,
      type: data.type,
      color: data.color || CATEGORY_COLORS[0],
      description: data.description,
      isActive: data.isActive,
    };

    try {
      if (isEditing && initialData) {
        await updateCategory.mutateAsync({ id: initialData.id, data: categoryData });
      } else {
        await createCategory.mutateAsync(categoryData);
      }
      onSuccess?.();
    } catch (error) {
      console.error('Erro ao salvar categoria:', error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditing ? 'Editar Categoria' : 'Nova Categoria'}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(handleSubmitForm)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Nome da Categoria *"
              placeholder="Ex: Mensalidades, Alimentação, Festas..."
              {...register('name')}
              error={errors.name?.message}
            />
            <Select
              label="Tipo *"
              options={[
                { value: 'INCOME', label: 'Entrada (Receita)' },
                { value: 'EXPENSE', label: 'Despesa (Gasto)' },
              ]}
              placeholder="Selecione o tipo"
              {...register('type')}
              error={errors.type?.message}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-text-secondary">Cor</Label>
            <div className="grid grid-cols-5 gap-2" role="radiogroup" aria-label="Selecionar cor">
              {CATEGORY_COLORS.map((color, index) => (
                <button
                  key={index}
                  type="button"
                  role="radio"
                  aria-checked={watchedColor === color}
                  onClick={() => setValue('color', color)}
                  className={`w-10 h-10 rounded-lg border-2 transition-all ${watchedColor === color ? 'border-primary scale-105' : 'border-transparent hover:border-border'}`}
                  style={{ backgroundColor: color }}
                  aria-label={`Cor ${index + 1}`}
                />
              ))}
            </div>
            <Input
              type="color"
              {...register('color')}
              className="w-12 h-12 rounded-lg border border-border cursor-pointer"
              aria-label="Cor personalizada"
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="isActive"
                checked={watch('isActive')}
                onCheckedChange={checked => setValue('isActive', checked === true)}
              />
              <Label htmlFor="isActive" className="cursor-pointer text-sm text-text-secondary">
                Categoria Ativa
              </Label>
            </div>
            <p className="text-xs text-text-muted">
              Categorias inativas não aparecem nas listas de seleção
            </p>
          </div>

          <Textarea
            label="Descrição"
            placeholder="Observações sobre esta categoria..."
            {...register('description')}
            rows={3}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
            )}
            <Button type="submit" variant="primary" disabled={isSubmitting || createCategory.isPending || updateCategory.isPending}>
              {isSubmitting || createCategory.isPending || updateCategory.isPending ? 'Salvando...' : isEditing ? 'Atualizar' : 'Cadastrar'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}