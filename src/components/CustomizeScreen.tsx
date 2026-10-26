import { COLOR_SCHEMES } from "../game/colorSchemes";
import { useGameStore } from "../game/store";
import { audio } from "../game/engine/audio";
import { VEHICLES } from "../game/vehicles";

export default function CustomizeScreen() {
  const save = useGameStore((s) => s.save);
  const selectColor = useGameStore((s) => s.selectColor);
  const closeCustomize = useGameStore((s) => s.closeCustomize);
  const status = useGameStore((s) => s.status);
  const selectedVehicleId = useGameStore((s) => s.selectedVehicleId);
  const selectVehicle = useGameStore((s) => s.selectVehicle);
  const purchaseUpgrade = useGameStore((s) => s.purchaseUpgrade);

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

      <section className="mt-10 w-full max-w-3xl">
        <h2 className="mb-3 text-2xl font-black text-slate-800">Choose your ride</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {VEHICLES.map((vehicle) => {
            const unlocked = save.unlockedVehicleIds.includes(vehicle.id);
            const selected = selectedVehicleId === vehicle.id;
            const affordable = save.totalEnergyBanked >= vehicle.cost;
            return (
              <button
                key={vehicle.id}
                onClick={() => {
                  audio.resume();
                  audio.play("click");
                  selectVehicle(vehicle.id);
                }}
                disabled={!unlocked && !affordable}
                className={`rounded-2xl bg-white p-4 text-left ring-2 transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-55 ${
                  selected ? "ring-amber-400 shadow-lg" : "ring-slate-200 hover:ring-slate-300"
                }`}
              >
                <span className="block text-lg font-black text-slate-800">{vehicle.name}</span>
                <span className="mt-1 block min-h-10 text-xs font-medium text-slate-500">{vehicle.description}</span>
                <span className="mt-3 block text-xs font-extrabold text-amber-700">
                  {selected ? "EQUIPPED" : unlocked ? "TAP TO EQUIP" : affordable ? `UNLOCK · ${vehicle.cost} ⚡` : `NEED ${vehicle.cost} ⚡`}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-8 w-full max-w-3xl">
        <h2 className="mb-3 text-2xl font-black text-slate-800">Workshop upgrades</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <UpgradeCard
            label="Engine"
            detail="More pull uphill and a higher top speed."
            level={save.vehicleUpgrades.engine}
            energy={save.totalEnergyBanked}
            onBuy={() => purchaseUpgrade("engine")}
          />
          <UpgradeCard
            label="Suspension"
            detail="Softer landings and better wheel contact."
            level={save.vehicleUpgrades.suspension}
            energy={save.totalEnergyBanked}
            onBuy={() => purchaseUpgrade("suspension")}
          />
          <UpgradeCard
            label="Jump springs"
            detail="More height and lift while gliding."
            level={save.vehicleUpgrades.jump}
            energy={save.totalEnergyBanked}
            onBuy={() => purchaseUpgrade("jump")}
          />
        </div>
      </section>

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

function UpgradeCard({
  label,
  detail,
  level,
  energy,
  onBuy,
}: {
  label: string;
  detail: string;
  level: number;
  energy: number;
  onBuy: () => void;
}) {
  const cost = 15 + level * 12;
  const maxed = level >= 5;
  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
      <div className="flex items-center justify-between">
        <h3 className="font-extrabold text-slate-800">{label}</h3>
        <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-black text-slate-600">{level}/5</span>
      </div>
      <p className="mt-2 min-h-10 text-xs font-medium text-slate-500">{detail}</p>
      <button
        disabled={maxed || energy < cost}
        onClick={() => {
          audio.play("click");
          onBuy();
        }}
        className="mt-3 w-full rounded-xl bg-amber-300 px-3 py-2 text-sm font-extrabold text-amber-950 disabled:cursor-not-allowed disabled:opacity-45"
      >
        {maxed ? "MAX LEVEL" : `Upgrade · ${cost} ⚡`}
      </button>
    </div>
  );
}
