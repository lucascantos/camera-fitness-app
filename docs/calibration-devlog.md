# Calibration — devlog

Running log of what we learn about calibration as a system. **General
principles only** — per-exercise threshold numbers belong in the tracker files
and the diagnostic traces, not here.

The question this document exists to answer:

> **What are we actually looking for when we calibrate?**

**Read this first:** the entries below are chronological and include ideas that
were later disproved. Findings 1–9 describe a persistent per-person profile that
**no longer exists** — it was built, measured, found worthless, and deleted
(finding 18). Finding 8 is retracted outright (finding 16). The section
immediately below is the current model; the log is kept because the wrong turns
are informative, not because they're still true.

---

## Current model (supersedes findings 1–9)

**Calibration is a per-set problem, not a per-person one.**

The variance that matters is not between bodies. It is in how a phone camera
projects a movement *today* — where it sits, what angle it sees the joint from.
Measured across 27 labelled sets, that between-session variance dwarfs anything
a stored body profile captures: the same athlete's barbell row bottomed out at
81° in one set and 123° in another, minutes apart.

So there is no profile, no wizard, and nothing persisted. Instead:

1. A set opens on **population default anchors** (`anchors.ts`) turned into
   thresholds by a fixed derivation (`derive.ts`). These only have to be sane
   for the first ~25 frames.
2. The tracker **buffers every frame** and periodically re-estimates the
   athlete's working range from the p20/p80 of what it has seen so far.
3. On each revision it **re-counts the entire set from frame zero** under the
   new thresholds. Nothing is lost to the observation window, because the
   observation window is re-counted.
4. The displayed count **never decreases**. This is both better UX and more
   accurate — revisions that lower a count are usually wrong.

Result on 27 labelled sets: total absolute error **144 → 77**, and **94%
accuracy** wherever median landmark confidence is at or above 0.90.

### What is still true from the early findings

- Thresholds are derived, never stored (finding 1) — so improving the
  derivation never requires re-calibrating anyone.
- An anchor must describe a *typical* extreme, not a maximum (findings 3, 15).
  Posed maxima and distribution extremes fail the same way.
- Derived ranges need bounding at both ends (finding 6).
- Learning must be gated on bad *input*, never on our own bad *output*
  (findings 7, 12).

---

## The premise

Every rep counter is a state machine over a joint angle with fixed thresholds.
A fixed threshold encodes an assumption about a specific body, at a specific
distance, in front of a specific camera. That assumption is false for almost
everyone, including the person it was originally tuned against.

Calibration is the mechanism that replaces the assumption with a measurement.
The original framing of the design question was "what do we need to measure
about a person" — which turned out to be the wrong question. The right one is
**what do we need to measure about this set, while it is happening.**

---

## 2026-07-27 — First evidence-backed entry

> ⚠️ **Largely superseded.** Findings 1–9 assume a persistent per-person
> profile. That was built and later deleted as measurably worthless
> (finding 18); finding 8 is retracted outright (finding 16). Kept as a record
> of the reasoning, not as current guidance.

First real dataset: four repeats of one movement, one person, one phone,
recorded with the diagnostics logger (see `tracking-diagnostics.md`). Counts
ranged from catastrophic to near-perfect across takes of the *same* movement by
the *same* person minutes apart. That spread is the whole argument for
calibration, and it's what the findings below are drawn from.

### Finding 1 — Calibration measures the person, not the exercise

The instinct is to store thresholds. That's wrong: thresholds are an *output*.
What we store should be properties of the athlete and their setup, from which
any exercise's thresholds can be derived.

The useful mental model is a **personal coordinate system per joint**: a mapping
from raw degrees to "fraction of this person's usable range". Exercise
definitions then get written in normalised terms — *work begins at 0.6 of range,
rest resumes below 0.25* — and become body-independent. Today those fractions
are the only part of the legacy design that survived contact with real data
unchanged; the absolute degree values were the part that failed.

### Finding 2 — Not all anchors deserve equal trust

Calibration needs two anchors per movement: a **neutral** (the joint at rest in
the start position) and a **working extreme** (the far end of the motion).

They are not equally reliable, and the asymmetry is large:

- **Neutral is robust.** Perturbing it across the whole plausible capture range
  barely moved counting accuracy.
- **The extreme is fragile.** The same perturbation swung accuracy from perfect
  to *worse than having no calibration at all*.

**Design consequence:** spend the capture effort on the extreme. The neutral can
come from a brief still pose; the extreme cannot.

