# camera-fitness-app

A browser-based fitness coach that uses your webcam to count reps, run a structured workout plan, and track your progress over time. Wii-Fit-style guidance, no install, no account, no server.

## Status

🚧 In development. See [`CLAUDE.md`](./CLAUDE.md) for the architecture map and the migration plan.

## Stack

React 18 · TypeScript · Vite · MediaPipe Tasks Vision · IndexedDB · Tailwind CSS · Zustand.
Runs entirely client-side.

## Local dev

```bash
npm install
npm run dev
```

Dev server runs at <http://localhost:5173>. Note that until Phase 1 of the migration lands (React/Vite deps installed, `src/main.tsx` written), `npm run dev` will fail — that is expected.

## License

TBD.
