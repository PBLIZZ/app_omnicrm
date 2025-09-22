/** DELETE /api/user/delete — Permanent account deletion for GDPR compliance (auth required). */
import { NextRequest, NextResponse } from "next/server";
import { getServerUserId } from "@/server/auth/user";
import { UserDeletionService } from "@/server/services/user-deletion.service";
import { z } from "zod";

const deletionSchema = z.object({
  confirmation: z.literal("DELETE MY DATA"),
  acknowledgeIrreversible: z.literal(true),
});

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const userId = await getServerUserId();
    const body: unknown = await request.json();

    // Validate request body
    const validatedBody = deletionSchema.parse(body);
    const { confirmation, acknowledgeIrreversible } = validatedBody;

    // Validate deletion request
    const validation = UserDeletionService.validateDeletionRequest({
      confirmation,
      acknowledgeIrreversible,
      ipAddress: request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "unknown",
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
      ipAddress: request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip") ?? "unknown",
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("Account deletion failed:", error);

    // Handle validation errors
    if (error instanceof Error && error.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid deletion request", details: error.message },
        { status: 400 }
      );
    }

    // SECURITY: Don't expose internal error details for account deletion failures
    return NextResponse.json(
      { error: "Account deletion failed due to internal error" },
      { status: 500 }
    );
  }
}