### Finding 3 — A posed maximum is the wrong measurement

Asked to reach as far as they can, people reach considerably further than they
do while actually training. Calibrating against that inflated figure places the
work threshold above the range the user occupies during a real set, and nothing
counts.

This is a systematic bias, not noise — it's always in the same direction, and it
gets worse the more motivated the user is during setup.

**What we want is the *typical* working extreme, not the achievable one.** That
means many samples and a robust central statistic (median across reps), never a
single max. A calibration flow that says "raise as high as you can" is asking
the wrong question; "do a few normal reps" is asking the right one.

### Finding 4 — A single frame is never a measurement

Frame-to-frame jitter in a *stationary* pose was substantial — enough that two
consecutive frames of the same held position can differ by more than the margin
between a working profile and a broken one.

Every calibration quantity must come from a **time window** with a robust
statistic, never an instantaneous sample. This also gives us something valuable
for free: the spread within that window is a direct measurement of the noise
floor.

### Finding 5 — The noise floor is itself a calibration output

We should be capturing not just *where* the joint sits, but *how much the
measurement wobbles* there.

That number sets a hard lower bound on hysteresis: if the angle jitters by more
than the gap between the work and rest thresholds, the state machine will
oscillate regardless of how well the anchors were placed. A profile that
produces a dead band narrower than its own measured noise is invalid and should
be rejected at capture time rather than shipped to the user.

### Finding 6 — Derived ranges need a ceiling, not just a floor

The legacy formula floors the usable range to guard against a degenerate capture
where the two anchors nearly coincide. Nothing guards the other end.

An implausibly *large* range is just as much a signal of a bad capture as an
implausibly small one, and empirically it was the more damaging of the two.
Bounding the range on both sides was the single cheapest, highest-leverage
robustness fix found so far: it made accuracy nearly insensitive to a badly
captured extreme.

### Finding 7 — Quality gating belongs in calibration, not in counting

A useful negative result. Rejecting low-confidence landmark frames:

- **Helps calibration.** A profile built from unreliable landmarks is
  permanently wrong and silently poisons every subsequent set.
- **Hurts counting.** Applied to the counting path it converted a bad count into
  *no* count — strictly worse for the user.

**Calibration should be strict and refuse bad input. Counting should be
permissive and degrade gracefully.** These are opposite policies and the
codebase should treat them as such.

### Finding 8 — A profile is only valid within the setup that produced it

Body position relative to the camera turned out to be the dominant driver of
tracking quality — far more than lighting, device tilt, or frame rate. A simple
ratio of apparent shoulder width to torso length cleanly separated the usable
takes from the unusable one.

So a profile is not universal; it is **conditional on a framing envelope**. That
implies:

- Capture and store the geometry alongside the anchors.
- Re-check it at the start of each set and warn when the user has drifted
  outside it, rather than silently applying thresholds that no longer hold.
- Treat "recalibrate" as a normal, low-friction action, not a one-time
  onboarding step.

### Finding 9 — Calibration should be continuous

Every logged set already contains exactly what calibration needs: the
distribution of per-rep extremes and resting angles, under real conditions, at
real tempo. That is strictly better raw material than anything a setup wizard
can collect, and it accumulates for free.

The wizard's proper role is **cold start** — get a usable profile in thirty
seconds so the first session works — after which the profile should keep
refining from actual training data. This also dissolves Finding 3 entirely:
real sets contain no posed maxima to be misled by.

---

## What we are looking for when calibrating

> ⚠️ **Superseded.** This was the answer under the per-person-profile model.
> Half of it is now moot: nothing is persisted, so there is no framing envelope,
> no confidence accumulation and no stored noise floor. What survives is the
> anchor pair — and it is measured from the set in progress, not from the
> athlete's history. See *Current model* at the top.

Consolidating the above. For each tracked joint/movement, a calibration must
produce:

| Quantity | What it is | Trust | How to capture |
|---|---|---|---|
| **Neutral anchor** | Joint angle at rest in the start position | High | Short still pose, windowed median |
| **Working extreme** | Angle at the far end of a *typical* rep | Low | Many real reps, median across reps — never a posed max |
| **Usable range** | Extreme − neutral, bounded both ends | Derived | Reject the capture if outside plausible bounds |
| **Noise floor** | Measurement spread while stationary | — | Free from the capture window; sets the minimum hysteresis |
| **Framing envelope** | Body geometry relative to camera at capture time | — | Landmark-derived ratios; the validity condition for the profile |
| **Confidence** | How much real data backs this profile | — | Sample count + observation quality; decides wizard vs learned values |

