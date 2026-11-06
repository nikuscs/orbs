import { Type } from '@earendil-works/pi-ai';
import { botCreate, botGet, botSwapModels, botUpdate, mcpServerAdd, mcpServerRemove } from '@repo/contracts/universal';
import { z } from 'zod';

export const botToolCreate = botCreate.omit({ permission: true }).strict();
export const botToolUpdate = botUpdate.omit({ permission: true }).strict();
export const botToolGet = botGet.strict();
export const botToolSwapModels = botSwapModels.strict();

export const botToolMcpAdd = z.object(mcpServerAdd.shape).omit({ botId: true, env: true }).strict();
export const botToolMcpRemove = mcpServerRemove.omit({ botId: true }).strict();

export const botToolCreateParameters = Type.Unsafe<z.infer<typeof botToolCreate>>(
  z.toJSONSchema(botToolCreate, { io: 'input' }),
);

export const botToolUpdateParameters = Type.Unsafe<z.infer<typeof botToolUpdate>>(
  z.toJSONSchema(botToolUpdate, { io: 'input' }),
);

export const botToolGetParameters = Type.Unsafe<z.infer<typeof botToolGet>>(
  z.toJSONSchema(botToolGet, { io: 'input' }),
);

export const botToolSwapModelsParameters = Type.Unsafe<z.infer<typeof botToolSwapModels>>(
  z.toJSONSchema(botToolSwapModels, { io: 'input' }),
);

export const botToolMcpAddParameters = Type.Unsafe<z.infer<typeof botToolMcpAdd>>(
  z.toJSONSchema(botToolMcpAdd, { io: 'input' }),
);

export const botToolMcpRemoveParameters = Type.Unsafe<z.infer<typeof botToolMcpRemove>>(
  z.toJSONSchema(botToolMcpRemove, { io: 'input' }),
);
