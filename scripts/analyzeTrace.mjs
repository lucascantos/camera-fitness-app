// Read tracking diagnostic traces uploaded from a phone.
//
//   node scripts/analyzeTrace.mjs                 # summary table of every trace in logs/
//   node scripts/analyzeTrace.mjs --detail        # full breakdown of every trace
//   node scripts/analyzeTrace.mjs --compare       # diff traces of the same exercise
//   node scripts/analyzeTrace.mjs logs/a.json     # one file, full breakdown
//
// See docs/tracking-diagnostics.md for what the fields mean.

import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const detail = args.includes("--detail");
const compare = args.includes("--compare");
const files = args.filter((a) => !a.startsWith("--"));

const targets = files.length
  ? files
  : fs.existsSync("logs")
    ? fs.readdirSync("logs").filter((f) => f.endsWith(".json")).map((f) => path.join("logs", f))
    : [];

if (!targets.length) {
  console.error("No traces found. Export from the phone first (Settings → Tracking diagnostics).");
  process.exit(1);
}

const logs = [];
for (const f of targets) {
  const raw = JSON.parse(fs.readFileSync(f, "utf8"));
  for (const l of Array.isArray(raw) ? raw : [raw]) logs.push({ ...l, _file: path.basename(f) });
}
logs.sort((a, b) => a.startedAt - b.startedAt);

// Trace schemas differ across versions: early traces carried a full calibration
// profile (anchors, learned/default provenance, sample counts); current ones
// carry only the opening thresholds. Normalise to what both have.
function calOf(l) {
  const c = l.context.calibration;
  if (!c) return null;
  if (typeof c.work === "number") return { ...c, legacy: false };
  if (c.thresholds) return { ...c.thresholds, legacy: true, source: c.source,
    restSamples: c.restSamples, workSamples: c.workSamples, fellBack: c.fellBack };
  return null;
}

const q = (a, p) => {
  if (!a.length) return NaN;
  const s = [...a].sort((x, y) => x - y);
  return s[Math.min(s.length - 1, Math.floor(p * s.length))];
};
const n2 = (v) => (Number.isFinite(v) ? v.toFixed(2) : "–");
const n3 = (v) => (Number.isFinite(v) ? v.toFixed(3) : "–");
const n0 = (v) => (Number.isFinite(v) ? Math.round(v) : "–");
const pad = (s, w) => String(s).padEnd(w).slice(0, w);
const lpad = (s, w) => String(s).padStart(w);

function stats(l) {
  const F = l.frames;
  const T = F.map((f) => f.tracker).filter(Boolean);
  const dt = F.map((f) => f.meta?.dtMs).filter(Number.isFinite);
  const inf = F.map((f) => f.meta?.inferenceMs).filter(Number.isFinite);
  const fps = F.map((f) => f.meta?.fps).filter(Number.isFinite);
  const ang = T.map((t) => t.angle).filter(Number.isFinite);
  const vis = T.map((t) => t.minVisibility).filter(Number.isFinite);
  const reasons = {};
  for (const t of T) reasons[t.reason] = (reasons[t.reason] || 0) + 1;
  // Rep tempo: gaps between successive count increments.
  const repTs = [];
  let last = 0;
  for (const f of F) if (f.reps > last) { repTs.push(f.t); last = f.reps; }
  const gaps = repTs.slice(1).map((t, i) => t - repTs[i]);
  return {
    F, T, dt, inf, fps, ang, vis, reasons, repTs, gaps,
    medDt: q(dt, 0.5), medInf: q(inf, 0.5), medFps: q(fps, 0.5),
    medGap: q(gaps, 0.5),
    // What CONFIRM_FRAMES actually costs in wall-clock time on this device.
    confirmMs: q(dt, 0.5) * (T[0]?.confirmFrames ?? 3),
    lowVis: vis.filter((v) => v < 0.5).length,
    maxSkip: Math.max(...F.map((f) => f.meta?.skip ?? 0)),
    minDim: Math.min(...F.map((f) => f.meta?.maxDim ?? Infinity)),
  };
}

// ── summary table ────────────────────────────────────────────────────────────
console.log(
  pad("exercise", 22) + lpad("cnt", 4) + lpad("act", 4) + lpad("fps", 6) +
  lpad("dt", 7) + lpad("conf", 7) + lpad("infer", 7) + lpad("skip", 5) +
  lpad("dim", 5) + lpad("tempo", 7) + lpad("lowVis", 7) + "  flags",
);
console.log("─".repeat(104));

