import { getNotificationBellDataAction } from "@/lib/notifications/actions";

/** Poll without placing a read in the page's Server Action queue. */
export async function POST(request: Request): Promise<Response> {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return new Response(null, { status: 403 });
  }
  const result = await getNotificationBellDataAction();
  return Response.json(result, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
