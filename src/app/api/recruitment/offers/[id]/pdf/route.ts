import { NextResponse } from "next/server";

import { managerOrPermissions } from "@/lib/manager/portal-scope";
import { requireServerAnyPermission } from "@/lib/permissions/server";
import { getOfferLetterFileForOffer } from "@/lib/recruitment/services/offer-letter-pdf-access";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    const profile = await requireServerAnyPermission(
      managerOrPermissions("recruitment.offer", "recruitment.view"),
    );
    const { id } = await context.params;
    const inline = new URL(request.url).searchParams.get("inline") === "1";
    const supabase = await createClient();
    const { fileBytes, filename, contentType } = await getOfferLetterFileForOffer(
      supabase,
      profile,
      id,
    );

    const safeFilename = filename.replace(/["\\]/g, "_");
    const disposition = inline ? "inline" : "attachment";

    return new NextResponse(Buffer.from(fileBytes), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `${disposition}; filename="${safeFilename}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to open offer letter";
    return NextResponse.json({ message }, { status: 404 });
  }
}
