import { useCallback, useEffect, useRef, useState } from 'react';
import { EditorToolbar, type EditorAction } from './toolbar';
import { parseChecklist, checklistCompleted, checklistTotal } from '@/utils/checklist';
import { countWords, readingTimeMinutes, htmlToPlainText } from '@/utils/text';

interface RichEditorProps {
  /** Initial HTML content. */
  initialHtml?: string;
  onContentChange?: (html: string, text: string) => void;
  onStatsChange?: (stats: { words: number; chars: number; readMinutes: number; checklist: { done: number; total: number } }) => void;
  placeholder?: string;
  autofocus?: boolean;
  /** Ref for programmatic blur/focus from parent. */
  innerRef?: React.RefObject<HTMLDivElement | null>;
}

function execCommand(cmd: string, value?: string) {
  document.execCommand(cmd, false, value);
}

/** Contenteditable rich text editor with a full toolbar and live stats. */
export function RichEditor({
  initialHtml = '',
  onContentChange,
  onStatsChange,
  placeholder = 'Start writing…',
  autofocus = false,
  innerRef,
}: RichEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<Partial<Record<EditorAction, boolean>>>({});
  const initialRef = useRef(initialHtml);

  const emit = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    const html = el.innerHTML;
    const text = htmlToPlainText(html);
    onContentChange?.(html, text);

    if (onStatsChange) {
      const words = countWords(text);
      const checklist = parseChecklist(html);
      onStatsChange({
        words,
        chars: text.length,
        readMinutes: readingTimeMinutes(words),
        checklist: {
          done: checklistCompleted(checklist),
          total: checklistTotal(checklist),
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    el.innerHTML = initialRef.current;
    if (autofocus) {
      const sel = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(el);
      range.collapse(false);
      sel?.removeAllRanges();
      sel?.addRange(range);
      el.focus();
    }
    emit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced emit on user edits.
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    let t: ReturnType<typeof setTimeout>;
    const onInput = () => {
      clearTimeout(t);
      t = setTimeout(emit, 250);
    };
    el.addEventListener('input', onInput);
    el.addEventListener('blur', emit);
    return () => {
      clearTimeout(t);
      el.removeEventListener('input', onInput);
      el.removeEventListener('blur', emit);
    };
  }, [emit]);

  const handleAction = useCallback(
    (action: EditorAction) => {
      const el = editorRef.current;
      if (!el) return;
      el.focus();

      switch (action) {
        case 'bold': execCommand('bold'); break;
        case 'italic': execCommand('italic'); break;
        case 'underline': execCommand('underline'); break;
        case 'strike': execCommand('strikeThrough'); break;
        case 'highlight': execCommand('hiliteColor', '#fef08a'); break;
        case 'align-left': execCommand('justifyLeft'); break;
        case 'align-center': execCommand('justifyCenter'); break;
        case 'align-right': execCommand('justifyRight'); break;
        case 'h1': execCommand('formatBlock', '<h1>'); break;
        case 'h2': execCommand('formatBlock', '<h2>'); break;
        case 'h3': execCommand('formatBlock', '<h3>'); break;
        case 'bullet': execCommand('insertUnorderedList'); break;
        case 'number': execCommand('insertOrderedList'); break;
        case 'quote': execCommand('formatBlock', '<blockquote>'); break;
        case 'code': execCommand('formatBlock', '<pre>'); break;
        case 'divider': execCommand('insertHorizontalRule'); break;
        case 'undo': execCommand('undo'); break;
        case 'redo': execCommand('redo'); break;
        case 'link': insertLink(el); break;
        case 'table': insertTable(el); break;
        case 'checklist': insertChecklist(el); break;
        case 'mention': insertInline(el, '@ '); break;
        case 'emoji': insertInline(el, '😊 '); break;
        default: break;
      }

      refreshActive(setActive, el);
      emit();
    },
    [emit]
  );

  // Expose the toolbar handler + ref for parent-controlled tools.
  useEffect(() => {
    if (innerRef && editorRef.current) {
      (innerRef as React.MutableRefObject<HTMLDivElement | null>).current = editorRef.current;
    }
  }, [innerRef]);

  return (
    <div className="flex flex-col gap-2">
      <EditorToolbar
        onAction={handleAction}
        active={active}
        onFileSelect={(kind) => {
          // File selection handled by the parent via a custom event.
          window.dispatchEvent(new CustomEvent('noteflow:editor-file', { detail: kind }));
        }}
      />
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        data-placeholder={placeholder}
        className="editor-area min-h-[320px] rounded-xl px-4 py-3 ring-1 ring-transparent transition-shadow focus-visible:outline-none [&:empty::before]:content-[attr(data-placeholder)] [&:empty::before]:text-muted-foreground/60"
      />
    </div>
  );
}

function refreshActive(
  setActive: React.Dispatch<React.SetStateAction<Partial<Record<EditorAction, boolean>>>>,
  el: HTMLElement
) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const node = sel.anchorNode;
  setActive({
    bold: node?.parentElement?.closest('b, strong') != null,
    italic: node?.parentElement?.closest('i, em') != null,
    underline: node?.parentElement?.closest('u') != null,
    strike: node?.parentElement?.closest('s, del, strike') != null,
    'align-left': false,
    'align-center': false,
    'align-right': false,
  });
}

function insertLink(el: HTMLElement) {
  const url = window.prompt('Enter URL:');
  if (!url) return;
  el.focus();
  execCommand('createLink', url.startsWith('http') ? url : `https://${url}`);
}

function insertTable(el: HTMLElement) {
  const html =
    '<table><tbody><tr><td>Cell</td><td>Cell</td></tr><tr><td>Cell</td><td>Cell</td></tr></tbody></table>';
  insertHtmlAtCursor(html);
  void el;
}

function insertChecklist(el: HTMLElement) {
  insertHtmlAtCursor('<ul data-list="checklist"><li data-check="false">Task</li></ul>');
  void el;
}

function insertInline(el: HTMLElement, text: string) {
  el.focus();
  document.execCommand('insertText', false, text);
}

/** Insert raw HTML at the caret and re-normalize. */
function insertHtmlAtCursor(html: string) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return;
  const range = sel.getRangeAt(0);
  const temp = document.createElement('div');
  temp.innerHTML = html;
  const frag = document.createDocumentFragment();
  while (temp.firstChild) frag.appendChild(temp.firstChild);
  range.deleteContents();
  range.insertNode(frag);
  sel.removeAllRanges();
}

