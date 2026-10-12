# Guided mode, Calibration and cycles — design notes

Status: design only, nothing here is built yet (except the weekly streak
on Home, noted below). Decisions were made in conversation on 2026-10-10 →
2026-10-13; open questions are marked **Open**.

---

## 1. Two modes, one app

| | Guided (working names: Campaign, Guided) | Free Training |
|---|---|---|
| Who writes the program | The app | The user |
| What it is | Onboarding → Calibration → checkpoint 0 → a program in cycles | Any exercise, any custom plan, Quick Start: the app as built today |
| Main page | Shows the current step (Calibration progress, next session, next checkpoint) | Today's workout, Quick Start |

- **All data and menus are shared.** One history, one set of verdicts, one
  profile. What differs is mostly the main page plus some interactions.
- Guided mode is mostly about **setting the program in motion**. For an
  experienced Free Training user with a year of history and their own
  program, switching to Guided offers little unless the goal changes or we
  write advanced programs. That's accepted; Guided is aimed at new users.
- The name "Personal trainer" is reserved: the trainer is coming back
  separately (section 7).

## 2. Onboarding

Asked once, editable later in Settings.

| Question | Used for |
|---|---|
| **Goal** (e.g. strength, muscle, weight loss, general) | Which kind of progress is measured and shown first |
| **Equipment** | Tailoring suggestions and the generated program |
| **Frequency** (training days a week) | Weekly streak, sessions target, program template |
| **Bodyweight and waist** | Always asked; key when the goal is weight loss or appearance. Also tightens level estimates (strength standards are relative to bodyweight) |

**Open:** whether more than one goal can be picked; whether "equipment" is
one choice or a checklist (barbell + rack vs dumbbells only changes the
program).

## 3. Warmup (the camera check)

- Always presented, skippable (like Ring Fit Adventure).
- The screen shows a **pre-recorded video or animation** of the movement to
  follow. The camera tracking is **not shown**.
