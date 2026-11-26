// ===== VISUALIZADOR DE COMPROVANTE (IMAGEM OU PDF) =====
import { ArrowLeft, Download, FileText } from 'lucide-react';
import { Button } from '../ui';
import { formatFileSize } from '../../lib/attachment';
import type { Attachment } from '../../types';

interface AttachmentViewerProps {
  attachment: Attachment;
  onClose: () => void;
}

export function AttachmentViewer({ attachment, onClose }: AttachmentViewerProps) {
  const isImage = attachment.mimeType.startsWith('image/') || attachment.filePath.startsWith('data:image/');
  const isPdf = attachment.mimeType === 'application/pdf'
    || attachment.filePath.startsWith('data:application/pdf')
    || attachment.fileName.toLowerCase().endsWith('.pdf');

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="min-w-0 truncate text-sm font-medium text-text-primary">{attachment.fileName}</p>
        <Button type="button" variant="ghost" size="sm" onClick={onClose}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar aos comprovantes
        </Button>
      </div>
      {isImage ? (
        <img
          src={attachment.filePath}
          alt={`Comprovante ${attachment.fileName}`}
          className="mx-auto max-h-[60vh] w-auto max-w-full rounded-lg border border-border bg-white object-contain"
        />
      ) : isPdf ? (
        <iframe
          src={attachment.filePath}
          title={`Comprovante ${attachment.fileName}`}
          className="h-[60vh] w-full rounded-lg border border-border bg-white"
        />
      ) : (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-border bg-primary/40 p-8 text-text-muted">
          <FileText className="h-8 w-8" />
          <p className="text-sm">Não é possível visualizar este arquivo. Baixe-o para abrir.</p>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-3">
        <p className="text-xs text-text-muted">{formatFileSize(attachment.fileSize)} · Comprovante registrado no grêmio</p>
        <a
          href={attachment.filePath}
          download={attachment.fileName}
          className="inline-flex items-center rounded-lg border border-border px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-tertiary"
        >
          <Download className="mr-2 h-4 w-4" /> Baixar comprovante
        </a>
      </div>
    </div>
  );
}
