# Coach improvements — brainstorm

> **Status: open brainstorm, nothing decided.** Ideas welcome anywhere; add
> yours under the `💡 Your ideas` headings or just scribble inline. Nothing
> here is committed to a roadmap yet.

---

## Where the coach is today

`say(category, exercise?)` picks a random string from a fixed pool and plays a
matching voice clip. That's the whole system.

```
say("rep")  →  "Good." | "Solid." | "Stay with it." | "Clean rep."
```

- **Stateless.** No memory between lines, sets, or sessions.
- **Context-blind.** Knows the exercise name. Nothing else.
- **Interchangeable.** Every line works for every user on every day — which is
  exactly why none of them land.

Meanwhile the app already stores: full workout history with *actual* reps and
weights, best sets per exercise, progression state per plan, body measurements,
and calibration. **The coach can't see any of it.**

That gap is the single biggest lever here, and it needs no new infrastructure.

---

## The honest constraint map

The three areas differ enormously in what they cost. Worth knowing before we
get attached to anything:

| Area | Needs a backend? | Verdict |
|---|---|---|
| **Analysis** | No — data is all local | Free. Do this regardless. |
| **Notifications** | Mostly yes | Real web-platform limits, see below |
| **Invitations** | Yes, for anything multi-user | Biggest departure from the mission |

CLAUDE.md is blunt: *"No backend. If a feature needs a server, it doesn't
ship."* Two of these three brush against that. The home server (TBD) changes
the calculus but is a real commitment — uptime, TLS, reachability off-LAN.

---

## Track 1 — Analysis (the foundation)

**Cost: zero infrastructure. Highest value. Everything else builds on it.**

Give the coach a read-only view of the athlete, and let lines be *selected* by
context rather than at random.

Today → possible:

| Now | With context |
|---|---|
| "Good set." | "That's your best set on squats since March." |
| "Let's get to work." | "Third session this week. Same as last week — hold the line." |
| "Solid." | "That's 5kg up from last Tuesday." |
| *(silence)* | "You've missed the last rep on all three sets. Drop 2.5kg next time?" |

**Ideas:**

- **A `CoachContext` object** assembled once per session: streak, days since
  last session, PR status per exercise, whether the last session was missed,
  volume trend, whether this weight is new.
- **Condition-gated line pools.** Each line declares a predicate
  (`isPR`, `streakGte3`, `returningAfterBreak`). Pick randomly *within* the
  set of lines whose conditions hold — same authoring model, far better output.
- **Priority tiers**, so a PR line beats a generic "Good." when both qualify.
- **Anti-repetition memory** — don't reuse a line within N sessions. Cheap,
  and probably the single most noticeable improvement.
- **End-of-session debrief.** The Complete screen currently shows numbers. The
  coach could actually read the session: what improved, what stalled, what to
  do next time.
- **Form feedback that persists.** Trackers already compute `formError`. Right
  now it flashes and vanishes. "Your depth dropped off after rep 6" is a real
  coaching observation we're throwing away.
- **Honest stall detection.** Now that actual reps are recorded, we can tell a
  missed target from a hit one. "You've stalled at 60kg for three sessions —
  deload week?"

**💡 Your ideas:**

-

---

## Track 2 — Notifications

**Cost: real web-platform limits. Read this before planning around it.**

Two things people assume work, that don't:

1. **Notification Triggers API** (schedule a local notification for later) —
   never shipped. Origin trial, abandoned. There is *no* reliable pure-client
   way to schedule a notification for tomorrow morning.
2. **Notifications while the app is closed** need either a push server or a
   background wake-up. Nothing else.

So the options are genuinely:

| Approach | Server? | Reality |
|---|---|---|
| Notify only while app is open | No | Works, but nearly pointless for reminders |
| **Periodic Background Sync** | No | Chromium-only, installed PWA only, browser decides frequency (~daily at best), no guarantees |
| **Web Push (VAPID)** | Yes | Fully reliable, works closed, needs a push endpoint — the home server could host this |

**Ideas (if we accept the cost):**

- **Rest-timer notification** — the one case that works *today* with no
  server, since the app is open. Currently if you switch apps mid-rest, you
  miss the end of it entirely.
- **Nudge on a scheduled training day** you haven't started by evening.
- **Streak-at-risk** warning — "you're one day from breaking a 3-week streak."
- **Deload / rest-day reminder** when volume trend suggests overreaching.
- **Weekly recap** — Sunday summary, which doubles as a re-engagement hook.

