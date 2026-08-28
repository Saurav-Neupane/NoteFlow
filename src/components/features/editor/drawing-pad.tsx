import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Pencil, Trash2, Undo2, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { strokesToDataUrl, clearCanvas, type DrawStroke } from '@/utils/drawing';

const COLORS = ['#0f172a', '#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#ffffff'];

interface DrawingPadProps {
  onSubmit: (dataUrl: string) => void;
  onCancel: () => void;
  initial?: string | null;
}

/** Simple whiteboard that exports to a data URL attachment. */
export function DrawingPad({ onSubmit, onCancel, initial }: DrawingPadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [strokes, setStrokes] = useState<DrawStroke[]>([]);
  const [color, setColor] = useState(COLORS[0]);
  const [width, setWidth] = useState(3);
  const drawing = useRef(false);
  const current = useRef<DrawStroke | null>(null);

  const getPos = useCallback((e: React.PointerEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const wrap = wrapRef.current!;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = wrap.clientWidth * dpr;
    canvas.height = wrap.clientHeight * dpr;
    canvas.style.width = `${wrap.clientWidth}px`;
    canvas.style.height = `${wrap.clientHeight}px`;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, wrap.clientWidth, wrap.clientHeight);

    if (initial) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, wrap.clientWidth, wrap.clientHeight);
      img.src = initial;
    }
  }, [initial]);

  const redraw = useCallback((list: DrawStroke[], includePartial = true) => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const wrap = wrapRef.current!;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, wrap.clientWidth, wrap.clientHeight);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, wrap.clientWidth, wrap.clientHeight);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const s of includePartial && current.current ? [...list, current.current] : list) {
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.width;
      ctx.beginPath();
      s.points.forEach((p, i) =>
        i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)
      );
      ctx.stroke();
    }
  }, []);

  const onDown = (e: React.PointerEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current!;
    canvas.setPointerCapture(e.pointerId);
    drawing.current = true;
    current.current = { points: [getPos(e)], color, width };
  };

  const onMove = (e: React.PointerEvent) => {
    if (!drawing.current || !current.current) return;
    current.current.points.push(getPos(e));
    redraw(strokes);
  };

  const onUp = () => {
    if (!drawing.current) return;
    drawing.current = false;
    if (current.current) setStrokes((s) => [...s, current.current!]);
    current.current = null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col gap-3"
    >
      <div ref={wrapRef} className="relative h-72 overflow-hidden rounded-xl border bg-white">
        <canvas
          ref={canvasRef}
          className="drawing-canvas absolute inset-0 h-full w-full"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerLeave={onUp}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {COLORS.map((c) => (
          <button
            key={c}
            style={{ background: c }}
            onClick={() => setColor(c)}
            className={`h-6 w-6 rounded-full ring-offset-2 transition-shadow ${
              color === c ? 'ring-2 ring-primary' : 'ring-1 ring-black/10'
            }`}
            aria-label={`Color ${c}`}
          />
        ))}
        <span className="mx-1 h-6 w-px bg-border" />
        {[2, 4, 6].map((w) => (
          <Button
            key={w}
            variant="ghost"
            size="icon-sm"
            onClick={() => setWidth(w)}
            className={width === w ? 'bg-accent' : ''}
          >
            <Pencil className="h-4 w-4" style={{ strokeWidth: w * 0.8 }} />
          </Button>
        ))}
        <Button variant="ghost" size="icon-sm" onClick={() => { setStrokes([]); clearCanvas(canvasRef.current!); }}>
          <Trash2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => {
            if (!strokes.length) return;
            const prev = [...strokes];
            prev.pop();
            setStrokes(prev);
            redraw(prev);
          }}
          disabled={!strokes.length}
        >
          <Undo2 className="h-4 w-4" />
        </Button>
        <span className="mx-1 h-6 w-px bg-border" />
        <Button variant="outline" size="sm" onClick={onCancel}>
          <Circle className="h-4 w-4" />
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={() =>
            onSubmit(strokesToDataUrl(canvasRef.current!, strokes))
          }
          disabled={!strokes.length}
        >
          Save drawing
        </Button>
      </div>
    </motion.div>
  );
}