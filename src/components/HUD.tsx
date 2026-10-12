import { useGameStore } from "../game/store";
import type { MovementForm } from "../game/types";

const FORM_META: Record<MovementForm, { label: string; icon: string; color: string }> = {
  roll: { label: "ROLL", icon: "●", color: "#4fd1a5" },
  glide: { label: "GLIDE", icon: "✦", color: "#6fb8e8" },
  magnet: { label: "MAGNET", icon: "⊛", color: "#ff5fae" },
};

function formatTime(ms: number): string {
  const totalSec = ms / 1000;
  const m = Math.floor(totalSec / 60);
  const s = (totalSec % 60).toFixed(2).padStart(5, "0");
  return `${m}:${s}`;
}

export default function HUD({ onPause }: { onPause: () => void }) {
  const hud = useGameStore((s) => s.hud);
  const meta = FORM_META[hud.form];

  return (
    <div className="pointer-events-none absolute inset-0 select-none font-[system-ui]">
      {/* Top bar */}
      <div className="flex items-start justify-between p-3 sm:p-4">
        <div className="flex gap-2">
          <div className="pointer-events-auto flex items-center gap-2 rounded-2xl bg-black/35 px-3 py-2 backdrop-blur-sm ring-1 ring-white/20">
            <span className="text-xl" style={{ color: "#ffd23f" }}>
              ⚡
            </span>
            <span className="text-lg font-bold text-white tabular-nums">
              {hud.energy}
              <span className="text-white/60">/{hud.totalEnergyInLevel}</span>
            </span>
          </div>
          {hud.totalHidden > 0 && (
            <div className="pointer-events-auto flex items-center gap-2 rounded-2xl bg-black/35 px-3 py-2 backdrop-blur-sm ring-1 ring-white/20">
              <span className="text-lg" style={{ color: "#9ef2ff" }}>
                ✦
              </span>
              <span className="text-sm font-bold text-white tabular-nums">
                {hud.hiddenFound}/{hud.totalHidden}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="rounded-2xl bg-black/35 px-3 py-2 font-mono text-lg font-bold text-white backdrop-blur-sm ring-1 ring-white/20 tabular-nums">
            {formatTime(hud.elapsedMs)}
          </div>
          <button
            onClick={onPause}
            className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-2xl bg-black/35 text-xl text-white ring-1 ring-white/20 backdrop-blur-sm transition hover:bg-black/55 active:scale-95"
            aria-label="Pause"
          >
            ❚❚
          </button>
        </div>
      </div>

      {/* Form indicator */}
      <div className="absolute bottom-4 left-3 sm:left-4 flex flex-col items-start gap-2">
        <div
          className="flex items-center gap-2 rounded-2xl px-3 py-2 ring-2 backdrop-blur-sm transition-colors"
          style={{ backgroundColor: `${meta.color}33`, borderColor: meta.color, boxShadow: `0 0 18px ${meta.color}55` }}
        >
          <span className="text-xl" style={{ color: meta.color }}>
            {meta.icon}
          </span>
          <span className="text-sm font-extrabold tracking-wider text-white">{meta.label}</span>
        </div>
        <div className="rounded-xl bg-black/30 px-2.5 py-1 text-xs font-semibold text-white/80 backdrop-blur-sm">
          Q · switch form
        </div>
      </div>

      {/* Speed */}
      <div className="absolute bottom-4 right-3 sm:right-4 rounded-2xl bg-black/35 px-3 py-2 text-right text-white ring-1 ring-white/20 backdrop-blur-sm">
        <div className="text-xl font-bold tabular-nums leading-none">{hud.speedKph}</div>
        <div className="text-[10px] font-semibold tracking-widest text-white/60">KPH</div>
      </div>

      {/* Contextual hint */}
      {hud.message && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 rounded-full bg-black/55 px-4 py-2 text-sm font-semibold text-white shadow-lg ring-1 ring-white/20 backdrop-blur-sm animate-pulse">
          {hud.message}
        </div>
      )}

      {/* Brief controls reminder, fades out once the player gets moving */}
      {hud.elapsedMs < 7000 && (
        <div
          className="absolute left-1/2 top-16 -translate-x-1/2 rounded-2xl bg-black/30 px-4 py-2 text-xs font-semibold text-white/85 backdrop-blur-sm transition-opacity duration-1000"
          style={{ opacity: hud.elapsedMs > 5500 ? 0 : 1 }}
        >
          A/D move · Space jump · Q shift form · R recover · Esc pause
        </div>
      )}
    </div>
  );
}
