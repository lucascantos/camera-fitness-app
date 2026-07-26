import { useEffect, useState } from "react";
import { getSettings, loadSettings } from "@/data/settings/settings";
import { requestPersistentStorage } from "@/data/db";
import { loadAthlete } from "@/data/athlete/athlete";
import { useSessionStore, loadPersistedSession } from "@/stores/sessionStore";
import { useWakeLock } from "@/hooks/useWakeLock";
import { unlockAudio } from "@/audio/sfx";
import { startMusic } from "@/audio/music";

import { TopNav }            from "@/components/TopNav";
import { BottomNav }         from "@/components/BottomNav";
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

  // Scenes that hide TopNav (full-screen workout flow).
  const fullscreen =
    scene === "training" || scene === "rest" ||
    scene === "transition" || scene === "complete";

  // Keep the screen awake for the whole workout flow (training + rest +
  // transition + complete), where the user often isn't touching the phone.
  // Called before the `!ready` early return to satisfy the rules of hooks.
  useWakeLock(fullscreen);

  useEffect(() => {
    Promise.all([loadSettings(), loadAthlete()]).then(async () => {
      const persisted = await loadPersistedSession();
      if (persisted) setShowRecovery(true);
      setReady(true);
    });
    // Best-effort ask to exempt our IndexedDB data from eviction under
    // storage pressure — mobile browsers reclaim "best effort" storage far
    // more aggressively than desktop. Fire-and-forget: nothing in the UI
    // depends on the outcome.
    void requestPersistentStorage();
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

  return (
    <div className="h-full flex flex-col bg-bg safe-area">
      {!fullscreen && <TopNav initials={getSettings().initials} />}
      {/* Bottom padding reserves room for the fixed BottomNav (56px bar +
          safe-area inset) so the last card is never trapped behind it. */}
      <main
        className="flex-1 overflow-auto"
        style={
          fullscreen
            ? undefined
            : { paddingBottom: "calc(56px + env(safe-area-inset-bottom))" }
        }
      >
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
      {!fullscreen && <BottomNav />}
      {showRecovery && (
        <SessionRecovery onDismiss={() => setShowRecovery(false)} />
      )}
    </div>
  );
}
