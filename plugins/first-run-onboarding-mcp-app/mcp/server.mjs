#!/usr/bin/env node
// Zero-dependency MCP server (stdio, newline-delimited JSON-RPC) for the
// first-run onboarding MCP App demo.
//
// - `complete_first_run_setup` performs the one-time setup writes. The server
//   is a host-side process spawned by the CLI, so it writes to a DURABLE
//   per-user location (~/.claude/first-run-onboarding-mcp-app) — unlike the
//   sibling hook-based demo plugin, setup here survives across sessions.
// - The tool declares a ui:// resource (MCP Apps ext, both modern and legacy
//   _meta formats), so compliant hosts render the result as an inline widget.
// - `toggle_sync_mode` exists so the widget can demonstrate a real
//   bidirectional interaction: a button in the iframe calls back into this
//   server and the config file actually changes.
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

const STATE_DIR = path.join(os.homedir(), ".claude", "first-run-onboarding-mcp-app");
const CONFIG = path.join(STATE_DIR, "config.json");
const MARKER = path.join(STATE_DIR, "setup-complete.json");
const VERSION = "0.1.0";
const UI_URI = "ui://first-run-onboarding-mcp-app/success";
const UI_MIME = "text/html;profile=mcp-app";

const log = (m) => process.stderr.write(`[onboarding-mcp] ${m}\n`);

function readJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

function doSetup() {
  fs.mkdirSync(STATE_DIR, { recursive: true, mode: 0o700 });
  const config = readJson(CONFIG) ?? {
    workspace: "default",
    region: "us",
    sync_mode: "manual",
  };
  fs.writeFileSync(CONFIG, JSON.stringify(config, null, 2), { mode: 0o600 });
  const marker = {
    completed_at: new Date().toISOString(),
    plugin_version: VERSION,
  };
  fs.writeFileSync(MARKER, JSON.stringify(marker, null, 2), { mode: 0o600 });
  return { config, marker };
}

function currentState() {
  return {
    config: readJson(CONFIG),
    marker: readJson(MARKER),
    state_dir: STATE_DIR,
  };
}

// ── JSON-RPC plumbing ─────────────────────────────────────────────────
const send = (msg) => process.stdout.write(JSON.stringify(msg) + "\n");
const reply = (id, result) => send({ jsonrpc: "2.0", id, result });
const replyErr = (id, code, message) =>
  send({ jsonrpc: "2.0", id, error: { code, message } });

const TOOLS = [
  {
    name: "complete_first_run_setup",
    description:
      "Perform the one-time first-run setup for the first-run-onboarding-mcp-app plugin (creates its config directory, writes defaults, records the completion marker) and show the setup summary. Call when the SessionStart hook reports setup has not been completed.",
    inputSchema: { type: "object", properties: {} },
    _meta: { ui: { resourceUri: UI_URI }, "ui/resourceUri": UI_URI },
  },
  {
    name: "toggle_sync_mode",
    description:
      "Toggle the plugin's configured sync_mode between manual and automatic. Used by the setup summary widget's button; can also be called directly.",
    inputSchema: { type: "object", properties: {} },
  },
];

function handle(msg) {
  const { id, method, params } = msg;
  switch (method) {
    case "initialize":
      reply(id, {
        protocolVersion: params?.protocolVersion ?? "2025-06-18",
        capabilities: { tools: {}, resources: {} },
        serverInfo: { name: "first-run-onboarding-mcp-app", version: VERSION },
      });
      return;
    case "notifications/initialized":
    case "notifications/cancelled":
      return;
    case "ping":
      reply(id, {});
      return;
    case "tools/list":
      reply(id, { tools: TOOLS });
      return;
    case "tools/call": {
      const name = params?.name;
      if (name === "complete_first_run_setup") {
        const already = fs.existsSync(MARKER);
        const { config, marker } = doSetup();
        reply(id, {
          content: [
            {
              type: "text",
              text: already
                ? "Setup was already complete; showing the summary."
                : `First-run setup complete. Config dir created at ${STATE_DIR}, defaults written to config.json (workspace: ${config.workspace}, region: ${config.region}, sync_mode: ${config.sync_mode}), completion marker recorded (${marker.completed_at}). The summary widget is displayed to the user — no need to repeat the checklist in text.`,
            },
          ],
          structuredContent: {
            already_complete: already,
            state_dir: STATE_DIR,
            config,
            completed_at: marker.completed_at,
            plugin_version: VERSION,
          },
        });
        return;
      }
      if (name === "toggle_sync_mode") {
        const config = readJson(CONFIG) ?? doSetup().config;
        config.sync_mode = config.sync_mode === "manual" ? "automatic" : "manual";
        fs.writeFileSync(CONFIG, JSON.stringify(config, null, 2), { mode: 0o600 });
        reply(id, {
          content: [
            { type: "text", text: `sync_mode is now ${config.sync_mode}.` },
          ],
          structuredContent: { config },
        });
        return;
      }
      replyErr(id, -32602, `Unknown tool: ${name}`);
      return;
    }
    case "resources/list":
      reply(id, {
        resources: [
          {
            uri: UI_URI,
            name: "Setup complete",
            mimeType: UI_MIME,
          },
        ],
      });
      return;
    case "resources/templates/list":
      reply(id, { resourceTemplates: [] });
      return;
    case "resources/read": {
      if (params?.uri === UI_URI) {
        reply(id, {
          contents: [{ uri: UI_URI, mimeType: UI_MIME, text: buildWidgetHtml() }],
        });
        return;
      }
      replyErr(id, -32002, `Unknown resource: ${params?.uri}`);
      return;
    }
    default:
      if (id !== undefined) replyErr(id, -32601, `Method not found: ${method}`);
  }
}

