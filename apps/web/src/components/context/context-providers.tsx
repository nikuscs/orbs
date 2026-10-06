import { domAnimation, LazyMotion } from 'motion/react';
import { Toaster } from '@/components/ui/sonner';
import { useTheme } from '@/hooks/use-theme';
import { ContextTheme } from './context-theme';
import type { PropsWithChildren } from 'react';

function ContextToaster() {
  const { resolved } = useTheme();

  return <Toaster theme={resolved} />;
}

export function ContextProviders({ children }: PropsWithChildren) {
  return (
    <ContextTheme>
      <LazyMotion strict features={domAnimation}>
        {children}
        <ContextToaster />
      </LazyMotion>
    </ContextTheme>
  );
}
