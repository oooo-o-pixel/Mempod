import "dotenv/config";
import { MemWal } from "@mysten-incubation/memwal";

async function main() {
  const memwal = MemWal.create({
    key: process.env.MEMWAL_PRIVATE_KEY!,
    accountId: process.env.MEMWAL_ACCOUNT_ID!,
    serverUrl: process.env.MEMWAL_SERVER_URL,
    namespace: "project-team-demo", // match whatever namespace you actually used
  });

  // Broad queries to surface as many stored memories as possible
  const queries = [
    "team",
    "project",
    "decision",
    "database",
    "frontend",
    "backend",
  ];
  const seen = new Set<string>();

  console.log("=== All recalled memories ===\n");

  for (const q of queries) {
    const result = await memwal.recall(q);
    for (const r of result.results) {
      const blobId = (r as any).blob_id ?? "(no blob_id returned)";
      const key = `${r.text}::${blobId}`;
      if (!seen.has(key)) {
        seen.add(key);
        console.log(`- "${r.text}"`);
        console.log(`  blob_id: ${blobId}\n`);
      }
    }
  }

  console.log(`Total unique memories found: ${seen.size}`);
}

main().catch((err) => console.error("ERROR:", err));
