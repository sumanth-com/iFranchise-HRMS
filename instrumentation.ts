export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  const { validateServerEnvironment } = await import("./src/lib/config/validate-env");
  validateServerEnvironment();
}
