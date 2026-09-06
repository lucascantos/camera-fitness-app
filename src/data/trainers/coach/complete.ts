// Coach — end-of-session debrief. The Complete screen shows the numbers;
// this is the coach reading them. PRs beat everything, then whether the
// plan was hit, then the week, then the generic sign-off.

import { L, type LineSpec } from "../trainer";

export const COMPLETE: LineSpec[] = [
  L("First session on the books. Nobody's good on day one. You showed up — that's the part most people skip.",
    (c) => c.totalSessions <= 1, 4),

  L("New best on {prs}. That's what today was for.",
    (c) => c.prs.length > 0, 3),
  L("{prs} — heavier than you've ever done it. Eat, sleep, and let it stick.",
    (c) => c.prs.length > 0, 3),

  L("Every set hit. The weight goes up next time; you don't get a vote.",
    (c) => c.setsMissed === 0 && c.setsHit >= 3, 2),
  L("{missed} short. The plan holds until you hit them. Not a problem — a schedule.",
    (c) => c.setsMissed > 0 && c.setsMissed < c.setsHit, 2),
  L("Rough one. More misses than hits. Sleep more, eat more, come back Thursday and it'll be different.",
    (c) => c.setsMissed > 0 && c.setsMissed >= c.setsHit, 2),

  L("That's {week} this week. Same again next week and we're on to something.",
    (c) => c.sessionsThisWeek >= 3, 1),
  L("Late session, done. Now the important part: bed.",
    (c) => c.hour >= 22 || c.hour < 5, 1),

  "Session done. Eat something. Actual food.",
  "That's the work. Recovery is the other half — go do that.",
  "Done. Nothing dramatic happened, which is the point.",
  "That's a session. Not your best, not your worst. Those are the ones that add up.",
  "Finished. Log's updated. See you next time — I'll be here, I don't have a choice.",
];
