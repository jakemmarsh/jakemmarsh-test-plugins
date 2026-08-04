---
name: onboarding-reset
description: Reset the onboarding demo so first-run setup fires again on the next session. Use when the user asks to reset, redo, or re-test onboarding for this plugin.
---

# Reset onboarding (demo)

The marker lives at `<config dir>/first-run-onboarding-demo/setup-complete.json`,
where `<config dir>` is `$CLAUDE_CONFIG_DIR` if set, else `~/.claude`.

- If your file tools can write there (plain Claude Code CLI): delete the file
  and confirm.
- In a Cowork session that path is outside the sandbox — tell the user to
  delete it themselves from a terminal, and print the exact path. On desktop
  the Cowork config dir lives under
  `~/Library/Application Support/Claude*/local-agent-mode-sessions/<account>/<org>/`.

Either way, tell the user setup will fire again at the start of their next
session.
