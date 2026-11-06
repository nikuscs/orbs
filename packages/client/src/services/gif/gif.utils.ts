import { GIF } from '@repo/contracts/universal';

export function gifEmojiUrl(emoji: string) {
  const codepoints = Array.from(emoji, (char) => char.codePointAt(0)?.toString(16)).join('_');

  return `${GIF.emojiOrigin}/${codepoints}/${GIF.emojiFile}`;
}
