#!/usr/bin/env node

import "dotenv/config";
import { MemWal } from "@mysten-incubation/memwal";
import { generateText, tool, stepCountIs } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import readline from "readline/promises";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOG_FILE = "./memory-log.jsonl";

const NAMESPACE = process.env.MEMPOD_NAMESPACE || "project-team-demo";

const memwal = MemWal.create({
  key: process.env.MEMWAL_PRIVATE_KEY!,
  accountId: process.env.MEMWAL_ACCOUNT_ID!,
  serverUrl: process.env.MEMWAL_SERVER_URL,
  namespace: NAMESPACE, // set MEMPOD_NAMESPACE in .env to use your own team's namespace
});

async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 2,
  delayMs = 2000,
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (retries <= 0) throw err;
    await new Promise((r) => setTimeout(r, delayMs));
    return withRetry(fn, retries - 1, delayMs);
  }
}

function logMemory(entry: Record<string, unknown>) {
  const line = JSON.stringify({
    timestamp: new Date().toISOString(),
    ...entry,
  });
  fs.appendFileSync(LOG_FILE, line + "\n", "utf-8");
}

const SYSTEM_PROMPT = fs.readFileSync(
  path.join(__dirname, "./submission_prompt/prompt.md"),
  "utf-8",
);

const tools = {
  remember: tool({
    description:
      "Store a durable team fact: a decision, rejected approach, convention, or issue.",
    inputSchema: z.object({ fact: z.string() }),
    execute: async ({ fact }) => {
      const job = await withRetry(() => memwal.remember(fact));
      const confirmed = await withRetry(() =>
        memwal.waitForRememberJob(job.job_id),
      );

      const blobId =
        (confirmed as any)?.blob_id ??
        (confirmed as any)?.blobId ??
        (job as any)?.blob_id ??
        null;

      console.log(
        `📝 Memory saved: "${fact}"${blobId ? ` (blob: ${blobId})` : ""}`,
      );
      logMemory({
        type: "remember",
        fact,
        job_id: job.job_id,
        blob_id: blobId,
      });

      return { status: "stored", blob_id: blobId };
    },
  }),
  recall: tool({
    description:
      "Search team memory for relevant past decisions, conventions, or issues.",
    inputSchema: z.object({ query: z.string() }),
    execute: async ({ query }) => {
      const result = await withRetry(() => memwal.recall(query));
      console.log(
        `🔎 Recalled ${result.results.length} memory item(s) for "${query}"`,
      );
      logMemory({
        type: "recall",
        query,
        results: result.results.map((r) => ({
          text: r.text,
          blob_id: (r as any).blob_id,
        })),
      });
      return { memories: result.results.map((r) => r.text) };
    },
  }),
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function main() {
  console.log(`
╔══════════════════════════════════╗
║             MemPod                ║
║   Shared Team Memory on Walrus    ║
╚══════════════════════════════════╝
`);

  const speaker = await rl.question("Who are you (name)? ");
  console.log(`\n${speaker} session started. Namespace: "${NAMESPACE}"\n`);

  // Proactive session-start summary — recall key facts before the user asks anything
  console.log("🔎 Checking team memory for context...");
  try {
    const summaryQueries = ["project", "decision", "issue"];
    const seen = new Set<string>();
    const summaryFacts: string[] = [];

    for (const q of summaryQueries) {
      const result = await withRetry(() => memwal.recall(q));
      for (const r of result.results) {
        if (!seen.has(r.text)) {
          seen.add(r.text);
          summaryFacts.push(r.text);
        }
      }
    }

    if (summaryFacts.length > 0) {
      console.log(`\nHere's what the team has shared so far:`);
      for (const fact of summaryFacts.slice(0, 5)) {
        console.log(`  • ${fact}`);
      }
      console.log("");
    } else {
      console.log("No prior team memory found yet — starting fresh.\n");
    }
  } catch (err) {
    console.log("(Could not load session summary — continuing anyway.)\n");
  }

  console.log("Type a message (or 'exit'):");

  while (true) {
    const userInput = await rl.question(`[${speaker}] > `);
    if (userInput.trim().toLowerCase() === "exit") break;

    const result = await generateText({
      model: openai("gpt-4o-mini"),
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: `${speaker} says: ${userInput}` }],
      tools,
      stopWhen: stepCountIs(5),
    });

    // Debug visibility: show every tool call attempt so we can confirm recall fires
    for (const step of result.steps) {
      for (const part of step.content) {
        if (part.type === "tool-call") {
          console.log(
            `  → called ${part.toolName}(${JSON.stringify(part.input)})`,
          );
        }
      }
    }

    console.log(result.text || "(no response)");
  }
  console.log(`\nSession log saved to ${LOG_FILE}`);
  rl.close();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  rl.close();
});
