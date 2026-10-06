import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { cn } from '@/lib/cn';
import Eye from '~icons/lucide/eye';
import EyeOff from '~icons/lucide/eye-off';
import { Input } from '../input';
import { FormErrorsAndHint, FormField, FormItem, FormLabel, useFormField } from './form';
import type { ReactNode } from 'react';
import type * as ReactHookFormTypes from 'react-hook-form';

interface FormInputProps<
  TFieldValues extends ReactHookFormTypes.FieldValues = ReactHookFormTypes.FieldValues,
  TName extends ReactHookFormTypes.FieldPath<TFieldValues> = ReactHookFormTypes.FieldPath<TFieldValues>,
> extends Omit<
  React.ComponentProps<'input'>,
  'name'
> {
  name: TName
  control?: ReactHookFormTypes.Control<TFieldValues>
  label?: ReactNode
  tooltip?: ReactNode
  prefixIcon?: ReactNode
  suffixIcon?: ReactNode
  showPasswordToggle?: boolean
  hint?: ReactNode
  showErrors?: boolean
  context?: Record<string, string>
}

interface FormInputInnerProps<TFieldValues extends ReactHookFormTypes.FieldValues, TName extends ReactHookFormTypes.FieldPath<TFieldValues>> extends Omit<React.ComponentProps<'input'>, 'name' | 'id'> {
  field: ReactHookFormTypes.ControllerRenderProps<TFieldValues, TName>
  label?: ReactNode
  tooltip?: ReactNode
  prefixIcon?: ReactNode
  suffixIcon?: ReactNode
  showPasswordToggle?: boolean
  hint?: ReactNode
  showErrors?: boolean
  context?: Record<string, string>
}

function FormInputInner<TFieldValues extends ReactHookFormTypes.FieldValues, TName extends ReactHookFormTypes.FieldPath<TFieldValues>>({
  field,
  label,
  tooltip,
  prefixIcon,
  suffixIcon,
  showPasswordToggle = true,
  hint,
  showErrors = true,
  context,
  required,
  className,
  type,
  autoComplete = 'off',
  onBlur,
  ...props
}: FormInputInnerProps<TFieldValues, TName>) {
  const { formItemId, error } = useFormField();
  const [showingPassword, setShowingPassword] = useState(false);
  const isPassword = type === 'password';
  const inputType = isPassword && showingPassword ? 'text' : type;
  const hasPrefix = Boolean(prefixIcon);
  const hasSuffix = Boolean(suffixIcon) || (isPassword && showPasswordToggle);

  return (
    <>
      {label ? (
        <FormLabel required={required} tooltip={tooltip}>
          {label}
        </FormLabel>
      ) : null}

      <div aria-invalid={Boolean(error)} className="group relative">
        {prefixIcon ? <div className="absolute inset-y-0 left-3 flex-center group-aria-invalid:text-destructive [&>svg]:text-inherit">{prefixIcon}</div> : null}

        <Input
          {...field}
          {...props}
          aria-invalid={Boolean(error)}
          autoComplete={autoComplete}
          className={cn(
            hasPrefix && 'pl-9',
            hasSuffix && 'pr-9',
            inputType === 'number' &&
              '[-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
            className,
          )}
          data-1p-ignore={autoComplete === 'off'}
          id={formItemId}
          required={required}
          type={inputType}
          onBlur={(event) => {
            field.onBlur();
            onBlur?.(event);
          }}
        />

        {suffixIcon && !isPassword ? (
          <div className="absolute inset-y-0 right-3 flex-center group-aria-invalid:text-destructive [&>svg]:text-inherit">{suffixIcon}</div>
        ) : null}

        {isPassword && showPasswordToggle ? (
          <div className="absolute inset-y-0 right-3 flex-center">
            <button
              aria-label={showingPassword ? 'Hide password' : 'Show password'}
              className="hit-area-3 size-4 cursor-pointer text-muted-foreground/70 group-aria-invalid:text-destructive disabled:opacity-30"
              disabled={!field.value}
              tabIndex={-1}
              type="button"
              onClick={() => setShowingPassword((prev) => !prev)}
            >
              {showingPassword ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
            </button>
          </div>
        ) : null}
      </div>

      <FormErrorsAndHint context={context} hint={hint} showErrors={showErrors} />
    </>
  );
}

function FormInput<
  TFieldValues extends ReactHookFormTypes.FieldValues = ReactHookFormTypes.FieldValues,
  TName extends ReactHookFormTypes.FieldPath<TFieldValues> = ReactHookFormTypes.FieldPath<TFieldValues>,
>({
  name,
  control: controlProp,
  ...rest
}: FormInputProps<TFieldValues, TName>) {
  const formContext = useFormContext<TFieldValues>();
  const control = controlProp ?? formContext.control;

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormInputInner {...rest} field={field} />
        </FormItem>
      )}
    />
  );
}

export { FormInput };
export type { FormInputProps };
