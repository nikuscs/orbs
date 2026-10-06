import { z } from 'zod';
import { routeDriverName } from '#/types/route-driver.types';
import { routeJudgeModel } from '#/types/route.types';
import type { Database } from '#/types/database.types';

export interface OrganizationServiceDeps {
  database: Database;
}

export interface OrganizationQueryActiveParams {
  userId: string;
  activeOrganizationId?: string | null;
}

export interface OrganizationQueryBanParams {
  organizationId: string;
}

export interface OrganizationActionEnsureParams {
  userId: string;
  activeOrganizationId?: string | null;
}

const organizationRouting = z
  .object({
    driver: routeDriverName,
    judge: routeJudgeModel.nullable().default(null),
  })
  .refine((routing) => routing.driver !== 'judge' || routing.judge !== null, { path: ['judge'], error: 'validation_judge_model' });

export const organizationSettings = z.object({
  memory: z.object({ model: routeJudgeModel.nullable() }).default({ model: null }),
  routing: organizationRouting,
});

export type OrganizationSettings = z.infer<typeof organizationSettings>;

export const organizationConfigureInput = organizationSettings.partial();

export interface OrganizationQuerySettingsParams {
  organizationId: string;
}

export interface OrganizationActionConfigureParams {
  organizationId: string;
  userId: string;
  settings: Partial<OrganizationSettings>;
}
