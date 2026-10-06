import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { m } from '@orbs/i18n/client';
import { useRouter } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { ButtonLoading } from '@/components/ui/button-loading';
import { Form } from '@/components/ui/forms/form';
import { FormInput } from '@/components/ui/forms/form-input';
import { toasty } from '@/components/ui/sonner';
import { auth } from '@/services/auth/auth.client';
import { authResetPasswordForm } from '@orbs/server/client';
import type { AuthResetPasswordFormData } from '@orbs/server/client';

export function AuthFormResetPassword({ token }: { token: string }) {
  const router = useRouter();

  const form = useForm({
    resolver: standardSchemaResolver(authResetPasswordForm),
    defaultValues: { password: '', confirmPassword: '' },
  });

  async function handleSubmit(values: AuthResetPasswordFormData) {
    const result = await auth.resetPassword({ newPassword: values.password, token });

    if (result.error) {
      toasty(m.auth_reset_password_failed(), '🔴', { id: 'auth' });
      return;
    }

    toasty(m.auth_password_reset_success(), '✅', { id: 'auth' });
    await router.navigate({ to: '/auth/sign-in' });
  }

  return (
    <Form {...form}>
      <form className="grid gap-4" onSubmit={form.handleSubmit(handleSubmit)}>
        <fieldset className="contents" disabled={form.formState.isSubmitting}>
          <FormInput
            required
            showPasswordToggle
            label={m.forms_new_password()}
            name="password"
            placeholder={m.forms_new_password_placeholder()}
            type="password"
          />
          <FormInput
            required
            showPasswordToggle
            label={m.forms_confirm_password()}
            name="confirmPassword"
            placeholder={m.forms_confirm_password_placeholder()}
            type="password"
          />
          <ButtonLoading
            className="w-full"
            disabled={!form.formState.isValid}
            loading={form.formState.isSubmitting}
            type="submit"
          >
            {m.auth_reset_password_title()}
          </ButtonLoading>
        </fieldset>
      </form>
    </Form>
  );
}
