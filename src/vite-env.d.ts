/// <reference types="vite/client" />

/** Git short SHA (plus `-dirty`) at build time — see vite.config.ts. */
declare const __BUILD_ID__: string;
/** ISO timestamp of the build. */
declare const __BUILD_TIME__: string;
