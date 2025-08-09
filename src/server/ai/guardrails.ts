import { sql } from "drizzle-orm";
import { db } from "@/server/db/client";

const MONTHLY = Number(process.env["AI_CREDITS_MONTHLY"] ?? 200);
const RPM = Number(process.env["AI_REQUESTS_PER_MINUTE"] ?? 8);
const DAILY_CAP_EUR = Number(process.env["AI_DAILY_EUR_HARDCAP"] ?? 0);

function firstOfMonth(d = new Date()) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
export { firstOfMonth }; // useful in tests

/**
 * Ensure a quota row exists for the current month & refresh if month rolled over.
 */
export async function ensureMonthlyQuota(userId: string) {
  const period = firstOfMonth();
  await db.execute(sql`
    insert into ai_quotas (user_id, period_start, credits_left)
    values (${userId}::uuid, ${period}, ${MONTHLY})
    on conflict (user_id) do update set
      period_start = excluded.period_start,
      credits_left = case
        when ai_quotas.period_start < excluded.period_start then ${MONTHLY}
        else ai_quotas.credits_left
      end
  `);
}

/**
 * Try to spend 1 credit. Returns remaining credits or null if blocked.
 * Do this BEFORE calling the model.
 */
export async function trySpendCredit(userId: string): Promise<number | null> {
  const { rows } = await db.execute(sql`
    update ai_quotas
    set credits_left = credits_left - 1
    where user_id = ${userId}::uuid
      and credits_left > 0
    returning credits_left
  `);
  const left = rows[0]?.["credits_left"];
  return typeof left === "number" ? left : null;
}

/**
 * Per-minute throttle using the usage log.
 */
export async function checkRateLimit(userId: string): Promise<boolean> {
  const { rows } = await db.execute(sql`
    select count(*)::int as c
    from ai_usage
    where user_id = ${userId}::uuid
      and created_at > now() - interval '60 seconds'
  `);
  const c = Number(rows[0]?.["c"] ?? 0);
  return c < RPM;
}

/**
 * Optional: stop if today's cost exceeds DAILY_CAP_EUR (0 disables).
 */
export async function underDailyCostCap(userId: string): Promise<boolean> {
  if (!DAILY_CAP_EUR || DAILY_CAP_EUR <= 0) return true;
  const { rows } = await db.execute(sql`
    select coalesce(sum(cost_usd), 0)::numeric as sum
    from ai_usage
    where user_id = ${userId}::uuid
      and created_at::date = current_date
  `);
  const raw = rows[0]?.["sum"] ?? 0;
  const spent = Number(raw);
  return spent < DAILY_CAP_EUR;
}

/**
 * Log the usage after the call. Pass tokens/cost if you have them; otherwise 0.
 */
export async function logUsage(params: {
  userId: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  costUsd?: number;
}) {
  const { userId, model, inputTokens = 0, outputTokens = 0, costUsd = 0 } = params;
  await db.execute(sql`
    insert into ai_usage (user_id, model, input_tokens, output_tokens, cost_usd)
    values (${userId}::uuid, ${model}, ${inputTokens}, ${outputTokens}, ${costUsd})
  `);
}
