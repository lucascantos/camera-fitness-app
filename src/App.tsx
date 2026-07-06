import { useEffect, useState } from "react";
import { getSettings, loadSettings } from "@/data/settings/settings";
import { loadAthlete } from "@/data/athlete/athlete";
import { useSessionStore, loadPersistedSession } from "@/stores/sessionStore";
import { unlockAudio } from "@/audio/sfx";
import { startMusic } from "@/audio/music";

import { TopNav }            from "@/components/TopNav";
import { Home }              from "@/components/Home";
import { Plans }             from "@/components/Plans";
import { Exercises }         from "@/components/Exercises";
import { Training }          from "@/components/Training";
import { Rest }              from "@/components/Rest";
import { NextExercise }      from "@/components/NextExercise";
import { Complete }          from "@/components/Complete";
import { Stats }             from "@/components/Stats";
import { Settings }          from "@/components/Settings";
import { SessionRecovery }   from "@/components/SessionRecovery";

export default function App() {
  const { scene } = useSessionStore();
  const [ready, setReady] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);

  useEffect(() => {
    Promise.all([loadSettings(), loadAthlete()]).then(async () => {
      const persisted = await loadPersistedSession();
      if (persisted) setShowRecovery(true);
      setReady(true);
    });
  }, []);

  // First user gesture unlocks WebAudio (iOS Safari) and kicks the music
  // loop. Both fail silently if the file is missing.
  useEffect(() => {
    const onFirstGesture = () => {
      unlockAudio();
      void startMusic();
      window.removeEventListener("pointerdown", onFirstGesture);
      window.removeEventListener("keydown",     onFirstGesture);
    };
    window.addEventListener("pointerdown", onFirstGesture, { once: true });
    window.addEventListener("keydown",     onFirstGesture, { once: true });
    return () => {
      window.removeEventListener("pointerdown", onFirstGesture);
      window.removeEventListener("keydown",     onFirstGesture);
    };
  }, []);

  if (!ready) {
    return (
      <div className="h-full grid place-items-center text-gray-dark">Loading…</div>
    );
  }

  // Scenes that hide TopNav (full-screen workout flow).
  const fullscreen =
    scene === "training" || scene === "rest" ||
    scene === "transition" || scene === "complete";

  return (
    <div className="h-full flex flex-col bg-bg">
      {!fullscreen && <TopNav initials={getSettings().initials} />}
      <main className="flex-1 overflow-auto">
        {scene === "home"      && <Home      />}
        {scene === "plans"     && <Plans     />}
        {scene === "exercises" && <Exercises />}
        {scene === "training"  && <Training  />}
        {scene === "rest"        && <Rest         />}
        {scene === "transition"  && <NextExercise />}
        {scene === "complete"    && <Complete     />}
        {scene === "stats"     && <Stats     />}
        {scene === "settings"  && <Settings  />}
      </main>
      {showRecovery && (
        <SessionRecovery onDismiss={() => setShowRecovery(false)} />
      )}
    </div>
  );
}
