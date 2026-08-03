#!/usr/bin/env bash
# Fires on every SessionStart (startup, resume, clear). It only speaks up when
# the setup marker is missing, so it is cheap and safe to run every time.
set -euo pipefail

# Cowork points CLAUDE_CONFIG_DIR at a per-session mount; the CLI uses ~/.claude.
# Follow whichever the CLI itself is using so the marker lands beside its config.
config_dir="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
marker="$config_dir/first-run-onboarding-demo/setup-complete.json"

if [ -f "$marker" ]; then
  exit 0
fi

# additionalContext is injected into the model's context at session start.
# It tells Claude to run the setup skill before doing anything else.
cat <<'EOF'
{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": "The first-run-onboarding-demo plugin is installed but its one-time setup has not been completed (no marker file at $CLAUDE_CONFIG_DIR/first-run-onboarding-demo/setup-complete.json, or ~/.claude/... if CLAUDE_CONFIG_DIR is unset). Before responding to the user's first request, invoke the first-run-onboarding-demo:onboarding-setup skill and walk the user through setup. Tell them it is a one-time step."
  }
}
EOF
