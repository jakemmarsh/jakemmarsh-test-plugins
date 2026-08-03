---
name: onboarding-reset
description: Reset the onboarding demo so first-run setup fires again on the next session. Use when the user asks to reset, redo, or re-test onboarding for this plugin.
---

# Reset onboarding (demo)

Delete `<config dir>/first-run-onboarding-demo/setup-complete.json` if it exists and confirm, where `<config dir>` is `$CLAUDE_CONFIG_DIR` if set, else `~/.claude`. Tell the user the setup prompt will show up again at the start of their next session (start a new session, or use /clear if it re-runs SessionStart hooks in their build).
