import type { NoteColor, Priority } from '@/types';

/** Shared application constants. */

export const APP_NAME = 'NoteFlow';
export const APP_TAGLINE = 'Capture. Organize. Flow.';

/** Note colors with their CSS variable and a display label.
 *  The `--note-*` variables hold bare HSL triples (e.g. `0 78% 88%`), so they
 *  must always be wrapped in `hsl(...)` before being used as a color value. */
export const NOTE_COLORS: {
  value: NoteColor;
  label: string;
  cssVar: string;
}[] = [
  { value: 'default', label: 'Default', cssVar: 'hsl(var(--note-default))' },
  { value: 'red', label: 'Red', cssVar: 'hsl(var(--note-red))' },
  { value: 'orange', label: 'Orange', cssVar: 'hsl(var(--note-orange))' },
  { value: 'amber', label: 'Amber', cssVar: 'hsl(var(--note-amber))' },
  { value: 'green', label: 'Green', cssVar: 'hsl(var(--note-green))' },
  { value: 'teal', label: 'Teal', cssVar: 'hsl(var(--note-teal))' },
  { value: 'blue', label: 'Blue', cssVar: 'hsl(var(--note-blue))' },
  { value: 'indigo', label: 'Indigo', cssVar: 'hsl(var(--note-indigo))' },
  { value: 'purple', label: 'Purple', cssVar: 'hsl(var(--note-purple))' },
  { value: 'pink', label: 'Pink', cssVar: 'hsl(var(--note-pink))' },
];

/** Resolve a note color to a usable CSS color, optionally with alpha (0–1). */
export function noteColorVar(color: NoteColor, alpha?: number): string {
  return alpha === undefined
    ? `hsl(var(--note-${color}))`
    : `hsl(var(--note-${color}) / ${alpha})`;
}

/** Tag preset colors. */
export const TAG_COLORS = [
  '#f43f5e',
  '#f97316',
  '#f59e0b',
  '#84cc16',
  '#10b981',
  '#06b6d4',
  '#3b82f6',
  '#6366f1',
  '#8b5cf6',
  '#d946ef',
];

/** Folder preset colors. */
export const FOLDER_COLORS = [
  '#f43f5e',
  '#f97316',
  '#f59e0b',
  '#84cc16',
  '#10b981',
  '#06b6d4',
  '#3b82f6',
  '#6366f1',
  '#8b5cf6',
  '#d946ef',
  '#94a3b8',
];

/** Accent presets. `value` is a hex for swatch rendering; `hsl` is the bare
 *  HSL triple written into the `--primary` / `--ring` CSS variables, which the
 *  Tailwind theme consumes as `hsl(var(--primary))`. */
export const ACCENT_COLORS: { name: string; value: string; hsl: string }[] = [
  { name: 'Indigo', value: '#6366f1', hsl: '239 84% 67%' },
  { name: 'Blue', value: '#3b82f6', hsl: '217 91% 60%' },
  { name: 'Sky', value: '#0ea5e9', hsl: '199 89% 48%' },
  { name: 'Teal', value: '#14b8a6', hsl: '173 80% 40%' },
  { name: 'Emerald', value: '#10b981', hsl: '160 84% 39%' },
  { name: 'Violet', value: '#8b5cf6', hsl: '258 90% 66%' },
  { name: 'Fuchsia', value: '#d946ef', hsl: '292 84% 61%' },
  { name: 'Rose', value: '#f43f5e', hsl: '350 89% 60%' },
  { name: 'Amber', value: '#f59e0b', hsl: '38 92% 50%' },
];

export const DEFAULT_ACCENT_HSL = ACCENT_COLORS[0].hsl;

/** Map a stored accent (hex or HSL triple) to the HSL triple the theme needs. */
export function accentToHsl(accent?: string | null): string {
  if (!accent) return DEFAULT_ACCENT_HSL;
  if (!accent.startsWith('#')) return accent;
  return ACCENT_COLORS.find((a) => a.value.toLowerCase() === accent.toLowerCase())?.hsl
    ?? DEFAULT_ACCENT_HSL;
}

export const PRIORITY_OPTIONS: {
  value: Priority;
  label: string;
}[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

export const FONT_SIZES = ['sm', 'md', 'lg'] as const;

/** NoteFlow ships in English only — there is no language selector. */
export const APP_LANGUAGE = 'en';

/** Supported file types for attachments. */
export const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
export const ACCEPTED_VIDEO_TYPES = ['video/webm', 'video/mp4', 'video/ogg'];
export const ACCEPTED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'application/zip',
  'application/octet-stream',
];

export const MAX_ATTACHMENT_SIZE_MB = 25;

/** Cloudinary unsigned upload configuration. Attachments are uploaded directly
 *  from the browser to Cloudinary's CDN using an unsigned preset (no secret). */
export const CLOUDINARY_CLOUD_NAME =
  import.meta.env.VITE_CLOUDINARY_CLOUD_NAME ?? 'iij3g2g5';
export const CLOUDINARY_UPLOAD_PRESET =
  import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET ?? 'noteflow_preset';
export const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

/** Sort options for the notes page. */
export const SORT_OPTIONS = [
  { value: 'updated_desc', label: 'Recently updated' },
  { value: 'created_desc', label: 'Recently created' },
  { value: 'created_asc', label: 'Oldest first' },
  { value: 'title_asc', label: 'Title A–Z' },
  { value: 'title_desc', label: 'Title Z–A' },
] as const;

/** Firestore collection names (single source of truth). */
export const DB = {
  profiles: 'profiles',
  notes: 'notes',
  folders: 'folders',
  tags: 'tags',
  attachments: 'attachments',
  versions: 'versions',
  settings: 'settings',
  activityLogs: 'activity_logs',
  noteShares: 'note_shares',
} as const;