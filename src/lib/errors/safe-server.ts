/**
 * Runs a server operation and returns a fallback instead of throwing.
 * Use in page loaders to avoid white-screen application errors.
 */
export async function safeServerCall<T>(
  operation: () => Promise<T>,
  fallback: T,
  label?: string,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    console.error(label ?? "[safe-server-call]", error);
    return fallback;
  }
}
