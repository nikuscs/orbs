import { match, P } from 'ts-pattern';
import { ARTIFACT_BLOCKS_CATALOG } from './artifact.constants';
import type { ArtifactPropSchema } from '../../types/artifact.types';

function artifactBlocksPropType(schema: ArtifactPropSchema): string {
  return match(schema)
    .with({ enum: P.array() }, ({ enum: values }) => values.join('|'))
    .with({ type: 'array' }, ({ items }) => `[${artifactBlocksPropType(items ?? {})}]`)
    .with({ properties: P.nonNullable }, (object) => `{ ${artifactBlocksPropFields(object)} }`)
    .with({ additionalProperties: P.nonNullable }, ({ additionalProperties }) => `{ key: ${artifactBlocksPropType(additionalProperties)} }`)
    .otherwise(({ type }) => [type ?? 'json'].flat().map((name) => (name === 'null' ? 'empty' : name)).join('|'));
}

function artifactBlocksPropFields({ properties = {}, required = [] }: ArtifactPropSchema) {
  return Object.entries(properties)
    .map(([name, prop]) => `${name}${required.includes(name) ? '' : '?'}: ${artifactBlocksPropType(prop)}`)
    .join(', ');
}

export function artifactBlocksReference() {
  return [
    '## Blocks',
    ...Object.entries(ARTIFACT_BLOCKS_CATALOG).map(([name, block]) => `- ${name}(${artifactBlocksPropFields(block.props)}): ${block.description}`),
  ].join('\n');
}