for (const l of logs) {
  const s = stats(l);
  const mismatch = l.actualReps != null && l.actualReps !== l.countedReps;
  const cal = calOf(l);
  const flags = [];
  if (mismatch) flags.push(`MISMATCH ${l.countedReps}→${l.actualReps}`);
  if (l.actualReps == null) flags.push("unlabelled");
  // Calibration provenance: whether this set ran on the athlete's own numbers
  // or on population defaults is the first thing to know about a trace.
  if (cal?.legacy) {
    const src = `${cal.source.rest[0]}${cal.source.work[0]}`.toUpperCase();
    flags.push(`cal:${src}(${cal.restSamples}r/${cal.workSamples}w)`);
    if (cal.fellBack) flags.push("CAL-FELLBACK");
  } else if (!cal) flags.push("no-cal");
  if (s.medFps < 12) flags.push("low-fps");
  if (s.lowVis / Math.max(1, s.T.length) > 0.1) flags.push("occluded");
  if (s.reasons["posture-gate"]) flags.push(`posture×${s.reasons["posture-gate"]}`);
  if (l.truncated) flags.push("TRUNCATED");
  if (l.events.length) flags.push(`events×${l.events.length}`);
  // Tapped reps are a far stronger label than a net count — they say *which*
  // reps were missed, so a failure can be aligned to a moment in the trace.
  if (l.repTaps?.length) flags.push(`taps:${l.repTaps.length}`);
  if (l.video) flags.push(`video ${(l.video.bytes / 1e6).toFixed(1)}MB`);
  if (l.context.build) flags.push(`build:${l.context.build.id}`);

  console.log(
    pad(l.context.exercise, 22) +
    lpad(l.countedReps ?? "–", 4) +
    lpad(l.actualReps ?? "–", 4) +
    lpad(n2(s.medFps), 6) +
    lpad(n0(s.medDt) + "ms", 7) +
    lpad(n0(s.confirmMs) + "ms", 7) +
    lpad(n0(s.medInf) + "ms", 7) +
    lpad(s.maxSkip, 5) +
    lpad(s.minDim, 5) +
    lpad(Number.isFinite(s.medGap) ? (s.medGap / 1000).toFixed(1) + "s" : "–", 7) +
    lpad(s.lowVis, 7) +
    "  " + flags.join(" · "),
  );
}

// ── compare mode ─────────────────────────────────────────────────────────────
// Groups traces by exercise and lines up the fields that plausibly differ
// between two attempts at the same movement. Several of these aren't logged
// directly — they're recovered from the stored landmarks, because the thing
// that usually changes between attempts is *how the user stood relative to the
// camera*, and nothing in the log records that explicitly.
if (compare) {
  const byExercise = {};
  for (const l of logs) (byExercise[l.context.exercise] ??= []).push(l);

  for (const [ex, group] of Object.entries(byExercise)) {
    if (group.length < 2) continue;
    console.log("\n" + "=".repeat(104));
    console.log(`COMPARING ${group.length} × ${ex}`);
    console.log("=".repeat(104));

    const cols = group.map((l, i) => {
      const s = stats(l);
      const g = geometry(l);
      return {
        head: `#${i + 1} ${new Date(l.startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`,
        rows: {
          "counted / actual": `${l.countedReps} / ${l.actualReps ?? "–"}`,
          "duration": `${((l.endedAt - l.startedAt) / 1000).toFixed(0)}s`,
          "── angle ──": "",
          "min": n0(Math.min(...s.ang)),
          "p5": n0(q(s.ang, 0.05)),
          "median": n0(q(s.ang, 0.5)),
          "p95": n0(q(s.ang, 0.95)),
          "max": n0(Math.max(...s.ang)),
          "reached work band": `${pctOf(s.ang, bandsFor(l), "work")}%`,
          "reached rest band": `${pctOf(s.ang, bandsFor(l), "rest")}%`,
          "── pose geometry ──": "",
          "shoulder width": n3(g.shoulderW),
          "torso length": n3(g.torsoLen),
          "width/torso ratio": n3(g.ratio),
          "shoulder z-spread": n3(g.zSpread),
          "body centre x": n3(g.centreX),
          "body centre y": n3(g.centreY),
          "landmarks in frame": `${n0(g.inFrame * 100)}%`,
          "── quality ──": "",
          "minVis median": n2(q(s.vis, 0.5)),
          "minVis p10": n2(q(s.vis, 0.1)),
          "frames vis<0.5": `${s.lowVis}/${s.T.length}`,
          "── camera ──": "",
          "phone tilt beta": g.beta == null ? "–" : `${n0(g.beta)}°`,
          "phone tilt gamma": g.gamma == null ? "–" : `${n0(g.gamma)}°`,
          "camera res": `${l.context.cameraSettings?.width}x${l.context.cameraSettings?.height}`,
          "luma": n2(g.luma),
          "── timing ──": "",
          "fps median": n2(s.medFps),
          "confirm window": `${n0(s.confirmMs)}ms`,
          "rep tempo": Number.isFinite(s.medGap) ? `${(s.medGap / 1000).toFixed(1)}s` : "–",
        },
      };
    });

    const keys = Object.keys(cols[0].rows);
    const W = 22;
    console.log(pad("", 22) + cols.map((c) => lpad(c.head, W)).join(""));
    for (const k of keys) {
      if (k.startsWith("──")) { console.log(`\n${k}`); continue; }
      const vals = cols.map((c) => c.rows[k]);
      // Flag rows where the traces meaningfully disagree — those are the
      // candidate explanations for why one worked and another didn't.
      const nums = vals.map((v) => parseFloat(String(v))).filter(Number.isFinite);
      const spread = nums.length === vals.length && Math.min(...nums) !== 0
        ? Math.abs(Math.max(...nums) - Math.min(...nums)) / Math.max(...nums.map(Math.abs))
        : 0;
      const mark = spread > 0.25 ? "  <<<" : "";
      console.log(pad(k, 22) + vals.map((v) => lpad(v, W)).join("") + mark);
    }

    console.log("\nangle traces:");
    for (let i = 0; i < group.length; i++) {
      console.log(`#${i + 1} ${spark(stats(group[i]).F)}`);
    }
  }
  process.exit(0);
}

