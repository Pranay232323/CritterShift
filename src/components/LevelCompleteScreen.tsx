import { useGameStore } from "../game/store";
import { audio } from "../game/engine/audio";
import { getLevelById, getNextLevel } from "../game/levelData";

function formatTime(ms: number): string {
  const totalSec = ms / 1000;
  const m = Math.floor(totalSec / 60);
  const s = (totalSec % 60).toFixed(2).padStart(5, "0");
  return `${m}:${s}`;
}

export default function LevelCompleteScreen() {
  const stats = useGameStore((s) => s.lastRunStats);
  const restart = useGameStore((s) => s.restart);
  const goTitle = useGameStore((s) => s.goTitle);
  const openCustomize = useGameStore((s) => s.openCustomize);
  const startGame = useGameStore((s) => s.startGame);

  if (!stats) return null;
  const level = getLevelById(stats.levelId);
  const nextLevel = getNextLevel(stats.levelId);

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-gradient-to-b from-sky-200/90 to-emerald-200/90 backdrop-blur-sm">
      <div className="w-[22rem] rounded-3xl bg-white/95 p-6 text-center shadow-2xl ring-4 ring-amber-200">
        <div className="mb-1 text-5xl">🏁</div>
        <h2 className="mb-1 text-3xl font-black text-emerald-700">{level.name} Cleared!</h2>
        <p className="mb-4 text-sm font-semibold text-slate-500">Your Shiftling made it to the finish.</p>

        <div className="mb-4 grid grid-cols-2 gap-3 text-left">
          <Stat label="Time" value={formatTime(stats.timeMs)} highlight={stats.isNewBest} />
          <Stat label="Energy" value={`${stats.energy}/${stats.totalEnergy} ⚡`} />
          <Stat label="Hidden Found" value={`${stats.hidden}/${stats.totalHidden} ✦`} />
          <Stat label="New Best" value={stats.isNewBest ? "YES!" : "—"} highlight={stats.isNewBest} />
        </div>

        <div className="flex flex-col gap-2">
          {nextLevel && (
            <button
              onClick={() => {
                audio.play("click");
                startGame(nextLevel.id);
              }}
              className="rounded-xl bg-gradient-to-b from-emerald-300 to-emerald-500 px-5 py-3 text-lg font-extrabold text-emerald-950 shadow-[0_4px_0_rgba(34,110,73,0.8)] transition active:translate-y-1 active:shadow-none"
            >
              ▶ Next World: {nextLevel.name}
            </button>
          )}
          <button
            onClick={() => {
              audio.play("click");
              restart();
            }}
            className="rounded-xl bg-gradient-to-b from-amber-300 to-amber-500 px-5 py-3 text-lg font-extrabold text-amber-950 shadow-[0_4px_0_rgba(146,88,0,0.8)] transition active:translate-y-1 active:shadow-none"
          >
            ↻ Play Again
          </button>
          <button
            onClick={() => {
              audio.play("click");
              openCustomize();
            }}
            className="rounded-xl bg-violet-100 px-5 py-3 text-base font-bold text-violet-700 ring-1 ring-violet-300 transition active:translate-y-1"
          >
            🎨 Spend Energy
          </button>
          <button
            onClick={() => {
              audio.play("click");
              goTitle();
            }}
            className="rounded-xl bg-white px-5 py-3 text-base font-bold text-slate-600 shadow-[0_3px_0_rgba(0,0,0,0.12)] ring-1 ring-slate-300 transition active:translate-y-1 active:shadow-none"
          >
            🏠 Title Screen
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-xl p-2.5 ${highlight ? "bg-amber-100 ring-1 ring-amber-300" : "bg-slate-100"}`}>
      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</div>
      <div className={`text-lg font-extrabold ${highlight ? "text-amber-600" : "text-slate-700"}`}>{value}</div>
    </div>
  );
}
