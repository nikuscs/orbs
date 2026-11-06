import { artifactActionCreate } from './artifact-action.create';
import { artifactActionRestore } from './artifact-action.restore';
import { artifactActionUpdate } from './artifact-action.update';
import { artifactQueryGet } from './artifact-query.get';
import { artifactQueryList } from './artifact-query.list';
import { artifactQueryVersions } from './artifact-query.versions';
import { ARTIFACT_BLOCKS_CATALOG } from './artifact.constants';
import type * as ArtifactTypes from '../../types/artifact.types';
import type { Context } from '@earendil-works/chord/context';

export function makeArtifactService(deps: ArtifactTypes.ArtifactServiceDeps) {
  return {
    actions: {
      create: (params: ArtifactTypes.ArtifactCreateParams, context: Context) => artifactActionCreate(deps, { ...params, context }),
      update: (params: ArtifactTypes.ArtifactUpdateParams, context: Context) => artifactActionUpdate(deps, { ...params, context }),
      saveState: (params: ArtifactTypes.ArtifactSaveStateParams, context: Context) => artifactActionUpdate(deps, { ...params, context }),
      restore: (params: ArtifactTypes.ArtifactRestoreParams, context: Context) => artifactActionRestore(deps, { ...params, context }),
    },
    queries: {
      list: (params: ArtifactTypes.ArtifactListParams, context: Context) => artifactQueryList(deps, { ...params, context }),
      get: (params: ArtifactTypes.ArtifactGetParams, context: Context) => artifactQueryGet(deps, { ...params, context }),
      versions: (params: ArtifactTypes.ArtifactVersionsParams, context: Context) => artifactQueryVersions(deps, { ...params, context }),
      blocks: () => ARTIFACT_BLOCKS_CATALOG,
    },
  };
}

export type ArtifactService = ReturnType<typeof makeArtifactService>;
