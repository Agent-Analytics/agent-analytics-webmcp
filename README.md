# Agent Analytics WebMCP Evidence Explorer

An open-source WebMCP support preview for Agent Analytics. It turns a live product-analytics page into an agent-native evidence surface: Codex or ChatGPT Work can call five read-only tools, receive structured analytics, and update the same visual canvas the person is watching.

**Live demo:** [webmcp.agentanalytics.sh](https://webmcp.agentanalytics.sh/)

**How to use it:** [Agent Analytics WebMCP guide](https://docs.agentanalytics.sh/guides/webmcp/)

## Why this exists

Agents can change products quickly, but they still waste time guessing what users did. Agent Analytics provides the evidence layer. This demo makes that evidence available directly from a webpage—without a separate MCP install and without giving the agent mutation authority.

The public dataset is served through the real `api.agentanalytics.sh` demo. It contains intentional product events (`signup_started`, `signup`, and experiment exposure), not only pageviews.

## Site tools

| Tool | Visible result |
| --- | --- |
| `show_growth_overview` | Time series and baseline KPIs |
| `trace_signup_funnel` | Step conversion and drop-off |
| `compare_conversion_paths` | Entry-page journeys to signup |
| `break_down_conversions` | Conversion event by page/referrer/campaign |
| `inspect_signup_experiment` | Variants and observed results |

Every tool is registered with `readOnlyHint: true`, has a closed JSON Schema, calls an allowlisted server endpoint, and returns enough structured evidence to verify the visible page update.

## Architecture

The page registers top-level imperative WebMCP tools with `document.modelContext.registerTool`. Tool executions reuse the same `run()` path as the human controls. A small Cloudflare Worker validates inputs, obtains an ephemeral public-demo agent session, calls only allowlisted read endpoints, and never sends the bearer token to the browser.

## Local development

```bash
npm install
npm test
npm run dev
```

Open the local URL and use the manual controls. WebMCP tools are feature-detected, so the page remains fully usable in ordinary browsers.

To test native site tools, open the URL in the ChatGPT or Codex built-in browser with WebMCP enabled and ask: **“Find the biggest signup leak and show me the evidence.”** The agent can call the page's structured tools; the same result appears in the visible evidence canvas.

## Deploy

```bash
npx wrangler whoami
npm run deploy
```

## Security and privacy

- Public seeded demo data only; no customer or account data.
- Read-only analytics and experiment reads; no billing, keys, delete, or control-plane mutations.
- Demo bearer tokens stay inside the Worker and expire after 15 minutes.
- Closed input schemas plus matching server-side validation.
- Same-origin API calls, strict CSP, no third-party browser scripts, no cookies, and no local storage.
- API responses are rendered as untrusted text; dynamic values are escaped.

## License

[MIT](LICENSE)
