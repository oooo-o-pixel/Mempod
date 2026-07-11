# Submission — Walrus Memory Prompt Jam (Session 5)

## Prompt Name
Shared Team Memory Assistant — MemPod System Prompt

## Category
System prompt that instructs an agent to store and recall information proactively

## Problem It Solves
Software teams lose context constantly — decisions get re-litigated, rejected
approaches get re-tried, and "who owns this" gets re-asked every few weeks
because nothing persists between sessions or between teammates. This prompt
turns an LLM into a shared team-memory agent: it recognizes six concrete
trigger types (decisions, rejected approaches, conventions, blockers,
resolutions, and ownership/deadline changes), writes each as a structured,
tagged, standalone fact to Walrus Memory, and always recalls before answering
any factual question about the project — so the team never has to ask
"didn't we already decide this?" again.

## How It Uses Walrus Memory
- Every `remember()` call writes one tagged, standalone fact
  (`[DECISION]`, `[BLOCKER]`, `[CONVENTION]`, `[OWNER]`, etc.) as a blob to
  Walrus Memory, so memories are human-skimmable and machine-filterable.
- Before writing, the agent checks for near-duplicates via `recall()` and
  skips redundant writes; if a new fact contradicts a stored one, it writes
  a new entry that explicitly notes the supersession rather than silently
  overwriting history.
- The agent distinguishes a *proposal* ("what if we used Redis?") from an
  *actual decision* ("we're using Redis") — it only writes on commitment,
  not exploration — which avoids polluting shared memory with noise.
- Factual questions always trigger `recall()` first, never an assumption;
  ambiguous or conflicting recall results are surfaced to the user rather
  than resolved silently.

## Proof of Usage
- **Agent / Project:** MemPod (shared team-memory CLI on Walrus MemWal)
- **Mainnet blobs written:** [FILL IN — 10+ required]
- **Wallet address:** [FILL IN]
- **Agent/session ID:** [FILL IN, if applicable]

## Demo Video
[FILL IN — link, ≤3 minutes]
Shows: a factual question triggering `recall()`, a new decision triggering
`remember()`, and a supersession case where a new decision overrides a
previously stored one.

## Files
- `prompt.md` — the standalone, copy-pasteable system prompt
- `SUBMISSION.md` — this file