/**
 * @internal
 * This is the core Pino instance for server-side structured logging.
 * It should ONLY be imported and used by the unified-logger system.
 * For all application logging, import from '@/lib/observability' instead.
 */
import pino from "pino";
import pretty from "pino-pretty";

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

const isLocalDev = nodeEnv === "development";

// Use pretty stream only in local development. In tests, avoid pretty to prevent open handles.
const stream = isLocalDev
  ? pretty({ colorize: true, translateTime: "SYS:standard", singleLine: false })
  : undefined;

const logger = stream
  ? pino(
      {
        level: isLocalDev ? "debug" : "info",
        redact: { paths: redactPaths, censor: "[redacted]" },
        base,
        timestamp: pino.stdTimeFunctions.isoTime,
        messageKey: "message",
      },
      stream,
    )
  : pino({
      level: isLocalDev ? "debug" : "info",
      redact: { paths: redactPaths, censor: "[redacted]" },
      base,
      timestamp: pino.stdTimeFunctions.isoTime,
      messageKey: "message",
    });

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
