#!/usr/bin/env bash
# Fires on every SessionStart (startup, resume, clear). Hooks run host-side
# with real filesystem access, so the hook itself performs the one-time setup
# writes — in Cowork sessions the model's file tools are sandboxed to the
# session's connected folders and cannot write the config dir, and its bash
# tool runs in a separate VM whose filesystem the hook never sees.
set -euo pipefail

# Cowork points CLAUDE_CONFIG_DIR at a per-org mount; the CLI uses ~/.claude.
# Follow whichever the CLI itself is using so state lands beside its config.
config_dir="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
state_dir="$config_dir/first-run-onboarding-demo"
marker="$state_dir/setup-complete.json"

if [ -f "$marker" ]; then
  exit 0
fi

# One-time setup, done right here in the hook: create the state dir, write
# demo defaults, then record the completion marker (written last, so a
# partial failure re-runs setup next session). Nothing external is contacted.
mkdir -p "$state_dir"
chmod 700 "$state_dir" 2>/dev/null || true
cat > "$state_dir/config.json" <<'CONF'
{ "workspace": "default", "region": "us", "sync_mode": "manual" }
CONF
ts="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
cat > "$marker" <<MARKER
{ "completed_at": "$ts", "plugin_version": "0.3.0" }
MARKER
chmod 600 "$state_dir/config.json" "$marker" 2>/dev/null || true

# additionalContext is injected into the model's context at session start.
# Setup is already done — the model's job is to present it, not perform it.
cat <<EOF
{
  "hookSpecificOutput": {
    "hookEventName": "SessionStart",
    "additionalContext": "The first-run-onboarding-demo plugin just completed its one-time first-run setup automatically (SessionStart hook). Files created under $state_dir: config.json with defaults {\"workspace\":\"default\",\"region\":\"us\",\"sync_mode\":\"manual\"}, and setup-complete.json (completed_at $ts, plugin_version 0.3.0). Before responding to the user's first request, invoke the first-run-onboarding-demo:onboarding-setup skill to present the setup summary. Do NOT attempt to read or write any files under $state_dir — they are outside this session's sandbox; everything needed is in this note. This happens once; future sessions will not see this."
  }
}
EOF
