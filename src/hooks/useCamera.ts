import { useEffect, useRef, useState } from "react";

/** Returns a MediaStream once the user grants camera access. */
export function useCamera() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let s: MediaStream | null = null;
    (async () => {
      try {
        // `ideal` (not fixed) constraints: a phone held in portrait can only
        // deliver ~720x1280, and an exact 1280x720 request would either fail
        // or force a letterboxed landscape crop. Asking for an ideal lets the
        // browser pick the closest valid mode for the device/orientation.
        // Landmarks come back normalised, so the overlay maths is unaffected.
        s = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: "user",
          },
          audio: false,
        });
        if (!active) { s.getTracks().forEach((t) => t.stop()); return; }
        setStream(s);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          await videoRef.current.play();
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      active = false;
      if (s) s.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return { videoRef, stream, error };
}
