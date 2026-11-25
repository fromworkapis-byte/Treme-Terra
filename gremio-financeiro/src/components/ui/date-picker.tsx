// ===== DATE PICKER COMPONENT =====
import * as React from 'react';
import { cn } from '../../utils/cn';
import { formatDateBR, parseDateBR, getCurrentMonthYear } from '../../db';

interface DatePickerProps {
  label?: string;
  error?: string;
  value?: string;
  onChange?: (value: string | React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  id?: string;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  className?: string;
  name?: string;
}

const DatePicker = React.forwardRef<HTMLInputElement, DatePickerProps>(
  ({ className, label, error, value, onChange, onBlur, id, disabled, required, placeholder, name, ...props }, forwardedRef) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    const errorId = `${inputId}-error`;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement> | string) => {
      const raw = typeof e === 'string' ? e.replace(/\D/g, '') : e.target.value.replace(/\D/g, '');
      let formatted = '';
      if (raw.length >= 2) formatted = raw.slice(0, 2);
      if (raw.length >= 4) formatted += '/' + raw.slice(2, 4);
      if (raw.length >= 8) formatted += '/' + raw.slice(4, 8);
      
      if (typeof e !== 'string') {
        e.target.value = formatted;
      }
      
      if (onChange && raw.length === 8) {
        onChange(parseDateBR(formatted));
      }
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      const raw = e.target.value.replace(/\D/g, '');
      if (raw.length === 8 && onChange) {
        onChange(parseDateBR(e.target.value));
      }
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
          placeholder={placeholder || "DD/MM/AAAA"}
          value={value ? formatDateBR(value) : ''}
          onChange={handleChange}
          onBlur={handleBlur}
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