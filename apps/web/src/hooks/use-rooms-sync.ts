import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { tenantService } from '@/services/tenant/tenant.client';

export function useRoomsSync() {
  const queryClient = useQueryClient();

  useEffect(() => tenantService.sync(queryClient), [queryClient]);
}
