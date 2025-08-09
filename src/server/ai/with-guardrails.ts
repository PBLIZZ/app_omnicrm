import {
  ensureMonthlyQuota,
  trySpendCredit,
  checkRateLimit,
  underDailyCostCap,
  logUsage,
} from "@/server/ai/guardrails";

type LlmCall<T> = () => Promise<{
  data: T;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
  costUsd?: number;
}>;

export async function withGuardrails<T>(userId: string, call: LlmCall<T>) {
  await ensureMonthlyQuota(userId);

  const allowedByRpm = await checkRateLimit(userId);
  if (!allowedByRpm) return { error: "rate_limited_minute" as const };

  const allowedByDaily = await underDailyCostCap(userId);
  if (!allowedByDaily) return { error: "rate_limited_daily_cost" as const };

  const left = await trySpendCredit(userId);
  if (left === null) return { error: "rate_limited_monthly" as const };

  // perform the model call
  const { data, model, inputTokens = 0, outputTokens = 0, costUsd = 0 } = await call();

  // log usage
  await logUsage({ userId, model, inputTokens, outputTokens, costUsd });

  return { data, creditsLeft: left };
}
