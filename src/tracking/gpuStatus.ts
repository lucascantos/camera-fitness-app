// Detects whether WebGL is hardware-accelerated.
//
// MediaPipe's pose landmarker uses the "GPU" delegate, which runs on WebGL.
// When the browser has no hardware acceleration it silently falls back to a
// software WebGL implementation (Chrome's SwiftShader, Mesa's llvmpipe, etc.),
// so "GPU" inference is really CPU-bound and very slow. Reading the WebGL
// renderer string is a reliable, synchronous proxy for that state.

export interface GpuStatus {
  webglAvailable: boolean;
  renderer: string;
  hardwareAccelerated: boolean;
}

let cached: GpuStatus | null = null;

/** Probes WebGL once and caches the result for the session. */
export function getGpuStatus(): GpuStatus {
  if (!cached) cached = probe();
  return cached;
}

function probe(): GpuStatus {
  try {
    const canvas = document.createElement("canvas");
    const gl = (canvas.getContext("webgl2") ||
      canvas.getContext("webgl")) as WebGLRenderingContext | null;
    if (!gl) return { webglAvailable: false, renderer: "", hardwareAccelerated: false };

    let renderer = "";
    const dbg = gl.getExtension("WEBGL_debug_renderer_info");
    if (dbg) renderer = String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || "");
    if (!renderer) renderer = String(gl.getParameter(gl.RENDERER) || "");

    const low = renderer.toLowerCase();
    const software =
      low.includes("swiftshader") ||
      low.includes("software") ||
      low.includes("llvmpipe") ||
      low.includes("basic render"); // "Microsoft Basic Render Driver"

    return { webglAvailable: true, renderer, hardwareAccelerated: !software };
  } catch {
    return { webglAvailable: false, renderer: "", hardwareAccelerated: false };
  }
}