**Worth deciding early:** are notifications *coach voice* ("Squats today.
You know what to do.") or *system voice* ("Workout reminder")? The former is
much more interesting and ties into Track 1.

**⚠️ The trap:** a fitness app that nags is one people uninstall. Every
notification should be earned, opt-in, and rate-limited.

**💡 Your ideas:**

-

---

## Track 3 — Invitations

**Cost: highest. Multi-user is a genuinely different product.**

"Invitations" can mean several very different things, with wildly different
price tags. Worth pinning down which one you actually want:

| Interpretation | Server? | Notes |
|---|---|---|
| **Share a plan** with a friend | No | Encode plan in a URL / QR / file. Doable now. |
| **Share a result** (PR card, session summary) | No | Generate an image, Web Share API. Doable now. |
| **Async challenge** — "beat my 5×5" | Barely | Could ride on share-links + local compare |
| **Friends list, live leaderboard** | Yes | Accounts, identity, sync, moderation |
| **Train together live** | Yes, heavily | Realtime, presence — a different app |

**Ideas that stay serverless:**

- **Plan sharing via link.** Plans are small JSON — base64 into a URL fragment,
  or a QR code on screen. Import screen already exists conceptually (the
  Export/Import backup does exactly this).
- **Shareable PR card.** Render a session summary to canvas, share via the
  Web Share API. Free marketing, zero infrastructure.
- **Ghost/challenge mode.** Import a friend's session and have the coach pace
  you against it — *"you're two reps behind their set 3."* All local; the
  "friend" is just imported data.
- **The coach as the social layer.** Rather than real friends, the coach
  remembers and compares you to *yourself*. Cheaper and arguably better
  motivation.

**💡 Your ideas:**

-

---

## Track 4 — Coach personality & presence

Not on your list, but it's what makes the other three feel like a coach rather
than a notification engine.

- **Multiple coaches with real differences** — the `Trainer` interface is
  already one-file-per-coach. Currently only Coach exists. Different
  personalities could differ in *when* they speak, not just what they say.
- **Adaptive verbosity.** Some people want a line every rep; some want silence
  until something's wrong. Currently hardcoded (`r % 3 === 0`).
- **The coach earned the right to be quiet.** Silence during a hard set is
  itself coaching. Right now the cadence is fixed regardless of effort.
- **Bring the coach back to the workout screen.** I removed on-screen trainer
  text in the mobile redesign because it competed with the camera feed — audio
  carries it now. If the coach gets smarter, it may deserve visual space back,
  but it needs to earn it.
- **Reactive tone.** Struggling (missed reps, form breaking) vs. cruising
  should sound different.

**💡 Your ideas:**

- Character types:
- Basic: Wii fit style
- Basic: Mascot
- Gym Bro
- Strong man
- Rival
- Talking Dog
- Robot
- Viking
- Goblin
- Chubby Penguin

---

## Track 5 — The cold open (reward, and hooking a *low-motivation* visit)

The scenario: **they're not planning to train. They opened the app to look.**
That visit is the highest-leverage moment in the whole product and right now
Home does almost nothing with it — it shows a 30-minute commitment with one
button, and the answer to "do I want to do 30 minutes?" when you're flat is no.

### The bug at the centre of the reward system

`athlete.coins` only ever goes **up**. `recordSession` adds; nothing anywhere
spends. `Complete.tsx` proudly shows a balance for a currency with no store.

A currency you can't spend isn't a reward, it's a score. And a score you can't
lose stops being interesting around week two.

**Give coins a sink and the low-motivation visit fixes itself**, because the
visit now has an answer: *you are 40 coins from the Viking.* One session gets
you there. Nothing else on this page needs a server, an account, or new data.

What coins could buy (all cosmetic — see the warning below):

- **Coaches.** The character list in Track 4 *is* the shop. Each one is a
  single `.ts` file. Unlocking a personality is a genuinely appealing prize and
  it re-motivates by changing how the app feels, not just what it says.
- Coach outfits / seasonal skins — much cheaper per unit than a whole coach.
- App themes, session music tracks, rep-counter sound packs.
- Trophy shelf items: a physical-looking gym that fills up as you buy things.
- **Streak insurance** (see below) — a sink with real emotional weight.

**Never sell:** exercises, plans, progressions, stats, or anything that gates
training. Paywalling the workout behind the workout is a trap.

### Lower the door, don't raise the motivation

You cannot argue someone into a 30-minute workout. You can get them to do one
set — and once the camera is on and a rep counted, the session usually
continues on its own. Momentum is cheaper than willpower.

- **A visibly tiny option on Home.** Not "Quick Start" (which still reads as
  *a workout*) — something explicitly small and honest: **"One set. 2 minutes.
  That's it."** Whatever's least-trained, one set, no plan, no commitment.
- **It has to genuinely count.** Coins earned, streak preserved, logged in
  history. The moment the tiny session is treated as a lesser/cheat path, it
  stops working, because the user knows it doesn't count either.
- **No friction between tap and first rep.** Right now: camera permission,
  side selection, calibration, weight entry. Every prompt is an exit. An
  unmotivated user bails at prompt one. The minimum-viable path should be
  tap → camera → count.
- **"Just do the first exercise"** as an explicit early-out on the hero card,
  so the plan itself has a small door too.

### Make the check-in never be a dead end

Every open should surface exactly **one** concrete, personal, nearly-finished
thing. Not a list — a list is a decision, and decisions are what the
unmotivated visitor can't spend.

- **Goal-gradient framing.** Show the thing that's closest to done:
  *"3 sets from your best week ever."* *"12 reps from 1,000 squats all-time."*
  *"One session and Wednesday's dot goes green."* A bar at 90% pulls; a bar
  at 10% doesn't.
- **The week strip already does this and doesn't say so.** Four grey dots is
  currently just information. *"Two more days matches last week"* is a hook.
- **Rotating daily challenge.** Seeded from the date, so it's deterministic and
  serverless: one exercise, one number, a coin bonus. *"Today: 30 squats,
  +50 coins."* Small, novel, and a reason to open tomorrow too.
- **A reason to open that isn't a workout, but points at one.** The body map
  filling in, a badge shelf with visible gaps, coach dialogue you haven't
  heard. Collections work because you can see what's missing.

### The coach should be there when you open the app

Right now the coach exists only inside a session — the one place you're already
committed. It's absent from the moment it would matter most.

- One line on Home from the coach you picked, selected by `CoachContext`
  (Track 1). *"Four days. I'm not judging. Well — a little."*
- **Reactive presence.** Wii Fit's balance board being cross with you was
  effective and cost nothing. A mascot that's visibly bored/dusty after a week,
  a Rival who's been training while you weren't. The avatar carries the nudge
  without a notification.
- **Tone by absence length.** Day 1 off: nothing. Day 3: light. Day 10: warm
  and forgiving, never shaming — that's the one that decides whether they
  come back at all.

### Streaks, without the cliff

Streaks motivate right up until they break, and then they actively repel.

- **Streak freeze / insurance**, bought with coins. Loss aversion intact,
  demoralising reset avoided, and it's a coin sink with actual stakes.
- **Repair window.** *"Train today and Tuesday still counts."*
- **Count weeks, not days.** "3 sessions/week" survives a bad Tuesday; a daily
  streak in a strength app punishes correct rest.

### ⚠️ The failure mode to watch

Extrinsic rewards can crowd out the real motivation — if training becomes about
coins, the day coins stop mattering is the day training stops. Keep rewards
**flavour, not the point**: cosmetic, characterful, and always narrating real
progress (*"that's your best week"*) rather than replacing it (*"+50 coins"*).
And never reward the check-in enough that checking in becomes a substitute for
training. The daily-login-bonus pattern trains app-opening, not exercise.

### Cheapest → most valuable, if this becomes a pass

1. Coin sink: unlock coaches. Uses Track 4 work, no new systems.
2. Home surfaces one nearly-complete goal + a coach line (needs Track 1).
3. The two-minute door, with zero prompts between tap and first rep.
4. Daily challenge (date-seeded) and streak insurance.

**💡 Your ideas:**

-

---

## Track 6 — The meta-game (engagement between sessions)

Cosmetics answer *"what do coins buy?"* They don't answer *"why do I want more
coins than the shirt costs?"* A management layer does: it turns a flat balance
into an economy with an appetite, and gives the app a reason to exist on
non-training days.

### The one rule that decides whether this works

> **Training is the only meaningful source of income. The meta-game is where
> coins are *spent*, and at most a rounding error of where they're *earned*.**

Every idle/management game eventually asks: *can I progress without the core
activity?* In a Farmville, yes — that's the product. Here, the moment idle
income rivals a session's payout, the app has taught the user that opening it
is as good as training, and the fitness app is now a clicker. If a passive
trickle exists at all it should be ~10–20% of one session's coins per day,
hard-capped, and boring to collect on its own.

The meta-game's job is to make you **want** coins. Training is how you get them.

### The shape: build your gym

Of the obvious candidates (gym builder / village / coach-tamagotchi / RPG
party), the gym is the strongest fit because it's the only one where the
management layer is *about the thing the user is actually doing*.

- **Coins buy equipment.** A squat rack, a bench, mirrors, a water cooler, mats,
  a sound system, terrible motivational posters.
- **Equipment is gated by real training, not just price.** The rack unlocks
  after you've actually squatted; the bench after real presses. This is the key
  move — the gym becomes a **physical rendering of your training history**, not
  a parallel economy running beside it. Walking into your own gym and seeing
  the empty corner where the deadlift platform would go is a better nudge than
  any notification we could send.
- **Equipment pays back into training.** Each piece gives a small permanent
  coin bonus on its exercise. Now the spend decision *is* a training decision:
  buying the rack because you squat, or to make squatting worth more.
- **Rooms / tiers** as long-horizon goals: garage → basement → real gym →
  something absurd. Big, visible, months away, always something to save toward.
- **The coach lives here.** This is where Track 4's characters get bodies and
  Track 5's reactive presence gets a stage. Your coach idles in the gym you
  built, uses the equipment you bought, comments on the empty spots. Unlocking a
  new coach is now moving someone in, not swapping a config value.

### Where the between-session pull actually comes from

Not from idle income — from **things that are waiting for you**:

- **A contract board.** 2–3 rotating jobs, date-seeded so it's deterministic
  and serverless. *"A client wants 300 squat reps this week — 200 coins."*
  *"Train 3 days: 150 coins."* *"Beat your bench best: 400 coins."* This is
  where the real money lives, and **every single job is completed by training.**
  Checking the board on a rest day is the check-in; the job is the reason to
  come back tomorrow.
- **Members show up because of what you built.** Buying equipment attracts
  gym members, members are the trickle, the trickle needs collecting. Small
  numbers, capped at roughly a day so nothing is lost by ignoring it for a
  week. The collect tap is the habit; the contract board is the conversion.
- **Delivery timers, not chores.** Ordered equipment arrives after a real-time
  delay. A reason to look tomorrow that costs nothing and punishes nothing.
- **Never a timer that decays.** No wilting plants, no members quitting, no
  "your gym is dirty." Guilt mechanics on a fitness app compound with the guilt
  the user already feels about not training, and that combination is why people
  delete apps. Absence should cost *opportunity*, never *progress*.

### Two currencies

- **Coins** — from reps and sets, as today. Soft, plentiful, buys equipment.
- **Something rare** — from PRs, streak milestones, completed contracts.
  Trophies, medals, whatever. Buys coaches and the best cosmetics.

This keeps a PR meaningful. Right now a PR and a lazy set pay the same rate per
rep, which quietly says they're the same thing.

### Scope reality check

This is the largest thing in this document by a wide margin — an economy, a
shop, an inventory, a renderable gym, art for every item, and balance tuning.
It's also entirely serverless and entirely local, so it doesn't touch the
mission. Two honest cuts if it happens:

- **v0 is a shop and a contract board, no gym render.** A list of equipment,
  a coin cost, an unlock condition, three rotating contracts. Ships in a
  fraction of the time and tests the loop — *do contracts actually pull people
  back?* — before anyone draws a dumbbell.
- **The gym render is v1**, and can start as a flat 2D room with sprites.

It needs its own tab (`BottomNav` currently holds four; a fifth fits, or it
lives behind the coach). It must never sit between the user and the Start
button.

### Failure modes

- **Idle income competing with training income.** The whole thing collapses here.
- **Numbers going up as the point.** If the gym is compelling and the workout is
  the tax you pay for it, the app has inverted itself. The gym should be a
  *trophy case*, not a *game*.
- **Depth creep.** Every management game grows synergies, upgrade trees, and
  eventually a wiki. The ceiling should be "pleasant to check for 40 seconds."
- **Clock cheating.** Offline accrual from timestamps is trivially gamed by
  changing the device clock. There's no leaderboard and no server, so the only
  person cheated is the user — worth an hour of thought, not a mitigation.

**💡 Your ideas:**

-

---

## Open questions

1. **Does the coach get to be wrong?** Confident-but-incorrect advice ("drop
   the weight") is worse than silence. How much certainty before it speaks?
2. **Is this a *coach* or a *cheerleader*?** Current lines are calm/neutral.
   Analysis pushes toward instructive. Notifications push toward motivational.
   These pull in different directions.
3. **Health-adjacent advice.** Deload suggestions, overtraining warnings —
   where's the line between programming and giving medical advice?
4. **Does the home server happen?** Blocks most of Track 2 and all of the
   interesting parts of Track 3. Still TBD from the Android plan.
5. **Voice clips.** Context-aware lines multiply the pool fast. Does every new
   line need recorded audio, or does text-only / TTS become acceptable?

---

## My recommendation

Do **Track 1 first, on its own.** It needs no decisions about servers, it
makes the coach immediately better, and both Track 2 and Track 3 are far more
compelling once the coach has something intelligent to say. A notification
from a coach that knows your history is worth sending; one from a random-line
generator is spam.

Then decide the home-server question — that single call determines whether
Track 2 gets the reliable version or the Chromium-only one, and whether
Track 3 stays share-link-shaped.
