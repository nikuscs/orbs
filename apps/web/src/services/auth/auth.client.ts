import { log } from '@orbs/logger/client';
import { createAuthClient } from 'better-auth/client';
import { adminClient, organizationClient, usernameClient } from 'better-auth/client/plugins';

export const auth = createAuthClient({
  plugins: [organizationClient(), adminClient(), usernameClient()],
  fetchOptions: {
    onError: ({ error, response }) => {
      log.error({
        tag: 'auth',
        message: 'Auth client request failed',
        status: response.status,
        url: response.url,
        errorMessage: error.message,
      });
    },
  },
});
