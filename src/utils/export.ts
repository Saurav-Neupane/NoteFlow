import { jsPDF } from 'jspdf';
import type { Note } from '@/types';
import { htmlToPlainText, toFilename } from '@/utils/text';
import { formatFullDate } from '@/utils/date';
import { APP_NAME } from '@/constants';

function triggerDownload(content: BlobPart, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Export a note as a plain-text Markdown-ish file. */
export function exportNoteAsTxt(note: Note): boolean {
  try {
    const header = [
      note.title ? `# ${note.title}` : 'Untitled',
      '',
      _createdLine(note),
      '',
      '---',
      '',
      note.content_text ?? '',
      '',
      `-- ${APP_NAME}`,
    ].join('\n');
    triggerDownload(header, `${toFilename(note.title)}.txt`, 'text/plain;charset=utf-8');
    return true;
  } catch {
    return false;
  }
}

function _createdLine(note: Note): string {
  return `Created: ${formatFullDate(note.created_at)}`;
}

/**
 * Export a note to PDF with a branded header and the note's plain text.
 * Rich HTML → styled PDF is intentionally kept dependency-light: we lay the
 * plain content onto a clean grid to guarantee a consistent output.
 */
export async function exportNoteAsPdf(note: Note): Promise<boolean> {
  try {
    const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
    const width = pdf.internal.pageSize.getWidth();
    const height = pdf.internal.pageSize.getHeight();
    const margin = 56;
    const contentWidth = width - margin * 2;

    // Header band
    pdf.setFillColor(99, 102, 241);
    pdf.rect(0, 0, width, 84, 'F');
    pdf.setFillColor(139, 92, 246);
    pdf.rect(0, 84, width, 6, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(22);
    pdf.text(note.title || 'Untitled', margin, 46);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(11);
    pdf.setTextColor(240, 240, 255);
    pdf.text(`${APP_NAME} · ${formatFullDate(note.created_at)}`, margin, 70);

    pdf.setTextColor(30, 30, 40);
    pdf.setFontSize(11);
    const body = note.content_text ?? '';
    const lines = pdf.splitTextToSize(body || ' ', contentWidth);
    let y = 130;
    pdf.setFont('helvetica', 'normal');

    for (const line of lines) {
      if (y > height - margin) {
        pdf.addPage();
        y = margin;
      }
      pdf.text(line, margin, y);
      y += 16;
    }

    pdf.save(`${toFilename(note.title)}.pdf`);
    return true;
  } catch {
    return false;
  }
}

/** Export the whole user's note library as a JSON backup. */
export function exportBackup(notes: Note[], metadata: Record<string, unknown> = {}): boolean {
  try {
    const payload = {
      app: APP_NAME,
      version: '1.0.0',
      exported_at: new Date().toISOString(),
      ...metadata,
      notes,
    };
    triggerDownload(
      JSON.stringify(payload, null, 2),
      `noteflow-backup-${Date.now()}.json`,
      'application/json'
    );
    return true;
  } catch {
    return false;
  }
}