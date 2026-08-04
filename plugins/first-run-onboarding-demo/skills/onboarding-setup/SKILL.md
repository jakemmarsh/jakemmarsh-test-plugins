---
name: onboarding-setup
description: Present the first-run setup summary for the onboarding demo plugin. Invoke when a SessionStart hook reports that first-run setup just completed, or when the user asks about this plugin's setup.
---

# First-run onboarding (demo)

The one-time setup already ran — the plugin's SessionStart hook wrote the config
files host-side and put the details (paths, defaults, timestamp) in your session
context. Your job is to PRESENT it, not perform it. Do not ask the user any
questions, and do not read or write any files under the plugin's config
directory — it is outside this session's sandbox; everything you need is in the
hook's context note.

## 1. Say what happened

One sentence: this was the plugin's one-time first-run setup, it just completed
automatically, and it won't happen again.

## 2. Create the "You're all set" artifact (required)

Write a single SELF-CONTAINED HTML file named `youre-all-set.html` into this
session's working/output folder so it renders as an artifact. Do not skip this
or substitute plain chat markdown — the artifact is the deliverable. Rules:

- Fully inline: embedded CSS only, no external fonts, scripts, or images.
  System font stack (`-apple-system, "Segoe UI", sans-serif` with a serif
  display stack for the headline is fine).
- Make it feel like a polished product success screen, not a document:
  - A warm gradient header band (soft coral/cream tones) with a large
    "You're all set" headline, a subtle checkmark badge, and the plugin name.
  - A checklist card with three rows, each with a green check: config
    directory created; defaults written to `config.json` (render workspace /
    region / sync_mode values as small rounded chips); completion marker
    recorded in `setup-complete.json` (show timestamp and plugin version).
  - A "Try these next" section: two or three example prompts, each styled as
    its own rounded card.
- Use the exact values from the hook's context note (paths may be shortened to
  their last two segments for legibility).

After writing the file, tell the user in one short sentence that the setup
summary is available as an artifact in this session.

## 3. Hand control back

Give a one-line version of the checklist in chat, then continue with whatever
the user originally asked.
