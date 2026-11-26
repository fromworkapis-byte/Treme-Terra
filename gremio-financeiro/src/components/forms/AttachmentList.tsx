// ===== LISTA DE COMPROVANTES ANEXADOS =====
import * as React from 'react';
import { FileText, Paperclip, Trash } from 'lucide-react';
import { Button } from '../ui';
import { useAttachments, useDeleteAttachment } from '../../hooks/useFinancialData';
import { formatFileSize } from '../../lib/attachment';
import type { Attachment, EntityType } from '../../types';
import { AttachmentViewer } from './AttachmentViewer';

interface AttachmentListProps {
  entityType: EntityType;
  entityId?: string;
  title?: string;
  autoView?: boolean;
}

export function AttachmentList({ entityType, entityId, title = 'Comprovantes anexados', autoView = false }: AttachmentListProps) {
  const { data: attachments, isLoading } = useAttachments(entityType, entityId);
  const removeAttachment = useDeleteAttachment();
  const [viewing, setViewing] = React.useState<Attachment | null>(null);
  const autoViewedRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    setViewing(null);
    autoViewedRef.current = null;
  }, [entityId]);

  React.useEffect(() => {
    if (!autoView || !attachments?.length || autoViewedRef.current === entityId) return;
    autoViewedRef.current = entityId || null;
    setViewing(attachments[0]);
  }, [autoView, attachments, entityId]);

  if (!entityId) return null;

  if (isLoading) {
    return <p className="text-sm text-text-muted">Carregando comprovantes...</p>;
  }

  if (!attachments?.length) {
    return <p className="text-sm text-text-muted">Nenhum comprovante anexado.</p>;
  }

  if (viewing) {
    return <AttachmentViewer attachment={viewing} onClose={() => setViewing(null)} />;
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-text-secondary">{title}</p>
      <ul className="divide-y divide-border/70 overflow-hidden rounded-lg border border-border/70">
        {attachments.map(attachment => (
          <li key={attachment.id} className="flex items-center justify-between gap-3 bg-primary/30 px-3 py-2">
            <button
              type="button"
              onClick={() => setViewing(attachment)}
              className="flex min-w-0 items-center gap-3 text-left text-sm text-text-primary transition-colors hover:text-info"
              aria-label={`Visualizar ${attachment.fileName}`}
            >
              {attachment.mimeType.startsWith('image/') ? (
                <Paperclip className="h-4 w-4 shrink-0 text-text-muted" />
              ) : (
                <FileText className="h-4 w-4 shrink-0 text-text-muted" />
              )}
              <span className="truncate">{attachment.fileName}</span>
              <span className="shrink-0 text-xs text-text-muted">{formatFileSize(attachment.fileSize)}</span>
            </button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => {
                if (window.confirm(`Remover o comprovante ${attachment.fileName}?`)) {
                  removeAttachment.mutate(attachment.id);
                }
              }}
              disabled={removeAttachment.isPending}
              aria-label={`Remover ${attachment.fileName}`}
            >
              <Trash className="h-4 w-4 text-danger" />
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
