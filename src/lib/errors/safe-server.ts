/**
 * Runs a server operation and returns a fallback instead of throwing.
 * Use in page loaders to avoid white-screen application errors.
 */
import { SECTION_LOAD_ERROR_DESCRIPTION } from "@/lib/errors/employee-facing";
import { toUserFriendlyError } from "@/lib/errors/user-messages";

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

export type SafeServerResult<T> = {
  data: T;
  error: string | null;
};

/** Like safeServerCall but also returns a sanitized user-facing error when the call fails. */
export async function safeServerCallWithError<T>(
  operation: () => Promise<T>,
  fallback: T,
  label?: string,
): Promise<SafeServerResult<T>> {
  try {
    return { data: await operation(), error: null };
  } catch (error) {
    console.error(label ?? "[safe-server-call]", error);
    return {
      data: fallback,
      error: toUserFriendlyError(error, SECTION_LOAD_ERROR_DESCRIPTION),
    };
  }
}
