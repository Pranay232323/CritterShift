import { useGameStore } from "./game/store";
import TitleScreen from "./components/TitleScreen";
import GameCanvas from "./components/GameCanvas";
import CustomizeScreen from "./components/CustomizeScreen";

export default function App() {
  const status = useGameStore((s) => s.status);
  const runToken = useGameStore((s) => s.runToken);

  if (status === "customize") return <CustomizeScreen />;
  if (status === "playing" || status === "paused" || status === "complete") {
    return <GameCanvas key={runToken} />;
  }
  return <TitleScreen />;
}
