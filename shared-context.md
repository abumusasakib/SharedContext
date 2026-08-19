# Overview

This file is the local canonical shared context for the project.

## Current Architecture

- Claude Code skill: `.claude/skills/shared-context-sync/SKILL.md`
- MCP server: `mcp/shared-context-mcp/`
- Project memory: `CLAUDE.md`

## Active Decisions

- Prefer a local-first workflow for setup and day-to-day use.
- Keep the shared context in a single markdown file with stable headings.

## Open Questions

- Should Google Drive be added later as a sync adapter?

## Recent Changes

- Initialized the shared context scaffold.
- Installed `mcp/shared-context-mcp` deps and registered the `shared-context` MCP server with Claude Code (local-file backend — no Google ADC credentials found at `~/.config/gcloud/application_default_credentials.json`, so Drive stays inactive until `gcloud auth application-default login` is run).
- Shared `../ProjectContext/` (sibling folder, one level up from this repo) as the team's reference material set:
  - `Answer - Capturing Expiry Dates and Unique Product IDs in Bangladesh.pdf`
  - `Research_Findings_of_Existing_Systems.docx`
  - `meeting note (17-08).pdf` — FistFighters meeting notes (Aug 17, 2026): node-by-node data flow mapping, bulk tagging/mobile logging, OCR on printed batch labels (≥10% of incoming batches target), mobile OCR research, perishable/loose-item batch traceability, camera-based photo tagging. Findings due before the Aug 19 team meeting; sync with Tashrif Bhaia on Friday.
  - `CloudFest_Master_Analysis.pdf`
  - `CloudFest_Technical_Cost_Analysis.pdf`
  - `Fist_Fighters_Smart_Food_Chain_Notes.pdf`
  - `CloudCamp AI Congress.docx`
- Related teammate research split (see `../research topics by teammate.txt`): Maisha — Alfamart/Dmart/Bigbazar inventory systems; Azra — 7-Eleven/Bata/BAU; Musa — Middle East supershops (Lulu Hypermarket, Falaj, Nesto, Farab Digi, Danobi, Alfalaj, National, A&H, Aimirah, Al Mandoosh); note on product seals (e.g. eggs).