if (!detail && files.length === 0) {
  console.log("\nRun with --detail for the full breakdown, --compare to diff same-exercise traces.");
  process.exit(0);
}

function pctOf(ang, b, which) {
  if (!b || !ang.length) return "–";
  const hit = ang.filter((a) =>
    which === "work"
      ? (b.inverted ? a > b.work : a < b.work)
      : (b.inverted ? a < b.rest : a > b.rest),
  ).length;
  return Math.round((hit / ang.length) * 100);
}

// Recover how the user was positioned relative to the camera from the stored
// screen landmarks. Distance shows up as apparent torso size; turning side-on
// collapses shoulder width relative to torso length and widens the shoulder
// depth spread. Neither is logged directly, and both change every angle the
// trackers measure.
function geometry(l) {
  const idx = l.context.landmarkIndices;
  const at = (flat, lm) => {
    const i = idx ? idx.indexOf(lm) : lm;
    if (i < 0) return null;
    const o = i * 4;
    const x = flat[o], y = flat[o + 1], z = flat[o + 2];
    return Number.isFinite(x) ? { x, y, z } : null;
  };
  const sw = [], tl = [], zs = [], cx = [], cy = [], inF = [];
  for (const f of l.frames) {
    if (!f.screen) continue;
    const ls = at(f.screen, 11), rs = at(f.screen, 12);
    const lh = at(f.screen, 23), rh = at(f.screen, 24);
    if (!ls || !rs || !lh || !rh) continue;
    sw.push(Math.hypot(ls.x - rs.x, ls.y - rs.y));
    const msx = (ls.x + rs.x) / 2, msy = (ls.y + rs.y) / 2;
    const mhx = (lh.x + rh.x) / 2, mhy = (lh.y + rh.y) / 2;
    tl.push(Math.hypot(msx - mhx, msy - mhy));
    zs.push(Math.abs(ls.z - rs.z));
    cx.push((msx + mhx) / 2);
    cy.push((msy + mhy) / 2);
    let seen = 0, total = 0;
    for (const lm of [11, 12, 13, 14, 15, 16, 23, 24, 25, 26]) {
      const p = at(f.screen, lm);
      total++;
      if (p && p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1) seen++;
    }
    inF.push(total ? seen / total : 0);
  }
  const OR = l.frames.map((f) => f.orientation).filter((o) => o && o.beta != null);
  const IM = l.frames.map((f) => f.image).filter(Boolean);
  const shoulderW = q(sw, 0.5), torsoLen = q(tl, 0.5);
  return {
    shoulderW, torsoLen,
    ratio: torsoLen ? shoulderW / torsoLen : NaN,
    zSpread: q(zs, 0.5),
    centreX: q(cx, 0.5), centreY: q(cy, 0.5),
    inFrame: q(inF, 0.5),
    beta: OR.length ? q(OR.map((o) => o.beta), 0.5) : null,
    gamma: OR.length ? q(OR.map((o) => o.gamma), 0.5) : null,
    luma: IM.length ? q(IM.map((i) => i.luma), 0.5) : NaN,
  };
}

