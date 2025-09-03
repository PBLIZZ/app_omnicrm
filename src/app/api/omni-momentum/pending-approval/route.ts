import { NextRequest } from "next/server";
import "@/lib/zod-error-map";
import { getServerUserId } from "@/server/auth/user";
import { ok, err } from "@/lib/api/http";
import { momentumStorage } from "@/server/storage/momentum.storage";

export async function GET(req: NextRequest): Promise<Response> {
  let userId: string;
  try {
    userId = await getServerUserId();
  } catch (e: unknown) {
    const error = e as { message?: string; status?: number };
    return err(error?.status ?? 401, error?.message ?? "unauthorized");
  }

  try {
    const momentums = await momentumStorage.getPendingApprovalMomentums(userId);
    return ok({ momentums });
  } catch (error) {
    console.error("Error fetching pending approval momentums:", error);
    return err(500, "internal_server_error");
  }
}