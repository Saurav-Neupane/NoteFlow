/** Typed checklist operations shared between the editor and cards. */

export interface CheckItem {
  text: string;
  checked: boolean;
}

/**
 * Parse HTML fragment into a flat checklist model.
 * Each `<li data-check="...">` produces one CheckItem. Used to compute
 * progress bars without mutating editor state.
 */
export function parseChecklist(html: string): CheckItem[] {
  const doc = document.createElement('div');
  doc.innerHTML = html;
  const items: CheckItem[] = [];
  doc.querySelectorAll('[data-check]').forEach((li) => {
    items.push({
      checked: li.getAttribute('data-check') === 'true',
      text: (li.textContent ?? '').trim(),
    });
  });
  return items;
}

/** Parse an HTML fragment and return the React virtual DOM (for previews). */
export function fragmentToReact(html: string): { type: string; props: object } | null {
  const doc = document.createElement('div');
  doc.innerHTML = html;
  const first = doc.firstElementChild;
  if (!first) return null;
  const props: Record<string, unknown> = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    children: (first as any).innerHTML,
  };
  return { type: first.tagName.toLowerCase(), props };
}

export function checklistCompleted(items: CheckItem[]): number {
  return items.filter((i) => i.checked).length;
}

export function checklistTotal(items: CheckItem[]): number {
  return items.length;
}

/** Serialize a checklist back into HTML list items (editor round-trip). */
export function checklistToHtml(items: CheckItem[]): string {
  return `<ul data-list="checklist">${items
    .map((i) => `<li data-check="${i.checked}">${i.text}</li>`)
    .join('')}</ul>`;
}