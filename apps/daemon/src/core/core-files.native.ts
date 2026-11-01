import { match, P } from 'ts-pattern';

export function coreFilesRange(response: Response): Response {
  return match(response.headers.get('content-range'))
    .with(P.nullish, () => response)
    .with(P.string.startsWith('bytes */'), () => {
      const headers = new Headers(response.headers);
      headers.delete('content-length');

      return new Response(null, { status: 416, headers });
    })
    .otherwise(() => new Response(response.body, { status: 206, headers: response.headers }));
}
