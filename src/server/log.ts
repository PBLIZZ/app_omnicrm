import pino from "pino";
import pretty from "pino-pretty";
import { env } from "@/lib/env";

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

const base = {
  app: "omnicrm",
  env: env.NODE_ENV,
};

const isDev = env.NODE_ENV !== "production";

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
  stream as any,
);

export const log = {
  info(bindings?: LogBindings, message?: string) {
    logger.info(bindings ?? {}, message);
  },
  warn(bindings?: LogBindings, message?: string) {
    logger.warn(bindings ?? {}, message);
  },
  error(bindings?: LogBindings, message?: string) {
    logger.error(bindings ?? {}, message);
  },
  debug(bindings?: LogBindings, message?: string) {
    logger.debug(bindings ?? {}, message);
  },
};
