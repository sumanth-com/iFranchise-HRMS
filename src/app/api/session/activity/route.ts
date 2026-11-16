import { touchSessionActivityAction } from "@/lib/auth/actions";

/** Keep the existing authenticated activity update outside the RSC action queue. */
export async function POST(request: Request): Promise<Response> {
  // Server Actions enforce Origin automatically; retain that protection here.
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return new Response(null, { status: 403 });
  }
  await touchSessionActivityAction();
  return new Response(null, {
    status: 204,
    headers: { "Cache-Control": "no-store" },
  });
}
