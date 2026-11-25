// ===== MODAL COMPONENT =====
import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cn } from '../../utils/cn';

interface ModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  showClose?: boolean;
}

const sizes = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-[90vw]',
};

function Modal({ open, onOpenChange, title, description, children, size = 'md', showClose = true }: ModalProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-fade-in data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <DialogPrimitive.Content className={cn(
          'fixed z-50 w-full bg-secondary border border-border rounded-2xl shadow-2xl animate-fade-in-up data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
          sizes[size]
        )}>
          {(title || showClose) && (
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div>
                {title && <h2 className="text-lg font-semibold text-text-primary">{title}</h2>}
                {description && <p className="text-sm text-text-secondary mt-1">{description}</p>}
              </div>
              {showClose && (
                <DialogPrimitive.Close className="p-1 rounded-lg hover:bg-tertiary transition-colors text-text-secondary hover:text-text-primary" aria-label="Fechar">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                </DialogPrimitive.Close>
              )}
            </div>
          )}
          <div className="p-6 max-h-[70vh] overflow-y-auto">
            {children}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export { Modal };