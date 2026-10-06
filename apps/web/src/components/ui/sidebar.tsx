import { Errors } from '@orbs/errors/universal';
import { m } from '@orbs/i18n/client';
import { cva } from 'cva';
import { Slot as SlotPrimitive } from 'radix-ui';
import { createContext, use, useEffect, useEffectEvent, useRef, useState } from 'react';
import { useIsMobile } from '@/hooks/use-is-mobile';
import { cn } from '@/lib/cn';
import LucidePanelLeft from '~icons/lucide/panel-left';
import { Button } from './button';
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from './drawer';
import { Input } from './input';
import { ScrollArea } from './scroll-area';
import { Separator } from './separator';
import { Skeleton } from './skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip';
import type { VariantProps } from 'cva';
import type { ComponentProps, CSSProperties } from 'react';

const SIDEBAR_COOKIE_NAME = 'sidebar_state';
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
const SIDEBAR_WIDTH = 256;
const SIDEBAR_WIDTH_MIN = 200;
const SIDEBAR_WIDTH_MAX = 400;
const SIDEBAR_COLLAPSE_WIDTH = 160;
const SIDEBAR_RESIZE_STEP = 16;
const SIDEBAR_DRAG_THRESHOLD = 4;
const SIDEBAR_WIDTH_MOBILE = '18rem';
const SIDEBAR_WIDTH_ICON = '3rem';
const SIDEBAR_KEYBOARD_SHORTCUT = 'b';

type SidebarCSSProperties = CSSProperties & {
  '--sidebar-width'?: string
  '--sidebar-width-icon'?: string
  '--skeleton-width'?: string
}

interface SidebarContext {
  state: 'expanded' | 'collapsed'
  open: boolean
  setOpen: (open: boolean) => void
  openMobile: boolean
  setOpenMobile: (open: boolean) => void
  isMobile: boolean
  toggleSidebar: () => void
  width: number
  setWidth: (width: number) => void
  setResizing: (resizing: boolean) => void
}

const SidebarContext = createContext<SidebarContext | null>(null);

function useSidebar() {
  const context = use(SidebarContext);

  if (!context) {
    throw new Errors.INTERNAL_ERROR({ internal: 'useSidebar requires SidebarProvider' });
  }

  return context;
}

