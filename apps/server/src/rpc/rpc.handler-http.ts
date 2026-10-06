import { Errors, errorStatusMap } from '@orbs/errors/universal';
import { COMMON_ERROR_STATUS_MAP, onError } from '@orpc/server';
import { RPCHandler } from '@orpc/server/fetch';
import { BatchHandlerPlugin } from '@orpc/server/plugins';
import { router } from './rpc.router';
import { rpcHandleClientError, rpcHandleErrorReporting } from './rpc.utils';

export const rpcHandler = new RPCHandler(router, {
  plugins: [new BatchHandlerPlugin()],
  errorStatusMap: { ...COMMON_ERROR_STATUS_MAP, ...errorStatusMap },
  clientInterceptors: [onError((error) => {
    if (error) {
      rpcHandleClientError(error);
    }
  })],
  interceptors: [onError((error) => rpcHandleErrorReporting(error instanceof Error ? error : new Errors.INTERNAL_ERROR({ internal: 'Non-error thrown', cause: error })))],
});
