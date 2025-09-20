/** DELETE /api/user/delete — Permanent account deletion for GDPR compliance (auth required). */
import { NextRequest, NextResponse } from "next/server";
import { createRouteHandler } from "@/server/api/handler";
import { UserDeletionService } from "@/server/services/user-deletion.service";
import { z } from "zod";

const deletionSchema = z.object({
  confirmation: z.literal("DELETE MY DATA"),
  acknowledgeIrreversible: z.literal(true),
});

export const DELETE = createRouteHandler({
  auth: true,
  rateLimit: { operation: "user_delete" },
  validation: {
    body: deletionSchema,
  },
})(async ({ userId, validated, requestId }, req: NextRequest) => {
  try {
    const { confirmation, acknowledgeIrreversible } = validated.body;

    // Validate deletion request
    const validation = UserDeletionService.validateDeletionRequest({
      confirmation,
      acknowledgeIrreversible,
      ipAddress: req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown",
    });

    if (!validation.valid) {
      return NextResponse.json(
        { error: "Invalid deletion request", details: validation.errors },
        { status: 400 }
      );
    }

    // Execute deletion
    const result = await UserDeletionService.deleteUserData(userId, {
      confirmation,
      acknowledgeIrreversible,
      ipAddress: req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown",
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    // SECURITY: Don't expose internal error details for account deletion failures
    return NextResponse.json(
      { error: "Account deletion failed due to internal error" },
      { status: 500 }
    );
  }
});
