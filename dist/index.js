#!/usr/bin/env node
import "dotenv/config";
import { MemWal } from "@mysten-incubation/memwal";
import { generateText, tool, stepCountIs } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import readline from "readline/promises";
import fs from "fs";
const LOG_FILE = "./memory-log.jsonl";
const memwal = MemWal.create({
    key: process.env.MEMWAL_PRIVATE_KEY,
    accountId: process.env.MEMWAL_ACCOUNT_ID,
    serverUrl: process.env.MEMWAL_SERVER_URL,
    namespace: "project-team-demo", // MemPod's active namespace — rename per-team as needed
});
async function withRetry(fn, retries = 2, delayMs = 2000) {
    try {
        return await fn();
    }
    catch (err) {
        if (retries <= 0)
            throw err;
        await new Promise((r) => setTimeout(r, delayMs));
        return withRetry(fn, retries - 1, delayMs);
    }
}
function logMemory(entry) {
    const line = JSON.stringify({
        timestamp: new Date().toISOString(),
        ...entry,
    });
    fs.appendFileSync(LOG_FILE, line + "\n", "utf-8");
}
const SYSTEM_PROMPT = `You are a shared project memory assistant for a software team. Multiple teammates use you, and all of you read from and write to the same team memory.

## WHEN TO WRITE (call remember)
Write a memory when the conversation contains:
1. A team decision (e.g. "we're using Postgres instead of MongoDB")
2. A rejected approach and why
3. A coding convention or project rule
4. An open issue or blocker
5. A resolution to a previously open issue

Do not write near-duplicate memories — if recall shows the fact is already stored, don't write it again. If a new statement contradicts an existing stored decision, write the new fact clearly noting it supersedes or conflicts with the prior one.

## WHAT TO WRITE
One clear, factual sentence per memory, readable standalone.

## WHEN TO RECALL
Always call recall before answering questions about past decisions, conventions, or issues. Never say "I don't know" without recalling first.

## CRITICAL RULE
If the user asks ANY question containing words like "what", "which", "who", "when", "how" about the project, team, decisions, tech stack, or status — you MUST call recall first, even if you think you already know the answer from earlier in this same conversation. Never answer from assumption or from your own guess. If recall returns nothing relevant, say clearly "I don't have that recorded yet" rather than giving a vague generic answer.

## PLAIN CONVERSATION
For greetings, small talk, or questions with no connection to the project, team, decisions, or status, respond directly and naturally without calling any tool.

## BEHAVIOR
- Be concise.
- If recall returns conflicting facts, surface the conflict to the user rather than picking one silently.`;
const tools = {
    remember: tool({
        description: "Store a durable team fact: a decision, rejected approach, convention, or issue.",
        inputSchema: z.object({ fact: z.string() }),
        execute: async ({ fact }) => {
            const job = await withRetry(() => memwal.remember(fact));
            const confirmed = await withRetry(() => memwal.waitForRememberJob(job.job_id));
            const blobId = confirmed?.blob_id ??
                confirmed?.blobId ??
                job?.blob_id ??
                null;
            console.log(`📝 Memory saved: "${fact}"${blobId ? ` (blob: ${blobId})` : ""}`);
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
        description: "Search team memory for relevant past decisions, conventions, or issues.",
        inputSchema: z.object({ query: z.string() }),
        execute: async ({ query }) => {
            const result = await withRetry(() => memwal.recall(query));
            console.log(`🔎 Recalled ${result.results.length} memory item(s) for "${query}"`);
            logMemory({
                type: "recall",
                query,
                results: result.results.map((r) => ({
                    text: r.text,
                    blob_id: r.blob_id,
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
    console.log(`\n${speaker} session started. Type a message (or 'exit'):`);
    while (true) {
        const userInput = await rl.question(`[${speaker}] > `);
        if (userInput.trim().toLowerCase() === "exit")
            break;
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
                    console.log(`  → called ${part.toolName}(${JSON.stringify(part.input)})`);
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
