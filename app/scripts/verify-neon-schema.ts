import { config } from "dotenv";
config({ path: ".env.local" });

async function main() {
  const { neon } = await import("@neondatabase/serverless");
  const sql = neon(process.env.DATABASE_URL!);
  const tables = await sql`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
  `;
  console.log("Tables in Neon:", tables.map((t) => (t as { tablename: string }).tablename));

  const counts = await sql`
    SELECT
      (SELECT count(*) FROM candidates) AS candidates,
      (SELECT count(*) FROM roles) AS roles;
  `;
  console.log("Row counts:", counts[0]);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
