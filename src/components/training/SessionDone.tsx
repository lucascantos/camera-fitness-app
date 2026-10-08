// The final set's Done modal is replaced by this: "SESSION COMPLETE!" in big
// outlined lettering zooming in straight over the camera feed (0.5s) with a
// referee whistle, holding for a second, then the whole screen washing out to
// the page background over another second — which is exactly what the Session
// Summary opens on, so the hand-over is seamless. A tap goes there at once.

import { useEffect, useRef, useState } from "react";
import { whistle } from "@/audio/sfx";

const ZOOM_MS = 500;    // matches animate-zoom-in
const HOLD_MS = 2000;
const FADE_MS = 1000;   // matches animate-fade-slow

export function SessionDone({ onNext }: { onNext(): void }) {
  const nextRef = useRef(onNext);
  nextRef.current = onNext;

  const [fading, setFading] = useState(false);

  useEffect(() => {
    whistle();
    const fade = setTimeout(() => setFading(true), ZOOM_MS + HOLD_MS);
    const next = setTimeout(() => nextRef.current(), ZOOM_MS + HOLD_MS + FADE_MS);
    return () => { clearTimeout(fade); clearTimeout(next); };
  }, []);

  return (
    <div onClick={onNext} className="fixed inset-0 z-50 grid place-items-center px-4">
      <div className="animate-zoom-in will-change-transform drop-shadow-[0_6px_18px_rgba(0,0,0,0.45)]">
        <OutlinedText lines={["SESSION", "COMPLETE!"]} />
      </div>
      {fading && <div className="fixed inset-0 bg-bg animate-fade-slow" />}
    </div>
  );
}

/**
 * Game-title lettering: red fill, thick white outline. A text stroke is drawn
 * centred on the glyph edge, so on its own it eats into the letters; stacking
 * a stroked copy *behind* a plain copy keeps only the outer half of the
 * outline and the fill stays full weight.
 */
function OutlinedText({ lines }: { lines: string[] }) {
  const text = (
    <>{lines.map((l) => <div key={l}>{l}</div>)}</>
  );
  const type = "col-start-1 row-start-1 text-center font-black leading-[0.95] text-[min(15vw,4.5rem)]";
  return (
    <div className="grid">
      <div aria-hidden className={type + " text-white"} style={{ WebkitTextStroke: "12px white" }}>
        {text}
      </div>
      <div className={type + " text-accent"}>{text}</div>
    </div>
  );
}
