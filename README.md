# jakemmarsh-test-plugins

Public test fixture for plugin-marketplace sync.

Contains one marketplace (`jakemmarsh-test-public`) with one plugin (`hello-cowork-public`) that ships a skill, a command, and an agent — the minimal set needed to verify each extractor ran.

`first-run-onboarding-demo` — first-run onboarding pattern: a `SessionStart` hook notices setup hasn't run and points Claude at an `onboarding-setup` skill, which writes a config/marker file and shows a "setup complete" summary. `onboarding-reset` clears the marker to re-test.
