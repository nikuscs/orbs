import { standardSchemaResolver } from '@hookform/resolvers/standard-schema';
import { m } from '@orbs/i18n/client';
import { resolveIntendedUrl } from '@orbs/tanstack-helpers/universal';
import { Link, useRouter } from '@tanstack/react-router';
import { AnimatePresence, m as motion } from 'motion/react';
import { useForm, useWatch } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { ButtonLoading } from '@/components/ui/button-loading';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/forms/form';
import { FormInput } from '@/components/ui/forms/form-input';
import { SeparatorWithLabel } from '@/components/ui/separator';
import { toasty } from '@/components/ui/sonner';
import { useCallbackUrl } from '@/hooks/use-callback-url';
import { auth } from '@/services/auth/auth.client';
import { authEmailField, authSignUpForm } from '@orbs/server/client';
import LogosGoogleIcon from '~icons/logos/google-icon';
import type { AuthSignUpFormData } from '@orbs/server/client';

interface AuthFormSignupProps {
  email?: string;
  intended?: string;
}

export function AuthFormSignup({ email = '', intended }: AuthFormSignupProps) {
  const router = useRouter();
  const fallbackUrl = useCallbackUrl();
  const callbackUrl = resolveIntendedUrl({ intended, fallback: fallbackUrl });

  const form = useForm({
    resolver: standardSchemaResolver(authSignUpForm),
    defaultValues: { name: '', email, password: '', acceptTerms: false },
  });

  const emailValue = useWatch({ control: form.control, name: 'email' });
  const isEmailValid = authEmailField.safeParse(emailValue).success;

  async function handleSocialSignIn() {
    const result = await auth.signIn.social({
      provider: 'google',
      callbackURL: callbackUrl,
      errorCallbackURL: '/auth/sign-up',
    });

    if (result.error) {
      toasty(m.auth_sign_up_with_provider_failed({ provider: 'Google' }), '🔴', { id: 'auth' });
    }
  }

  async function handleSubmit(values: AuthSignUpFormData) {
    const result = await auth.signUp.email({
      name: values.name,
      email: values.email,
      password: values.password,
      callbackURL: callbackUrl,
    });

    if (result.error) {
      toasty(m.auth_sign_up_failed(), '🔴', { id: 'auth' });
      return;
    }

    toasty(m.auth_account_created(), '✅', { id: 'auth' });
    await router.navigate({ href: callbackUrl === '/rooms' ? '/auth/sign-in' : `/auth/sign-in?redirectTo=${encodeURIComponent(callbackUrl)}` });
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
              label={m.forms_name()}
              name="name"
              placeholder={m.forms_name_placeholder()}
              type="text"
            />
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
                    required
                    showPasswordToggle
                    label={m.forms_password()}
                    name="password"
                    placeholder={m.forms_password_placeholder()}
                    type="password"
                  />
                  <FormField
                    control={form.control}
                    name="acceptTerms"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start gap-2">
                        <Checkbox
                          checked={field.value}
                          disabled={form.formState.isSubmitting}
                          onCheckedChange={field.onChange}
                        />
                        <div className="grid gap-1">
                          <FormLabel>
                            {m.auth_terms_prefix()}
                            <Link className="underline underline-offset-4 hover:text-primary" to="/">{m.auth_terms_link()}</Link>
                          </FormLabel>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
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
              {m.auth_sign_up()}
            </ButtonLoading>
          </fieldset>
        </form>
      </Form>
    </div>
  );
}