And explicitly **not** stored: thresholds. Those are derived from the above at
use time, so improving the derivation doesn't require re-calibrating every user.

### The one-sentence version

> Calibration captures a person's *neutral position*, their *habitual working
> range*, the *noise* in measuring both, and the *setup conditions* under which
> those numbers are valid — and nothing else.

---

## Open questions

> ⚠️ **Partly resolved.** Several of these dissolved rather than being answered:
> with no persistent profile there is no wizard to fill in and no cross-session
> data to accumulate. The live list is under *Next steps* at the end.

- **Shared vs per-exercise anchors.** Several exercises hinge on the same joint.
  Is a joint's neutral reusable across all of them, or does the start position
  change it enough to matter? *(Still open, but lower stakes — anchors are now
  re-measured per set anyway.)*
- ~~**How much data before learned values override the wizard?**~~ *Moot: no
  wizard, no persisted learned values (finding 18).*
- **Do the normalised fractions generalise?** They held for one movement. They
  need testing on a hinge and a squat pattern before being treated as universal.
- **What is the plausible-range bound, in normalised terms?** Currently only an
  absolute figure fitted to a single dataset.
- **Bilateral movements.** Trackers watch one side. Should calibration record
  both and use the better-observed one, or is asymmetry itself a signal?
- **Failure UX.** When a capture is rejected (Finding 7) or framing drifts
  (Finding 8), what does the user actually see? Refusing to count with no
  explanation is the worst outcome available.

---

## 2026-07-27 — Implementation

Built the minimum that tests the design, deliberately leaving out the setup
wizard. Rationale: every set already produces better calibration data than a
posed capture can, so the wizard is only ever cold-start — and building it now
would mean committing to a shape before the data justifies one.

**What shipped**

- `anchors.ts` — population defaults per exercise, as *anchor pairs* rather than
  thresholds. The legacy profile's three measured joints carried over verbatim;
  the other six extrapolated and flagged as such. Direction (which end is the
  working position) is implied by the anchors, which removed the separate
  `inverted` flag exercises used to declare.
- `derive.ts` — anchors → thresholds, using the legacy fractions plus the two
  guards from Findings 5 and 6: a span clamped at both ends, and a viability
  check that refuses a profile whose dead band sits inside its own noise.
- `session.ts` — the per-workout measurement, entirely passive. No prompt, no
  wizard: it watches the first seconds of a set and takes the resting angle if
  the athlete happens to stand still, which they usually do. Gives up after 8s
  and says nothing. The spread over that window doubles as the noise floor
  (Finding 5).
- `calibration.ts` — rolling per-exercise observations, learned from real sets.
  A set the athlete had to correct is not trusted into the profile, so one bad
  session can't poison later ones. Session rest outranks stored history, since
  the projection changed (Finding 8).
- The four bespoke trackers collapsed into one implementation, so thresholds
  enter the tracking layer in exactly one place. Verified behaviour-identical:
  all six recorded traces replay to their original counts.

**Result on the existing traces** — total absolute error across all six traces
fell from 34 reps to 9. The two catastrophic failures (2/12 and 0/12) became
12/12 and 10/12. The bicep curl trace, which was already correct, stayed
correct. The badly-framed take stayed broken, which is the right outcome: it is
a landmark-quality failure and no threshold can fix it.

Every trace now records the calibration it ran under, so the next round of data
is interpretable — the same angles mean different things under different
thresholds, and without that field a trace can't be compared across versions.

