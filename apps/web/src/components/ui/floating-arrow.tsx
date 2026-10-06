import { cn } from '@/lib/cn';

export function FloatingArrow({ className, ...props }: React.ComponentProps<'svg'>) {
  return (
    <svg className={cn('z-49', className)} fill="none" height="10" viewBox="0 0 20 10" width="20" {...props}>
      <path d="M0 0 C5 0 5 10 10 10 C15 10 15 0 20 0 Z" fill="currentColor" />
      <path className="stroke-border" d="M0 0 C5 0 5 10 10 10 C15 10 15 0 20 0" strokeWidth="1" />
    </svg>
  );
}
