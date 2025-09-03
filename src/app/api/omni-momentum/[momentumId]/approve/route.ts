import { NextRequest } from "next/server";
import "@/lib/zod-error-map";
import { getServerUserId } from "@/server/auth/user";
import { ok, err, safeJson } from "@/lib/api/http";
import { momentumStorage } from "@/server/storage/momentum.storage";
import { z } from "zod";

const ApproveMomentumSchema = z.object({
  notes: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ momentumId: string }> }
): Promise<Response> {
  let userId: string;
  try {
    userId = await getServerUserId();
  } catch (e: unknown) {
    const error = e as { message?: string; status?: number };
    return err(error?.status ?? 401, error?.message ?? "unauthorized");
  }

  const { momentumId } = await params;
  
  const body = (await safeJson<unknown>(req)) ?? {};
  const parsed = ApproveMomentumSchema.safeParse(body);
  if (!parsed.success) {
    return err(400, "invalid_body", parsed.error.flatten());
  }

  try {
    await momentumStorage.approveMomentum(momentumId, userId, parsed.data.notes);
    const momentum = await momentumStorage.getMomentum(momentumId, userId);
    return ok({ momentum, message: "Momentum approved successfully" });
  } catch (error) {
    console.error("Error approving momentum:", error);
    return err(500, "internal_server_error");
  }
}