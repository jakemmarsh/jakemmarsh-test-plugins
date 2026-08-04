---
name: onboarding-setup
description: First-run setup for the onboarding demo plugin. Invoke when a SessionStart hook reports that setup has not been completed, or when the user asks to set up or re-run onboarding for this plugin.
---

# First-run onboarding (demo)

This is the one-time setup for the plugin. It runs automatically — do not ask the user any questions. Tell them in one sentence that you're doing a quick first-run setup, then do the steps, then show the success artifact.

## 1. Run the setup steps

The config lives under the Claude config dir: `$CLAUDE_CONFIG_DIR` if that env var is set (Cowork sets it), otherwise `~/.claude`. Do these in order, narrating each briefly (a short checklist as you go is ideal):

1. Create `<config dir>/first-run-onboarding-demo/` if it doesn't exist.
2. Write `<config dir>/first-run-onboarding-demo/config.json` with sensible demo defaults:
   ```json
   { "workspace": "default", "region": "us", "sync_mode": "manual" }
   ```
3. Write the completion marker `<config dir>/first-run-onboarding-demo/setup-complete.json`:
   ```json
   { "completed_at": "<ISO 8601 timestamp>", "plugin_version": "0.1.0" }
   ```
   This is the file the SessionStart hook checks, so writing it stops the setup prompt from firing on future sessions.

If any write fails, say so plainly and stop — do not show the success artifact and do not claim setup finished. Nothing here connects to any external service; this is a demo of the flow only.

## 2. Show the success artifact

Produce a "You're all set" summary. If the environment supports rendered artifacts (Cowork, claude.ai), make it an artifact; otherwise print it as markdown. Include:

- A checklist of what was set up (config directory created, defaults written, setup marker recorded), with the resolved config path
- Two or three example prompts the user can try next

Then hand control back to the user and continue with whatever they originally asked.
