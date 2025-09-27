import type { Config } from "drizzle-kit";

export default {
  dialect: "postgresql",
  out: "./.drizzle-introspect",
  schema: "./src/server/db/schema.ts",
  introspect: { casing: "preserve" },
  dbCredentials: { url: process.env.DATABASE_URL! },
} satisfies Config;
