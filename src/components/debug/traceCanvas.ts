// The angle trace strip: the joint angle plotted against the tracker's own
// work/rest bands, with per-frame ticks for the frames it was blind or frozen.

const ANGLE_MIN = 0;
const ANGLE_MAX = 180;

export function drawTrace(
  canvas: HTMLCanvasElement | null,
  angles: (number | null)[],
  reasons: string[],
  bands: { work: number; rest: number; inverted: boolean } | null,
) {
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "rgba(255,255,255,0.04)";
  ctx.fillRect(0, 0, w, h);

  const y = (deg: number) => h - ((deg - ANGLE_MIN) / (ANGLE_MAX - ANGLE_MIN)) * h;

  if (bands) {
    // Shade the two zones the state machine switches between. For an inverted
    // tracker (lateral raise, overhead press) the work zone is the high angles.
    const workTop = bands.inverted ? y(ANGLE_MAX) : y(bands.work);
    const workBot = bands.inverted ? y(bands.work) : y(ANGLE_MIN);
    ctx.fillStyle = "rgba(255,120,60,0.16)";
    ctx.fillRect(0, workTop, w, workBot - workTop);

    const restTop = bands.inverted ? y(bands.rest) : y(ANGLE_MAX);
    const restBot = bands.inverted ? y(ANGLE_MIN) : y(bands.rest);
    ctx.fillStyle = "rgba(60,200,255,0.16)";
    ctx.fillRect(0, restTop, w, restBot - restTop);

    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 1;
    for (const deg of [bands.work, bands.rest]) {
      ctx.beginPath();
      ctx.moveTo(0, y(deg) + 0.5);
      ctx.lineTo(w, y(deg) + 0.5);
      ctx.stroke();
    }
  }

  // Frames where the machine was frozen or blind get a vertical tick, so a
  // flat stretch of trace is attributable rather than mysterious.
  for (let i = 0; i < reasons.length; i++) {
    const r = reasons[i];
    if (r === "posture-gate") ctx.fillStyle = "rgba(255,90,90,0.5)";
    else if (r === "missing-landmark" || r === "non-finite-angle") ctx.fillStyle = "rgba(255,220,0,0.5)";
    else if (r === "counted") ctx.fillStyle = "rgba(120,255,140,0.95)";
    else continue;
    ctx.fillRect(i, 0, r === "counted" ? 2 : 1, h);
  }

  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  let pen = false;
  for (let i = 0; i < angles.length; i++) {
    const a = angles[i];
    if (a == null) { pen = false; continue; }
    const py = y(a);
    if (!pen) { ctx.moveTo(i, py); pen = true; }
    else ctx.lineTo(i, py);
  }
  ctx.stroke();
}
