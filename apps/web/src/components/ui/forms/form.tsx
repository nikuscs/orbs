'use client';

import { Errors } from '@orbs/errors/universal';
import { deriveLabel, expandValidationError } from '@orbs/i18n/validation';
import { AnimatePresence } from 'motion/react';
import * as motion from 'motion/react-m';
import { Slot as SlotPrimitive } from 'radix-ui';
import * as React from 'react';
import { Controller, FormProvider, useFormContext, useFormState } from 'react-hook-form';
import { cn } from '@/lib/cn';
import Info from '~icons/lucide/info';
import { Label } from '../label';
import { Popover, PopoverContent, PopoverTrigger } from '../popover';
import type { Label as LabelPrimitive } from 'radix-ui';
import type { ReactNode } from 'react';
import type { ControllerProps, FieldPath, FieldValues } from 'react-hook-form';

const Form = FormProvider;

interface FormFieldContextValue<TFieldValues extends FieldValues = FieldValues, TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>> {
  name: TName
}

const FormFieldContext = React.createContext<FormFieldContextValue | null>(null);

function FormField<TFieldValues extends FieldValues = FieldValues, TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>>({
  ...props
}: ControllerProps<TFieldValues, TName>) {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  );
}

const useFormField = () => {
  const fieldContext = React.useContext(FormFieldContext);
  const itemContext = React.useContext(FormItemContext);

  if (!fieldContext || !itemContext) {
    throw new Errors.INTERNAL_ERROR({ internal: 'useFormField requires FormField and FormItem providers' });
  }

  const { getFieldState } = useFormContext();
  const formState = useFormState({ name: fieldContext.name });
  const fieldState = getFieldState(fieldContext.name, formState);

  const { id } = itemContext;

  return {
    id,
    name: fieldContext.name,
    formItemId: id ? `${id}-form-item` : undefined,
    formDescriptionId: id ? `${id}-form-item-description` : undefined,
    formMessageId: id ? `${id}-form-item-message` : undefined,
    ...fieldState,
  };
};

interface FormItemContextValue {
  id: string
}

const FormItemContext = React.createContext<FormItemContextValue | null>(null);

function FormItem({ className, ...props }: React.ComponentProps<'div'>) {
  const id = React.useId();

  return (
    <FormItemContext.Provider value={{ id }}>
      <div className={cn('grid min-w-0 gap-2', className)} data-slot="form-item" {...props} />
    </FormItemContext.Provider>
  );
}

interface FormLabelProps extends React.ComponentProps<typeof LabelPrimitive.Root> {
  required?: boolean
  showRequired?: boolean
  showError?: boolean
  disabled?: boolean
  tooltip?: ReactNode
}

function FormLabel({ className, htmlFor, required, showRequired, showError = true, disabled, tooltip, children, ...props }: FormLabelProps) {
  const { error, formItemId } = useFormField();
  const hasError = showError && Boolean(error);

  return (
    <Label
      className={cn('data-[error=true]:text-destructive', className)}
      data-error={hasError}
      data-slot="form-label"
      disabled={disabled}
      htmlFor={htmlFor ?? formItemId}
      required={required}
      showRequired={showRequired}
      {...props}
    >
      {children}
      {tooltip ? (
        <Popover>
          <PopoverTrigger asChild>
            <button
              className="inline-flex cursor-pointer text-muted-foreground/60 transition-colors hover:text-muted-foreground"
              tabIndex={-1}
              type="button"
              onClick={(e) => e.stopPropagation()}
            >
              <Info className="size-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-fit max-w-64 p-3 text-xs">{tooltip}</PopoverContent>
        </Popover>
      ) : null}
    </Label>
  );
}

function FormControl({ ...props }: React.ComponentProps<typeof SlotPrimitive.Slot>) {
  const { error, formItemId, formDescriptionId, formMessageId } = useFormField();

  return (
    <SlotPrimitive.Slot
      aria-describedby={!error ? formDescriptionId : `${formDescriptionId} ${formMessageId}`}
      aria-invalid={Boolean(error)}
      data-slot="form-control"
      id={formItemId}
      {...props}
    />
  );
}

function FormDescription({ className, ...props }: React.ComponentProps<'p'>) {
  const { formDescriptionId } = useFormField();

  return <p className={cn('text-sm text-muted-foreground', className)} data-slot="form-description" id={formDescriptionId} {...props} />;
}

function FormMessage({ className, ...props }: React.ComponentProps<'p'>) {
  const { error, formMessageId } = useFormField();
  const body = error ? (error.message ?? '') : props.children;

  if (!body) {
    return null;
  }

  return (
    <p className={cn('text-sm text-destructive', className)} data-slot="form-message" id={formMessageId} {...props}>
      {body}
    </p>
  );
}

interface FormErrorsProps {
  error?: ReactNode
  className?: string
}

function FormErrors({ error, className }: FormErrorsProps) {
  if (!error) {
    return null;
  }
  return <p className={cn('text-xs text-destructive', className)} role="alert">{error}</p>;
}

interface FormHintProps {
  hint?: ReactNode
  className?: string
}

function FormHint({ hint, className }: FormHintProps) {
  if (!hint) {
    return null;
  }
  return <p className={cn('text-xs text-muted-foreground', className)}>{hint}</p>;
}

interface FormErrorsAndHintProps {
  hint?: ReactNode
  showErrors?: boolean
  className?: string
  context?: Record<string, string>
}

function FormErrorsAndHint({ hint, showErrors = true, className, context }: FormErrorsAndHintProps) {
  const { error, name } = useFormField();
  const errorMessage = error?.message ? expandValidationError(error.message, { field: deriveLabel(name), ...context }) : undefined;
  const hasErrors = errorMessage !== '' && errorMessage !== undefined;
  const hasHint = hint !== '' && hint !== undefined;
  const shouldShowError = hasErrors && showErrors;
  const shouldShowHint = !shouldShowError && hasHint;

  return (
    <AnimatePresence initial={false} mode="wait">
      {shouldShowError ? (
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className={className}
          exit={{ opacity: 0, y: -10 }}
          initial={{ opacity: 0, y: 10 }}
          key="error"
          transition={{ duration: 0.2 }}
        >
          <FormErrors error={errorMessage} />
        </motion.div>
      ) : null}

      {shouldShowHint ? (
        <motion.div
          animate={{ opacity: 1, y: 0 }}
          className={className}
          exit={{ opacity: 0, y: -10 }}
          initial={{ opacity: 0, y: 10 }}
          key="hint"
          transition={{ duration: 0.2 }}
        >
          <FormHint hint={hint} />
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

interface FormFieldSetProps extends React.PropsWithChildren, React.FieldsetHTMLAttributes<HTMLFieldSetElement> {}

function FormFieldSet({ children, ...rest }: FormFieldSetProps) {
  return (
    <fieldset {...rest} className={cn('grid w-full gap-y-4', rest.className)}>
      {children}
    </fieldset>
  );
}

export { useFormField, Form, FormItem, FormLabel, FormControl, FormDescription, FormMessage, FormField, FormFieldSet, FormErrors, FormHint, FormErrorsAndHint };
export type { FormFieldSetProps };