// ── per-trace detail ─────────────────────────────────────────────────────────
for (const l of logs) {
  const s = stats(l);
  const c = l.context;
  console.log("\n" + "=".repeat(104));
  console.log(`${l.context.exercise}  |  counted ${l.countedReps}  vs actual ${l.actualReps ?? "(unlabelled)"}  |  target ${c.targetReps}${c.side ? `  |  ${c.side}` : ""}`);
  console.log(`${l._file}  ·  ${((l.endedAt - l.startedAt) / 1000).toFixed(1)}s  ·  ${s.F.length} frames${l.truncated ? "  ·  TRUNCATED" : ""}`);
  if (l.note) console.log(`note: ${l.note}`);
  if (l.events.length) console.log(`ground-truth events: ${JSON.stringify(l.events)}`);

  console.log(`\ndevice   ${c.userAgent.slice(0, 80)}`);
  console.log(`gpu      ${c.gpu.renderer}  hwAccel=${c.gpu.hardwareAccelerated}  cores=${c.hardwareConcurrency}  mem=${c.deviceMemory}`);
  console.log(`video    ${c.videoWidth}x${c.videoHeight}  camera=${c.cameraSettings?.width}x${c.cameraSettings?.height}@${c.cameraSettings?.frameRate}  orientation=${c.screenOrientation}`);

  console.log(`\nTIMING   fps med ${n2(s.medFps)} (p10 ${n2(q(s.fps, 0.1))})   dt med ${n0(s.medDt)}ms p90 ${n0(q(s.dt, 0.9))}ms`);
  console.log(`         inference med ${n0(s.medInf)}ms p90 ${n0(q(s.inf, 0.9))}ms   maxSkip ${s.maxSkip}   minDim ${s.minDim}`);
  console.log(`         => ${s.T[0]?.confirmFrames ?? 3}-frame confirm ≈ ${n0(s.confirmMs)}ms of wall clock`);

  const cal = c.calibration;
  if (cal) {
    console.log(`\nCALIB    anchors rest ${cal.anchors.rest} (${cal.source.rest}) work ${cal.anchors.work} (${cal.source.work})`);
    console.log(`         thresholds work ${cal.thresholds.inverted ? ">" : "<"}${cal.thresholds.work}  rest ${cal.thresholds.inverted ? "<" : ">"}${cal.thresholds.rest}  band ${cal.thresholds.deadBand}  noiseFloor ${cal.noiseFloor}`);
    console.log(`         history ${cal.restSamples} rest / ${cal.workSamples} work samples${cal.fellBack ? "   FELL BACK to defaults (dead band inside the noise)" : ""}`);
    console.log(`         sessionRest ${c.sessionRest ?? "not measured — athlete never held still"}` +
      (c.framing ? `   framing ratio ${c.framing.ratio} torso ${c.framing.torso}` : ""));
  }
  if (l.cycles) {
    const cy = l.cycles.extremes;
    console.log(`CYCLES   ${cy.length} rep extremes${cy.length ? `  min ${n0(Math.min(...cy))} med ${n0(q(cy, 0.5))} max ${n0(Math.max(...cy))}` : ""}` +
      `   ${l.cycles.trusted ? "fed into the profile" : "NOT trusted (count was corrected)"}`);
  }

  console.log(`\nTRACKER  reasons ${JSON.stringify(s.reasons)}`);
  console.log(`         angle min ${n0(Math.min(...s.ang))} p5 ${n0(q(s.ang, 0.05))} med ${n0(q(s.ang, 0.5))} p95 ${n0(q(s.ang, 0.95))} max ${n0(Math.max(...s.ang))}`);
  const b = bandsFor(l);
  if (b) {
    const inWork = s.ang.filter((a) => (b.inverted ? a > b.work : a < b.work)).length;
    const inRest = s.ang.filter((a) => (b.inverted ? a < b.rest : a > b.rest)).length;
    console.log(`         bands work${b.inverted ? ">" : "<"}${b.work} rest${b.inverted ? "<" : ">"}${b.rest}  →  work ${inWork}  dead ${s.ang.length - inWork - inRest}  rest ${inRest}`);
  }
  console.log(`         minVisibility med ${n2(q(s.vis, 0.5))} p10 ${n2(q(s.vis, 0.1))} min ${n2(Math.min(...s.vis))}   frames<0.5: ${s.lowVis}/${s.T.length}`);
  const div = s.T.map((t) => (Number.isFinite(t.angle) && Number.isFinite(t.angleOther) ? Math.abs(t.angle - t.angleOther) : NaN)).filter(Number.isFinite);
  if (div.length) console.log(`         world-vs-screen angle divergence med ${n0(q(div, 0.5))}° p90 ${n0(q(div, 0.9))}°`);
  const forms = {};
  for (const t of s.T) if (t.formError) forms[t.formError] = (forms[t.formError] || 0) + 1;
  if (Object.keys(forms).length) console.log(`         formErrors ${JSON.stringify(forms)}`);
  const auxKeys = new Set();
  s.T.forEach((t) => t.aux && Object.keys(t.aux).forEach((k) => auxKeys.add(k)));
  for (const k of auxKeys) {
    const v = s.T.map((t) => t.aux?.[k]).filter(Number.isFinite);
    console.log(`         aux ${pad(k, 18)} min ${n0(Math.min(...v))} med ${n0(q(v, 0.5))} max ${n0(Math.max(...v))}`);
  }

  const IM = s.F.map((f) => f.image).filter(Boolean);
  if (IM.length) {
    console.log(`\nIMAGE    luma med ${n2(q(IM.map((i) => i.luma), 0.5))}  contrast med ${n2(q(IM.map((i) => i.contrast), 0.5))}  motion med ${n2(q(IM.map((i) => i.motion), 0.5))}`);
    console.log(`         clipLow med ${n2(q(IM.map((i) => i.clipLow), 0.5))}  clipHigh med ${n2(q(IM.map((i) => i.clipHigh), 0.5))}`);
  }
  const OR = s.F.map((f) => f.orientation).filter((o) => o && o.beta != null);
  if (OR.length) console.log(`TILT     beta med ${n0(q(OR.map((o) => o.beta), 0.5))}°  gamma med ${n0(q(OR.map((o) => o.gamma), 0.5))}°`);
  const hidden = s.F.filter((f) => f.hidden).length;
  if (hidden) console.log(`HIDDEN   ${hidden} frames recorded while the tab was backgrounded`);

  console.log(`\nrep times (s)  ${s.repTs.map((t) => (t / 1000).toFixed(1)).join(" ")}`);
  if (s.gaps.length) console.log(`rep gaps  med ${(s.medGap / 1000).toFixed(2)}s  min ${(Math.min(...s.gaps) / 1000).toFixed(2)}s  max ${(Math.max(...s.gaps) / 1000).toFixed(2)}s`);
  console.log(`angle trace (0–180°, ▁ low ▇ high, · = no pose)\n${spark(s.F)}`);
}

