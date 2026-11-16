/** Share only unfinished reads within the owning component. Never cache results. */
export function deduplicateInFlight<K, V>(load: (key: K) => Promise<V>) {
  const pending = new Map<K, Promise<V>>();
  return (key: K): Promise<V> => {
    const existing = pending.get(key);
    if (existing) return existing;
    const request = Promise.resolve().then(() => load(key));
    pending.set(key, request);
    const clear = () => {
      if (pending.get(key) === request) pending.delete(key);
    };
    void request.then(clear, clear);
    return request;
  };
}
