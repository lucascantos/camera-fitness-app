import { useEffect, useState } from "react";
import { getSettings, loadSettings, updateSettings } from "@/data/settings/settings";
import { requestPersistentStorage } from "@/data/db";
import { getAthlete, loadAthlete } from "@/data/athlete/athlete";
import { useSessionStore, loadPersistedSession } from "@/stores/sessionStore";
import { useWakeLock } from "@/hooks/useWakeLock";
import { unlockAudio } from "@/audio/sfx";
import { startMusic } from "@/audio/music";
import { dismissSplash } from "@/splash";

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
import { SessionPreview }    from "@/components/SessionPreview";
import { SessionRecovery }   from "@/components/SessionRecovery";
import { Onboarding }        from "@/components/onboarding/Onboarding";
import { makeCalibrationSession } from "@/data/plans/calibration";

export default function App() {
  const { scene, openPreview } = useSessionStore();
  const [ready, setReady] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [onboarding, setOnboarding] = useState(false);

  // The full-screen workout flow.
  const workoutFlow =
    scene === "training" || scene === "rest" ||
    scene === "transition" || scene === "complete";

  // Scenes that hide TopNav and BottomNav: the workout, and the preview
  // screen leading into it.
  const chromeless = workoutFlow || scene === "preview";

  // Keep the screen awake for the whole workout flow (training + rest +
  // transition + complete), where the user often isn't touching the phone.
  // Called before the `!ready` early return to satisfy the rules of hooks.
  useWakeLock(workoutFlow);

  useEffect(() => {
    Promise.all([loadSettings(), loadAthlete()]).then(async () => {
      // Onboarding is for a first launch only. Workout history without saved
      // settings is still an existing user, so mark them done and move on.
      if (!getSettings().onboarded) {
        if (getAthlete().history.length > 0) await updateSettings({ onboarded: true });
        else setOnboarding(true);
      }
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

  // Play the splash exit once the app has rendered underneath it.
  useEffect(() => { if (ready) dismissSplash(); }, [ready]);

  if (!ready) {
    return (
      <div className="h-full grid place-items-center text-gray-dark">Loading…</div>
    );
  }

  // First launch: onboarding replaces the app until it's finished.
  if (onboarding) {
    return (
      <Onboarding
        onDone={(calibrate) => {
          setOnboarding(false);
          if (calibrate) {
            openPreview({ title: "Calibration", subtitle: "Dumbbells", session: makeCalibrationSession() });
          }
        }}
      />
    );
  }

  return (
    <div className="h-full flex flex-col bg-bg safe-area">
      {!chromeless && <TopNav />}
      {/* Bottom padding reserves room for the fixed BottomNav (56px bar +
          safe-area inset) so the last card is never trapped behind it. */}
      <main
        className="flex-1 overflow-auto"
        style={
          chromeless
            ? undefined
            : { paddingBottom: "calc(56px + env(safe-area-inset-bottom))" }
        }
      >
        {scene === "home"      && <Home      />}
        {scene === "plans"     && <Plans     />}
        {scene === "exercises" && <Exercises />}
        {scene === "preview"   && <SessionPreview />}
        {scene === "training"  && <Training  />}
        {scene === "rest"        && <Rest         />}
        {scene === "transition"  && <NextExercise />}
        {scene === "complete"    && <Complete     />}
        {scene === "stats"     && <Stats     />}
        {scene === "settings"  && <Settings  />}
      </main>
      {!chromeless && <BottomNav />}
      {showRecovery && (
        <SessionRecovery onDismiss={() => setShowRecovery(false)} />
      )}
    </div>
  );
}
