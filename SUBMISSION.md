# Devpost submission copy

## Project name

Agent Analytics — WebMCP Evidence Explorer

## Tagline

Agents get structured product evidence. People see the same live answer.

## Short description

Agent Analytics turns a product-analytics page into a shared evidence workspace for people and AI agents. Five read-only WebMCP tools let Codex or ChatGPT Work inspect growth, funnels, paths, conversion breakdowns, and an A/B experiment through the real Agent Analytics API. Every agent call updates the same visible canvas, so the person can inspect the evidence instead of trusting a hidden answer.

## Inspiration

Coding agents can ship product changes quickly, but they still struggle to answer the question that should guide those changes: what did users actually do? Browser automation can click through a dashboard, but it is slow, brittle, and forces the agent to infer meaning from pixels. Traditional MCP solves remote integrations, but it requires a separate server connection and loses the immediacy of a page that a person is already exploring.

WebMCP is a strong fit because analytics is collaborative sensemaking. The agent needs structured numbers; the person needs to see the chart, funnel, journey, or experiment that supports the conclusion. Both should work against the same live page and state.

## What it does

The explorer exposes five tools:

- `show_growth_overview` establishes the baseline with unique users, product events, signup rate, and a daily trend.
- `trace_signup_funnel` measures ordered event conversion and pinpoints the largest drop-off.
- `compare_conversion_paths` follows bounded session journeys from entry pages to the signup goal.
- `break_down_conversions` ranks conversion events by page, referrer, or campaign source.
- `inspect_signup_experiment` compares real exposure and conversion results for a signup CTA test.

The demo dataset contains 390 visitors, 288 signup starts, and 93 signups. The agent can show that the largest leak is `signup_started → signup`, compare `/pricing` at 44.4% conversion with `/docs` at 0%, and inspect a CTA variant converting at 35.4% versus 12.3% for control.

This creates a better experience than browser clicking because one precise call returns typed, structured evidence and immediately renders the human-readable view. It also creates a new collaborative loop: a person can ask a product question in natural language, watch the agent choose the right analysis, inspect the visible evidence, and decide what to test next.

## How WebMCP is implemented

The top-level JavaScript module feature-detects `document.modelContext.registerTool` and registers each tool imperatively. Every definition has a closed JSON Schema, a focused description, `annotations: { readOnlyHint: true }`, and an `execute` callback that reuses the page's normal `run()` function. There is no hidden agent-only path: manual buttons and WebMCP calls use the same data client and renderers.

A Cloudflare Worker provides the same-origin `/api/evidence` endpoint. It validates every input again, maps only five known tool names to allowlisted read endpoints, obtains an ephemeral public-demo agent session, and keeps that bearer token on the server. The browser never receives an Agent Analytics credential. The app uses a strict Content Security Policy, no third-party browser scripts, no cookies, and no local storage.

## How we built it

- Vanilla HTML, CSS, and JavaScript for a fast, dependency-free interface.
- Top-level imperative WebMCP registration for native ChatGPT/Codex discovery.
- Cloudflare Workers Static Assets plus a small validation proxy.
- Live Agent Analytics API data for overview, funnel, paths, breakdown, and experiment evidence.
- Node's built-in test runner for schemas, feature fallback, request construction, and invalid-input rejection.
- Native WebMCP end-to-end testing in the Codex built-in browser against localhost and production.

## Challenges

The main design challenge was preserving a trustworthy data boundary. A browser could request a public demo token directly, but forwarding that token to client JavaScript would create unnecessary leakage. The Worker therefore owns the short-lived demo session and exposes only a tightly validated evidence API. Another challenge was making tool calls legible to both audiences: the structured result has to be complete enough for an agent, while the visible canvas has to make the same conclusion easy for a person to verify.

## Accomplishments

- Five non-trivial tools discovered and executed by the actual Codex WebMCP client.
- Visible page state updates verified after native tool calls.
- Live deployment backed by the real analytics API, not a mocked JSON file.
- Read-only security boundary with closed schemas and matching server validation.
- Public MIT-licensed repository with complete source, tests, and deployment instructions.

## What we learned

WebMCP is most powerful when it does more than wrap UI actions. The best tools expose the semantic operation behind the interface, then keep the interface in sync so a human can audit the result. Analytics also benefits from narrow tools: “trace this funnel” is safer and more reliable than exposing a generic query language on a public page.

## What's next

The public challenge build is intentionally anonymous and read-only. The next step is to bring the same pattern to signed-in Agent Analytics projects, preserving each account's existing authorization and scopes. That would let a product team explore its own goals, event glossary, funnels, paths, retention, and experiments in a shared browser session, while keeping billing, keys, deletion, and other control-plane mutations outside the initial WebMCP surface.

## Links

- Live app: https://agent-analytics-webmcp.dannyshmueli.workers.dev/
- Source: https://github.com/Agent-Analytics/agent-analytics-webmcp
- Product: https://agentanalytics.sh
