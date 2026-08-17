/**
 * The Guardian and NYT return real word counts; NewsAPI returns none, so those
 * articles show nothing rather than an invented estimate.
 */
const WORDS_PER_MINUTE = 230;

export function readingTime(wordCount: number | null): string | null {
  if (!wordCount || wordCount <= 0) return null;

  const minutes = Math.max(1, Math.round(wordCount / WORDS_PER_MINUTE));
  return `${minutes} min read`;
}
