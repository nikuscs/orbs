import { artifactComponents } from '@repo/contracts/universal';
import { z } from 'zod';
import type { Context } from '@earendil-works/chord/context';
import type * as PiTypes from '@earendil-works/pi-durable';
import type * as ContractTypes from '@repo/contracts/universal';

export const artifactBlockSchemas = Object.fromEntries(Object.entries(artifactComponents).map(([name, component]) => [
  name,
  {
    description: component.description,
    props: z.toJSONSchema(component.props, { io: 'input' }),
  },
]));

export interface ArtifactServiceDeps {
  harness: PiTypes.Harness;
}

export interface ArtifactConversationParams {
  botId: string;
  conversationId: PiTypes.ConversationId;
}

export interface ArtifactContextParams {
  context: Context;
}

export type ArtifactListParams = ArtifactConversationParams;
export type ArtifactCreateParams = ContractTypes.ArtifactCreateInput & ArtifactConversationParams & { id?: string };
export type ArtifactGetParams = ContractTypes.ArtifactGetInput & ArtifactConversationParams;
export type ArtifactUpdateParams = ContractTypes.ArtifactUpdateInput & ArtifactConversationParams;
export type ArtifactSaveStateParams = ContractTypes.ArtifactSaveStateInput & ArtifactConversationParams;
export type ArtifactRestoreParams = ContractTypes.ArtifactRestoreInput & ArtifactConversationParams;
export type ArtifactVersionsParams = ContractTypes.ArtifactVersionsInput & ArtifactConversationParams;

export interface ArtifactVersionPointer extends PiTypes.JsonObject {
  version: number;
  createdAt: number;
  title: string;
}

export interface ArtifactRecord extends PiTypes.JsonObject {
  id: string;
  botId: string;
  conversationId: number;
  title: string;
  emoji: string | null;
  version: number;
  createdAt: number;
  updatedAt: number;
  versions: ArtifactVersionPointer[];
}

export interface ArtifactDocument extends PiTypes.JsonObject {
  artifacts: Record<string, ArtifactRecord>;
}

export interface ArtifactVersionData extends PiTypes.JsonObject {
  artifactId: string;
  version: number;
  title: string;
}

export interface ArtifactContent extends PiTypes.JsonObject {
  spec: ContractTypes.ArtifactSpec | null;
}

export interface ArtifactPropSchema {
  type?: string | string[];
  enum?: string[];
  items?: ArtifactPropSchema;
  properties?: Record<string, ArtifactPropSchema>;
  required?: string[];
  additionalProperties?: ArtifactPropSchema;
}
