// Dev-server-only sink for tracking diagnostic logs.
//
// The problem this solves: the app records pose traces on a *phone* (that's
// where the camera and the failing reps are), but the traces have to be read on
// a *laptop*, and the project has no backend or cloud storage to move them
// through. Since `npm run dev:mobile` already serves the app to the phone over
// HTTPS on the LAN, the laptop is right there — this adds a POST endpoint to
// that same dev server which writes the uploaded JSON to ./logs/. One tap on
// the phone, the file appears on the laptop.
//
// `apply: "serve"` means this plugin is inert during `vite build`: nothing here
// ships, and the deployed app has no server to talk to (CLAUDE.md rule 5). The
// client probes /ping and silently falls back to the share sheet or a plain
// file download when the endpoint isn't there — see src/tracking/log/export.ts.

import fs from "node:fs";
import path from "node:path";
import type { Connect, Plugin, ViteDevServer } from "vite";

const ROUTE = "/__tracking-log";
// Traces run to a few MB per set; a phone that's been recording all session
// can post a batch of them at once.
const MAX_BYTES = 128 * 1024 * 1024;

export function logSink(outDir = "logs"): Plugin {
  return {
    name: "camera-fitness-log-sink",
    apply: "serve",
    configureServer(server: ViteDevServer) {
      const dir = path.resolve(server.config.root, outDir);

      server.middlewares.use(ROUTE, (req, res, next) => {
        // CORS: the phone may be on the LAN origin while the request carries a
        // different Origin header (or none). Dev-only, same machine, so this is
        // permissive on purpose.
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Headers", "content-type");
        res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");

        if (req.method === "OPTIONS") {
          res.statusCode = 204;
          res.end();
          return;
        }

        // The client probes this to decide whether to upload or fall back.
        if (req.method === "GET") {
          json(res, 200, { ok: true, dir });
          return;
        }

        if (req.method !== "POST") return next();

        // Recordings arrive as raw binary on /video?id=... — they are far too
        // large to embed in the JSON payload.
        if (req.url && req.url.startsWith("/video")) {
          const id = new URL(req.url, "http://x").searchParams.get("id") ?? "unknown";
          readRaw(req)
            .then((buf) => {
              fs.mkdirSync(dir, { recursive: true });
              const ext = String(req.headers["content-type"] ?? "").includes("mp4") ? "mp4" : "webm";
              const file = path.join(dir, `${id}.${ext}`);
              fs.writeFileSync(file, buf);
              server.config.logger.info(
                `[log-sink] wrote recording ${(buf.length / 1e6).toFixed(1)} MB -> ${outDir}/${path.basename(file)}`,
              );
              json(res, 200, { ok: true, file: path.relative(server.config.root, file) });
            })
            .catch((e: unknown) => {
              json(res, 400, { ok: false, error: e instanceof Error ? e.message : String(e) });
            });
          return;
        }

        readBody(req)
          .then((body) => {
            const parsed = JSON.parse(body) as unknown;
            const logs = Array.isArray(parsed) ? parsed : [parsed];
            fs.mkdirSync(dir, { recursive: true });

            const written = logs.map((log) => {
              const file = path.join(dir, filenameFor(log));
              fs.writeFileSync(file, JSON.stringify(log, null, 2), "utf8");
              return path.relative(server.config.root, file);
            });

            server.config.logger.info(
              `[log-sink] wrote ${written.length} trace(s) → ${outDir}/`,
            );
            json(res, 200, { ok: true, files: written });
          })
          .catch((e: unknown) => {
            const msg = e instanceof Error ? e.message : String(e);
            server.config.logger.error(`[log-sink] ${msg}`);
            json(res, 400, { ok: false, error: msg });
          });
      });

      server.config.logger.info(`  ➜  log sink:  ${ROUTE} → ${outDir}/`);
    },
  };
}

function filenameFor(log: unknown): string {
  const l = log as {
    id?: string;
    startedAt?: number;
    context?: { exercise?: string };
  };
  const when = new Date(l.startedAt ?? Date.now())
    .toISOString()
    .replace(/[:.]/g, "-")
    .slice(0, 19);
  const ex = (l.context?.exercise ?? "unknown").replace(/[^a-z0-9]+/gi, "-");
  const id = (l.id ?? "0").slice(-6);
  return `${when}__${ex}__${id}.json`;
}

function readRaw(req: Connect.IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on("data", (c: Buffer) => {
      size += c.length;
      if (size > MAX_BYTES) {
        reject(new Error(`payload too large (>${MAX_BYTES} bytes)`));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function readBody(req: Connect.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on("data", (c: Buffer) => {
      size += c.length;
      if (size > MAX_BYTES) {
        reject(new Error(`payload too large (>${MAX_BYTES} bytes)`));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function json(res: { statusCode: number; setHeader(k: string, v: string): void; end(s: string): void }, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify(body));
}
