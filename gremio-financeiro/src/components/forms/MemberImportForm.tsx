// ===== IMPORTAÇÃO EM MASSA DE INTEGRANTES =====
import * as React from 'react';
import { AlertCircle, Loader2, Upload } from 'lucide-react';
import { Button, Textarea } from '../ui';
import { useCreateMembersBulk } from '../../hooks/useFinancialData';
import { parseMemberList } from '../../lib/memberImport';
import { militaryRankLabel } from '../../types';

interface MemberImportFormProps {
  onSuccess?: (count: number) => void;
  onCancel: () => void;
}

export function MemberImportForm({ onSuccess, onCancel }: MemberImportFormProps) {
  const [text, setText] = React.useState('');
  const [error, setError] = React.useState('');
  const bulkCreate = useCreateMembersBulk();
  const parsed = React.useMemo(() => parseMemberList(text), [text]);

  const counts = React.useMemo(() => parsed.members.reduce<Record<string, number>>((total, member) => {
    total[member.rank] = (total[member.rank] || 0) + 1;
    return total;
  }, {}), [parsed.members]);

  const handleConfirm = async () => {
    if (parsed.members.length === 0) {
      setError('Cole uma lista com os grupos e os integrantes no formato "Nome - telefone".');
      return;
    }
    setError('');
    try {
      const count = await bulkCreate.mutateAsync(parsed.members);
      onSuccess?.(count);
      onCancel();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível cadastrar os integrantes.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border/70 bg-tertiary/30 p-3 text-sm text-text-secondary">
        <p>Cole a lista com os títulos <strong>Cabos</strong> e <strong>Soldados</strong>, seguida das linhas no formato <code>Nome - telefone</code>.</p>
        <p className="mt-1 text-xs text-text-muted">Os integrantes entram como ativos, com data de ingresso de hoje e antiguidade na ordem da lista. Nada é removido ou substituído.</p>
      </div>

      <Textarea
        label="Lista para importar"
        value={text}
        onChange={event => { setText(event.target.value); setError(''); }}
        rows={12}
        placeholder={'Cabos -\n1. Nome - 53999999999\n\nSoldados -\n1. Nome - 53888888888'}
        hint="Cada linha deve ter nome e telefone. Texto após o telefone é ignorado."
      />

      {text.trim() && (
        <div className="space-y-2 rounded-lg border border-border/70 bg-primary/30 p-3">
          <div className="flex flex-wrap gap-3 text-sm">
            {Object.entries(counts).map(([rank, count]) => (
              <span key={rank} className="text-text-secondary">
                <strong className="text-text-primary">{count}</strong> {militaryRankLabel(rank)}
              </span>
            ))}
            <span className="text-text-primary"><strong>{parsed.members.length}</strong> no total</span>
          </div>
          <ul className="max-h-44 space-y-1 overflow-y-auto text-xs text-text-muted">
            {parsed.members.slice(0, 25).map((member, index) => (
              <li key={`${member.name}-${index}`}>
                {index + 1}. {militaryRankLabel(member.rank)} — {member.name} — {member.phone}
              </li>
            ))}
            {parsed.members.length > 25 && <li>... e mais {parsed.members.length - 25}.</li>}
          </ul>
        </div>
      )}

      {parsed.errors.length > 0 && (
        <div className="space-y-1 rounded-lg border border-warning/30 bg-warning/10 p-3 text-xs text-warning">
          <p className="flex items-center gap-2 font-medium"><AlertCircle className="h-4 w-4" /> Linhas ignoradas:</p>
          {parsed.errors.slice(0, 8).map((message, index) => <p key={index}>• {message}</p>)}
          {parsed.errors.length > 8 && <p>• e mais {parsed.errors.length - 8}.</p>}
        </div>
      )}

      {error && <p className="text-sm text-danger" role="alert">{error}</p>}

      <div className="flex flex-wrap justify-end gap-3 border-t border-border/70 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button
          type="button"
          variant="success"
          onClick={handleConfirm}
          disabled={bulkCreate.isPending || parsed.members.length === 0}
        >
          {bulkCreate.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
          {bulkCreate.isPending ? 'Cadastrando...' : `Cadastrar ${parsed.members.length} integrante(s)`}
        </Button>
      </div>
    </div>
  );
}
