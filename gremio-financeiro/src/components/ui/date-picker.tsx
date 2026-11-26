// ===== DATE PICKER COMPONENT =====
import * as React from 'react';
import { cn } from '../../utils/cn';
import { formatDateBR } from '../../db';

interface DatePickerProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  label?: string;
  error?: string;
  value?: string;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

function maskDate(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function displayDate(value?: string): string {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return formatDateBR(value);
  return maskDate(value);
}

const DatePicker = React.forwardRef<HTMLInputElement, DatePickerProps>(
  ({ className, label, error, value, onChange, id, disabled, required, placeholder, name, ...props }, forwardedRef) => {
    const inputId = id || name || label?.toLowerCase().replace(/\s+/g, '-') || 'date-picker';
    const errorId = `${inputId}-error`;

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      event.target.value = maskDate(event.target.value);
      onChange?.(event);
    };

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-text-secondary mb-1.5">
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={forwardedRef}
          name={name}
          type="text"
          inputMode="numeric"
          placeholder={placeholder || 'DD/MM/AAAA'}
          value={value === undefined ? undefined : displayDate(value)}
          onChange={handleChange}
          disabled={disabled}
          required={required}
          className={cn(
            'w-full px-4 py-2.5 bg-primary border rounded-lg text-text-primary placeholder:text-text-muted',
            'focus:outline-none focus:ring-2 focus:ring-info focus:border-transparent transition-all',
            error ? 'border-danger focus:ring-danger' : 'border-border',
            className
          )}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? errorId : undefined}
          maxLength={10}
          {...props}
        />
        {error && (
          <p id={errorId} className="mt-1.5 text-sm text-danger" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);
DatePicker.displayName = 'DatePicker';

export { DatePicker };
