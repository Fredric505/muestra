import { useRef, useState, useCallback } from "react";

interface PatternLockProps {
  value: number[];
  onChange: (pattern: number[]) => void;
  size?: number;
}

// 3x3 grid pattern lock. Nodes numbered 1-9 (like a phone keypad).
export const PatternLock = ({ value, onChange, size = 240 }: PatternLockProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);

  const padding = size * 0.12;
  const step = (size - padding * 2) / 2;

  const nodes = Array.from({ length: 9 }, (_, i) => {
    const row = Math.floor(i / 3);
    const col = i % 3;
    return { id: i + 1, x: padding + col * step, y: padding + row * step };
  });

  const getPoint = useCallback((e: React.PointerEvent) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * size,
      y: ((e.clientY - rect.top) / rect.height) * size,
    };
  }, [size]);

  const nodeAt = useCallback((x: number, y: number) => {
    const radius = step * 0.4;
    return nodes.find((n) => Math.hypot(n.x - x, n.y - y) <= radius);
  }, [nodes, step]);

  const start = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    setIsDrawing(true);
    onChange([]);
    const p = getPoint(e);
    setCursor(p);
    const n = nodeAt(p.x, p.y);
    if (n) onChange([n.id]);
  };

  const move = (e: React.PointerEvent) => {
    if (!isDrawing) return;
    const p = getPoint(e);
    setCursor(p);
    const n = nodeAt(p.x, p.y);
    if (n && !value.includes(n.id)) onChange([...value, n.id]);
  };

  const end = () => {
    setIsDrawing(false);
    setCursor(null);
  };

  const nodeById = (id: number) => nodes.find((n) => n.id === id)!;

  return (
    <div className="inline-flex flex-col items-center gap-2 select-none">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${size} ${size}`}
        style={{ width: size, height: size, touchAction: "none" }}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
        className="rounded-lg border border-input bg-muted/30"
      >
        {value.map((id, i) => {
          if (i === 0) return null;
          const a = nodeById(value[i - 1]);
          const b = nodeById(id);
          return <line key={`l${i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="hsl(var(--primary))" strokeWidth={4} strokeLinecap="round" />;
        })}
        {isDrawing && value.length > 0 && cursor && (
          <line x1={nodeById(value[value.length - 1]).x} y1={nodeById(value[value.length - 1]).y} x2={cursor.x} y2={cursor.y} stroke="hsl(var(--primary))" strokeWidth={4} strokeLinecap="round" opacity={0.5} />
        )}
        {nodes.map((n) => {
          const active = value.includes(n.id);
          return (
            <g key={n.id}>
              <circle cx={n.x} cy={n.y} r={step * 0.32} fill={active ? "hsl(var(--primary) / 0.2)" : "transparent"} stroke="hsl(var(--border))" strokeWidth={2} />
              <circle cx={n.x} cy={n.y} r={step * 0.1} fill={active ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))"} />
            </g>
          );
        })}
      </svg>
    </div>
  );
};
