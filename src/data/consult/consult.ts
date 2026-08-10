// Initial consultation — the coach's opening conversation.
//
// This module is the entry point for the whole feature: the script lives in
// ./script, the derived programme in ./briefing, the shapes in ./types, and
// persistence (IndexedDB, key "consult") is below.

import { kvGet, kvSet } from "@/data/db";
import type { ConsultAnswers, ConsultProfile } from "./types";

export type { Choice, ConsultAnswers, ConsultProfile, Step, StepId } from "./types";
export { CLOSING, OPENING, STEPS } from "./script";
export { briefing, labelFor, progressionFor } from "./briefing";

const KEY = "consult";

let _profile: ConsultProfile | null = null;

export async function loadConsult(): Promise<ConsultProfile | null> {
  _profile = (await kvGet<ConsultProfile>(KEY)) ?? null;
  return _profile;
}

export function getConsult(): ConsultProfile | null {
  return _profile;
}

/** True once the athlete has been through the consultation at least once. */
export function hasConsulted(): boolean {
  return Boolean(_profile?.completedAt);
}

export async function saveConsult(answers: ConsultAnswers): Promise<ConsultProfile> {
  _profile = { ...answers, completedAt: new Date().toISOString().slice(0, 10) };
  await kvSet(KEY, _profile);
  return _profile;
}
