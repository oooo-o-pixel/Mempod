#!/usr/bin/env node
import "dotenv/config";
import { MemWal } from "@mysten-incubation/memwal";
import { generateText, tool, stepCountIs } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import readline from "readline/promises";
import fs from "fs";
const LOG_FILE = "./memory-log.jsonl";
const NAMESPACE = process.env.MEMPOD_NAMESPACE || "project-team-demo";
const memwal = MemWal.create({
    key: process.env.MEMWAL_PRIVATE_KEY,
    accountId: process.env.MEMWAL_ACCOUNT_ID,
    serverUrl: process.env.MEMWAL_SERVER_URL,
    namespace: NAMESPACE, // set MEMPOD_NAMESPACE in .env to use your own team's namespace
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
If the user asks a FACTUAL question about the project, team, decisions, tech stack, or status (e.g. "what database are we using", "who decided X", "what's the status of Y") — you MUST call recall first, even if you think you already know the answer. Never answer a factual question from assumption or guess. If recall returns nothing relevant to a factual question, say clearly "I don't have that recorded yet."

This rule applies to factual lookups only — it does NOT apply to opinion, discussion, or open-ended questions (see OPINIONS & DISCUSSION below), which should always get a real, engaged response.

## OPINIONS & DISCUSSION
When asked for your opinion, thoughts, or feedback on the project or a decision (e.g. "what do you think", "your take on this", "any concerns?"), always engage genuinely — never respond with "I don't have that recorded yet" to this kind of question:
1. Call recall first to check what's already been decided, so your opinion is grounded in real context.
2. Give a real, specific opinion — pros, cons, tradeoffs, or a genuine take — referencing relevant recalled facts by name where relevant (e.g. "since you're using FastAPI, I'd lean toward...").
3. If recall returns little or nothing, it's fine to give a general take on the project concept itself rather than refusing to answer.
4. It's fine to raise a concern if something recalled seems risky or inconsistent — flag it constructively.

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
    console.log(`\n${speaker} session started. Namespace: "${NAMESPACE}"\n`);
    // Proactive session-start summary — recall key facts before the user asks anything
    console.log("🔎 Checking team memory for context...");
    try {
        const summaryQueries = ["project", "decision", "issue"];
        const seen = new Set();
        const summaryFacts = [];
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
        }
        else {
            console.log("No prior team memory found yet — starting fresh.\n");
        }
    }
    catch (err) {
        console.log("(Could not load session summary — continuing anyway.)\n");
    }
    console.log("Type a message (or 'exit'):");
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