- Purpose: confirm the camera works and pose capture works. If the camera
  still runs in the background it can also check framing ("I can't see your
  feet"), confirm placement for the first exercise, and measure joint range.
- Examples: leg swings, a shoulder movement. Different warmups per session
  (picked from the joints the session uses) still needs designing.
- Option worth exploring: record the movement once through the app's own
  pose tracking and replay it as a drawn figure (a few KB, works offline,
  follows the theme) instead of video files.

**Open:** confirm the camera runs in the background during the warmup.

## 4. Calibration

The data-collection phase after onboarding: find the user's fitness level
and their numbers. ("Placement", as in placement matches, was suggested as
an alternative name.)

**Naming clash:** the code already uses "calibration" for rep-detection
anchors (`src/data/calibration/`). Rename that module (e.g. `poseAnchors`)
when this phase gets built.

### Starting weights

- For an exercise the user has never done, the app **does not prescribe a
  weight**.
- After the first round they enter the weight used and rate how it felt on a
  **5-level scale**; the app then suggests a weight.
- Draft scale (reps left in the tank → suggestion):
  1 Very easy (5+) → +2–3 steps · 2 Easy (3–4) → +1–2 · 3 Solid (2) → keep ·
  4 Hard (1) → keep or −1 · 5 Max (0) → −1–2.
- The rating is self-reported reps in reserve, which is also the data needed
  to validate estimating it from rep speed later (see backlog).

**Open:** whether "first round" means the first set (suggestion applies to
the remaining sets) or the first session.

### Level inference

- General thresholds on the numbers: e.g. struggling with 4 kg curls for 12
  reps → beginner, which gives an estimate for every other exercise.
- **Always about narrowing down and confirming.** Each muscle moves through:
  wide guess → inferred (from a related lift) → level found (lift done +
  rating) → progress unlocked (second session, first verdict).
- Needs a hand-made table: typical range per exercise per level, plus ratios
  between lifts (e.g. overhead press ≈ 60% of bench).

### What the user sees during Calibration

- A profile card on the main page: one row per muscle with a range that
  narrows, sessions left, and what the next session will unlock ("we can now
  assess your chest; next session we'll learn about your shoulders").
- Wins available before any verdict exists: **beat our guess** (the guess is
  revealed only after the set), unlocks, the first real verdict mid-phase,
  turning up on schedule.
- Count sessions, not days, so a missed day only delays it.

With a 3×/week A/B program (squat, bench, row / squat, overhead press,
deadlift), every lift has its second session by session 4, about a week
and a half.

**Open:** 4 sessions, or squeeze Calibration into week 1.

### The reveal = checkpoint 0

A cool animation plus the final results: level and numbers per muscle,
first verdicts, what's next and a target for the first month. Reuses the
staged reveal from the Session Summary (`useTimeline`).

## 5. Programs are written in cycles

A preferred structure for programs the app writes:

```
Calibration → Checkpoint 0 → [ train · train · train · TEST ] → Checkpoint 1 → …
```

- **1 cycle = 1 month = 3 training weeks + 1 test week.**
- Framing: "you're training 3 weeks for your test"; in the test week we
  push harder to see what they can do.
- Every checkpoint is the same screen as checkpoint 0, running the progress
  model over the cycle.
- Suggestions for the test week: test with as many reps as possible at a set
  weight (about 3–8 reps), not a one-rep max; fewer sets that week so it
  doubles as recovery; set the target at the start of the cycle; spread the
  lifts over the week's sessions; a test set is an all-out effort by
  definition.
- Test results are deliberate measurements, so the checkpoint can trust
  them more than noisy session-to-session verdicts.
- Cycles and test weeks are wanted in **Free Training** too; how is open.

**Open:** missed sessions and missed tests. The key question: does the
program follow the calendar or the session count?

## 6. Progress model (built)

Per exercise, against the last session that included it
(`src/data/stats/verdict.ts`): every set ≥ → progress, every set ≤ → dipped;
mixed at one weight → total reps; mixed with weight changes → estimated max
(Epley) with a ±2.5% band, no call above 10 reps. Bodyweight → total reps.

Ideas discussed but not built:
- **Staleness:** after a 4+ week gap, label the session "Comeback" and
  re-baseline instead of showing a dip.
- **Per muscle:** combine each exercise's own direction ("Chest: 3 of 3
  exercises up", or an average % change). Kilos can't be compared across
  exercises. Needs repeated staple exercises to work.
- **Felt easier:** same numbers rated easier than last time counts as
  progress.

## 7. Personal trainer (later)

Plateau, imbalance and break detection are **not** part of Guided mode.
They belong to a personal trainer that will come back later: it detects
these at any time and triggers a notification to chat about them. Works in
both modes. A free-form chat would need a language model, which conflicts
with "no backend"; a scripted trainer doesn't.

## 8. Main page (in progress)

Layout (built 2026-10-13): streak header → week strip → **billboard** →
Start button. The date, the "Day A" heading, the red "Today's workout"
card, Quick Start and Last Session are gone from Home.

- **Billboard** (`src/components/home/Billboard.tsx`): a white information
  box rotating through "news", auto-advancing every 6 s, swipeable, pausing
  12 s after a touch. Slides with nothing to say are skipped. Built today:
  this month's training days vs the goal's pace (stand-in for the cycle
  checkpoint), the last workout's verdicts, the latest personal best, training
  days per week over 8 weeks against the goal, the body trend; a welcome
  slide when there's no history. Planned: Calibration progress, onboarding
  progress, the cycle checkpoint. Data builders: `src/components/home/news.ts`.
- **Start button** under the billboard: "Start Day A" plus exercises, time
  and plan; "Create a plan" when there is none. Replaced by Continue while a
  session is open. It opens the **session preview** rather than starting.
- **Session preview** (`src/components/SessionPreview.tsx`, scene
  `preview`): "Today's session": day, plan, exercise/set count, time,
  muscles trained, and each exercise's sets and weights (prepared by the
  plan's progression, so they match the workout) with last time's top set or
  "First time". The workout starts only from its Start button. Natural home
  later for the warmup and Calibration hints.
- App name removed from the header.
- **Weekly streak** at the top (built 2026-10-13): consecutive weeks in which
  the user trained on at least `weeklyGoal` distinct days (default 3, set in
  Settings → Workouts per week; onboarding will set it later). The current
  week can only add to the streak; a missed week breaks it when the next
  week starts. Code: `src/data/stats/weeklyStreak.ts`,
  `src/components/home/StreakBadge.tsx`.