function bandsFor(l) {
  // Traces recorded since calibration shipped carry the thresholds they
  // actually ran under — always prefer those. The table below is only a
  // fallback for older traces, and is the pre-calibration hardcoded set.
  const cal = calOf(l);
  if (cal) return { work: cal.work, rest: cal.rest, inverted: cal.inverted };
  const B = {
    "bicep curl": { work: 100, rest: 130, inverted: false },
    squat: { work: 110, rest: 155, inverted: false },
    "push ups": { work: 95, rest: 150, inverted: false },
    "bench press": { work: 80, rest: 155, inverted: false },
    deadlift: { work: 115, rest: 165, inverted: false },
    "overhead press": { work: 155, rest: 100, inverted: true },
    "barbell row": { work: 90, rest: 155, inverted: false },
    "lateral raise": { work: 70, rest: 25, inverted: true },
    "one arm triceps extension": { work: 75, rest: 150, inverted: false },
  };
  return B[l.context.exercise] ?? null;
}

function spark(F) {
  const width = 100;
  const step = Math.max(1, Math.floor(F.length / width));
  return F.filter((_, i) => i % step === 0)
    .map((f) => {
      const a = f.tracker?.angle;
      if (!Number.isFinite(a)) return "·";
      if (f.tracker.reason === "counted") return "R";
      if (f.tracker.reason === "posture-gate") return "x";
      return " ▁▂▃▄▅▆▇█"[Math.min(8, Math.floor((a / 180) * 8) + 1)];
    })
    .join("");
}
