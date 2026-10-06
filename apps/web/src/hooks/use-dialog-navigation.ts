import { useRouter } from '@tanstack/react-router';
import type { DialogNavigationOptions } from '@/types/dialog.types';

export function useDialogNavigation({ to, params, search = false, isSubmitting = false }: DialogNavigationOptions) {
  const router = useRouter();

  function navigate() {
    void router.navigate({
      viewTransition: true,
      to,
      params,
      resetScroll: false,
      search: search || undefined,
    });
  }

  function handleOpenChange(open: boolean) {
    if (open || isSubmitting) {
      return;
    }
    navigate();
  }

  return { handleOpenChange, navigate };
}
