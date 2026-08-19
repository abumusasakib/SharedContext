import { existsSync } from "node:fs";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { google } from "googleapis";
import { GoogleAuth } from "google-auth-library";
import { config as loadDotenv } from "dotenv";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const repoRoot = resolve(__dirname, "..", "..");
const stateDir = resolve(repoRoot, ".cache", "shared-context-mcp");
const defaultLocalPath = resolve(repoRoot, "shared-context.md");
const metadataPath = resolve(stateDir, "drive-metadata.json");
// Drop the shared service-account key here and everyone's setup Just Works —
// no per-person `gcloud auth` and no env vars to export by hand.
const defaultServiceAccountPath = resolve(__dirname, "service-account.json");

// Load mcp/shared-context-mcp/.env if present, without clobbering vars the
// user already has exported in their shell.
loadDotenv({ path: resolve(__dirname, ".env") });

function env(name, fallback = "") {
  return process.env[name] || fallback;
}

function config() {
  const adcPath = resolve(process.env.HOME || process.env.USERPROFILE || "", ".config", "gcloud", "application_default_credentials.json");
  const serviceAccountPath = env("GOOGLE_APPLICATION_CREDENTIALS", "") || (existsSync(defaultServiceAccountPath) ? defaultServiceAccountPath : "");
  const driveReady = existsSync(adcPath) || (serviceAccountPath && existsSync(serviceAccountPath));
  // Point GoogleAuth at the service-account key even when it was only found
  // via the default path (i.e. GOOGLE_APPLICATION_CREDENTIALS wasn't set).
  if (serviceAccountPath && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = serviceAccountPath;
  }
  return {
    localPath: env("SHARED_CONTEXT_PATH", defaultLocalPath),
    driveFileName: env("GOOGLE_DRIVE_FILE_NAME", "Shared Context"),
    driveFolderId: env("GOOGLE_DRIVE_FOLDER_ID", ""),
    // Drive is the default backend for everyone as soon as credentials are
    // present (service-account key or personal ADC). Set
    // SHARED_CONTEXT_BACKEND=local to opt out and stay file-only.
    useDrive: env("SHARED_CONTEXT_BACKEND") === "local" ? false : driveReady,
    driveReady,
    adcPath,
    serviceAccountPath
  };
}

async function ensureStateDir() {
  await mkdir(stateDir, { recursive: true });
}

async function readJsonIfExists(path) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(value, null, 2), "utf8");
}

async function readLocalContext(path) {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") return "";
    throw error;
  }
}

async function writeLocalContext(path, content) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, "utf8");
  return path;
}

async function getDriveClient() {
  const auth = new GoogleAuth({
    // drive.file only covers files the app itself created — files shared
    // with the service account by someone else (our setup flow) need the
    // full drive scope to be readable/writable.
    scopes: ["https://www.googleapis.com/auth/drive"]
  });
  const client = await auth.getClient();
  const drive = google.drive({ version: "v3", auth: client });
  return { client, drive };
}

async function findContextFile(drive) {
  const { driveFileName, driveFolderId } = config();
  const parts = [`name = '${driveFileName.replace(/'/g, "\\'")}'`, "trashed = false"];
  if (driveFolderId) parts.push(`'${driveFolderId}' in parents`);
  const result = await drive.files.list({
    q: parts.join(" and "),
    fields: "files(id,name,mimeType,modifiedTime,webViewLink)",
    spaces: "drive",
    pageSize: 10
  });
  return result.data.files?.[0] || null;
}

async function createContextFile(drive) {
  const { driveFileName, driveFolderId } = config();
  const metadata = {
    name: driveFileName,
    mimeType: "text/markdown"
  };
  if (driveFolderId) metadata.parents = [driveFolderId];
  const created = await drive.files.create({
    requestBody: metadata,
    media: {
      mimeType: "text/markdown",
      body: "# Overview\n\n",
    },
    fields: "id,name,mimeType,modifiedTime,webViewLink"
  });
  return created.data;
}

async function getDriveContextFile(drive) {
  const cached = await readJsonIfExists(metadataPath);
  if (cached?.id) {
    try {
      const res = await drive.files.get({
        fileId: cached.id,
        fields: "id,name,mimeType,modifiedTime,webViewLink"
      });
      return res.data;
    } catch {
      // fall through to search
    }
  }
  const found = await findContextFile(drive);
  return found || createContextFile(drive);
}

async function readDriveContext(drive, fileId) {
  const meta = await drive.files.get({
    fileId,
    alt: "media",
    responseType: "text"
  });
  return typeof meta.data === "string" ? meta.data : Buffer.from(meta.data || "").toString("utf8");
}

async function writeDriveContext(drive, fileId, content) {
  await drive.files.update({
    fileId,
    media: {
      mimeType: "text/markdown",
      body: content
    }
  });
}

async function readContext() {
  const cfg = config();
  if (!cfg.useDrive) return readLocalContext(cfg.localPath);
  const { drive } = await getDriveClient();
  const file = await getDriveContextFile(drive);
  await writeJson(metadataPath, { id: file.id, name: file.name, webViewLink: file.webViewLink || "" });
  return readDriveContext(drive, file.id);
}

async function writeContext(content) {
  const cfg = config();
  if (!cfg.useDrive) {
    return writeLocalContext(cfg.localPath, content);
  }
  const { drive } = await getDriveClient();
  const file = await getDriveContextFile(drive);
  await writeDriveContext(drive, file.id, content);
  await writeJson(metadataPath, { id: file.id, name: file.name, webViewLink: file.webViewLink || "" });
  return `drive:${file.id}`;
}

async function appendNote(note) {
  const current = await readContext();
  const trimmed = current.endsWith("\n") ? current : `${current}\n`;
  const separator = trimmed.endsWith("\n\n") || !trimmed.trim() ? "" : "\n";
  return `${trimmed}${separator}## Note\n${note}\n`;
}

await ensureStateDir();

const server = new McpServer({
  name: "shared-context-mcp",
  version: "0.2.0"
});

server.tool("get_shared_context", {}, async () => {
  const content = await readContext();
  return {
    content: [
      {
        type: "text",
        text: content || "shared context is empty."
      }
    ]
  };
});

server.tool(
  "replace_shared_context",
  {
    content: z.string().describe("Full replacement content for the shared context file.")
  },
  async ({ content }) => {
    const target = await writeContext(content);
    return { content: [{ type: "text", text: `Updated ${target}` }] };
  }
);

server.tool(
  "append_shared_context_note",
  {
    note: z.string().describe("A short note to append to the shared context file.")
  },
  async ({ note }) => {
    const next = await appendNote(note);
    const target = await writeContext(next);
    return { content: [{ type: "text", text: `Appended note to ${target}` }] };
  }
);

server.tool("shared_context_status", {}, async () => {
  const cfg = config();
  const lines = [];
  lines.push(`backend: ${cfg.useDrive ? "google-drive" : "local-file"}`);
  lines.push(`file: ${cfg.useDrive ? cfg.driveFileName : cfg.localPath}`);
  if (cfg.useDrive) {
    lines.push(`folder: ${cfg.driveFolderId || "root"}`);
    lines.push(`credentials: ${cfg.serviceAccountPath ? `service-account (${cfg.serviceAccountPath})` : `personal ADC (${cfg.adcPath})`}`);
  } else if (!cfg.driveReady) {
    lines.push("credentials: none found — run `npm run setup` in mcp/shared-context-mcp to enable Drive sync");
  }
  return { content: [{ type: "text", text: lines.join("\n") }] };
});

const transport = new StdioServerTransport();
await server.connect(transport);
