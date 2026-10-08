// Horizontal card pager for the Session Summary. Cards follow the finger,
// snap on release (by distance or by flick speed), and resist with a rubber
// band past either end. Neighbours peek in at the edges, shrunk and dimmed,
// so it's obvious there is more to swipe to; tapping a peeking card goes to it.
//
// Vertical drags are left to the page (touch-action: pan-y), so a tall card
// still scrolls normally.

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";

const PAGE_FRACTION = 0.88;   // of the container; the rest is the peek
const GAP = 12;
const DECIDE_PX = 8;          // movement before we commit to a direction
const FLICK = 0.45;           // px/ms that counts as a flick

export function Carousel({ index, onIndex, children }: {
  index: number;
  onIndex(i: number): void;
  children: ReactNode[];
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [drag, setDrag] = useState(0);
  const [dragging, setDragging] = useState(false);
  const g = useRef({ x: 0, y: 0, t: 0, mode: "idle" as "idle" | "pending" | "drag" | "scroll" });
  const swallowClick = useRef(false);

  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const n = children.length;
  const page = width * PAGE_FRACTION;
  const lead = (width - page) / 2;
  const x = lead - index * (page + GAP) + drag;

  const onPointerDown = (e: React.PointerEvent) => {
    g.current = { x: e.clientX, y: e.clientY, t: performance.now(), mode: "pending" };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const s = g.current;
    if (s.mode === "idle" || s.mode === "scroll") return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (s.mode === "pending") {
      if (Math.abs(dy) > DECIDE_PX && Math.abs(dy) > Math.abs(dx)) { s.mode = "scroll"; return; }
      if (Math.abs(dx) < DECIDE_PX) return;
      s.mode = "drag";
      setDragging(true);
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }
    // Rubber band: past the first or last card, the card moves a third as far.
    const atEdge = (dx > 0 && index === 0) || (dx < 0 && index === n - 1);
    setDrag(atEdge ? dx / 3 : dx);
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const s = g.current;
    if (s.mode === "drag") {
      const dx = e.clientX - s.x;
      const v = dx / Math.max(1, performance.now() - s.t);
      if ((dx < -page * 0.2 || v < -FLICK) && index < n - 1) onIndex(index + 1);
      else if ((dx > page * 0.2 || v > FLICK) && index > 0) onIndex(index - 1);
      swallowClick.current = true;   // the release must not also "tap" a card
    }
    g.current.mode = "idle";
    setDragging(false);
    setDrag(0);
  };

  return (
    <div
      ref={boxRef}
      className="overflow-hidden -mx-4 select-none"
      style={{ touchAction: "pan-y" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClickCapture={(e) => {
        if (!swallowClick.current) return;
        swallowClick.current = false;
        e.stopPropagation();
        e.preventDefault();
      }}
    >
      <div
        className="flex items-start will-change-transform"
        style={{
          gap: GAP,
          transform: `translateX(${x}px)`,
          transition: dragging ? "none" : "transform 450ms cubic-bezier(0.22,1,0.36,1)",
        }}
      >
        {children.map((child, i) => {
          const active = i === index;
          return (
            <div
              key={i}
              onClick={active ? undefined : () => onIndex(i)}
              className="shrink-0 transition-[transform,opacity] duration-[450ms] ease-out origin-top"
              style={{
                width: page || `${PAGE_FRACTION * 100}%`,
                transform: active ? "scale(1)" : "scale(0.94)",
                opacity: active ? 1 : 0.55,
              }}
            >
              {child}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function Dots({ count, index, onIndex }: {
  count: number; index: number; onIndex(i: number): void;
}) {
  return (
    <div className="flex justify-center gap-1.5 mt-4">
      {Array.from({ length: count }, (_, i) => (
        <button
          key={i}
          onClick={() => onIndex(i)}
          aria-label={`Card ${i + 1} of ${count}`}
          className={
            "h-2 rounded-full transition-all duration-300 " +
            (i === index ? "w-6 bg-accent" : "w-2 bg-ink/20")
          }
        />
      ))}
    </div>
  );
}
