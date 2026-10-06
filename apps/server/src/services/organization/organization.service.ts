import { organizationActionConfigure } from './organization-action.configure';
import { organizationActionEnsure } from './organization-action.ensure';
import { organizationQueryActive } from './organization-query.active';
import { organizationQueryBan } from './organization-query.ban';
import { organizationQuerySettings } from './organization-query.settings';
import type * as OrganizationTypes from '#/types/organization.types';

export function makeOrganizationService(deps: OrganizationTypes.OrganizationServiceDeps) {
  return {
    queries: {
      active: (params: OrganizationTypes.OrganizationQueryActiveParams) => organizationQueryActive(deps, params),
      ban: (params: OrganizationTypes.OrganizationQueryBanParams) => organizationQueryBan(deps, params),
      settings: (params: OrganizationTypes.OrganizationQuerySettingsParams) => organizationQuerySettings(deps, params),
    },
    actions: {
      ensure: (params: OrganizationTypes.OrganizationActionEnsureParams) => organizationActionEnsure(deps, params),
      configure: (params: OrganizationTypes.OrganizationActionConfigureParams) => organizationActionConfigure(deps, params),
    },
  };
}

export type OrganizationService = ReturnType<typeof makeOrganizationService>;
