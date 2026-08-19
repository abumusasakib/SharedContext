---
name: shared-context-sync
description: Sync, summarize, and maintain shared project context for Claude Code using the repository's canonical context file and the optional MCP server.
metadata:
  short-description: Sync shared project context
---

# Shared Context Sync

Use this skill when you need the current team context, want to refresh the canonical project notes, or need to reconcile code with shared decisions.

## What to do

- Read `shared-context.md` first when it exists.
- If the MCP server is available, prefer it for structured reads and updates.
- Keep updates concise, additive, and easy to diff.
- Preserve decisions, constraints, and open questions in separate sections.
- If the source of truth is unclear, record the ambiguity instead of guessing.

## Output shape

- Summarize only what changed or matters for the current task.
- Call out:
  - new decisions
  - changed constraints
  - open questions
  - any mismatch between code and shared context

## Update rule

- When writing back context, avoid bulk rewrites unless the structure itself is wrong.
- Keep headings stable so both humans and tools can parse the document reliably.

## Setup expectation

- This skill assumes the repo contains `CLAUDE.md` and the MCP server scaffold in `mcp/shared-context-mcp/`.
- The default backend is Google Drive via a shared service-account key (see `mcp/shared-context-mcp/CLAUDE-MCP-SETUP.md`); it falls back automatically to the local `shared-context.md` file when no Drive credentials are configured.
