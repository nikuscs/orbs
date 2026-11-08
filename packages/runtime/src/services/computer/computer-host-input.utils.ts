import { match } from 'ts-pattern';
import { COMPUTER_HOST } from './computer-host.constants';
import { computerHostKey } from './computer-host.utils';
import type * as HostTypes from '../../types/computer-host.types';
import type * as ComputerTypes from '../../types/computer.types';

export function computerHostInputRequest(input: ComputerTypes.ComputerAction): HostTypes.ComputerHostInput {
  const computerHostInputPointer = (body: object): HostTypes.ComputerHostInput => ({
    method: 'ComputerService/Pointer',
    body: { target: COMPUTER_HOST.targets.screen, ...body },
  });

  const computerHostInputKeyboard = (body: object): HostTypes.ComputerHostInput => ({
    method: 'ComputerService/Keyboard',
    body: { target: COMPUTER_HOST.targets.keyboard, ...body },
  });

  return match(input)
    .with({ action: 'click' }, ({ x, y }) => computerHostInputPointer({ click: { position: { x, y }, button: 'MOUSE_BUTTON_LEFT', count: 1 } }))
    .with({ action: 'double_click' }, ({ x, y }) => computerHostInputPointer({ click: { position: { x, y }, button: 'MOUSE_BUTTON_LEFT', count: 2 } }))
    .with({ action: 'right_click' }, ({ x, y }) => computerHostInputPointer({ click: { position: { x, y }, button: 'MOUSE_BUTTON_RIGHT', count: 1 } }))
    .with({ action: 'move' }, ({ x, y }) => computerHostInputPointer({ move: { position: { x, y } } }))
    .with({ action: 'drag' }, ({ x, y, toX, toY }) => computerHostInputPointer({ drag: { from: { x, y }, to: { x: toX, y: toY } } }))
    .with({ action: 'scroll' }, ({ x, y, dx, dy }) => computerHostInputPointer({ scroll: { position: { x, y }, deltaX: dx, deltaY: dy, unit: 'SCROLL_UNIT_LINE' } }))
    .with({ action: 'type' }, ({ text }) => computerHostInputKeyboard({ type: { text, mode: 'TEXT_ENTRY_MODE_KEYSTROKES' } }))
    .with({ action: 'key' }, ({ keys }) => computerHostInputKeyboard(keys.length === 1
      ? { press: { key: computerHostKey(keys[0] ?? '') } }
      : { hotkey: { keys: keys.map(computerHostKey) } }))
    .exhaustive();
}
