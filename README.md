# MemPod — Shared Team Memory on Walrus

MemPod is a CLI assistant that gives software teams persistent, shared memory across sessions, built on **Walrus Memory (MemWal)**. Instead of every teammate's AI conversations starting from zero, MemPod writes durable facts — decisions, rejected approaches, conventions, issues, and resolutions — to Walrus, and any teammate, in any separate session, can recall them accurately.

## The Problem

Software teams constantly re-explain the same things to their AI assistants: "we decided against MongoDB," "we use snake_case for API routes," "we already tried that, it didn't work." This context lives in someone's head or scattered across chat logs, and gets lost the moment a session ends or a different teammate opens a new conversation. MemPod solves this by giving the team a single, durable, shared memory that persists on Walrus — verifiable, portable, and not locked to any one AI vendor or chat session.

## What It Does

MemPod's system prompt instructs the agent to:

**Write a memory** when the conversation contains one of five fact types:

1. A team decision (e.g. "we're using PostgreSQL instead of MongoDB")
2. A rejected approach, with reasoning
3. A coding convention or project rule
4. An open issue or blocker
5. A resolution to a previously open issue

It avoids writing memories for greetings or vague statements, and checks for near-duplicates before writing.

**Recall memory** before answering any question about past decisions, conventions, or status — the agent is explicitly required to check memory first rather than guessing or claiming "I don't know" without having actually recalled. If two recalled facts conflict, it surfaces the conflict rather than silently picking one.

**Hold normal conversation** for greetings and small talk without forcing unnecessary tool calls, and can give grounded opinions on project decisions by recalling relevant context first — making it usable as a genuine day-to-day assistant, not just a lookup tool.

## Quick Start (recommended — via npm)

MemPod is published on npm. No cloning required.

### 1. Create a project folder

```bash
mkdir my-team-memory
cd my-team-memory
```

### 2. Create a `.env` file in that folder

```
MEMWAL_PRIVATE_KEY=your-delegate-private-key
MEMWAL_ACCOUNT_ID=your-memwal-account-id
MEMWAL_SERVER_URL=https://relayer.memory.walrus.xyz
OPENAI_API_KEY=your-openai-api-key
```

Get Walrus Memory credentials at [memory.walrus.xyz](https://memory.walrus.xyz) (Mainnet) or [staging.memory.walrus.xyz](https://staging.memory.walrus.xyz) (Testnet, for trying it out safely first — use `https://relayer-staging.memory.walrus.xyz` as `MEMWAL_SERVER_URL` if testing).

### 3. Run it

```bash
npx mempod
```

You'll be asked for your name, then can chat naturally. State decisions, ask about past decisions, and watch memories get written (📝) and recalled (🔎) in real time.

To simulate a second teammate, open a separate terminal in the same folder and run `npx mempod` again with a different name — as long as both share the same namespace (see below), they'll share memory.

### Optional: install globally

```bash
npm install -g mempod
mempod
```

## Important: Namespace

Team members share memory through a **namespace** — a scoping key in MemWal. Anyone using the same namespace string reads and writes to the same shared memory pool.

The published package currently ships with a fixed default namespace for demonstration purposes. **If you're setting this up for your own team, clone the repo instead and change the `namespace` value in `index.ts` to something unique to your team** (e.g. `"your-team-name-2026"`), so you don't share memory with unrelated users of the package. A future version will let users set this via an environment variable or an interactive join/create prompt.

## Using the Source Directly (for customizing namespace, prompt, or behavior)

```bash
git clone https://github.com/oooo-o-pixel/Mempod.git
cd Mempod
npm install
```

Edit the `namespace` value in `index.ts`, then:

```bash
npx tsx index.ts
```

## Verifying Memory on Walrus

Every memory write returns a real blob ID. You can independently verify any blob at:

```
https://walruscan.com/mainnet/blob/<blob-id>
```

## Known Limitations / Roadmap

- Namespace is currently hardcoded per deployment rather than user-selectable at runtime — a production version would let each team set or generate their own via an interactive prompt or environment variable.
- Namespace membership is open — anyone with the namespace string can join. A production version would add Sui-based access control per team.
- No file upload support — MemPod remembers conversational facts, not documents.

## License

MIT