function SidebarProvider({
  defaultOpen = true,
  defaultWidth = SIDEBAR_WIDTH,
  open: openProp,
  onOpenChange: setOpenProp,
  pathname,
  shortcut = SIDEBAR_KEYBOARD_SHORTCUT,
  className,
  style,
  children,
  ...props
}: ComponentProps<'div'> & {
  defaultOpen?: boolean
  defaultWidth?: number
  open?: boolean
  onOpenChange?: (open: boolean) => void
  pathname?: string
  // A nested provider (a second sidebar) passes null so Cmd+B keeps toggling only the outer one.
  shortcut?: string | null
}) {
  const isMobile = useIsMobile();
  const [openMobile, setOpenMobile] = useState(false);
  const [openState, setOpenState] = useState(defaultOpen);
  const [width, setWidth] = useState(defaultWidth);
  const [resizing, setResizing] = useState(false);
  const [previousPathname, setPreviousPathname] = useState(pathname);
  const open = openProp ?? openState;

  const setOpen = (value: boolean | ((value: boolean) => boolean)) => {
    const nextOpen = value instanceof Function ? value(open) : value;

    if (setOpenProp) {
      setOpenProp(nextOpen);
    } else {
      setOpenState(nextOpen);
    }

    document.cookie = `${SIDEBAR_COOKIE_NAME}=${nextOpen}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
  };

  if (pathname !== previousPathname) {
    setPreviousPathname(pathname);

    if (openMobile) {
      setOpenMobile(false);
    }
  }

  const toggleSidebar = () => (isMobile ? setOpenMobile((o) => !o) : setOpen(!open));

  const onShortcut = useEffectEvent(() => toggleSidebar());

  // Keyboard shortcut to toggle sidebar
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!shortcut || event.key !== shortcut || !(event.metaKey || event.ctrlKey)) {
        return;
      }

      event.preventDefault();
      onShortcut();
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcut]);

  const state = open ? 'expanded' : 'collapsed';

  const contextValue: SidebarContext = {
    state,
    open,
    setOpen,
    isMobile,
    openMobile,
    setOpenMobile,
    toggleSidebar,
    width,
    setWidth,
    setResizing,
  };

  const sidebarStyle: SidebarCSSProperties = {
    '--sidebar-width': `${width}px`,
    '--sidebar-width-icon': SIDEBAR_WIDTH_ICON,
    ...style,
  };

  return (
    <SidebarContext value={contextValue}>
      <TooltipProvider delayDuration={0}>
        <div
          className={cn(
            'group/sidebar-wrapper flex min-h-svh w-full has-data-[variant=inset]:bg-sidebar',
            className,
          )}
          data-slot="sidebar-wrapper"
          data-resizing={resizing}
          style={sidebarStyle}
          {...props}
        >
          {children}
        </div>
      </TooltipProvider>
    </SidebarContext>
  );
}

function Sidebar({
  side = 'left',
  variant = 'sidebar',
  collapsible = 'offcanvas',
  className,
  children,
  ...props
}: ComponentProps<'div'> & {
  side?: 'left' | 'right'
  variant?: 'sidebar' | 'floating' | 'inset'
  collapsible?: 'offcanvas' | 'icon' | 'none'
}) {
  const { isMobile, state, openMobile, setOpenMobile } = useSidebar();
  const sidebarInert = !isMobile && state === 'collapsed' && collapsible === 'offcanvas';

  if (collapsible === 'none') {
    return (
      <div className={cn('flex h-full w-(--sidebar-width) flex-col bg-sidebar text-sidebar-foreground', className)} data-slot="sidebar" {...props}>
        {children}
      </div>
    );
  }

  if (isMobile) {
    const mobileStyle: SidebarCSSProperties = { '--sidebar-width': SIDEBAR_WIDTH_MOBILE };

    return (
      <Drawer direction="bottom" open={openMobile} onOpenChange={setOpenMobile}>
        <DrawerContent
          className="mx-2 bg-sidebar p-2 text-sidebar-foreground"
          data-mobile="true"
          data-sidebar="sidebar"
          data-slot="sidebar"
          style={mobileStyle}
        >
          <DrawerHeader className="sr-only">
            <DrawerTitle>Sidebar</DrawerTitle>
            <DrawerDescription>Navigation sidebar.</DrawerDescription>
          </DrawerHeader>
          <div className="flex size-full flex-col overflow-y-auto">{children}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <div
      className="group peer hidden text-sidebar-foreground md:block"
      data-collapsible={state === 'collapsed' ? collapsible : ''}
      data-side={side}
      data-slot="sidebar"
      data-state={state}
      data-variant={variant}
    >
      {/* Sidebar gap on desktop */}
      <div
        className={cn(
          'relative w-(--sidebar-width) bg-transparent transition-[width] duration-200 ease-linear in-data-[resizing=true]:transition-none',
          'group-data-[collapsible=offcanvas]:w-0',
          'group-data-[side=right]:rotate-180',
          variant === 'floating' || variant === 'inset'
            ? 'group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4)))]'
            : 'group-data-[collapsible=icon]:w-(--sidebar-width-icon)',
        )}
        data-slot="sidebar-gap"
      />
      <div
        className={cn(
          'fixed inset-y-0 z-10 hidden h-svh w-(--sidebar-width) transition-[left,right,width] duration-200 ease-linear in-data-[resizing=true]:transition-none md:flex',
          side === 'left'
            ? 'left-0 group-data-[collapsible=offcanvas]:-left-(--sidebar-width)'
            : 'right-0 group-data-[collapsible=offcanvas]:-right-(--sidebar-width)',
          variant === 'floating' || variant === 'inset'
            ? 'p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4))+2px)]'
            : 'group-data-[collapsible=icon]:w-(--sidebar-width-icon) group-data-[side=left]:border-r group-data-[side=right]:border-l',
          className,
        )}
        {...props}
      >
        <div
          className="flex size-full flex-col bg-sidebar group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:border group-data-[variant=floating]:border-sidebar-border group-data-[variant=floating]:shadow-sm"
          data-sidebar="sidebar"
          inert={sidebarInert || undefined}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

function SidebarTrigger({ className, onClick, ...props }: ComponentProps<typeof Button>) {
  const { toggleSidebar } = useSidebar();

  return (
    <Button
      className={cn('size-7', className)}
      data-sidebar="trigger"
      data-slot="sidebar-trigger"
      size="icon"
      variant="ghost"
      onClick={(event) => {
        onClick?.(event);
        toggleSidebar();
      }}
      {...props}
    >
      <LucidePanelLeft className="size-4" />
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  );
}

function SidebarRail({ className, ...props }: ComponentProps<'button'>) {
  const { toggleSidebar, open, setOpen, width, setWidth, setResizing } = useSidebar();
  const drag = useRef<{ startX: number, startWidth: number, direction: number, moved: boolean } | null>(null);

  const resize = (nextWidth: number) => {
    const nextOpen = nextWidth >= SIDEBAR_COLLAPSE_WIDTH;

    if (nextOpen) {
      setWidth(Math.min(SIDEBAR_WIDTH_MAX, Math.max(SIDEBAR_WIDTH_MIN, nextWidth)));
    }

    if (nextOpen !== open) {
      setOpen(nextOpen);
    }
  };

  return (
    <button
      aria-label={m.layout_sidebar_resize()}
      aria-expanded={open}
      className={cn(
        'absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 transition-all ease-linear group-data-[side=left]:-right-4 group-data-[side=right]:left-0 after:absolute after:inset-y-0 after:left-1/2 after:w-0.5 hover:after:bg-sidebar-border sm:flex',
        'cursor-col-resize touch-none select-none',
        'group-data-[collapsible=offcanvas]:translate-x-0 group-data-[collapsible=offcanvas]:after:left-full hover:group-data-[collapsible=offcanvas]:bg-sidebar',
        '[[data-side=left][data-collapsible=offcanvas]_&]:-right-2',
        '[[data-side=right][data-collapsible=offcanvas]_&]:-left-2',
        'ring-input ring-inset focus-visible:ring-1',
        className,
      )}
      data-sidebar="rail"
      data-slot="sidebar-rail"
      title={m.layout_sidebar_resize()}
      type="button"
      onClick={() => {
        if (!drag.current?.moved) {
          toggleSidebar();
        }

        drag.current = null;
      }}
      onKeyDown={(event) => {
        if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
          return;
        }

        event.preventDefault();
        const direction = event.currentTarget.closest('[data-side="right"]') ? -1 : 1;
        const delta = (event.key === 'ArrowRight' ? SIDEBAR_RESIZE_STEP : -SIDEBAR_RESIZE_STEP) * direction;

        if (!open && delta < 0) {
          return;
        }

        const nextWidth = open ? width + delta : SIDEBAR_WIDTH_MIN;
        resize(open && nextWidth < SIDEBAR_WIDTH_MIN ? SIDEBAR_COLLAPSE_WIDTH - 1 : nextWidth);
      }}
      onPointerDown={(event) => {
        if (event.button !== 0 || !event.isPrimary) {
          return;
        }

        const sidebar = event.currentTarget.closest('[data-slot="sidebar"]');
        drag.current = {
          startX: event.clientX,
          startWidth: open ? width : sidebar?.getBoundingClientRect().width ?? 0,
          direction: sidebar?.getAttribute('data-side') === 'right' ? -1 : 1,
          moved: false,
        };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        const current = drag.current;

        if (!current || !event.currentTarget.hasPointerCapture(event.pointerId)) {
          return;
        }

        const delta = (event.clientX - current.startX) * current.direction;

        if (!current.moved && Math.abs(delta) < SIDEBAR_DRAG_THRESHOLD) {
          return;
        }

        current.moved = true;
        setResizing(true);
        resize(current.startWidth + delta);
      }}
      onLostPointerCapture={() => setResizing(false)}
      onPointerCancel={() => {
        drag.current = null;
        setResizing(false);
      }}
      {...props}
    />
  );
}

function SidebarInset({ className, ...props }: ComponentProps<'main'>) {
  return (
    <main
      className={cn(
        'relative flex w-full flex-1 flex-col bg-background',
        'md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow-sm md:peer-data-[variant=inset]:peer-data-[state=collapsed]:ml-2',
        className,
      )}
      data-slot="sidebar-inset"
      {...props}
    />
  );
}

function SidebarInput({ className, ...props }: ComponentProps<typeof Input>) {
  return <Input className={cn('h-8 w-full bg-background shadow-none', className)} data-sidebar="input" data-slot="sidebar-input" {...props} />;
}

function SidebarHeader({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('flex flex-col gap-2 p-2', className)} data-sidebar="header" data-slot="sidebar-header" {...props} />;
}

function SidebarFooter({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('flex flex-col gap-2 p-2', className)} data-sidebar="footer" data-slot="sidebar-footer" {...props} />;
}

function SidebarSeparator({ className, ...props }: ComponentProps<typeof Separator>) {
  return <Separator className={cn('mx-2 w-auto bg-sidebar-border', className)} data-sidebar="separator" data-slot="sidebar-separator" {...props} />;
}

function SidebarContent({ className, ...props }: ComponentProps<typeof ScrollArea>) {
  return (
    <ScrollArea
      fullHeight
      className={cn('flex min-h-0 flex-1 flex-col gap-2 group-data-[collapsible=icon]:overflow-hidden', className)}
      data-sidebar="content"
      data-slot="sidebar-content"
      threshold={0.1}
      viewportClassName="p-0"
      {...props}
    />
  );
}

function SidebarGroup({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('relative flex w-full min-w-0 flex-col p-2', className)} data-sidebar="group" data-slot="sidebar-group" {...props} />;
}

function SidebarGroupLabel({ className, asChild = false, ...props }: ComponentProps<'div'> & { asChild?: boolean }) {
  const Comp = asChild ? SlotPrimitive.Slot : 'div';

  return (
    <Comp
      className={cn(
        'mb-2 flex shrink-0 items-center rounded-md px-2 text-xs leading-none font-medium text-sidebar-foreground/70 ring-sidebar-ring outline-hidden transition-[margin,opacity] duration-200 ease-linear focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0',
        'group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0',
        className,
      )}
      data-sidebar="group-label"
      data-slot="sidebar-group-label"
      {...props}
    />
  );
}

function SidebarGroupAction({ className, asChild = false, ...props }: ComponentProps<'button'> & { asChild?: boolean }) {
  const Comp = asChild ? SlotPrimitive.Slot : 'button';

  return (
    <Comp
      className={cn(
        'absolute top-3.5 right-3 flex-center aspect-square w-5 rounded-md p-0 text-sidebar-foreground ring-sidebar-ring outline-hidden transition-transform hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0',
        'after:absolute after:-inset-2 md:after:hidden',
        'group-data-[collapsible=icon]:hidden',
        className,
      )}
      data-sidebar="group-action"
      data-slot="sidebar-group-action"
      {...props}
    />
  );
}

function SidebarGroupContent({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('w-full text-sm', className)} data-sidebar="group-content" data-slot="sidebar-group-content" {...props} />;
}

function SidebarMenu({ className, ...props }: ComponentProps<'ul'>) {
  return <ul className={cn('flex w-full min-w-0 flex-col gap-1', className)} data-sidebar="menu" data-slot="sidebar-menu" {...props} />;
}

function SidebarMenuItem({ className, ...props }: ComponentProps<'li'>) {
  return <li className={cn('group/menu-item relative', className)} data-sidebar="menu-item" data-slot="sidebar-menu-item" {...props} />;
}

const sidebarMenuButtonVariants = cva({
  base: 'peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm ring-sidebar-ring outline-hidden transition-[width,height,padding] group-has-data-[sidebar=menu-action]/menu-item:pr-8 group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2! hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0',
  variants: {
    variant: {
      default: 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
      outline: 'bg-background shadow-[0_0_0_1px_hsl(var(--sidebar-border))] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-[0_0_0_1px_hsl(var(--sidebar-accent))]',
    },
    size: {
      default: 'h-8 text-sm',
      sm: 'h-7 text-xs',
      lg: 'h-12 text-sm group-data-[collapsible=icon]:p-0!',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
});

function SidebarMenuButton({
  asChild = false,
  isActive = false,
  variant = 'default',
  size = 'default',
  tooltip,
  className,
  ...props
}: ComponentProps<'button'> & {
  asChild?: boolean
  isActive?: boolean
  tooltip?: string | ComponentProps<typeof TooltipContent>
} & VariantProps<typeof sidebarMenuButtonVariants>) {
  const Comp = asChild ? SlotPrimitive.Slot : 'button';
  const { isMobile, state } = useSidebar();

  const button = (
    <Comp
      className={cn(sidebarMenuButtonVariants({ variant, size }), className)}
      data-active={isActive}
      data-sidebar="menu-button"
      data-size={size}
      data-slot="sidebar-menu-button"
      {...props}
    />
  );

  let tooltipLocal = tooltip;

  if (!tooltipLocal) {
    return button;
  }

  if (!(tooltipLocal instanceof Object)) {
    tooltipLocal = {
      children: tooltipLocal,
    };
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent align="center" hidden={state !== 'collapsed' || isMobile} side="right" {...tooltipLocal} />
    </Tooltip>
  );
}

function SidebarMenuAction({
  className,
  asChild = false,
  showOnHover = false,
  ...props
}: ComponentProps<'button'> & {
  asChild?: boolean
  showOnHover?: boolean
}) {
  const Comp = asChild ? SlotPrimitive.Slot : 'button';

  return (
    <Comp
      className={cn(
        'absolute top-1.5 right-1 flex-center aspect-square w-5 rounded-md p-0 text-muted-foreground/70 ring-sidebar-ring outline-hidden transition-[color,opacity] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:text-sidebar-accent-foreground focus-visible:ring-2 data-[state=open]:text-sidebar-accent-foreground [&>svg]:size-3.5 [&>svg]:shrink-0',
        'after:absolute after:-inset-2 md:after:hidden',
        'peer-data-[size=sm]/menu-button:top-1',
        'peer-data-[size=default]/menu-button:top-1.5',
        'peer-data-[size=lg]/menu-button:top-2.5',
        'group-data-[collapsible=icon]:hidden',
        showOnHover &&
          'group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 data-[state=open]:opacity-100 md:opacity-0',
        className,
      )}
      data-sidebar="menu-action"
      data-slot="sidebar-menu-action"
      {...props}
    />
  );
}

function SidebarMenuBadge({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'pointer-events-none absolute right-1 flex-center h-5 min-w-5 rounded-md px-1 text-xs font-medium text-sidebar-foreground tabular-nums select-none',
        'peer-hover/menu-button:text-sidebar-accent-foreground peer-data-[active=true]/menu-button:text-sidebar-accent-foreground',
        'peer-data-[size=sm]/menu-button:top-1',
        'peer-data-[size=default]/menu-button:top-1.5',
        'peer-data-[size=lg]/menu-button:top-2.5',
        'group-data-[collapsible=icon]:hidden',
        className,
      )}
      data-sidebar="menu-badge"
      data-slot="sidebar-menu-badge"
      {...props}
    />
  );
}

function SidebarMenuSkeleton({
  className,
  showIcon = false,
  ...props
}: ComponentProps<'div'> & {
  showIcon?: boolean
}) {
  const skeletonStyle: SidebarCSSProperties = { '--skeleton-width': '70%' };

  return (
    <div className={cn('flex h-8 items-center gap-2 rounded-md px-2', className)} data-sidebar="menu-skeleton" data-slot="sidebar-menu-skeleton" {...props}>
      {showIcon ? <Skeleton className="size-4 rounded-md" data-sidebar="menu-skeleton-icon" /> : null}
      <Skeleton
        className="h-4 max-w-(--skeleton-width) flex-1"
        data-sidebar="menu-skeleton-text"
        style={skeletonStyle}
      />
    </div>
  );
}

function SidebarMenuSub({ className, ...props }: ComponentProps<'ul'>) {
  return (
    <ul
      className={cn(
        'mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l border-sidebar-border px-2.5 py-0.5',
        'group-data-[collapsible=icon]:hidden',
        className,
      )}
      data-sidebar="menu-sub"
      data-slot="sidebar-menu-sub"
      {...props}
    />
  );
}

function SidebarMenuSubItem({ className, ...props }: ComponentProps<'li'>) {
  return <li className={cn('group/menu-sub-item relative', className)} data-sidebar="menu-sub-item" data-slot="sidebar-menu-sub-item" {...props} />;
}

function SidebarMenuSubButton({
  asChild = false,
  size = 'md',
  isActive = false,
  className,
  ...props
}: ComponentProps<'a'> & {
  asChild?: boolean
  size?: 'sm' | 'md'
  isActive?: boolean
}) {
  const Comp = asChild ? SlotPrimitive.Slot : 'a';

  return (
    <Comp
      className={cn(
        'flex h-7 min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-md px-2 text-sidebar-foreground ring-sidebar-ring outline-hidden hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-sidebar-accent-foreground',
        'data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground',
        size === 'sm' && 'text-xs',
        size === 'md' && 'text-sm',
        'group-data-[collapsible=icon]:hidden',
        'cursor-pointer',
        className,
      )}
      data-active={isActive}
      data-sidebar="menu-sub-button"
      data-size={size}
      data-slot="sidebar-menu-sub-button"
      {...props}
    />
  );
}

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
};
