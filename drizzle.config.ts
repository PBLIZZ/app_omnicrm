import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./drizzle_app",
  schema: "./src/server/db/schema.app.ts", // <— migrations read ONLY this
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!, // pooled public URL (6543)
  },
  strict: true,
});
