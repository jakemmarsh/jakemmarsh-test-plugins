---
name: onboarding-setup
description: Present the first-run setup summary for the onboarding demo plugin. Invoke when a SessionStart hook reports that first-run setup just completed, or when the user asks about this plugin's setup.
---

# First-run onboarding (demo)

The one-time setup already ran — the plugin's SessionStart hook wrote the config
files host-side and put the details (paths, defaults, timestamp) in your session
context. Your job is to PRESENT it, not perform it. Do not ask the user any
questions, and do not read or write any files under the plugin's config
directory — it is outside this session's sandbox, and everything you need is in
the hook's context note.

## 1. Say what happened

One sentence: this was the plugin's one-time first-run setup, it just completed
automatically, and it won't happen again.

## 2. Show the success artifact

Produce a "You're all set" summary. If the environment supports rendered
artifacts (Cowork, claude.ai), make it an artifact; otherwise print it as
markdown. Include:

- A checklist of what was set up, taken from the hook's context note: config
  directory created, defaults written (`config.json` — workspace/region/
  sync_mode), completion marker recorded (`setup-complete.json`), with the
  resolved config path
- Two or three example prompts the user can try next

Then hand control back to the user and continue with whatever they originally
asked.