**Not built, on purpose:** the setup wizard; any framing warning UI (Finding 8
says store and compare the geometry, but we don't yet know where the line goes);
the notify/ask decision bands. All three need more data than one exercise from
one body can supply.

---

## 2026-07-27 — Second dataset: the projection dominates the body

17 traces across six movements. This round overturns part of the model above.

### Finding 10 — Between-session variance in the *measured* range is larger than any body difference

The same athlete performing the same movement minutes apart produced completely
different measured ranges. A barbell row bottomed out at 81° in one set and
123° in another. A bicep curl's session-measured resting angle came out at
155.9° once and 145.1° another time.

That is not the body changing. It is the projection changing — where the phone
was, what angle it saw the joint from. And it is *bigger* than the differences a
stored per-person profile is trying to capture.

**This invalidates the "measure the person once, reuse it" premise** that
Findings 1–3 were built on. A profile averaged across sessions is averaging
across camera positions, which is averaging across incompatible measurements.

### Finding 11 — Deriving both thresholds from one anchor propagates its error

With thresholds computed as fractions along the rest → work span, an error in
the rest anchor moves the work threshold by the same absolute amount. An 11°
difference in a measured resting angle moved a bicep curl's work threshold from
87° to 83° — and since the athlete's achieved extreme was 80°, that turned a
16° margin into a 3° one, and the set counted 2 of 12 instead of 12 of 12.

Anchors are not independent knobs. A "robust" anchor is only robust if the
threshold it controls has margin against the athlete's achieved range.

### Finding 12 — Refusing to learn from miscounted sets creates a deadlock

The rule "don't fold a corrected set into the profile" sounded prudent and was
actively harmful: the sets that most needed to teach us the athlete's range
were exactly the ones being discarded. Counting fails → athlete corrects →
nothing learned → counting fails again.

The right distinction is that a miscounted set has untrustworthy *rep
segmentation* but perfectly good *angle range*. The athlete really did move
their elbow to 80°, whatever we counted. Gate learning on landmark quality —
bad input — not on whether our own output was right.

### Finding 13 — Filtering by landmark confidence biases the range estimate

Discarding low-visibility frames before estimating the range made accuracy
*worse* (error 86 → 106). Occlusion correlates with the working position: at
the bottom of a bench press the arms are near the body and least visible. Filter
on confidence and you preferentially delete the working end of the range, then
conclude the athlete has less range than they do.

Confidence filtering is right for deciding *whether to trust a set at all*, and
wrong for deciding *which frames within it* describe the movement.

### Finding 14 — Adaptation should be within-set, and should re-count

Given Finding 10, the range has to be estimated from the set currently being
performed. Three variants, scored against labelled counts (total absolute error
across 17 traces, baseline 133):

| approach | error |
|---|---|
| Population defaults | 133 |
| Cross-session pooled anchors | 119 |
| Warm-up window, count only afterwards | 112 |
| Whole-set retro-calibration (not causal) | 86 |
| **Rolling estimate + re-count from frame zero** | **86** |
| **…with a monotonic display guard** | **77** |

The decisive trick is **re-counting rather than only applying revised
thresholds going forward**. A warm-up window loses whatever reps happen during
it; replaying the buffer costs nothing, because the angles are buffered anyway.
That single change is the difference between 112 and 86.

The monotonic guard — never let the displayed count decrease when a revision
reinterprets earlier frames — was added for UX and turned out to also be *more
accurate* (86 → 77), because revisions that lower the count are usually wrong.

### What this means for the model

Calibration is now better understood as **two things on different timescales**,
and the fast one matters more:

- **Slow (per-person):** habitual range, noise floor. Genuinely stable, but a
  weaker signal than assumed.
- **Fast (per-set):** how this camera, in this position, is projecting this
  movement right now. This is where the variance lives, and it can only be
  measured from the set in progress.

The population defaults' real job is to be a sane starting point for the first
twenty-five frames, not to be accurate.

### Finding 15 — An anchor is a *typical* extreme, not an extreme

Adapting to the p5/p95 of the observed range improved five movements and made a
sixth (overhead press) worse than doing nothing at all. Cause: anchoring on the
furthest the athlete ever reached, then requiring a return to rest + 25% of that
span, asks them to match their best-ever rep on every rep. Where the movement
has a long hold at one end the extreme percentile sits well outside the typical
one, and the return threshold becomes unreachable.

Swept over the captured traces:

| anchor percentiles | total error |
|---|---|
| p5 / p95 | 94 |
| p10 / p90 | 86 |
| p15 / p85 | 78 |
| **p20 / p80** | **75** |
| p25 / p75 | 83 |

A smooth curve with a real minimum, not a spike. At p20/p80 every movement
improves and none regresses. This is the same lesson as Finding 3 — posed
maxima mislead — arriving through a different door: the estimator has to
describe the habitual range, and both a posed maximum and a distribution
extreme fail that in the same direction.

### Finding 16 — RETRACTION: the framing ratio is not a usable quality gate

Finding 8 claimed apparent-shoulder-width ÷ torso-length cleanly separated
usable recordings from unusable ones. **That was an artefact of a logging bug.**
The value being compared came from the stored profile — written during an
*earlier* session — not from the set being examined. Recomputed properly from
each set's own landmarks, the separation disappears:

| framing ratio | landmark conf. | result |
|---|---|---|
| 0.10 | 0.95 | 12/12 ✓ |
| 0.33 | 0.86 | 13/13 ✓ |
| 1.20 | 0.86 | 0/12 ✗ |
| 1.56 | 0.95 | 0/12 ✗ |

Counter-examples in both directions. Below 0.50 mean recall is 41%; at or above
it, 64% — a weak trend, not a gate, and nothing that could justify interrupting
an athlete mid-workout.

Two reasons it fails. The ratio is exercise-dependent — a deadlift hinges the
torso forward and foreshortens it, inflating the ratio for reasons that have
nothing to do with tracking quality. And for horizontal movements the whole
premise collapses: shoulder width relative to torso says nothing useful about
whether a camera on the floor can see someone's elbow.

Landmark confidence remains the better signal but is not sufficient either:
two sets counted 0/12 at confidences of 0.86 and 0.95.

**So the "when do we warn the athlete" question from the design discussion is
still unanswered, and now has one fewer candidate answer than it appeared to.**

### Finding 17 — Where the residual error actually lives

Across 27 labelled sets after within-set adaptation:

| landmark confidence | sets | mean error/set (before → after) | accuracy |
|---|---|---|---|
| 0.90 – 1.00 | 13 | 1.6 → **0.8** | **94%** |
| 0.80 – 0.90 | 4 | 7.3 → 4.3 | 65% |
| 0.50 – 0.80 | 4 | 9.3 → 3.8 | 67% |
| below 0.50 | 6 | 9.5 → 5.8 | 51% |

65% of all remaining error sits in the 10 sets below 0.80 confidence. Where the
camera can actually see the athlete, counting is now 94% accurate and
calibration is close to done. Below that, the limit is the pose estimate, not
the thresholds.

Deadlift is the cleanest evidence that the derivation itself is sound: three
sets, no calibration history at all, population defaults only — 12/12, 11/12,
13/13.

### Finding 18 — The persistent profile was measurably worth nothing, and is gone

Direct test over 27 labelled sets, profile accumulated in chronological order
exactly as the app would build it:

| configuration | total error |
|---|---|
| defaults only, no adaptation | 153 |
| learned profile, no adaptation | 137 |
| defaults only, **with** adaptation | **77** |
| learned profile, **with** adaptation | **77** |

Without adaptation the profile helps. With it, identical to the digit — because
adaptation re-counts the whole set and overwrites whatever the profile
contributed to the opening thresholds. The profile only ever influenced the
first ~25 frames, and those get re-counted too.

So the store was deleted: `calibration.ts` (220 lines), `session.ts` (130), and
the Training wiring — roughly 400 lines including the passive stillness
detector, rolling sample windows, learned/default anchor resolution, framing
capture, and the IndexedDB persistence. Verified behaviour-identical afterwards
(still 77 on the same 27 sets).

What survives is small and load-bearing: `anchors.ts` (population defaults,
also the reference the adaptive span clamps against) and `derive.ts` (anchors →
thresholds, called on every adaptation cycle).

**The lesson worth keeping:** calibration here is a *per-set* problem, not a
per-person one. The variance that matters is in how the camera projects the
movement today, and that can only be measured from the set in progress. A
per-person profile is answering a question that isn't the bottleneck.

This also retires the "wizard vs continuous learning" question from the design
discussion — with nothing persisted, there is nothing for a wizard to fill in.

---

## Where the remaining error is

Across 27 labelled sets, after adaptation:

| landmark confidence | sets | mean error/set | accuracy |
|---|---|---|---|
| 0.90 – 1.00 | 13 | 0.8 | **94%** |
| 0.80 – 0.90 | 4 | 4.3 | 65% |
| 0.50 – 0.80 | 4 | 3.8 | 67% |
| below 0.50 | 6 | 5.8 | 51% |

**65% of all remaining error sits in the 10 sets below 0.80 confidence.** Bench
press alone accounts for 26 of the 77. Where the camera can see the athlete,
calibration is close to finished; below that, the binding constraint is the
pose estimate, not the thresholds.

That reframes the roadmap: **the next wins are in pose quality, not in
calibration.**

---

## Next steps

Ordered by expected value, highest first.

### 1. Track whichever side is better observed

Every tracker watches the right side only. Horizontal movements put that side
nearest the floor or occluded by the torso, which is exactly where the 65% of
error lives. Both sides are already in every frame and both are already logged.

Approach: compute the angle on each side, pick per frame by `visibility`, or
blend when both are confident. Needs care — switching sides mid-rep could
introduce a discontinuity that reads as a phantom rep, so it likely needs
hysteresis on the side choice itself.

*Test:* replay the six bench press and two push-up traces; they are the ones
this should move.

### 2. ~~Fix the frame-rate throttle ratchet~~ — DONE

The diagnosis was right but incomplete. Keying the controller off processed
FPS was indeed a feedback loop, but the recorded timings showed something
worse: *both* throttle mechanisms were counterproductive on this hardware.

| inference resolution | frames | median inference |
|---|---|---|
| 480 px | 521 | 79.2 ms |
| 320 px | 8,006 | 81.4 ms |

A 2.25× pixel reduction for no gain — inference cost is dominated by fixed
overhead, not input area. The resolution ladder was pure landmark-quality loss,
and landmark quality is the binding constraint (finding 17).

| skip level | median frame interval | effective fps |
|---|---|---|
| 0 | 132 ms | 7.6 |
| 2 | 161 ms | 6.2 |

Frame skipping *lowered* throughput. It cannot raise it: skipping does not make
an inference faster, it only delays the next one.

Changes: resolution is now fixed at 480 px; the skip valve is driven by
smoothed inference duration (>150 ms engage, <110 ms release) and exists purely
to keep the UI responsive when a device genuinely cannot keep up. A 10-frame
warm-up guard was added after measurement showed the first inferences spike to
a 1280 ms worst case (p90 561 ms over frames 0–9 vs 0.7% of steady-state frames
above threshold) — without it the valve tripped on every set, during the exact
window the tracker uses to establish range.

Replayed over all 27 sets' recorded timings: previously **27/27** ended pinned
at 320 px / skip 2; now **0/27** ever engage the valve at all.

**Untested:** whether running at 480 px rather than 320 px actually improves
landmark confidence. Every trace to date was recorded at 320. It should help —
that is the whole reason for the change — but it needs a fresh capture to
confirm, and finding 17 says landmark confidence is what the residual error
depends on.

### 3. Decide the warn/ask thresholds — still blocked on data

The original design question ("at which point do we notify the user, and at
which point do we ask them to fix the number") remains unanswered. The framing
ratio looked like the answer and was retracted (finding 16). Landmark
confidence is better but insufficient: two sets counted 0/12 at confidences of
0.86 and 0.95.

Blocked on **deliberately bad setups** — side-on, too far, too close, partly
out of frame, phone too low — each with a corrected count. Ten to fifteen would
place the line on evidence. Everything before that is guessing.

Note also the principle from the design discussion, which survives: interrupt
based on whether the error would change the *count*, not on whether the
measurement is uncertain. And corrections should flow through rep counts, never
through degrees — nobody can validate a 40° threshold, everybody can validate
"was that 12?".

### 4. Validate the fitted constants against a second body

`p20/p80`, the `0.62/0.25` split, the `0.6–1.15` span clamp, `25` frames before
first adaptation: all fitted to one person on one phone. The *structure* should
hold; the numbers are placeholders. A second athlete is the cheapest way to find
out which are which.

### 5. Housekeeping

- A 0-frame trace gets persisted when a set is started and abandoned; it should
  be dropped instead.
- An orphaned `"calibration"` key remains in IndexedDB from the deleted profile.
  Nothing reads it, but `kvExportAll` carries it into backups.
- `logs/` is ~40 MB across 28 traces plus `archive-v1/`.

---

## Evidence

All findings derive from traces in `logs/`, analysed with
`scripts/analyzeTrace.mjs`. Method and schema: `docs/tracking-diagnostics.md`.

**Confidence: moderate for the structure, low for every constant.** 27 labelled
sets, seven movements, one person, one device. The structural findings —
per-set rather than per-person calibration, re-counting on revision, typical
extremes rather than maxima, bounded spans, gating on input quality rather than
output correctness — are each supported by a direct measurement and by at least
one failed alternative, and are unlikely to reverse.

Every specific number is fitted to a single body. Track record so far is a
caution: six hypotheses stated confidently in this log were later killed by
data, and two of the corrections came from bugs in the diagnostics themselves
rather than from the tracking code. Treat the newest entries as the least
tested — finding 15's `p20/p80` has had one round of validation, not three.