let buf = "";
process.stdin.on("data", (chunk) => {
  buf += chunk.toString("utf8");
  let nl;
  while ((nl = buf.indexOf("\n")) !== -1) {
    const line = buf.slice(0, nl).trim();
    buf = buf.slice(nl + 1);
    if (!line) continue;
    try {
      handle(JSON.parse(line));
    } catch (e) {
      log(`bad message: ${e}`);
    }
  }
});
process.stdin.on("end", () => process.exit(0));
log(`ready (state dir: ${STATE_DIR})`);

// ── Widget ────────────────────────────────────────────────────────────
// Self-contained MCP App view: hand-rolled postMessage bridge implementing
// the ext-apps handshake (ui/initialize → ui/notifications/initialized),
// tool-result updates, size-changed notifications, and tools/call back into
// this server. Current values are baked in at read time as a fallback for
// hosts that render before the tool-result notification arrives.
function buildWidgetHtml() {
  const state = currentState();
  const initial = JSON.stringify({
    state_dir: state.state_dir,
    config: state.config,
    completed_at: state.marker?.completed_at ?? null,
    plugin_version: VERSION,
  });
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>You're all set</title>
<style>
  * { box-sizing: border-box; margin: 0; }
  html, body { background: transparent; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    color: #1f1b17; -webkit-font-smoothing: antialiased; padding: 2px;
  }
  .card {
    border: 1px solid #ece5dd; border-radius: 14px; overflow: hidden;
    background: #fffdfa; max-width: 560px;
  }
  .hero {
    background: linear-gradient(135deg, #f8d9c4 0%, #fbeadd 55%, #fdf6ee 100%);
    padding: 26px 24px 20px; text-align: center;
  }
  .badge {
    width: 44px; height: 44px; border-radius: 50%; background: #fff;
    display: inline-flex; align-items: center; justify-content: center;
    box-shadow: 0 2px 8px rgba(0,0,0,.08); margin-bottom: 10px;
  }
  .badge svg { width: 22px; height: 22px; stroke: #2f9e63; }
  h1 { font-family: Georgia, "Times New Roman", serif; font-size: 26px; font-weight: 600; }
  .sub { font-size: 11px; letter-spacing: .08em; color: #8a7f76; margin-top: 6px; text-transform: uppercase; }
  .body { padding: 16px 20px 18px; }
  .row { display: flex; gap: 10px; align-items: flex-start; padding: 9px 0; border-bottom: 1px solid #f2ece5; font-size: 13.5px; }
  .row:last-of-type { border-bottom: 0; }
  .check { color: #2f9e63; font-weight: 700; }
  code, .chip { font-family: ui-monospace, Menlo, monospace; font-size: 11.5px; background: #f6f0e9; border-radius: 5px; padding: 1.5px 6px; }
  .muted { color: #6f6660; font-size: 11.5px; margin-top: 2px; }
  .actions { display: flex; gap: 8px; margin-top: 14px; flex-wrap: wrap; }
  button {
    font: inherit; font-size: 12.5px; padding: 7px 12px; border-radius: 8px;
    border: 1px solid #e0d7cd; background: #fff; cursor: pointer;
  }
  button:hover { background: #faf6f1; }
  button.primary { background: #b5714f; border-color: #b5714f; color: #fff; }
  button.primary:hover { background: #a5633f; }
  #status { font-size: 11.5px; color: #6f6660; margin-top: 8px; min-height: 14px; }
</style>
</head>
<body>
<div class="card">
  <div class="hero">
    <div class="badge"><svg viewBox="0 0 24 24" fill="none" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg></div>
    <h1>You're all set</h1>
    <div class="sub">first-run-onboarding-mcp-app · v${VERSION}</div>
  </div>
  <div class="body">
    <div class="row"><span class="check">✓</span><div>Config directory created<div class="muted"><code id="dir"></code></div></div></div>
    <div class="row"><span class="check">✓</span><div>Defaults written to <code>config.json</code><div class="muted" id="chips"></div></div></div>
    <div class="row"><span class="check">✓</span><div>Completion marker recorded<div class="muted" id="when"></div></div></div>
    <div class="actions">
      <button class="primary" id="toggle">Switch sync_mode</button>
      <button id="ask">Ask Claude about my config</button>
    </div>
    <div id="status"></div>
  </div>
</div>
<script>
(() => {
  let data = ${initial};
  const pending = new Map();
  let nextId = 1;
  const post = (m) => window.parent.postMessage(m, "*");
  const request = (method, params) => new Promise((res, rej) => {
    const id = "w" + nextId++;
    pending.set(id, { res, rej });
    post({ jsonrpc: "2.0", id, method, params });
  });
  const notify = (method, params) => post({ jsonrpc: "2.0", method, params });

  function render() {
    const c = data.config || {};
    document.getElementById("dir").textContent = (data.state_dir || "").replace(/^\\/Users\\/[^/]+/, "~");
    const chips = document.getElementById("chips");
    chips.replaceChildren(...["workspace", "region", "sync_mode"].map((k) => {
      const el = document.createElement("span");
      el.className = "chip";
      el.textContent = k + ": " + (c[k] ?? "?");
      return el;
    }));
    document.getElementById("when").textContent =
      (data.completed_at || "") + " · plugin v" + (data.plugin_version || "");
  }

  function sendSize() {
    const h = Math.ceil(document.documentElement.getBoundingClientRect().height) + 4;
    notify("ui/notifications/size-changed", { width: Math.ceil(window.innerWidth), height: h });
  }

  window.addEventListener("message", (ev) => {
    const m = ev.data;
    if (!m || m.jsonrpc !== "2.0") return;
    if (m.id !== undefined && pending.has(m.id)) {
      const p = pending.get(m.id);
      pending.delete(m.id);
      m.error ? p.rej(m.error) : p.res(m.result);
      return;
    }
    if (m.method === "ping" && m.id !== undefined) { post({ jsonrpc: "2.0", id: m.id, result: {} }); return; }
    if (m.method === "ui/notifications/tool-result") {
      const sc = m.params && m.params.result && m.params.result.structuredContent;
      if (sc) { data = Object.assign({}, data, sc, sc.config ? { config: sc.config } : {}); render(); sendSize(); }
    }
  });

  document.getElementById("toggle").addEventListener("click", async () => {
    const st = document.getElementById("status");
    st.textContent = "Toggling sync_mode…";
    try {
      const r = await request("tools/call", { name: "toggle_sync_mode", arguments: {} });
      if (r && r.structuredContent && r.structuredContent.config) { data.config = r.structuredContent.config; render(); }
      st.textContent = "sync_mode is now " + (data.config.sync_mode || "?") + " — written to config.json by the plugin's MCP server.";
    } catch (e) { st.textContent = "Tool call failed: " + (e && e.message || JSON.stringify(e)); }
    sendSize();
  });

  document.getElementById("ask").addEventListener("click", () => {
    request("ui/message", { content: [{ type: "text", text: "What is my current first-run-onboarding-mcp-app configuration?" }] })
      .catch(() => {});
  });

  (async () => {
    render();
    try {
      await request("ui/initialize", {
        appInfo: { name: "first-run-onboarding-mcp-app", version: "${VERSION}" },
        appCapabilities: {},
        protocolVersion: "2026-01-26",
      });
      notify("ui/notifications/initialized");
    } catch (e) { /* keep rendering even if handshake fails */ }
    sendSize();
    new ResizeObserver(sendSize).observe(document.body);
  })();
})();
</script>
</body>
</html>`;
}
