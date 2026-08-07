import { NextResponse } from "next/server";

import { getOfferLetterFileForOffer } from "@/lib/recruitment/services/offer-letter-pdf-access";
import { requireServerPermission } from "@/lib/permissions/server";
import { createClient } from "@/lib/supabase/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const profile = await requireServerPermission("recruitment.offer");
    const { id } = await context.params;
    const supabase = await createClient();
    const { fileBytes, filename, contentType } = await getOfferLetterFileForOffer(
      supabase,
      profile,
      id,
    );

    return new NextResponse(Buffer.from(fileBytes), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to download offer letter";
    return NextResponse.json({ message }, { status: 500 });
  }
}
