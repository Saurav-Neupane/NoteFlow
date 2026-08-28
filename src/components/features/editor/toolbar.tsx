import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Highlighter,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  ListTodo,
  Code,
  Quote,
  Minus,
  Table,
  Image,
  Paperclip,
  PenTool,
  Smile,
  AtSign,
  Link,
  Undo2,
  Redo2,
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/utils/cn';

export type EditorAction =
  | 'bold' | 'italic' | 'underline' | 'strike' | 'highlight'
  | 'align-left' | 'align-center' | 'align-right'
  | 'h1' | 'h2' | 'h3'
  | 'bullet' | 'number' | 'checklist'
  | 'code' | 'quote' | 'divider' | 'table'
  | 'image' | 'attachment' | 'drawing' | 'emoji' | 'mention' | 'link'
  | 'undo' | 'redo';

interface ToolbarProps {
  onAction: (action: EditorAction) => void;
  active: Partial<Record<EditorAction, boolean>>;
  onFileSelect?: (kind: 'image' | 'attachment') => void;
  disabled?: boolean;
}

interface ToolButton {
  action: EditorAction;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  section?: boolean;
}

const PRIMARY_TOOLS: ToolButton[] = [
  { action: 'undo', label: 'Undo', icon: Undo2 },
  { action: 'redo', label: 'Redo', icon: Redo2 },
  { action: 'bold', label: 'Bold', icon: Bold },
  { action: 'italic', label: 'Italic', icon: Italic },
  { action: 'underline', label: 'Underline', icon: Underline },
  { action: 'strike', label: 'Strikethrough', icon: Strikethrough },
  { action: 'highlight', label: 'Highlight', icon: Highlighter },
  { action: 'h1', label: 'Heading 1', icon: Heading1 },
  { action: 'h2', label: 'Heading 2', icon: Heading2 },
  { action: 'h3', label: 'Heading 3', icon: Heading3 },
  { action: 'bullet', label: 'Bullet list', icon: List },
  { action: 'number', label: 'Numbered list', icon: ListOrdered },
  { action: 'checklist', label: 'Checklist', icon: ListTodo },
  { action: 'quote', label: 'Quote', icon: Quote },
  { action: 'code', label: 'Code block', icon: Code },
  { action: 'divider', label: 'Divider', icon: Minus },
  { action: 'table', label: 'Insert table', icon: Table },
  { action: 'align-left', label: 'Align left', icon: AlignLeft },
  { action: 'align-center', label: 'Align center', icon: AlignCenter },
  { action: 'align-right', label: 'Align right', icon: AlignRight },
  { action: 'link', label: 'Insert link', icon: Link },
  { action: 'mention', label: 'Mention', icon: AtSign },
  { action: 'emoji', label: 'Emoji', icon: Smile },
];

const MEDIA_TOOLS: ToolButton[] = [
  { action: 'image', label: 'Image', icon: Image },
  { action: 'attachment', label: 'Attach file', icon: Paperclip },
  { action: 'drawing', label: 'Drawing', icon: PenTool },
];

/** Floating rich-text toolbar (wraps on small screens). */
export function EditorToolbar({ onAction, active, onFileSelect, disabled }: ToolbarProps) {
  return (
    <div className="glass-strong sticky top-0 z-20 flex flex-wrap items-center gap-0.5 rounded-2xl border px-2 py-1.5">
      {PRIMARY_TOOLS.map((tool) => (
        <ToolButton key={tool.action} tool={tool} onAction={onAction} active={active[tool.action]} disabled={disabled} />
      ))}

      <span className="mx-1 my-1 h-6 w-px bg-border" />

      {MEDIA_TOOLS.map((tool) =>
        tool.action === 'image' || tool.action === 'attachment' ? (
          <ToolButton
            key={tool.action}
            tool={tool}
            onAction={(a) => {
              if (a === 'image' || a === 'attachment') {
                onFileSelect?.(a);
              } else {
                onAction(a);
              }
            }}
            active={active[tool.action]}
            disabled={disabled}
          />
        ) : (
          <ToolButton key={tool.action} tool={tool} onAction={onAction} active={active[tool.action]} disabled={disabled} />
        )
      )}
    </div>
  );
}

function ToolButton({
  tool,
  onAction,
  active,
  disabled,
}: {
  tool: ToolButton;
  onAction: (a: EditorAction) => void;
  active?: boolean;
  disabled?: boolean;
}) {
  const Icon = tool.icon;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          disabled={disabled}
          aria-label={tool.label}
          aria-pressed={active}
          onClick={() => onAction(tool.action)}
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-lg transition-colors disabled:pointer-events-none disabled:opacity-40',
            active
              ? 'bg-primary/15 text-primary'
              : 'text-muted-foreground hover:bg-accent hover:text-foreground'
          )}
        >
          <Icon className="h-4 w-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{tool.label}</TooltipContent>
    </Tooltip>
  );
}