import { useEffect, useRef, useState } from 'react';

const BOT_AVATAR_FLASH_MS = 1400;

export function useBotAvatarFlash() {
  const [moving, setMoving] = useState(false);
  const [label, setLabel] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const flash = (nextLabel: string, change: () => void) => {
    setMoving(true);
    setLabel(nextLabel);
    requestAnimationFrame(change);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setMoving(false);
      setLabel('');
    }, BOT_AVATAR_FLASH_MS);
  };

  return { moving, label, flash };
}
