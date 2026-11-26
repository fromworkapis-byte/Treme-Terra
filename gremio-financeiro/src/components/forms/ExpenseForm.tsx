// ===== EXPENSE FORM =====
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Button, Card, CardContent, CardDescription, CardHeader, CardTitle,
  DatePicker, Input, Select, Textarea,
} from '../ui';
import {
  useCategories, useAccounts, useCreateExpense, useUpdateExpense, useUploadAttachment,
} from '../../hooks/useFinancialData';
import { useAuth } from '../../context/AuthContext';
import { formatDateBR, getCurrentMonthYear, parseBRL } from '../../db';
import { analyzeExpenseReceipt, readReceipt } from '../../lib/receipt';
import type { Expense, Category, Account } from '../../types';
import { AttachmentList } from './AttachmentList';
import { ReceiptField } from './ReceiptField';

const expenseSchema = z.object({
  date: z.string().min(1, 'Data é obrigatória'),
  description: z.string().min(2, 'Descrição deve ter pelo menos 2 caracteres'),
  categoryId: z.string().min(1, 'Categoria é obrigatória'),
  amount: z.string().min(1, 'Valor é obrigatório').refine(value => parseBRL(value) > 0, 'Valor deve ser maior que zero'),
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

function formatAmount(value: string): string {
  const numeric = value.replace(/\D/g, '');
  if (!numeric) return '';
  return (Number(numeric) / 100).toFixed(2).replace('.', ',');
}

export function ExpenseForm({ initialData, categories, accounts, onSuccess, onCancel }: ExpenseFormProps) {
  const isEditing = !!initialData;
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const uploadAttachment = useUploadAttachment();
  const { user } = useAuth();

  const [receiptFile, setReceiptFile] = React.useState<File | null>(null);
  const [reading, setReading] = React.useState(false);
  const [ocrMessage, setOcrMessage] = React.useState('');
  const [saveError, setSaveError] = React.useState('');
  const [ocrFilled, setOcrFilled] = React.useState(false);

  const defaultValues: ExpenseFormData = {
    date: initialData ? formatDateBR(initialData.date) : formatDateBR(`${getCurrentMonthYear()}-01`),
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
    register, handleSubmit, watch, setValue, getValues,
    formState: { errors, isSubmitting },
  } = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues,
  });

  const watchedAmount = watch('amount');
  const amountField = register('amount');
  const expenseCategories = categories.filter(category => category.type === 'EXPENSE');
  const activeAccounts = accounts.filter(account => account.isActive);

  const handleReadReceipt = async () => {
    if (!receiptFile) return;
    if (!receiptFile.type.startsWith('image/')) {
      setOcrMessage('A leitura automática funciona com imagens. O PDF pode ser anexado normalmente.');
      return;
    }

    setReading(true);
    setOcrMessage('');
    try {
      const text = await readReceipt(receiptFile);
      const analysis = analyzeExpenseReceipt(text);

      if (analysis.amountCents) {
        setValue('amount', (analysis.amountCents / 100).toFixed(2).replace('.', ','), { shouldValidate: true });
      }
      if (analysis.date) {
        setValue('date', formatDateBR(analysis.date), { shouldValidate: true });
      }
      if (analysis.description && (!getValues('description') || ocrFilled)) {
        setValue('description', analysis.description, { shouldValidate: true });
      }
      if (analysis.beneficiary && (!getValues('beneficiary') || ocrFilled)) {
        setValue('beneficiary', analysis.beneficiary);
      }
      if (analysis.receiptNumber && (!getValues('receiptNumber') || ocrFilled)) {
        setValue('receiptNumber', analysis.receiptNumber);
      }

      setOcrFilled(true);
      setOcrMessage('Campos sugeridos pela leitura. Confira e ajuste antes de salvar.');
    } catch (error) {
      setOcrMessage(error instanceof Error ? error.message : 'Não foi possível ler o comprovante');
    } finally {
      setReading(false);
    }
  };

  const handleSubmitForm = async (data: ExpenseFormData) => {
    setSaveError('');
    const expenseData = {
      date: data.date.split('/').reverse().join('-'),
      description: data.description.trim(),
      categoryId: data.categoryId,
      amount: parseBRL(data.amount),
      paymentMethod: data.paymentMethod as Expense['paymentMethod'],
      accountId: data.accountId,
      createdById: user?.id || 'admin-001',
      beneficiary: data.beneficiary || undefined,
      receiptNumber: data.receiptNumber || undefined,
      notes: data.notes,
    };

    try {
      let expenseId = initialData?.id;

      if (isEditing && initialData) {
        await updateExpense.mutateAsync({ id: initialData.id, data: expenseData });
      } else {
        const created = await createExpense.mutateAsync(expenseData);
        expenseId = created.id;
      }

      if (receiptFile && expenseId) {
        await uploadAttachment.mutateAsync({
          file: receiptFile,
          entityType: 'EXPENSE',
          entityId: expenseId,
          uploadedById: user?.id,
        });
      }

      onSuccess?.();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Não foi possível salvar a despesa');
    }
  };

  const submitting = isSubmitting || createExpense.isPending || updateExpense.isPending || uploadAttachment.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditing ? 'Editar despesa' : 'Nova despesa'}</CardTitle>
        <CardDescription>
          Preencha os dados ou use a leitura do comprovante para sugerir descrição, valor e data.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(handleSubmitForm)} className="space-y-6">
          <section className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">Dados da despesa</p>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <DatePicker
                label="Data da despesa *"
                {...register('date')}
                error={errors.date?.message}
              />
              <Select
                label="Categoria *"
                options={expenseCategories.map(category => ({ value: category.id, label: category.name }))}
                placeholder="Selecione a categoria"
                {...register('categoryId')}
                error={errors.categoryId?.message}
              />
            </div>

            <Input
              label="Título / Descrição *"
              placeholder="Ex.: Material de limpeza para a companhia"
              {...register('description')}
              error={errors.description?.message}
            />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Input
                label="Valor (R$) *"
                placeholder="0,00"
                inputMode="decimal"
                {...amountField}
                value={watchedAmount}
                onChange={event => setValue('amount', formatAmount(event.target.value), { shouldValidate: true })}
                error={errors.amount?.message}
              />
              <Select
                label="Forma de pagamento *"
                options={[
                  { value: 'CASH', label: 'Dinheiro' },
                  { value: 'PIX', label: 'PIX' },
                  { value: 'TRANSFER', label: 'Transferência' },
                  { value: 'DEPOSIT', label: 'Depósito' },
                  { value: 'CARD_DEBIT', label: 'Cartão débito' },
                  { value: 'CARD_CREDIT', label: 'Cartão crédito' },
                  { value: 'BOLETO', label: 'Boleto' },
                  { value: 'OTHER', label: 'Outros' },
                ]}
                placeholder="Selecione"
                {...register('paymentMethod')}
                error={errors.paymentMethod?.message}
              />
              <Select
                label="Conta debitada *"
                options={activeAccounts.map(account => ({ value: account.id, label: account.name }))}
                placeholder="Selecione a conta"
                {...register('accountId')}
                error={errors.accountId?.message}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                label="Beneficiário / Fornecedor"
                placeholder="Nome de quem recebeu"
                {...register('beneficiary')}
              />
              <Input
                label="Nº do comprovante"
                placeholder="Número da nota ou recibo"
                {...register('receiptNumber')}
              />
            </div>

            <Textarea
              label="Observações"
              placeholder="Informações adicionais..."
              {...register('notes')}
              rows={3}
            />
          </section>

          <section className="space-y-4 border-t border-border/70 pt-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">Comprovante do gasto</p>
            <ReceiptField
              label="Imagem ou PDF do comprovante"
              file={receiptFile}
              onFileChange={file => {
                setReceiptFile(file);
                setOcrMessage('');
              }}
              onRead={handleReadReceipt}
              reading={reading}
              hint="A leitura preenche título, descrição, valor e data. Confira tudo antes de salvar."
            />
            {ocrMessage && <p className="text-sm text-info">{ocrMessage}</p>}
            {initialData && <AttachmentList entityType="EXPENSE" entityId={initialData.id} />}
          </section>

          {saveError && <p className="text-sm text-danger" role="alert">{saveError}</p>}

          <div className="flex flex-wrap justify-end gap-3 border-t border-border/70 pt-4">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
            )}
            <Button type="submit" variant="danger" disabled={submitting}>
              {submitting ? 'Salvando...' : isEditing ? 'Atualizar despesa' : 'Cadastrar despesa'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
