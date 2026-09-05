import { useEffect, useState } from "react";

const SPINNER_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

/**
 * Advances through the braille spinner frames on an 80ms tick while `active`
 * is true, and stops the interval (no wasted re-renders) once it isn't.
 * Shared by RunView and WalletView so the two don't each keep their own
 * copy of the same interval bookkeeping.
 */
export function useSpinnerFrame(active: boolean): string {
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => {
      setFrameIndex((current) => (current + 1) % SPINNER_FRAMES.length);
    }, 80);
    return () => clearInterval(timer);
  }, [active]);

  return SPINNER_FRAMES[frameIndex] ?? SPINNER_FRAMES[0];
}
