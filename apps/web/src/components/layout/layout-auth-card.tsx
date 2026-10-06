import { LayoutAuthTitle } from '@/components/layout/layout-auth-title';
import * as Card from '@/components/ui/card';
import { cn } from '@/lib/cn';
import type { ComponentProps, ReactNode } from 'react';

interface LayoutAuthCardProps extends ComponentProps<'div'> {
  title: string
  description: string
  children: ReactNode
  footer?: ReactNode
}

export function LayoutAuthCard({ title, description, children, footer, className, ...props }: LayoutAuthCardProps) {
  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card.Card className="overflow-hidden p-0">
        <Card.CardContent className="grid p-0 md:min-h-120 md:grid-cols-2">
          <div className="w-full p-6 md:p-8">
            <LayoutAuthTitle description={description} title={title} />
            {children}
            {footer ? <div className="mt-4 text-center text-sm">{footer}</div> : null}
          </div>
          <div className="hidden border-l border-border/60 bg-muted md:block" />
        </Card.CardContent>
      </Card.Card>
    </div>
  );
}
