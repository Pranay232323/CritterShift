import { COLOR_SCHEMES } from "../game/colorSchemes";
import { useGameStore } from "../game/store";
import { audio } from "../game/engine/audio";

export default function CustomizeScreen() {
  const save = useGameStore((s) => s.save);
  const selectColor = useGameStore((s) => s.selectColor);
  const closeCustomize = useGameStore((s) => s.closeCustomize);
  const status = useGameStore((s) => s.status);

  return (
    <div className="flex min-h-screen w-full flex-col items-center bg-gradient-to-b from-indigo-100 via-sky-50 to-emerald-50 px-4 py-8">
      <div className="mb-6 flex w-full max-w-3xl items-center justify-between">
        <h1 className="text-3xl font-black text-slate-800">Customize your Shiftling</h1>
        <div className="rounded-full bg-amber-100 px-4 py-2 text-sm font-bold text-amber-700 ring-1 ring-amber-300">
          ⚡ {save.totalEnergyBanked} Energy Banked
        </div>
      </div>

      <div className="grid w-full max-w-3xl grid-cols-2 gap-4 sm:grid-cols-3">
        {COLOR_SCHEMES.map((scheme) => {
          const unlocked = save.unlockedColors.includes(scheme.id);
          const selected = save.selectedColor === scheme.id;
          const affordable = save.totalEnergyBanked >= scheme.cost;
          return (
            <button
              key={scheme.id}
              onClick={() => {
                audio.play("click");
                selectColor(scheme.id);
              }}
              className={`flex flex-col items-center gap-2 rounded-2xl p-4 ring-2 transition active:scale-95 ${
                selected ? "bg-white ring-amber-400 shadow-lg" : "bg-white/70 ring-slate-200 hover:bg-white"
              }`}
            >
              <div className="relative flex h-16 w-24 items-center justify-center">
                <div
                  className="h-10 w-20 rounded-full border-2"
                  style={{ backgroundColor: scheme.primary, borderColor: scheme.secondary }}
                />
                <div
                  className="absolute left-1/2 top-1 h-7 w-7 -translate-x-1/2 rounded-full border-2 border-slate-700/20 bg-white"
                  style={{ boxShadow: `0 0 0 3px ${scheme.accent} inset` }}
                />
              </div>
              <span className="text-sm font-bold text-slate-700">{scheme.name}</span>
              {!unlocked && (
                <span className={`text-xs font-bold ${affordable ? "text-emerald-600" : "text-rose-500"}`}>
                  🔒 {scheme.cost}⚡
                </span>
              )}
              {unlocked && selected && <span className="text-xs font-bold text-amber-600">✓ EQUIPPED</span>}
              {unlocked && !selected && <span className="text-xs font-semibold text-slate-400">Tap to equip</span>}
            </button>
          );
        })}
      </div>

      <button
        onClick={() => {
          audio.play("click");
          closeCustomize();
        }}
        className="mt-8 rounded-xl bg-slate-800 px-8 py-3 text-lg font-bold text-white shadow-[0_4px_0_rgba(0,0,0,0.3)] transition active:translate-y-1 active:shadow-none"
      >
        {status === "customize" ? "Back" : "Done"}
      </button>
    </div>
  );
}
