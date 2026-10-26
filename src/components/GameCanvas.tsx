import { useEffect, useRef } from "react";
import { CritterShiftGame } from "../game/engine/CritterShiftGame";
import { getColorScheme } from "../game/colorSchemes";
import { useGameStore } from "../game/store";
import { audio } from "../game/engine/audio";
import HUD from "./HUD";
import PauseMenu from "./PauseMenu";
import LevelCompleteScreen from "./LevelCompleteScreen";
import { getLevelById } from "../game/levelData";

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<CritterShiftGame | null>(null);

  const status = useGameStore((s) => s.status);
  const setStatus = useGameStore((s) => s.setStatus);
  const updateHud = useGameStore((s) => s.updateHud);
  const completeLevel = useGameStore((s) => s.completeLevel);
  const save = useGameStore((s) => s.save);
  const selectedLevelId = useGameStore((s) => s.selectedLevelId);
  const restart = useGameStore((s) => s.restart);

  // Mount / unmount the physics + render engine exactly once per run.
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    audio.setMuted(save.muted);
    const game = new CritterShiftGame(canvas, getColorScheme(save.selectedColor), getLevelById(selectedLevelId), {
      onHud: (hud) => updateHud(hud),
      onComplete: (stats) => {
        completeLevel(stats);
      },
    });
    gameRef.current = game;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      game.resize(rect.width, rect.height, Math.min(2, window.devicePixelRatio || 1));
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    game.start();

    return () => {
      ro.disconnect();
      game.destroy();
      gameRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the engine's pause state in sync with UI status.
  useEffect(() => {
    const game = gameRef.current;
    if (!game) return;
    if (status === "paused") game.pause();
    else if (status === "playing") game.resume();
  }, [status]);

  // Escape toggles pause.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code !== "Escape") return;
      const current = useGameStore.getState().status;
      if (current === "playing") setStatus("paused");
      else if (current === "paused") setStatus("playing");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setStatus]);

  return (
    <div ref={containerRef} className="relative h-screen w-full overflow-hidden bg-sky-200">
      <canvas ref={canvasRef} className="block h-full w-full" />
      <HUD
        onPause={() => setStatus("paused")}
        levelName={getLevelById(selectedLevelId).name}
        onControl={(control, active) => gameRef.current?.setControl(control, active)}
        onAction={(action) => gameRef.current?.triggerAction(action)}
      />
      {status === "paused" && (
        <PauseMenu
          onResume={() => setStatus("playing")}
          onRestart={() => {
            setStatus("playing");
            restart();
          }}
        />
      )}
      {status === "complete" && <LevelCompleteScreen />}
    </div>
  );
}
