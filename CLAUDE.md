# CloudCamp — Project Memory

This is the root-level project memory for Claude Code in this repo. It orients
a fresh session; the live team context (decisions, timeline, project direction)
lives in the shared-context document synced via MCP, not here — see below.

## What's here

- `CLAUDE.md` (this file) — static orientation, not team state.
- `.claude/skills/shared-context-sync/SKILL.md` — how to read/write the shared
  context correctly (via MCP tools, not raw file edits, when the MCP server
  is available).
- `mcp/shared-context-mcp/` — local MCP server; syncs through Google Drive by
  default (shared service-account key, see `README.md`), falling back to the
  local `shared-context.md` file if Drive isn't configured.
- `README.md` — full setup and troubleshooting for the Drive backend.

## Working with the shared context

- Always sync via the MCP tools (`get_shared_context`, `replace_shared_context`,
  `append_shared_context_note`) instead of editing `shared-context.md` directly,
  whenever the MCP server is available.
- Use the `shared-context-sync` skill for the read/reconcile/write workflow.

## Available skills in this session

- **ai-humanizer** — rewrites AI-sounding text to read naturally, checked
  against the 35 AI-writing-pattern checklist from
  [blader/humanizer](https://github.com/blader/humanizer) (content, language,
  style, chatbot, and filler/hedging patterns). Reference lives at
  `~/.claude/skills/ai-humanizer/references/ai_writing_patterns_35.md`.
- **Deep research skills** (`research`, `research-add-items`,
  `research-add-fields`, `research-deep`, `research-report`) — from
  [Weizhena/Deep-Research-skills](https://github.com/Weizhena/Deep-Research-skills),
  installed at `~/.claude/skills/` with the `web-search-agent` and its search
  modules at `~/.claude/agents/`. Two-phase workflow: `/research <topic>` to
  build an outline, then `/research-deep` to investigate each item in
  parallel, then `/research-report` to compile a markdown report. Useful for
  the competitive-benchmarking and market-research work already reflected in
  the shared context (e.g. the Middle East retail-chain comparisons).
