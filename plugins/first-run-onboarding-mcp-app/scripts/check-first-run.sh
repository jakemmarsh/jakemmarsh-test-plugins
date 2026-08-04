#!/usr/bin/env bash
# Fires on every SessionStart. Detection only — the actual setup is performed
# by the plugin's MCP server tool, so the writes happen inside a visible,
# approvable tool call rather than a silent hook side effect.
#
# The marker lives at a STABLE per-user path (~/.claude/<plugin>/), written by
# the host-side MCP server — so unlike the per-session $CLAUDE_CONFIG_DIR
# variant in the sibling demo plugin, setup here is genuinely one-time per
# machine (host-loop sessions).
set -euo pipefail

marker="$HOME/.claude/first-run-onboarding-mcp-app/setup-complete.json"

if [ -f "$marker" ]; then
  exit 0
fi

cat <<'EOF'
{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": "The first-run-onboarding-mcp-app plugin is installed but its one-time setup has not run. Before responding to the user's first request, call the complete_first_run_setup tool (from this plugin's onboarding MCP server). It performs the setup itself and displays an interactive summary widget to the user — after calling it, do NOT repeat the setup checklist in text and do NOT write any files yourself; add one short sentence noting the one-time setup finished, then continue with the user's request."
  }
}
EOF
