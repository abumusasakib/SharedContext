# MCP Setup

The default backend is **Google Drive**, shared by the whole team through one
service-account key — nobody needs to run a personal `gcloud auth` login.
If no credentials are found, it falls back to the local `shared-context.md`
file automatically.

## Quick start

```bash
cd mcp/shared-context-mcp
npm run setup
```

This installs dependencies, walks you through Drive credentials (paste the
path to the team's shared service-account key, or create one the first time
— instructions are printed inline), and offers to register the server with
Claude Code.

## Manual setup

1. Install dependencies:

   ```bash
   cd mcp/shared-context-mcp
   npm install
   ```

2. Enable Google Drive sync (skip to stay local-only):

   - Get the team's shared service-account JSON key (or create one — see
     `npm run setup` output for the exact console steps: create the service
     account, download a JSON key, enable the Drive API, and share your
     team's Drive folder with the service account's `client_email` as an
     Editor).
   - Save it as `mcp/shared-context-mcp/service-account.json` (git-ignored).
   - Create `mcp/shared-context-mcp/.env` (git-ignored) with:

     ```
     GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/service-account.json
     GOOGLE_DRIVE_FOLDER_ID=<the shared folder's id>
     ```

     `GOOGLE_DRIVE_FOLDER_ID` is optional but recommended — without it,
     everyone gets their own file named "Shared Context" instead of one
     shared document.

3. Register the server in Claude Code:

   ```bash
   claude mcp add --transport stdio shared-context -- node mcp/shared-context-mcp/index.js
   ```

4. `shared-context.md` remains the local fallback and cache path — the MCP
   tools always read/write through the server, which picks Drive when
   credentials are present and falls back to that file otherwise. Set
   `SHARED_CONTEXT_BACKEND=local` to force local-file mode even with Drive
   credentials present.

## Personal ADC (alternative, not the default)

If you'd rather authenticate as yourself instead of using the shared service
account, `gcloud auth application-default login` with Drive scopes still
works and is detected automatically — but each teammate has to do this
individually, and it doesn't work in CI/headless environments. The shared
service-account key is the recommended default for that reason.
