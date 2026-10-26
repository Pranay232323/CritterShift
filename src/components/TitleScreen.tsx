import { useGameStore } from "../game/store";
import { audio } from "../game/engine/audio";
import { LEVELS } from "../game/levelData";

export default function TitleScreen() {
  const startGame = useGameStore((s) => s.startGame);
  const openCustomize = useGameStore((s) => s.openCustomize);
  const save = useGameStore((s) => s.save);
  const selectedLevelId = useGameStore((s) => s.selectedLevelId);
  const selectLevel = useGameStore((s) => s.selectLevel);
  const toggleMute = useGameStore((s) => s.toggleMute);

  const bestTime = save.bestTimeMs !== null ? formatTime(save.bestTimeMs) : "—";
  const selectedLevel = LEVELS.find((level) => level.id === selectedLevelId) ?? LEVELS[0];

  return (
    <div
      className="relative flex min-h-screen w-full flex-col items-center justify-between overflow-x-hidden bg-cover bg-center px-4 py-6 sm:py-8"
      style={{ backgroundImage: "url(/images/title-hero.jpg)" }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/20 to-black/70" />

      <div className="relative z-10 flex flex-col items-center gap-1 pt-6 text-center">
        <span className="rounded-full bg-white/15 px-4 py-1 text-xs font-bold tracking-[0.3em] text-white/90 backdrop-blur-sm">
          AN ORIGINAL PHYSICS ADVENTURE
        </span>
        <h1
          className="mt-3 text-5xl font-black tracking-tight text-white drop-shadow-[0_4px_0_rgba(0,0,0,0.35)] sm:text-7xl"
          style={{ fontFamily: "system-ui, sans-serif" }}
        >
          CRITTER<span className="text-amber-300">SHIFT</span>
        </h1>
        <p className="text-lg font-semibold tracking-[0.4em] text-white/90 sm:text-xl">WILDWHEEL WORLDS</p>
      </div>

      <div className="relative z-10 flex w-full max-w-2xl flex-col items-center gap-4">
        <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-5">
          {LEVELS.map((level, index) => {
            const unlocked = save.unlockedLevelIds.includes(level.id);
            const selected = selectedLevelId === level.id;
            return (
              <button
                key={level.id}
                disabled={!unlocked}
                onClick={() => {
                  audio.play("click");
                  selectLevel(level.id);
                }}
                className={`min-h-16 rounded-xl px-3 py-2 text-left ring-1 transition ${
                  selected
                    ? "bg-amber-300/90 text-amber-950 ring-amber-100"
                    : unlocked
                      ? "bg-black/40 text-white ring-white/30 hover:bg-black/55"
                      : "cursor-not-allowed bg-black/25 text-white/50 ring-white/15"
                }`}
              >
                <span className="block text-[10px] font-bold uppercase tracking-widest">
                  {unlocked ? `World ${index + 1}` : "Locked"}
                </span>
                <span className="block text-sm font-extrabold leading-tight">{level.name}</span>
                <span className="mt-1 block text-[10px] font-semibold opacity-75">
                  {Math.round((level.finish.x - level.startPosition.x) / 1000)} km journey
                </span>
              </button>
            );
          })}
        </div>
        <p className="text-center text-xs font-semibold text-white/80">{selectedLevel.subtitle}</p>
        <button
          onClick={() => {
            audio.resume();
            audio.play("click");
            startGame();
          }}
          className="w-full rounded-2xl bg-gradient-to-b from-amber-300 to-amber-500 px-8 py-4 text-2xl font-extrabold text-amber-950 shadow-[0_6px_0_rgba(146,88,0,0.8)] ring-2 ring-amber-200 transition active:translate-y-1 active:shadow-[0_2px_0_rgba(146,88,0,0.8)]"
        >
          ▶ PLAY WORLD
        </button>

        <button
          onClick={() => {
            audio.play("click");
            openCustomize();
          }}
          className="w-full rounded-2xl bg-white/15 px-6 py-3 text-lg font-bold text-white ring-1 ring-white/30 backdrop-blur-sm transition hover:bg-white/25 active:scale-95"
        >
          🎨 Customize Shiftling
        </button>

        <button
          onClick={() => {
            toggleMute();
            audio.setMuted(!save.muted);
          }}
          className="rounded-xl bg-black/30 px-4 py-2 text-sm font-semibold text-white/90 ring-1 ring-white/20 backdrop-blur-sm transition hover:bg-black/45"
        >
          {save.muted ? "🔇 Sound Off" : "🔊 Sound On"}
        </button>

        <div className="mt-1 text-sm font-semibold text-white/80">Best Time: {bestTime} · Energy Banked: {save.totalEnergyBanked}⚡</div>
      </div>

      <div className="relative z-10 w-full max-w-2xl rounded-2xl bg-black/35 p-4 text-white ring-1 ring-white/20 backdrop-blur-sm">
        <h2 className="mb-2 text-center text-xs font-bold tracking-[0.3em] text-amber-300">CONTROLS</h2>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-5">
          <Control keys="A / ←" desc="Reverse / Brake" />
          <Control keys="D / →" desc="Accelerate" />
          <Control keys="Space" desc="Jump / Flap" />
          <Control keys="Q" desc="Switch Form" />
          <Control keys="R" desc="Recover" />
        </div>
      </div>
    </div>
  );
}

function Control({ keys, desc }: { keys: string; desc: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="rounded-md bg-white/20 px-2 py-0.5 font-mono text-xs font-bold">{keys}</span>
      <span className="text-white/80">{desc}</span>
    </div>
  );
}

function formatTime(ms: number): string {
  const totalSec = ms / 1000;
  const m = Math.floor(totalSec / 60);
  const s = (totalSec % 60).toFixed(2).padStart(5, "0");
  return `${m}:${s}`;
}
