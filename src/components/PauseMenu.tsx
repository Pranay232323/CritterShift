import { useGameStore } from "../game/store";
import { audio } from "../game/engine/audio";

export default function PauseMenu({ onResume, onRestart }: { onResume: () => void; onRestart: () => void }) {
  const goTitle = useGameStore((s) => s.goTitle);
  const save = useGameStore((s) => s.save);
  const toggleMute = useGameStore((s) => s.toggleMute);

  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/55 backdrop-blur-sm">
      <div className="w-80 rounded-3xl bg-gradient-to-b from-slate-100 to-slate-200 p-6 text-center shadow-2xl ring-4 ring-white/40">
        <h2 className="mb-4 text-2xl font-black tracking-wide text-slate-800">PAUSED</h2>
        <div className="flex flex-col gap-3">
          <MenuButton
            label="▶ Resume"
            onClick={() => {
              audio.play("click");
              onResume();
            }}
            primary
          />
          <MenuButton
            label="↻ Restart"
            onClick={() => {
              audio.play("click");
              onRestart();
            }}
          />
          <MenuButton
            label={save.muted ? "🔇 Sound Off" : "🔊 Sound On"}
            onClick={() => {
              toggleMute();
              audio.setMuted(!save.muted);
            }}
          />
          <MenuButton
            label="🏠 Title Screen"
            onClick={() => {
              audio.play("click");
              goTitle();
            }}
          />
        </div>
      </div>
    </div>
  );
}

function MenuButton({ label, onClick, primary }: { label: string; onClick: () => void; primary?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={
        primary
          ? "rounded-xl bg-gradient-to-b from-amber-300 to-amber-500 px-5 py-3 text-lg font-extrabold text-amber-950 shadow-[0_4px_0_rgba(146,88,0,0.8)] transition active:translate-y-1 active:shadow-none"
          : "rounded-xl bg-white px-5 py-3 text-base font-bold text-slate-700 shadow-[0_3px_0_rgba(0,0,0,0.15)] ring-1 ring-slate-300 transition active:translate-y-1 active:shadow-none"
      }
    >
      {label}
    </button>
  );
}
