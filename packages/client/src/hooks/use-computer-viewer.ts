import { useEffect, useRef, useState } from 'react';
import { match } from 'ts-pattern';
import { COMPUTER } from '../services/computer/computer.constants';
import { useComputer } from './use-computer';
import type { ComputerTicket } from '../types/computer.types';

export function useComputerViewer(botId: string) {
  const computer = useComputer(botId);
  const [ticket, setTicket] = useState<ComputerTicket | null>(null);
  const isRunning = computer.status?.state === 'running';
  const startedAt = computer.status?.startedAt ?? null;
  const { openViewer, touch } = computer;
  const release = useRef(computer.release);
  const isHolding = useRef(false);

  useEffect(() => {
    release.current = computer.release;
    isHolding.current = ticket?.isControlling ?? false;
  });

  useEffect(() => () => {
    match(isHolding.current)
      .with(true, () => {
        release.current().catch(() => undefined);
      })
      .with(false, () => undefined)
      .exhaustive();
  }, []);

  useEffect(() => {
    match(isRunning)
      .with(true, () => {
        openViewer('watch').then(
          (result) => setTicket({
            url: result.url,
            startedAt,
            isControlling: false,
          }),
          () => setTicket(null),
        );
      })
      .with(false, () => undefined)
      .exhaustive();
  }, [isRunning, startedAt, openViewer]);

  useEffect(() => match(isRunning)
    .with(true, () => {
      touch();
      const timer = setInterval(touch, COMPUTER.touchMs);

      return () => clearInterval(timer);
    })
    .with(false, () => undefined)
    .exhaustive(), [isRunning, touch]);

  const current = isRunning && ticket?.startedAt === startedAt ? ticket : null;

  const takeOver = async () => {
    const result = await openViewer('control');
    setTicket({
      url: result.url,
      startedAt,
      isControlling: true,
    });
  };

  const finish = async () => {
    await computer.release();
    const result = await openViewer('watch');
    setTicket({
      url: result.url,
      startedAt,
      isControlling: false,
    });
  };

  return {
    computer,
    url: current?.url ?? null,
    isControlling: current?.isControlling ?? false,
    takeOver,
    finish,
  };
}
