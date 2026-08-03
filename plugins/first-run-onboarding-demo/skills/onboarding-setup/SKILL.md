---
name: onboarding-setup
description: First-run setup for the onboarding demo plugin. Invoke when a SessionStart hook reports that setup has not been completed, or when the user asks to set up or re-run onboarding for this plugin.
---

# First-run onboarding (demo)

This is the one-time setup for the plugin. Three steps, in order. Keep the user in the loop.

## 1. Explain and confirm

In one or two sentences, tell the user the plugin needs a quick first-run setup: it saves a small config file, then shows a summary. Ask for one demo value to store, e.g. "What workspace name should this plugin use?" Any placeholder is fine — this demo does not connect to anything external. Wait for their answer before continuing.

## 2. Write the config file

The config lives under the Claude config dir: `$CLAUDE_CONFIG_DIR` if that env var is set (Cowork sets it), otherwise `~/.claude`. Create `<config dir>/first-run-onboarding-demo/` if it doesn't exist, then write `<config dir>/first-run-onboarding-demo/setup-complete.json` with:

```json
{
  "workspace_name": "<what the user gave>",
  "completed_at": "<ISO 8601 timestamp>",
  "plugin_version": "0.1.0"
}
```

This file doubles as the marker the SessionStart hook checks, so writing it stops the setup prompt from firing on future sessions. If the write fails, say so and stop — do not claim setup finished.

## 3. Show the success artifact

Produce a short "Setup complete" summary. If the environment supports rendered artifacts (Cowork, claude.ai), make it an artifact; otherwise print it as markdown. Include:

- Config saved to `<config dir>/first-run-onboarding-demo/setup-complete.json` (show the resolved path)
- The workspace name they entered
- Two or three example prompts they can try next

Then stop and hand control back to the user.
