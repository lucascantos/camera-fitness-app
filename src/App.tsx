import { useEffect, useState } from "react";
import { getSettings, loadSettings } from "@/data/settings/settings";
import { loadAthlete } from "@/data/athlete/athlete";
import { useSessionStore } from "@/stores/sessionStore";

import { TopNav }    from "@/components/TopNav";
import { Home }      from "@/components/Home";
import { Plans }     from "@/components/Plans";
import { Exercises } from "@/components/Exercises";
import { Training }  from "@/components/Training";
import { Rest }      from "@/components/Rest";
import { Complete }  from "@/components/Complete";
import { Stats }     from "@/components/Stats";
import { Settings }  from "@/components/Settings";

export default function App() {
  const { scene } = useSessionStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    Promise.all([loadSettings(), loadAthlete()]).then(() => setReady(true));
  }, []);

  if (!ready) {
    return (
      <div className="h-full grid place-items-center text-gray-dark">Loading…</div>
    );
  }

  // Scenes that hide TopNav (full-screen workout flow)
  const fullscreen = scene === "training" || scene === "rest" || scene === "complete";

  return (
    <div className="h-full flex flex-col bg-bg">
      {!fullscreen && <TopNav initials={getSettings().initials} />}
      <main className="flex-1 overflow-auto">
        {scene === "home"      && <Home      />}
        {scene === "plans"     && <Plans     />}
        {scene === "exercises" && <Exercises />}
        {scene === "training"  && <Training  />}
        {scene === "rest"      && <Rest      />}
        {scene === "complete"  && <Complete  />}
        {scene === "stats"     && <Stats     />}
        {scene === "settings"  && <Settings  />}
      </main>
    </div>
  );
}
