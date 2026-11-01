import { match } from 'ts-pattern';
import { authedRouter } from './rpc.procedures';

export const attachments = {
  upload: authedRouter.attachments.upload.handler(({ context, input }) => context.attachments.actions.upload(input)),
  download: authedRouter.attachments.download.handler(async ({ context, input }) => {
    const { file, range, size } = await context.attachments.queries.download({ ...input, range: context.reqHeaders?.get('range') ?? undefined });
    context.resHeaders?.set('accept-ranges', 'bytes');

    match(range)
      .with({ kind: 'partial' }, ({ start, end }) => context.resHeaders?.set('content-range', `bytes ${String(start)}-${String(end)}/${String(size)}`))
      .with({ kind: 'unsatisfiable' }, () => context.resHeaders?.set('content-range', `bytes */${String(size)}`))
      .with({ kind: 'full' }, () => undefined)
      .exhaustive();

    return file;
  }),
  list: authedRouter.attachments.list.handler(({ context, input }) => context.attachments.queries.list(input)),
  remove: authedRouter.attachments.remove.handler(({ context, input }) => context.attachments.actions.remove(input)),
};
