/** Tiny whole-pixel poses keep the idle crisp and stay inside the crop. */
export function vendorIdlePose(elapsedMs: number): { frame: number; lift: number } {
  const time = Math.max(0, elapsedMs);
  const blink = time % 4600;
  return { frame: blink >= 3800 && blink < 3940 ? 1 : 0, lift: time % 2600 >= 1300 ? -1 : 0 };
}
