import pino from "pino";
import pretty from "pino-pretty";

export type LogBindings = Record<string, unknown> | undefined;

const redactPaths = [
  "req.headers.authorization",
  "req.headers.cookie",
  "token",
  "access_token",
  "refresh_token",
  "payload.accessToken",
  "payload.refreshToken",
];

// Read NODE_ENV directly to avoid importing full env validation at module load.
// This prevents tests/CI from failing early when optional env vars are absent.
const nodeEnv = (process.env["NODE_ENV"] as "development" | "test" | "production") ?? "development";
const base = {
  app: "omnicrm",
  env: nodeEnv,
};

const isDev = nodeEnv !== "production";

const stream = isDev
  ? pretty({ colorize: true, translateTime: "SYS:standard", singleLine: false })
  : undefined;

const logger = pino(
  {
    level: isDev ? "debug" : "info",
    redact: { paths: redactPaths, censor: "[redacted]" },
    base,
    timestamp: pino.stdTimeFunctions.isoTime,
    messageKey: "message",
  },
  stream as pino.DestinationStream,
);

export const log = {
  info(bindings?: LogBindings, message?: string): void {
    logger.info(bindings ?? {}, message);
  },
  warn(bindings?: LogBindings, message?: string): void {
    logger.warn(bindings ?? {}, message);
  },
  error(bindings?: LogBindings, message?: string): void {
    logger.error(bindings ?? {}, message);
  },
  debug(bindings?: LogBindings, message?: string): void {
    logger.debug(bindings ?? {}, message);
  },
};
