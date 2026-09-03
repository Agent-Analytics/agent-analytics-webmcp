const readOnly = { readOnlyHint: true };

export function createToolDefinitions(run) {
  return [
    {
      name: "show_growth_overview",
      description: "Show 7-90 days of product events and unique users in the visible Agent Analytics evidence canvas. Use this first to establish the baseline before deeper analysis.",
      inputSchema: {
        type: "object",
        properties: { days: { type: "integer", minimum: 7, maximum: 90, default: 30, description: "Lookback window in days." } },
        additionalProperties: false,
      },
      annotations: readOnly,
      execute: async ({ days = 30 } = {}) => run("overview", { days }),
    },
    {
      name: "trace_signup_funnel",
      description: "Trace a 2-5 step event funnel and show conversion and drop-off at each step in the visible canvas. The public demo contains page_view, signup_started, and signup.",
      inputSchema: {
        type: "object",
        properties: {
          steps: { type: "array", minItems: 2, maxItems: 5, items: { type: "string", minLength: 1, maxLength: 64 }, default: ["page_view", "signup_started", "signup"], description: "Ordered event names." },
          since: { type: "string", enum: ["7d", "14d", "30d", "90d"], default: "30d" },
        },
        additionalProperties: false,
      },
      annotations: readOnly,
      execute: async ({ steps = ["page_view", "signup_started", "signup"], since = "30d" } = {}) => run("funnel", { steps, since }),
    },
    {
      name: "compare_conversion_paths",
      description: "Compare entry-page journeys to a goal event and show which paths convert or drop off in the visible canvas.",
      inputSchema: {
        type: "object",
        properties: {
          goal_event: { type: "string", default: "signup", minLength: 1, maxLength: 64, description: "Goal event to attribute within each session." },
          since: { type: "string", enum: ["7d", "14d", "30d", "90d"], default: "30d" },
        },
        additionalProperties: false,
      },
      annotations: readOnly,
      execute: async ({ goal_event = "signup", since = "30d" } = {}) => run("paths", { goal_event, since }),
    },
    {
      name: "break_down_conversions",
      description: "Rank page paths, referrers, or campaign sources for a product event and show the comparison in the visible canvas.",
      inputSchema: {
        type: "object",
        properties: {
          property: { type: "string", enum: ["path", "referrer", "utm_source"], default: "path" },
          event: { type: "string", enum: ["page_view", "signup_started", "signup"], default: "signup" },
          days: { type: "integer", minimum: 7, maximum: 90, default: 30 },
          limit: { type: "integer", minimum: 1, maximum: 20, default: 8 },
        },
        additionalProperties: false,
      },
      annotations: readOnly,
      execute: async ({ property = "path", event = "signup", days = 30, limit = 8 } = {}) => run("breakdown", { property, event, days, limit }),
    },
    {
      name: "inspect_signup_experiment",
      description: "Inspect the public signup CTA A/B experiment, including variants, exposures, conversions, and lift, and show it in the visible canvas.",
      inputSchema: {
        type: "object",
        properties: { id: { type: "string", enum: ["exp_demo_signup_cta"], default: "exp_demo_signup_cta" } },
        additionalProperties: false,
      },
      annotations: readOnly,
      execute: async ({ id = "exp_demo_signup_cta" } = {}) => run("experiment", { id }),
    },
  ];
}

export async function registerSiteTools(modelContext, run) {
  if (typeof modelContext?.registerTool !== "function") return 0;
  const tools = createToolDefinitions(run);
  for (const tool of tools) await modelContext.registerTool(tool);
  return tools.length;
}
