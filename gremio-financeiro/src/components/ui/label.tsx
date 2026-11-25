// ===== LABEL COMPONENT =====
import * as React from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';
import { cn } from '../../utils/cn';

const Label = React.forwardRef<HTMLLabelElement, React.ComponentPropsWithoutRef<'label'>>(
  ({ className, ...props }, ref) => (
    <LabelPrimitive.Root ref={ref} className={cn('text-sm font-medium text-text-secondary', className)} {...props} />
  )
);
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };