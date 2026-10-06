import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { m } from '@orbs/i18n/client';
import { useQueryClient } from '@tanstack/react-query';
import { Link, useRouter } from '@tanstack/react-router';
import { AnimatePresence, m as motion } from 'motion/react';
import { useForm, useWatch } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { ButtonLoading } from '@/components/ui/button-loading';
import { Form } from '@/components/ui/forms/form';
import { FormInput } from '@/components/ui/forms/form-input';
import { SeparatorWithLabel } from '@/components/ui/separator';
import { toasty } from '@/components/ui/sonner';
import { useCallbackUrl } from '@/hooks/use-callback-url';
import { auth } from '@/services/auth/auth.client';
import { rpc } from '@/services/rpc/rpc.client';
import { authEmailField, authSignInForm } from '@orbs/server/client';
import LogosGoogleIcon from '~icons/logos/google-icon';
import type { AuthSignInFormData } from '@orbs/server/client';

export function AuthFormLogin() {
  const callbackUrl = useCallbackUrl();
  const queryClient = useQueryClient();
  const router = useRouter();

  const form = useForm({
    resolver: standardSchemaResolver(authSignInForm),
    defaultValues: { email: '', password: '' },
  });

  const email = useWatch({ control: form.control, name: 'email' });
  const isEmailValid = authEmailField.safeParse(email).success;

  async function handleSocialSignIn() {
    const result = await auth.signIn.social({
      provider: 'google',
      callbackURL: callbackUrl,
      errorCallbackURL: '/auth/sign-in',
    });

    if (result.error) {
      toasty(m.auth_sign_in_with_provider_failed({ provider: 'Google' }), '🔴', { id: 'auth' });
    }
  }

  async function handleSubmit(values: AuthSignInFormData) {
    const result = await auth.signIn.email({
      email: values.email,
      password: values.password,
      callbackURL: callbackUrl,
    });

    if (result.error) {
      if (result.error.status === 403) {
        toasty(m.auth_verify_email_first(), '📧', { id: 'auth' });
        return;
      }

      toasty(m.auth_sign_in_failed(), '🔴', { id: 'auth' });

      return;
    }

    toasty(m.auth_welcome_back(), '✅', { id: 'auth' });
    await queryClient.invalidateQueries({ queryKey: rpc.auth.session.queryKey() });
    await router.invalidate({ filter: (route) => route.id === '__root__' });
    await router.navigate({ href: callbackUrl });
  }

  return (
    <div className="grid gap-6">
      <Button
        className="w-full"
        type="button"
        variant="outline"
        onClick={handleSocialSignIn}
      >
        <LogosGoogleIcon className="size-4" />
        {m.auth_continue_with_google()}
      </Button>
      <SeparatorWithLabel label={m.auth_or_continue_with_email()} />
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
            <AnimatePresence>
              {isEmailValid ? (
                <motion.div
                  animate={{ height: 'auto', opacity: 1 }}
                  className="-m-1 flex flex-col gap-4 overflow-hidden p-1"
                  exit={{ height: 0, opacity: 0 }}
                  initial={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <FormInput
                    showPasswordToggle
                    hint={<Link className="text-xs underline underline-offset-4 hover:text-primary" to="/auth/forgot-password">{m.auth_forgot_password_link()}</Link>}
                    label={m.forms_password()}
                    name="password"
                    placeholder={m.forms_password_placeholder()}
                    type="password"
                  />
                </motion.div>
              ) : null}
            </AnimatePresence>
            <ButtonLoading
              className="w-full"
              disabled={!form.formState.isValid}
              loading={form.formState.isSubmitting}
              type="submit"
            >
              {m.auth_sign_in()}
            </ButtonLoading>
          </fieldset>
        </form>
      </Form>
    </div>
  );
}
