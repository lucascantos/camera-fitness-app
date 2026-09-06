// Coach — greetings. Spoken on Home and when the trainer is picked in
// Settings. Gated by how long it's been, how the week is going, and the
// clock. Tone by absence length, from docs/coach-brainstorm.md: day 1 off,
// nothing; day 3, light; day 10+, warm and forgiving, never shaming.

import { L, type LineSpec } from "../trainer";

export const GREETINGS: LineSpec[] = [
  // First ever session.
  L("First session. Nobody's good at this on day one. Let's find out where you are.",
    (c) => c.totalSessions === 0, 3),
  L("New here. The camera counts, I talk, you lift. That's the whole arrangement.",
    (c) => c.totalSessions === 0, 3),

  // Already trained today.
  L("Back again today? Fine. Rest days exist for a reason, though.",
    (c) => c.daysSinceLast === 0, 2),
  L("Twice in a day. Ambitious. Keep it light this time.",
    (c) => c.daysSinceLast === 0, 2),

  // A normal gap.
  L("Yesterday, and now today. That's how it works.",
    (c) => c.daysSinceLast === 1, 2),
  L("Couple of days off. Right on schedule.",
    (c) => c.daysSinceLast === 2 || c.daysSinceLast === 3, 2),

  // Drifting.
  L("{days}. I'm not judging. Well — a little.",
    (c) => c.daysSinceLast !== null && c.daysSinceLast >= 4 && c.daysSinceLast <= 6, 2),
  L("{days} since the last one. The plan didn't go anywhere. Neither did the bar.",
    (c) => c.daysSinceLast !== null && c.daysSinceLast >= 4 && c.daysSinceLast <= 6, 2),

  // A week or two.
  L("A week. It happens. We pick up where you left off, not where you think you should be.",
    (c) => c.daysSinceLast !== null && c.daysSinceLast >= 7 && c.daysSinceLast <= 13, 2),
  L("Been a bit. No lecture — warm up properly and don't chase last time's numbers.",
    (c) => c.daysSinceLast !== null && c.daysSinceLast >= 7 && c.daysSinceLast <= 13, 2),

  // Long absence: warm, forgiving.
  L("You came back. That's the whole trick. Everything after this is just sets.",
    (c) => c.daysSinceLast !== null && c.daysSinceLast >= 14, 2),
  L("It's been a while. Good to see you. We go lighter today and nobody has to talk about it.",
    (c) => c.daysSinceLast !== null && c.daysSinceLast >= 14, 2),

  // Week momentum (only when the gap is unremarkable).
  L("Third one this week. Same as last week — hold the line.",
    (c) => c.sessionsThisWeek === 2 && (c.daysSinceLast ?? 9) <= 3, 2),
  L("Four this week. I'd tell you to rest, but you'd ignore me. So: lift well.",
    (c) => c.sessionsThisWeek >= 3 && (c.daysSinceLast ?? 9) <= 3, 2),

  // Time of day.
  L("Morning. Coffee later. Lifts first.", (c) => c.hour >= 5 && c.hour < 10),
  L("Early. Joints are stiff at this hour — take the warm-up seriously.", (c) => c.hour >= 5 && c.hour < 9),
  L("Lunchtime session. Efficient. I respect that.", (c) => c.hour >= 11 && c.hour < 14),
  L("Evening. Long day — leave it at the door. The bar doesn't care.", (c) => c.hour >= 18 && c.hour < 22),
  L("Late one. Keep it clean, then go to bed. Sleep is a set you don't skip.", (c) => c.hour >= 22 || c.hour < 5),

  // Generic.
  "Ready when you are.",
  "Let's get to work.",
  "Good. You showed up. Now the boring part.",
  "Camera's on. I'm watching your form, not your face.",
  "Same as always — one set at a time. Nothing clever.",
  "Right. Warm up, then we do the plan. The plan's the point.",
  "You know the drill. I'll count, you lift, we both go home.",
];
