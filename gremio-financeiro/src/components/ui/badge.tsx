// ===== BADGE COMPONENT =====
import * as React from 'react';
import { cn } from '../../utils/cn';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'danger' | 'warning' | 'info' | 'gray';
}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    const variants = {
      default: 'bg-tertiary text-text-secondary',
      success: 'bg-success/10 text-success',
      danger: 'bg-danger/10 text-danger',
      warning: 'bg-warning/10 text-warning',
      info: 'bg-info/10 text-info',
      gray: 'bg-tertiary text-text-muted',
    };

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
          variants[variant],
          className
        )}
        {...props}
      />
    );
  }
);
Badge.displayName = 'Badge';

export { Badge };