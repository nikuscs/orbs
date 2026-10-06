import { z } from 'zod';

export const routeDriverName = z.enum(['jev', 'roundtable', 'judge']);
export type RouteDriverName = z.infer<typeof routeDriverName>;

