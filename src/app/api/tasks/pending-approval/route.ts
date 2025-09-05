import "@/lib/zod-error-map";
import { getServerUserId } from "@/server/auth/user";
import { ok, err } from "@/lib/api/http";
import { MomentumStorage } from "@/server/storage/momentum.storage";

const momentumStorage = new MomentumStorage();

export async function GET(): Promise<Response> {
  let userId: string;
  try {
    userId = await getServerUserId();
  } catch (e: unknown) {
    const error = e as { message?: string; status?: number };
    return err(error?.status ?? 401, error?.message ?? "unauthorized");
  }

  try {
    const tasks = await momentumStorage.getPendingApprovalMomentums(userId);
    return ok({ tasks });
  } catch (error) {
    console.error("Error fetching pending approval tasks:", error);
    return err(500, "internal_server_error");
  }
}
