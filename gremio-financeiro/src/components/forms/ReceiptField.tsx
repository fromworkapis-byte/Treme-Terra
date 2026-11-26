// ===== CAMPO DE COMPROVANTE (IMAGEM OU PDF) =====
import * as React from 'react';
import { Camera, FileText, Loader2, X } from 'lucide-react';
import { Button } from '../ui';
import { MAX_ATTACHMENT_BYTES, formatFileSize, isImageFile } from '../../lib/attachment';

interface ReceiptFieldProps {
  label?: string;
  hint?: string;
  file: File | null;
  onFileChange: (file: File | null) => void;
  onRead?: () => void;
  reading?: boolean;
  error?: string;
  compact?: boolean;
}

export function ReceiptField({
  label = 'Comprovante',
  hint,
  file,
  onFileChange,
  onRead,
  reading = false,
  error,
  compact = false,
}: ReceiptFieldProps) {
  const [previewUrl, setPreviewUrl] = React.useState('');
  const [localError, setLocalError] = React.useState('');

  React.useEffect(() => {
    if (!file || !isImageFile(file)) {
      setPreviewUrl('');
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] || null;
    setLocalError('');

    if (selected && selected.size > MAX_ATTACHMENT_BYTES) {
      setLocalError(`Arquivo muito grande. Máximo ${formatFileSize(MAX_ATTACHMENT_BYTES)}.`);
      event.target.value = '';
      onFileChange(null);
      return;
    }

    onFileChange(selected);
  };

  const input = (
    <input
      type="file"
      accept="image/*,application/pdf"
      className="hidden"
      onChange={handleChange}
      aria-label={label}
    />
  );

  if (compact) {
    return (
      <div className="w-full">
        <label className="block text-sm font-medium text-text-secondary mb-1.5">{label}</label>
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-primary px-3 py-2 text-sm text-text-secondary transition-colors hover:border-border-hover hover:text-text-primary">
            {isImageFile(file) ? <Camera className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
            {file ? file.name : 'Anexar arquivo'}
            {input}
          </label>
          {file && (
            <Button type="button" variant="ghost" size="icon" onClick={() => onFileChange(null)} aria-label="Remover comprovante">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        {(localError || error) && <p className="mt-1.5 text-sm text-danger">{localError || error}</p>}
      </div>
    );
  }

  return (
    <div className="w-full space-y-3">
      <div>
        <label className="block text-sm font-medium text-text-secondary mb-1.5">{label}</label>
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-primary/40 px-4 py-6 text-center text-text-secondary transition-colors hover:border-border-hover hover:bg-tertiary/40">
          {isImageFile(file) ? <Camera className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
          <span className="text-sm">{file ? file.name : 'Selecionar imagem ou PDF (até 5 MB)'}</span>
          {input}
        </label>
      </div>

      {file && (
        <div className="flex flex-wrap items-start gap-4 rounded-lg border border-border/70 bg-tertiary/30 p-3">
          {previewUrl ? (
            <img src={previewUrl} alt="Prévia do comprovante" className="h-28 w-28 rounded-md border border-border object-cover" />
          ) : (
            <div className="flex h-28 w-28 items-center justify-center rounded-md border border-border bg-primary text-text-muted">
              <FileText className="h-7 w-7" />
            </div>
          )}
          <div className="min-w-0 flex-1 space-y-2">
            <p className="truncate text-sm text-text-primary">{file.name}</p>
            <p className="text-xs text-text-muted">{formatFileSize(file.size)}</p>
            <div className="flex flex-wrap gap-2">
              {onRead && isImageFile(file) && (
                <Button type="button" variant="outline" size="sm" onClick={onRead} disabled={reading}>
                  {reading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
                  {reading ? 'Lendo...' : 'Ler comprovante'}
                </Button>
              )}
              <Button type="button" variant="ghost" size="sm" onClick={() => onFileChange(null)}>
                <X className="mr-2 h-4 w-4" /> Remover
              </Button>
            </div>
          </div>
        </div>
      )}

      {hint && <p className="text-xs text-text-muted">{hint}</p>}
      {(localError || error) && <p className="text-sm text-danger">{localError || error}</p>}
    </div>
  );
}
