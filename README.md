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

## How Memory Is Shared

Team members share memory via a **namespace** — a scoping key in MemWal. Anyone using the same namespace string reads and writes to the same shared memory pool, simulating a team's collective knowledge. Different teams (or personal use) can use different namespace values to keep memory pools separate.

## Setup

### Prerequisites
- Node.js 18+
- An OpenAI API key
- A Walrus Memory account (generate one at [memory.walrus.xyz](https://memory.walrus.xyz) for Mainnet, or [staging.memory.walrus.xyz](https://staging.memory.walrus.xyz) for testing)

### Installation

```bash
git clone https://github.com/<your-username>/mempod.git
cd mempod
npm install
```

### Configuration

Create a `.env` file in the project root:

```
MEMWAL_PRIVATE_KEY=your-delegate-private-key
MEMWAL_ACCOUNT_ID=your-memwal-account-id
MEMWAL_SERVER_URL=https://relayer.memory.walrus.xyz
OPENAI_API_KEY=your-openai-api-key
```

Use `https://relayer-staging.memory.walrus.xyz` instead if you want to test on Testnet first.

### Run

```bash
npx tsx index.ts
```

You'll be asked for your name, then can chat naturally. State decisions, ask questions about past decisions, and watch memories get written (`📝`) and recalled (`🔎`) in real time.

To open a second "teammate" session, run the same command in a separate terminal — as long as both use the same namespace (set in `index.ts`), they'll share memory.

## Verifying Memory on Walrus

Every memory write returns a real blob ID. You can independently verify any blob at:

```
https://walruscan.com/mainnet/blob/<blob-id>
```

## Known Limitations / Roadmap

- Namespace membership is currently open — anyone with the namespace string can join. A production version would add Sui-based access control per team.
- No file upload support — MemPod remembers conversational facts, not documents.
- Built and tested as a CLI tool; not yet packaged for `npm install -g`.

## License

MIT