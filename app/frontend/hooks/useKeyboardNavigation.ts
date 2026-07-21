import { useState } from "react";

export function useKeyboardNavigation(length: number) {
  const [selected, setSelected] = useState(0);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      setSelected((v) => Math.min(v + 1, length - 1));
    }

    if (e.key === "ArrowUp") {
      setSelected((v) => Math.max(v - 1, 0));
    }
  }

  return {
    selected,
    onKeyDown,
  };
}