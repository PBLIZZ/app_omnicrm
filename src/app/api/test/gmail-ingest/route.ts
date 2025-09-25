/** POST /api/test/gmail-ingest — simple Gmail ingestion test (auth required). */
import { NextResponse } from "next/server";
import { createRouteHandler } from "@/server/lib/middleware-handler";
import { GmailIngestionService } from "@/server/services/gmail-ingestion.service";
import { GmailIngestionResultDTOSchema } from "@omnicrm/contracts";

export const POST = createRouteHandler({
  auth: true,
  rateLimit: { operation: "gmail_ingest_test" },
})(async ({ userId }) => {
  try {
    const result = await GmailIngestionService.testGmailIngestion(userId);

    // Validate response with schema
    const validatedResult = GmailIngestionResultDTOSchema.parse(result);

    return NextResponse.json(validatedResult);
  } catch {
    return NextResponse.json({ error: "Gmail ingest failed" }, { status: 500 });
  }
});
