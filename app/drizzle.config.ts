import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// drizzle-kit runs standalone (not through Next.js), so it doesn't pick up
// .env.local automatically the way `next dev`/`next build` do.
config({ path: ".env.local" });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not set (checked .env.local / .env).");
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
