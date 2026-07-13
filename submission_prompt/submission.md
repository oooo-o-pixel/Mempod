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
- **Mainnet blobs written:** 1. https://walruscan.com/mainnet/blob/fdAl5h39yCKqOLlDLH0YTd6rqN3BPdtHwjPY8oCXrD0 2. https://walruscan.com/mainnet/blob/y0zrZIQUAWCraSHHZLvCqOa9nCr4KuUoE1k0_Ktp3aA 3. https://walruscan.com/mainnet/blob/0EK9I7S0lZoV-aCzDgkHvug-LPYyr0xzK5qnwYRGc9M 4. https://walruscan.com/mainnet/blob/9Uo6QuoAQKcKrX1dQBeOhnaI5KmEgWdHB-R307TYEY8 5. https://walruscan.com/mainnet/blob/SbEERvuwMcKWP10nmFjB-9QewqA6UrJ8AuXb62sSANk 6. 9Ekw-cz9WZl-7wVgRMDJfnUmzP4vQCuVAMw21ou9Vvg 7. https://walruscan.com/mainnet/blob/Ljq7t0czqWuacf8Kt8nt5eboPzmDgMipYMkR6PsXjnE 8. https://walruscan.com/mainnet/blob/DFqtpfrbdkV6C_sXYvS8nG8JGJxMM7eF2KEse5mgZU4 9. https://walruscan.com/mainnet/blob/Ljq7t0czqWuacf8Kt8nt5eboPzmDgMipYMkR6PsXjnE 10. https://walruscan.com/mainnet/blob/GuiLcBYgkThr3xSpfE4m88J-KCCqLIFt2FZcsQd-nic
- **Wallet address:** 0xd2929257229e34a0f0e7ea013f0a7c4c3a06b97932d3b47cc4e063076dcb3f18
- **Agent/session ID:** 0xb19efb98c4ce842591a12484e019bb767c8a9a126e4f7a61b2d3aa9c91185b93

## Demo Video
https://youtu.be/huCUF2rMRSE?si=lUaQkP14wz8sNKsX
Shows: a factual question triggering `recall()`, a new decision triggering
`remember()`, and a supersession case where a new decision overrides a
previously stored one.

## Files
- `prompt.md` — the standalone, copy-pasteable system prompt
- `SUBMISSION.md` — this file
