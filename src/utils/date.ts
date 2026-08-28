import { formatDistanceToNow, format, isToday, isYesterday, isThisWeek, isThisYear } from 'date-fns';

/** Human-friendly, locale-aware date display for note cards. */
export function formatRelative(dateIso: string | null | undefined): string {
  if (!dateIso) return '';
  const date = new Date(dateIso);
  if (isToday(date)) return `Today · ${format(date, 'h:mm a')}`;
  if (isYesterday(date)) return `Yesterday · ${format(date, 'h:mm a')}`;
  if (isThisWeek(date)) return format(date, 'EEEE · h:mm a');
  if (isThisYear(date)) return format(date, 'MMM d');
  return format(date, 'MMM d, yyyy');
}

export function formatTimeAgo(dateIso: string | null | undefined): string {
  if (!dateIso) return '';
  return formatDistanceToNow(new Date(dateIso), { addSuffix: true });
}

export function formatFullDate(dateIso: string | null | undefined): string {
  if (!dateIso) return '';
  return format(new Date(dateIso), 'EEEE, MMMM d, yyyy');
}

export function formatMinute(dateIso: string | null | undefined): string {
  if (!dateIso) return '';
  return format(new Date(dateIso), 'h:mm a');
}

/** Multi-line greeting based on local time. */
export function greetingFor(date: Date = new Date()): string {
  const h = date.getHours();
  if (h < 5) return 'Good night';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 22) return 'Good evening';
  return 'Good night';
}