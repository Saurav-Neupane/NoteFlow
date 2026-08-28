import { useState, useCallback } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import { Check, GripVertical } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import type { CheckItem } from '@/utils/checklist';

interface ChecklistProps {
  items: CheckItem[];
  onChange: (items: CheckItem[]) => void;
  collapsed?: boolean;
}

/** Interactive, draggable, nested-capable checklist with progress. */
export function Checklist({ items, onChange, collapsed = false }: ChecklistProps) {
  const [expanded, setExpanded] = useState(!collapsed);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const done = items.filter((i) => i.checked).length;
  const pct = items.length ? Math.round((done / items.length) * 100) : 0;

  const toggle = useCallback(
    (index: number) => {
      const next = [...items];
      next[index] = { ...next[index], checked: !next[index].checked };
      onChange(next);
    },
    [items, onChange]
  );

  const onDragEnd = useCallback(
    ({ active, over }: DragEndEvent) => {
      if (!over || active.id === over.id) return;
      const from = Number(active.id);
      const to = Number(over.id);
      onChange(arrayMove(items, from, to));
    },
    [items, onChange]
  );

  return (
    <div className="rounded-xl border bg-card/60 p-3">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="mb-2 flex w-full items-center justify-between gap-2"
      >
        <span className="flex items-center gap-2 text-sm font-semibold">
          <Check className="h-4 w-4 text-primary" />
          Checklist
        </span>
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          {done}/{items.length}
          <span className={expanded ? 'rotate-180 transition-transform' : 'transition-transform'}>▾</span>
        </span>
      </button>

      {expanded && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
          <Progress value={pct} className="mb-3 h-1.5" />
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={items.map((_, i) => i)} strategy={verticalListSortingStrategy}>
              <ul className="space-y-1">
                {items.map((item, index) => (
                  <SortableItem key={index} id={index} item={item} onToggle={() => toggle(index)} />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
        </motion.div>
      )}
    </div>
  );
}

function SortableItem({
  id,
  item,
  onToggle,
}: {
  id: number;
  item: CheckItem;
  onToggle: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`flex items-center gap-2 rounded-lg px-1.5 py-1.5 ${isDragging ? 'z-10 bg-accent shadow' : ''}`}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab text-muted-foreground/50 hover:text-muted-foreground active:cursor-grabbing"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={onToggle}
        aria-label={item.checked ? 'Mark incomplete' : 'Mark complete'}
        className={`flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-md border transition-colors ${
          item.checked ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/40 hover:border-primary'
        }`}
      >
        {item.checked && <Check className="h-3 w-3" />}
      </button>
      <span className={`flex-1 text-sm ${item.checked ? 'text-muted-foreground line-through' : ''}`}>
        {item.text}
      </span>
    </li>
  );
}