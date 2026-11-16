/** Ignore a pointer passing over a link; an actual press never waits. */
export function createIntentPrefetch(prefetch: (path: string) => void, delayMs = 120) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pendingPath: string | undefined;
  const cancel = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
    pendingPath = undefined;
  };
  return {
    hover(path: string) {
      if (pendingPath === path) return;
      cancel();
      pendingPath = path;
      timer = setTimeout(() => {
        cancel();
        prefetch(path);
      }, delayMs);
    },
    press(path: string) {
      cancel();
      prefetch(path);
    },
    cancel,
  };
}
