const API_BASE = "https://api.agentanalytics.sh";
const DEMO_PROJECT = "agentanalytics-demo";
const DEMO_EXPERIMENT = "exp_demo_signup_cta";
const TOKEN_SKEW_MS = 30_000;
const REQUEST_TIMEOUT_MS = 12_000;

let cachedSession = null;
let sessionRequest = null;

const jsonHeaders = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-Content-Type-Options": "nosniff",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: jsonHeaders });
}

function integer(value, fallback, min, max) {
  const parsed = Number.parseInt(value ?? fallback, 10);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw new Error(`Expected an integer from ${min} to ${max}.`);
  }
  return parsed;
}

function choice(value, fallback, allowed) {
  const selected = value ?? fallback;
  if (!allowed.includes(selected)) {
    throw new Error(`Expected one of: ${allowed.join(", ")}.`);
  }
  return selected;
}

function eventName(value) {
  if (typeof value !== "string" || !/^[a-zA-Z_$][a-zA-Z0-9_$.-]{0,63}$/.test(value)) {
    throw new Error("Event names must be 1-64 safe identifier characters.");
  }
  return value;
}

function assertSameOrigin(request) {
  const origin = request.headers.get("Origin");
  if (!origin) return;
  if (origin !== new URL(request.url).origin) {
    throw new Error("Cross-origin requests are not allowed.");
  }
}

async function withTimeout(url, init = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function getDemoSession() {
  if (cachedSession && cachedSession.expiresAt - TOKEN_SKEW_MS > Date.now()) {
    return cachedSession.token;
  }
  if (!sessionRequest) {
    sessionRequest = withTimeout(`${API_BASE}/demo/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    }).then(async (response) => {
      const body = await response.json();
      if (!response.ok || !body?.agent_session?.access_token) {
        throw new Error(body?.error || "The public analytics demo is unavailable.");
      }
      cachedSession = {
        token: body.agent_session.access_token,
        expiresAt: body.agent_session.access_expires_at,
      };
      return cachedSession.token;
    }).finally(() => {
      sessionRequest = null;
    });
  }
  return sessionRequest;
}

async function analyticsRequest(path, init = {}) {
  let token = await getDemoSession();
  let response = await withTimeout(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init.headers || {}),
    },
  });
  if (response.status === 401) {
    cachedSession = null;
    token = await getDemoSession();
    response = await withTimeout(`${API_BASE}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(init.headers || {}),
      },
    });
  }
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error || `Analytics API returned ${response.status}.`);
  return data;
}

export function buildEvidenceRequest(tool, args = {}) {
  if (tool === "overview") {
    const days = integer(args.days, 30, 7, 90);
    return { path: `/stats?project=${DEMO_PROJECT}&since=${days}d`, init: {}, view: { days } };
  }
  if (tool === "funnel") {
    const steps = Array.isArray(args.steps) ? args.steps.map(eventName) : ["page_view", "signup_started", "signup"];
    if (steps.length < 2 || steps.length > 5) throw new Error("A funnel needs 2-5 steps.");
    const since = choice(args.since, "30d", ["7d", "14d", "30d", "90d"]);
    return {
      path: "/funnel",
      init: { method: "POST", body: JSON.stringify({ project: DEMO_PROJECT, steps: steps.map((event) => ({ event })), since, count_by: "user_id" }) },
      view: { steps, since },
    };
  }
  if (tool === "paths") {
    const goalEvent = eventName(args.goal_event ?? "signup");
    const since = choice(args.since, "30d", ["7d", "14d", "30d", "90d"]);
    return {
      path: "/paths",
      init: { method: "POST", body: JSON.stringify({ project: DEMO_PROJECT, goal_event: goalEvent, since, max_steps: 5, entry_limit: 5, path_limit: 4, candidate_session_cap: 5000 }) },
      view: { goal_event: goalEvent, since },
    };
  }
  if (tool === "breakdown") {
    const property = choice(args.property, "path", ["path", "referrer", "utm_source"]);
    const event = choice(args.event, "signup", ["page_view", "signup_started", "signup"]);
    const days = integer(args.days, 30, 7, 90);
    const limit = integer(args.limit, 8, 1, 20);
    return { path: `/breakdown?project=${DEMO_PROJECT}&property=${property}&event=${event}&since=${days}d&limit=${limit}`, init: {}, view: { property, event, days, limit } };
  }
  if (tool === "experiment") {
    if (args.id != null && args.id !== DEMO_EXPERIMENT) throw new Error("Only the public demo experiment is available.");
    return { path: `/experiments/${DEMO_EXPERIMENT}`, init: {}, view: { id: DEMO_EXPERIMENT } };
  }
  throw new Error("Unknown evidence tool.");
}

export async function handleEvidence(request) {
  if (request.method !== "POST") return json({ ok: false, error: "Method not allowed." }, 405);
  assertSameOrigin(request);
  if (!(request.headers.get("Content-Type") || "").toLowerCase().startsWith("application/json")) {
    return json({ ok: false, error: "Content-Type must be application/json." }, 415);
  }
  const body = await request.json();
  const built = buildEvidenceRequest(body?.tool, body?.args);
  const data = await analyticsRequest(built.path, built.init);
  return json({ ok: true, tool: body.tool, project: DEMO_PROJECT, view: built.view, generated_at: new Date().toISOString(), data });
}

function secureAsset(response) {
  const secured = new Response(response.body, response);
  secured.headers.set("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'");
  secured.headers.set("Referrer-Policy", "no-referrer");
  secured.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  secured.headers.set("X-Content-Type-Options", "nosniff");
  secured.headers.set("X-Frame-Options", "DENY");
  return secured;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      if (url.pathname === "/api/health") return json({ ok: true, service: "agent-analytics-webmcp" });
      if (url.pathname === "/api/evidence") return await handleEvidence(request);
      return secureAsset(await env.ASSETS.fetch(request));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected error.";
      const clientError = /Expected|needs|must|Only|Unknown|Cross-origin|Event names/.test(message);
      return json({ ok: false, error: message }, clientError ? 400 : 502);
    }
  },
};
