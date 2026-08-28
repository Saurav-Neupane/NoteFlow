/** Text analysis & transformation helpers. */

/** Words per minute used for reading-time estimates. */
const WPM = 200;

export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

export function countCharacters(text: string): number {
  return text.length;
}

export function readingTimeMinutes(words: number): number {
  if (words <= 0) return 1;
  return Math.max(1, Math.round(words / WPM));
}

/** Generate a deterministic id from a string (for icon/color lookups). */
export function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function truncate(text: string, length = 120): string {
  if (text.length <= length) return text;
  return text.slice(0, length).trimEnd() + '…';
}

/** Extract a plain-text preview from rich HTML content. */
export function htmlToPlainText(html: string | null | undefined): string {
  if (!html) return '';
  // Build in a detached element to avoid touching the live DOM.
  const doc = document.createElement('div');
  doc.innerHTML = html;
  return doc.textContent ?? '';
}

/** Escape HTML special characters (used when injecting raw text). */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

/** Strips leading `# ` style Markdown heading markers from a title. */
export function cleanTitle(title: string): string {
  return title.replace(/^\s*#+\s*/, '').trim();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Turn a string into a valid filename slug (for exports). */
export function toFilename(title: string): string {
  return slugify(title).slice(0, 60) || 'note';
}