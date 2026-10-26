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

type TouchControl = "left" | "right" | "jump";
type TouchAction = "form" | "recover";

export default function HUD({
  onPause,
  levelName,
  onControl,
  onAction,
}: {
  onPause: () => void;
  levelName: string;
  onControl: (control: TouchControl, active: boolean) => void;
  onAction: (action: TouchAction) => void;
}) {
  const hud = useGameStore((s) => s.hud);
  const meta = FORM_META[hud.form];

  return (
    <div className="pointer-events-none absolute inset-0 select-none font-[system-ui]">
      {/* Top bar */}
      <div className="flex items-start justify-between p-3 sm:p-4">
        <div className="flex gap-2">
          <div className="hidden items-center rounded-2xl bg-black/35 px-3 py-2 text-sm font-bold text-white backdrop-blur-sm ring-1 ring-white/20 sm:flex">
            {levelName}
          </div>
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

      <div className="absolute left-1/2 top-12 max-w-[45vw] -translate-x-1/2 truncate text-center text-[10px] font-bold text-white drop-shadow sm:hidden">
        {levelName}
      </div>
      <div className="absolute left-1/2 top-[4.6rem] w-40 -translate-x-1/2 sm:top-4 sm:w-48">
        <div className="h-2 overflow-hidden rounded-full bg-black/35 ring-1 ring-white/25">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-300 to-emerald-300 transition-[width] duration-150"
            style={{ width: `${hud.progress * 100}%` }}
          />
        </div>
        <div className="mt-1 text-center text-[9px] font-bold uppercase tracking-widest text-white/80 drop-shadow">
          {Math.round(hud.progress * 100)}% journey
        </div>
      </div>

      {/* Form indicator */}
      <div className="absolute bottom-20 left-3 flex flex-col items-start gap-2 sm:bottom-4 sm:left-4">
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
      <div className="absolute bottom-20 right-3 rounded-2xl bg-black/35 px-3 py-2 text-right text-white ring-1 ring-white/20 backdrop-blur-sm sm:bottom-4 sm:right-4">
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
        <>
          <div
            className="absolute left-1/2 top-28 -translate-x-1/2 rounded-2xl bg-black/30 px-4 py-2 text-center text-xs font-semibold text-white/85 backdrop-blur-sm transition-opacity duration-1000 sm:hidden"
            style={{ opacity: hud.elapsedMs > 5500 ? 0 : 1 }}
          >
            Tap arrows to drive · Hold JUMP to flap · SHIFT to transform
          </div>
          <div
            className="absolute left-1/2 top-16 hidden -translate-x-1/2 rounded-2xl bg-black/30 px-4 py-2 text-xs font-semibold text-white/85 backdrop-blur-sm transition-opacity duration-1000 sm:block"
            style={{ opacity: hud.elapsedMs > 5500 ? 0 : 1 }}
          >
            A/D move · Space jump · Q shift form · R recover · Esc pause
          </div>
        </>
      )}

      <div className="pointer-events-auto absolute bottom-3 left-3 flex items-end gap-2 md:hidden">
        <TouchButton label="◀" ariaLabel="Move left" onPress={(active) => onControl("left", active)} />
        <TouchButton label="▶" ariaLabel="Move right" onPress={(active) => onControl("right", active)} />
        <TouchButton label="JUMP" ariaLabel="Jump or flap" onPress={(active) => onControl("jump", active)} />
      </div>
      <div className="pointer-events-auto absolute bottom-3 right-3 flex items-end gap-2 md:hidden">
        <TouchButton label="SHIFT" ariaLabel="Switch movement form" onPress={(active) => active && onAction("form")} />
        <TouchButton label="RECOVER" ariaLabel="Recover at checkpoint" onPress={(active) => active && onAction("recover")} />
      </div>
    </div>
  );
}

function TouchButton({
  label,
  ariaLabel,
  onPress,
}: {
  label: string;
  ariaLabel: string;
  onPress: (active: boolean) => void;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      onPointerDown={(event) => {
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        onPress(true);
      }}
      onPointerUp={(event) => {
        event.preventDefault();
        onPress(false);
      }}
      onPointerCancel={() => onPress(false)}
      onContextMenu={(event) => event.preventDefault()}
      className="touch-none select-none rounded-2xl bg-slate-950/55 px-3 py-3 text-xs font-black tracking-wide text-white shadow-lg ring-1 ring-white/40 backdrop-blur-sm active:scale-95 active:bg-amber-500/80"
    >
      {label}
    </button>
  );
}
