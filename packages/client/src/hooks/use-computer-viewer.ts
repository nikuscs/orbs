import { useCallback, useEffect, useRef, useState } from 'react';
import { match } from 'ts-pattern';
import { COMPUTER } from '../services/computer/computer.constants';
import { useComputer } from './use-computer';
import type { ComputerTicket } from '../types/computer.types';
import type { ComputerViewerMode } from '@repo/contracts/universal';

export function useComputerViewer(botId: string) {
  const computer = useComputer(botId);
  const [ticket, setTicket] = useState<ComputerTicket | null>(null);
  const isRunning = computer.status?.state === 'running';
  const startedAt = computer.status?.startedAt ?? null;
  const { openViewer, touch } = computer;
  const release = useRef(computer.release);
  const held = useRef<ComputerTicket | null>(null);

  useEffect(() => {
    release.current = computer.release;
    held.current = ticket;
  });

  useEffect(() => () => {
    match(held.current?.isControlling ?? false)
      .with(true, () => {
        release.current().catch(() => undefined);
      })
      .with(false, () => undefined)
      .exhaustive();
  }, []);

  const show = useCallback(async (mode: ComputerViewerMode, from: number | null) => {
    const result = await openViewer(mode);

    setTicket({
      url: result.url,
      startedAt: from,
      expiresAt: result.expiresAt,
      isControlling: mode === 'control',
    });
  }, [openViewer]);

  useEffect(() => {
    match(isRunning)
      .with(true, () => {
        show('watch', startedAt).catch(() => setTicket(null));
      })
      .with(false, () => undefined)
      .exhaustive();
  }, [isRunning, startedAt, show]);

  useEffect(() => match(isRunning)
    .with(true, () => {
      const keep = () => {
        touch();

        match(held.current)
          .with({ isControlling: true }, (current) => current.expiresAt - Date.now() < COMPUTER.renewControlMs, (current) => {
            show('control', current.startedAt)
              .catch(() => show('watch', current.startedAt))
              .catch(() => setTicket(null));
          })
          .otherwise(() => undefined);
      };

      keep();
      const timer = setInterval(keep, COMPUTER.touchMs);

      return () => clearInterval(timer);
    })
    .with(false, () => undefined)
    .exhaustive(), [isRunning, touch, show]);

  const current = isRunning && ticket?.startedAt === startedAt ? ticket : null;

  const takeOver = () => show('control', startedAt);

  const finish = async () => {
    await computer.release();
    await show('watch', startedAt);
  };

  return {
    computer,
    url: current?.url ?? null,
    isControlling: current?.isControlling ?? false,
    takeOver,
    finish,
  };
}
