import { Link, useRouter } from '@tanstack/react-router';
import { memo } from 'react';
import { Streamdown } from 'streamdown';
import { cn } from '@/lib/cn';
import { linkInternalPath } from '@/lib/link';
import type { ComponentProps, HTMLAttributes } from 'react';
import type { Components, ExtraProps } from 'streamdown';

type ResponseProps = ComponentProps<typeof Streamdown>

type ResponseTag = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'ul' | 'ol' | 'li' | 'blockquote' | 'hr' | 'strong' | 'thead' | 'tbody' | 'tr' | 'th' | 'td' | 'code'

const responseLinkClass = 'font-medium text-current underline decoration-current/35 underline-offset-2 transition-colors wrap-break-word hover:decoration-current';

function ResponseLink({ node: _node, href = '', className, children, ...props }: ComponentProps<'a'> & ExtraProps) {
  const { origin } = useRouter();
  const path = linkInternalPath(href, origin);

  if (!href || href.startsWith('streamdown:')) {
    return <span className={cn(responseLinkClass, className)}>{children}</span>;
  }

  if (path) {
    const [to, hash] = path.split('#');

    return (
      <Link className={cn(responseLinkClass, className)} hash={hash} to={to}>
        {children}
      </Link>
    );
  }

  return (
    <a className={cn(responseLinkClass, className)} href={href} rel="noopener noreferrer" target="_blank" {...props}>
      {children}
    </a>
  );
}

function responseElement(Tag: ResponseTag, base: string) {
  return function ResponseElement({ node: _node, className, ...props }: HTMLAttributes<HTMLElement> & ExtraProps) {
    return <Tag className={cn(base, className)} {...props} />;
  };
}

function ResponseTable({ node: _node, className, ...props }: ComponentProps<'table'> & ExtraProps) {
  return (
    <div className="scrollbar-thin max-w-full overflow-x-auto rounded-lg border" data-streamdown="table-wrapper">
      <table className={cn('w-max min-w-full border-collapse text-xs', className)} {...props} />
    </div>
  );
}

const responseComponents: Components = {
  a: ResponseLink,
  h1: responseElement('h1', 'mt-5 mb-1.5 text-base font-semibold text-balance'),
  h2: responseElement('h2', 'mt-5 mb-1.5 text-base font-semibold text-balance'),
  h3: responseElement('h3', 'mt-4 mb-1 text-sm font-semibold text-balance'),
  h4: responseElement('h4', 'mt-4 mb-1 text-sm font-semibold'),
  h5: responseElement('h5', 'mt-4 mb-1 text-sm font-medium'),
  h6: responseElement('h6', 'mt-4 mb-1 text-sm font-medium text-muted-foreground'),
  ul: responseElement('ul', 'flex list-disc flex-col gap-1 pl-5 marker:text-muted-foreground'),
  ol: responseElement('ol', 'flex list-decimal flex-col gap-1 pl-5 marker:text-muted-foreground marker:tabular-nums'),
  li: responseElement('li', 'pl-0.5 [&>ol]:mt-1 [&>p]:inline [&>ul]:mt-1'),
  blockquote: responseElement('blockquote', 'border-l-2 border-current/20 pl-3 text-muted-foreground'),
  hr: responseElement('hr', 'border-current/15'),
  strong: responseElement('strong', 'font-semibold'),
  table: ResponseTable,
  thead: responseElement('thead', ''),
  tbody: responseElement('tbody', '[&>tr:last-child>td]:border-0'),
  tr: responseElement('tr', ''),
  th: responseElement('th', 'border-b px-3 py-1.5 text-left font-medium whitespace-nowrap text-muted-foreground'),
  td: responseElement('td', 'border-b px-3 py-1.5 whitespace-nowrap tabular-nums'),
  inlineCode: responseElement('code', 'rounded-md bg-current/10 px-1 py-0.5 font-mono text-xs'),
};

export const Response = memo(
  ({ className, components, ...props }: ResponseProps) => (
    <Streamdown
      className={cn('size-full space-y-3 **:data-[streamdown=code-block-body]:p-3 **:data-[streamdown=code-block-body]:text-xs [&>*:first-child]:mt-0 [&>*:last-child]:mb-0', className)}
      components={{ ...responseComponents, ...components }}
      controls={{ table: false, code: { copy: true, download: false }, mermaid: false }}
      {...props}
    />
  ),
  (prevProps, nextProps) => prevProps.children === nextProps.children,
);

Response.displayName = 'Response';
