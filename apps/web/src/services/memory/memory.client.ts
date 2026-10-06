import { rpc } from '@/services/rpc/rpc.client';

export async function memoryExport(): Promise<void> {
  async function memoryExportPage(after?: string): Promise<Awaited<ReturnType<typeof rpc.memory.export.call>>['items']> {
    const page = await rpc.memory.export.call({ after });
    return page.next ? [...page.items, ...(await memoryExportPage(page.next))] : page.items;
  }

  const items = await memoryExportPage();

  const url = URL.createObjectURL(
    new Blob(
      [
        JSON.stringify(
          {
            schemaVersion: 1,
            exportedAt: new Date().toISOString(),
            items,
          },
          null,
          2,
        ),
      ],
      { type: 'application/json' },
    ),
  );

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'orbs-memories.json';
  anchor.click();
  URL.revokeObjectURL(url);
}
