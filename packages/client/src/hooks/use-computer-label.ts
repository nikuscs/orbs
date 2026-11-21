import { m } from '@repo/i18n/client';
import { useEffect, useState } from 'react';
import { match, P } from 'ts-pattern';
import { COMPUTER } from '../services/computer/computer.constants';
import type { ComputerLabel } from '../types/computer.types';
import type { ComputerStatus } from '@repo/contracts/universal';

function minutesUntil(at: number, now: number) {
  return Math.max(1, Math.ceil((at - now) / COMPUTER.minuteMs));
}

export function useComputerLabel(status: ComputerStatus | null, isControlling = false): ComputerLabel {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), COMPUTER.clockMs);

    return () => clearInterval(timer);
  }, []);

  return match(status)
    .returnType<ComputerLabel>()
    .with(P.nullish, () => ({ label: m.rooms_computer_off(), tone: 'default' }))
    .with({ control: { deviceName: P.string }, state: 'running' }, ({ control }) => ({
      label: isControlling ? m.rooms_computer_controlled() : m.rooms_computer_controlled_by({ device: control.deviceName }),
      tone: 'warning',
    }))
    .with({ state: 'off' }, () => ({ label: m.rooms_computer_off(), tone: 'default' }))
    .with({ state: 'running', sleepsAt: P.number }, ({ sleepsAt }) => ({
      label: m.rooms_computer_sleeps_in({ minutes: minutesUntil(sleepsAt, now) }),
      tone: 'success',
    }))
    .with({ state: 'running' }, () => ({ label: m.rooms_computer_running(), tone: 'success' }))
    .with({ state: 'sleeping', shutsDownAt: P.number }, ({ shutsDownAt }) => ({
      label: m.rooms_computer_shuts_down_in({ minutes: minutesUntil(shutsDownAt, now) }),
      tone: 'default',
    }))
    .with({ state: 'sleeping' }, () => ({ label: m.rooms_computer_sleeping(), tone: 'default' }))
    .exhaustive();
}
