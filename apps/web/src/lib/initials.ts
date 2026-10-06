export function initialsFromNames(names: string[]): string {
  if (!names.length) {
    return '';
  }

  let allWords = names
    .join(' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (allWords.length === 1 && allWords.at(0)?.includes('@')) {
    const username = allWords.at(0)?.split('@').at(0);

    if (username) {
      allWords = [username];
    }
  }

  if (!allWords.length) {
    return '';
  }

  const getFirstLetter = (word: string): string => {
    const match = /[a-zA-Z]/.exec(word);
    return match ? (match.at(0) ?? '') : '';
  };

  if (allWords.length >= 2) {
    const first = getFirstLetter(allWords.at(0) ?? '');
    const second = getFirstLetter(allWords.at(1) ?? '');

    if (first && second) {
      return (first + second).toUpperCase();
    }
  }

  const firstWord = allWords.at(0) ?? '';
  const letters = firstWord.match(/[a-zA-Z]/g) ?? [];

  if (letters.length >= 2) {
    return ((letters.at(0) ?? '') + (letters.at(1) ?? '')).toUpperCase();
  }

  if (letters.length === 1) {
    return (letters.at(0) ?? '').toUpperCase().repeat(2);
  }

  return 'XX';
}
