export interface SecurityReadRequestTextParams {
  maxBytes: number;
}

export type SecurityReadResult = { ok: true; text: string } | { ok: false; status: 400 | 413 };
