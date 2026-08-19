# Shared Context for Claude Code

This repo gives you a lightweight way to keep Claude Code aligned with team decisions.

## What's here

- `CLAUDE.md` for root-level project memory
- `.claude/skills/shared-context-sync/SKILL.md` for syncing and reconciling context
- `mcp/shared-context-mcp/` for a local MCP server that syncs the context through
  Google Drive by default, falling back to a local file if Drive isn't configured

## How the Drive backend works

The default setup uses **one shared Google service account**, not personal
Google logins — nobody runs `gcloud auth`, and it works the same for
everyone (including CI). The service account key and Drive folder ID live in
`mcp/shared-context-mcp/.env` (git-ignored), pointing at
`mcp/shared-context-mcp/service-account.json` (also git-ignored).

Two things about the Drive API that shaped this setup, so you don't hit the
same walls if you ever touch it:

- **Service accounts have no personal storage quota.** They can't create
  files inside a regular "My Drive" folder — only inside a Google Workspace
  Shared Drive. On a personal Gmail account (no Shared Drives available),
  that means the sync file has to be **created by a human** and then shared
  with the service account — the server can update it after that, just not
  originate it.
- **The `drive.file` OAuth scope only covers files the app itself created.**
  A file a human creates and shares with the service account needs the
  broader `drive` scope to be readable/writable — that's what the server
  requests.

## Setup for a new teammate

### 1. Install the MCP server deps

```bash
cd mcp/shared-context-mcp
npm install
```

Or run the guided setup, which also handles steps 2–4 below:

```bash
npm run setup
```

### 2. Get the shared credentials

Ask a teammate for the shared `service-account.json` key (or generate one —
`npm run setup` prints the exact Google Cloud Console steps: create a
service account, download a JSON key, enable the Drive API, no project IAM
roles needed). Drop it at:

```
mcp/shared-context-mcp/service-account.json
```

### 3. Point it at the shared Drive file

Create `mcp/shared-context-mcp/.env` (or let `npm run setup` write it):

```bash
GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/mcp/shared-context-mcp/service-account.json
GOOGLE_DRIVE_FOLDER_ID=<the shared folder's id>
GOOGLE_DRIVE_FILE_NAME=Shared Context.md
```

`GOOGLE_DRIVE_FILE_NAME` matters here: the file already exists (see below),
so this must match its exact name, including whatever extension Drive gave
it. If a teammate is instead setting up a *brand-new* team from scratch, see
"Bootstrapping a brand-new shared file" below.

### 4. Register the MCP server with Claude Code

```bash
claude mcp add --transport stdio shared-context -- node mcp/shared-context-mcp/index.js
```

`npm run setup` offers to run this for you.

### 5. Start using it

- Ask Claude Code to sync shared context, or invoke the `shared-context-sync`
  skill.
- Restart Claude Code (or reconnect MCP servers) after any credential or
  `.env` change — the server only reads config at startup.

## Bootstrapping a brand-new shared file (one-time, per team)

Only needed once, when there's no shared Drive file yet:

1. In Google Drive, create or pick a folder for the team, and copy its
   folder ID from the URL.
2. Create a plain-text file in that folder named `Shared Context`. Drive
   auto-appends an extension based on mimeType — a freshly created plain-text
   file typically lands as `Shared Context.txt`. That's fine as a starting
   point: the first write through `replace_shared_context` or
   `append_shared_context_note` sets `mimeType: text/markdown`, and Drive
   auto-renames the extension to `.md` on that update. Note whatever name it
   ends up with after that first write — don't assume `.txt` will stick.
3. Share that file with the service account's email (the `client_email`
   field in `service-account.json`, e.g.
   `name@project-id.iam.gserviceaccount.com`) as **Editor**.
4. Set `GOOGLE_DRIVE_FOLDER_ID` and `GOOGLE_DRIVE_FILE_NAME` in `.env` to
   match steps 1–2 exactly.

(If your team is on Google Workspace with Shared Drives available, you can
skip the manual file creation — point `GOOGLE_DRIVE_FOLDER_ID` at a Shared
Drive folder the service account is a member of, and it can create the file
itself on first write.)

## Recommended workflow

- Keep team decisions in one markdown file.
- Use the MCP tools (`get_shared_context`, `replace_shared_context`,
  `append_shared_context_note`) for reads and updates — avoid editing the
  Drive file by hand or via raw file access, so everyone goes through the
  same path.
- Avoid rewriting the entire context file unless the structure needs to
  change; prefer `append_shared_context_note` for incremental updates.

## Environment variables

- `SHARED_CONTEXT_BACKEND=local` forces the local file backend, ignoring
  any Drive credentials present.
- `SHARED_CONTEXT_PATH` changes the local file location (used as the
  fallback, and as the cache path in general).
- `GOOGLE_APPLICATION_CREDENTIALS` points at the service-account key. If
  unset, the server also auto-detects a key dropped at
  `mcp/shared-context-mcp/service-account.json`.
- `GOOGLE_DRIVE_FILE_NAME` sets the exact Drive file name to search for
  (must match Drive's actual name, extension included).
- `GOOGLE_DRIVE_FOLDER_ID` scopes the Drive search/create target to a
  folder.

## Troubleshooting

- **`Service Accounts do not have storage quota...`** — the server tried to
  create the file itself and can't (no Shared Drive available). Create the
  file manually and share it with the service account instead (see
  "Bootstrapping" above).
- **`insufficient authentication scopes` / file not readable despite being
  shared** — the server needs the full `drive` scope to read files a human
  shared with it, not just `drive.file`. This is already how
  `mcp/shared-context-mcp/index.js` requests scopes; if you're debugging a
  custom script, use the same one.
- **Status looks right but reads/writes fail** — `shared_context_status`
  only reports config, it doesn't touch the file. Always confirm with an
  actual `get_shared_context` call.
- **Changed `.env` or the key but nothing changed** — the MCP server only
  reads config at process startup. Restart Claude Code or reconnect the MCP
  server.

## Notes for teammates

- The Google Drive backend works best with a shared Markdown file (`.md`)
  in Drive rather than a full Google Doc — Google Docs render Markdown
  literally (asterisks, hashes and all), which reads badly. A file created
  as plain text and then written to once via the MCP tools ends up as
  `.md`, per the bootstrapping note above.
- The server uses Google Drive only when credentials are found (service
  account key, or personal ADC as a non-default fallback); otherwise it
  works locally with `shared-context.md`.
- Keep `service-account.json` and `.env` out of version control — both are
  git-ignored in `mcp/shared-context-mcp/`.
