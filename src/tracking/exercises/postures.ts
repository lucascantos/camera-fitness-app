// Form constraints that gate whether a rep counts, per exercise. Each one is
// an angle between three landmarks that must stay inside a range for the
// tracker to trust the movement; the hint is what the user sees when it
// doesn't. Consumed by ./registry.ts.

import { LM } from "../helpers";
import type { Side } from "./types";
import type { PostureConstraint } from "./posture";

// Posture: the upper arm must hang at the side (elbow tucked). The angle at
// the shoulder between the hip and the elbow stays small when the arm is down;
// it grows when the arm is raised out to the side or overhead — which is the
// cheat that was letting curls count from any arm position.
export const CURL_POSTURE: PostureConstraint[] = [{
  landmarks: [LM.RIGHT_HIP, LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW],
  range: [0, 45],
  hint: "Keep your elbow tucked at your side",
}];

// Posture: the upper arm must point up (elbow above the shoulder, overhead).
// The hip–shoulder–elbow angle is large when the arm is raised; it shrinks if
// the arm drops in front or out to the side.
export const TRICEPS_POSTURE: Record<Side, PostureConstraint[]> = {
  right: [{
    landmarks: [LM.RIGHT_HIP, LM.RIGHT_SHOULDER, LM.RIGHT_ELBOW],
    range: [125, 180],
    hint: "Keep your upper arm pointing up",
  }],
  left: [{
    landmarks: [LM.LEFT_HIP, LM.LEFT_SHOULDER, LM.LEFT_ELBOW],
    range: [125, 180],
    hint: "Keep your upper arm pointing up",
  }],
};

// Posture: the body must be roughly horizontal for a push-up rep to count.
// The shoulder–hip–knee angle stays near 170° when flat and collapses when
// the user stands up, repositions the phone, or gets up after a set — all
// three phantom-rep scenarios seen in captured traces.
export const PUSHUP_POSTURE: PostureConstraint[] = [{
  landmarks: [LM.RIGHT_SHOULDER, LM.RIGHT_HIP, LM.RIGHT_KNEE],
  range: [140, 180],
  hint: "Keep your body straight",
}];
