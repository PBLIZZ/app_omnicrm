type Bindings = Record<string, unknown> | undefined;

function emit(level: "info" | "warn" | "error" | "debug", bindings?: Bindings, message?: string) {
  const ts = new Date().toISOString();
  if (bindings && message) {
    // simple structured log
    if (level === "error" || level === "warn")
      console[level](`${ts} ${level.toUpperCase()}: ${message} ${JSON.stringify(bindings)}`);
  } else if (message) {
    if (level === "error" || level === "warn")
      console[level](`${ts} ${level.toUpperCase()}: ${message}`);
  } else if (bindings) {
    if (level === "error" || level === "warn")
      console[level](`${ts} ${level.toUpperCase()}: ${JSON.stringify(bindings)}`);
  }
}

export const log = {
  info(bindings?: Bindings, message?: string) {
    emit("info", bindings, message);
  },
  warn(bindings?: Bindings, message?: string) {
    emit("warn", bindings, message);
  },
  error(bindings?: Bindings, message?: string) {
    emit("error", bindings, message);
  },
  debug(bindings?: Bindings, message?: string) {
    emit("debug", bindings, message);
  },
};
