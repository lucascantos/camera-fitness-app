// Home's information box: a rotating billboard of "news" about the athlete —
// this month's training, the last workout's verdicts, a personal best, the
// weekly-goal chart, the body trend. Slides with nothing to say are left out.
// It advances on its own every few seconds and pauses for a while after the
// athlete touches it, so a swipe is never fought by the timer.

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { getAthlete } from "@/data/athlete/athlete";
import { getSettings } from "@/data/settings/settings";
import { Carousel, Dots } from "@/components/complete/Carousel";
import { bestNews, bodyNews, latestNews, monthNews, weeksNews } from "./news";
import { BestSlide, LatestSlide, MonthSlide, WelcomeSlide } from "./slides";
import { BodySlide, WeeksSlide } from "./slideCharts";

const ADVANCE_MS = 6000;
const TOUCH_PAUSE_MS = 12000;

type Slide = { id: string; node: ReactNode };

function buildSlides(): Slide[] {
  const history = getAthlete().history;
  if (history.length === 0) return [{ id: "welcome", node: <WelcomeSlide /> }];

  const today = new Date();
  const goal = getSettings().weeklyGoal;
  const latest = latestNews(history);
  const best = bestNews(history, today);
  const body = bodyNews(today);
  const slides: (Slide | null)[] = [
    { id: "month", node: <MonthSlide m={monthNews(history, goal, today)} /> },
    latest && { id: "latest", node: <LatestSlide l={latest} /> },
    best && { id: "best", node: <BestSlide b={best} /> },
    { id: "weeks", node: <WeeksSlide w={weeksNews(history, goal, today)} /> },
    body && { id: "body", node: <BodySlide b={body} /> },
  ];
  return slides.filter((s): s is Slide => s !== null);
}

export function Billboard({ refreshKey }: { refreshKey?: unknown }) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const slides = useMemo(buildSlides, [refreshKey]);
  const [index, setIndex] = useState(0);
  const touched = useRef(0);
  const n = slides.length;

  useEffect(() => {
    if (n < 2) return;
    const id = setInterval(() => {
      if (document.hidden || Date.now() - touched.current < TOUCH_PAUSE_MS) return;
      setIndex((i) => (i + 1) % n);
    }, ADVANCE_MS);
    return () => clearInterval(id);
  }, [n]);

  const go = (i: number) => {
    touched.current = Date.now();
    setIndex(i);
  };

  return (
    <section aria-label="Your news" onPointerDown={() => { touched.current = Date.now(); }}>
      <Carousel index={Math.min(index, n - 1)} onIndex={go} gutter={16}>
        {slides.map((s) => <div key={s.id}>{s.node}</div>)}
      </Carousel>
      {n > 1 && <Dots count={n} index={Math.min(index, n - 1)} onIndex={go} />}
    </section>
  );
}
