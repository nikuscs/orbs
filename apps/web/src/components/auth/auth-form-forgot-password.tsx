import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { m } from '@orbs/i18n/client';
import { useRouter } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { ButtonLoading } from '@/components/ui/button-loading';
import { Form } from '@/components/ui/forms/form';
import { FormInput } from '@/components/ui/forms/form-input';
import { toasty } from '@/components/ui/sonner';
import { auth } from '@/services/auth/auth.client';
import { authForgotPasswordForm } from '@orbs/server/client';
import type { AuthForgotPasswordFormData } from '@orbs/server/client';

export function AuthFormForgotPassword() {
  const router = useRouter();

  const form = useForm({
    resolver: standardSchemaResolver(authForgotPasswordForm),
    defaultValues: { email: '' },
  });

  async function handleSubmit(values: AuthForgotPasswordFormData) {
    const result = await auth.requestPasswordReset({
      email: values.email,
      redirectTo: '/auth/reset-password',
    });

    if (result.error) {
      toasty(m.auth_reset_email_failed(), '🔴', { id: 'auth' });
      return;
    }

    toasty(m.auth_password_reset_email_sent(), '✅', { id: 'auth' });
    await router.navigate({ to: '/auth/sign-in' });
  }

  return (
    <Form {...form}>
      <form className="grid gap-4" onSubmit={form.handleSubmit(handleSubmit)}>
        <fieldset className="contents" disabled={form.formState.isSubmitting}>
          <FormInput
            required
            label={m.forms_email()}
            name="email"
            placeholder={m.forms_email_placeholder()}
            type="email"
          />
          <ButtonLoading
            className="w-full"
            disabled={!form.formState.isValid}
            loading={form.formState.isSubmitting}
            type="submit"
          >
            {m.auth_send_reset_link()}
          </ButtonLoading>
        </fieldset>
      </form>
    </Form>
  );
}
