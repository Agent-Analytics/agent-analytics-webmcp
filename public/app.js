import { registerSiteTools } from "/tools.js";

const content = document.querySelector("#evidence-content");
const panel = document.querySelector(".evidence-panel");
const title = document.querySelector("#view-title");
const kicker = document.querySelector("#view-kicker");
const freshness = document.querySelector("#freshness");
const callText = document.querySelector("#call-text");
const callState = document.querySelector(".call-state");
const toolStatus = document.querySelector("#tool-status");
const number = new Intl.NumberFormat("en-US");

const labels = {
  overview: ["GROWTH OVERVIEW", "Thirty days of product evidence", "show_growth_overview({ days: 30 })"],
  funnel: ["CONVERSION FUNNEL", "Where the signup journey leaks", "trace_signup_funnel({ steps: ['page_view', 'signup_started', 'signup'] })"],
  paths: ["JOURNEY PATHS", "Which entry page creates signups", "compare_conversion_paths({ goal_event: 'signup' })"],
  breakdown: ["CONVERSION BREAKDOWN", "Signups by landing page", "break_down_conversions({ property: 'path', event: 'signup' })"],
  experiment: ["EXPERIMENT EVIDENCE", "Did the signup CTA test work?", "inspect_signup_experiment({ id: 'exp_demo_signup_cta' })"],
};

function escape(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}

function percent(value, digits = 1) {
  const numeric = Number(value || 0);
  return `${(numeric * 100).toFixed(digits).replace(/\.0$/, "")}%`;
}

function setActive(tool) {
  document.querySelectorAll("[data-demo]").forEach((button) => button.classList.toggle("active", button.dataset.demo === tool && button.classList.contains("question")));
}

function metric(label, value, note) {
  return `<div class="metric"><div class="metric-label">${escape(label)}</div><div class="metric-value">${escape(value)}</div><div class="metric-note">${escape(note)}</div></div>`;
}

function sparkline(points) {
  if (!points.length) return "";
  const width = 800;
  const height = 190;
  const values = points.map((point) => Number(point.total_events || 0));
  const max = Math.max(...values, 1);
  const x = (index) => (index / Math.max(values.length - 1, 1)) * width;
  const y = (value) => height - 18 - (value / max) * (height - 42);
  const line = values.map((value, index) => `${index ? "L" : "M"}${x(index).toFixed(1)},${y(value).toFixed(1)}`).join(" ");
  const area = `${line} L${width},${height} L0,${height} Z`;
  return `<div class="chart-wrap"><div class="chart-label"><span>Daily accepted events</span><span>${escape(points[0].bucket)} → ${escape(points.at(-1).bucket)}</span></div><svg class="sparkline" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" role="img" aria-label="Daily event volume chart"><defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff5a1f" stop-opacity=".32"/><stop offset="1" stop-color="#ff5a1f" stop-opacity="0"/></linearGradient></defs><line class="grid" x1="0" y1="50" x2="800" y2="50"/><line class="grid" x1="0" y1="110" x2="800" y2="110"/><path class="area" d="${area}"/><path class="line" d="${line}"/></svg></div>`;
}

function renderOverview(data) {
  const totals = data.totals || {};
  const sessions = data.sessions || {};
  content.innerHTML = `<div class="metrics">${metric("Unique users", number.format(totals.unique_users || 0), "Resolved people")}${metric("Product events", number.format(totals.total_events || 0), "Intentional signals")}${metric("Signup rate", percent((data.events || []).find((event) => event.event === "signup")?.unique_users / Math.max(totals.unique_users || 1, 1)), "From all visitors")}</div>${sparkline(data.timeSeries || [])}<div class="evidence-note">The public dataset is seeded through the real Agent Analytics API. Generic pageviews establish the baseline; signup milestones provide the decision evidence.</div>`;
}

function renderFunnel(data) {
  const steps = data.steps || [];
  content.innerHTML = `<div class="funnel-list">${steps.map((step, index) => `<div class="funnel-step"><span class="funnel-index">0${index + 1}</span><span class="funnel-name">${escape(step.event)}</span><div class="funnel-track"><div class="funnel-fill" style="width:${Math.max(2, Number(step.conversion_from_first || 0) * 100)}%"></div></div><span class="funnel-value">${number.format(step.users)} · ${percent(step.conversion_from_first, 1)}</span></div>`).join("")}</div><div class="evidence-note">The largest leak is ${escape(steps.at(-2)?.event || "the penultimate step")} → ${escape(steps.at(-1)?.event || "the goal")}: ${percent(steps.at(-1)?.drop_off_rate || 0, 1)} drop-off at the final step.</div>`;
}

function renderPaths(data) {
  const paths = data.entry_paths || [];
  content.innerHTML = `<div class="path-cards">${paths.map((path) => `<div class="path-card"><h3>${escape(path.entry_page)}</h3><div class="path-rate">${percent(path.conversion_rate, 1)}</div><div class="path-meta">${number.format(path.sessions)} sessions<br>${number.format(path.conversions)} signups</div></div>`).join("")}</div><div class="evidence-note">The strongest entry is ${escape(paths.toSorted((a, b) => b.conversion_rate - a.conversion_rate)[0]?.entry_page || "unknown")}. The zero-conversion path is a concrete candidate for the next experiment.</div>`;
}

function renderBreakdown(data) {
  const values = data.values || [];
  const max = Math.max(...values.map((item) => Number(item.count || 0)), 1);
  content.innerHTML = `<div class="bars">${values.map((item) => `<div class="bar-row"><span class="bar-label">${escape(item.value)}</span><div class="bar-track"><div class="bar-fill" style="width:${(Number(item.count || 0) / max) * 100}%"></div></div><span class="bar-value">${number.format(item.count)}</span></div>`).join("")}</div><div class="evidence-note">This is an event-property breakdown, not a pageview ranking: each bar is tied directly to the selected conversion event.</div>`;
}

function experimentRows(data) {
  if (Array.isArray(data.results)) return data.results;
  if (Array.isArray(data.results?.variants)) return data.results.variants;
  if (data.results && typeof data.results === "object") return Object.entries(data.results).map(([key, value]) => ({ key, ...(value || {}) }));
  return (data.variants || []).map((variant) => ({ ...variant, exposures: 0, conversions: 0, conversion_rate: 0 }));
}

function renderExperiment(data) {
  const variants = experimentRows(data);
  const winner = data.winner || variants.toSorted((a, b) => Number(b.conversion_rate || 0) - Number(a.conversion_rate || 0))[0]?.key;
  content.innerHTML = `<div class="experiment-grid">${variants.map((variant) => `<div class="variant ${variant.key === winner ? "winner" : ""}">${variant.key === winner ? '<span class="winner-tag">LEADING</span>' : ""}<h3>${escape(variant.key)}</h3><div class="variant-rate">${percent(variant.conversion_rate || 0, 1)}</div><div class="variant-meta">${number.format(variant.exposures || variant.users || 0)} exposures<br>${number.format(variant.conversions || 0)} conversions</div></div>`).join("")}</div><div class="evidence-note">Status: ${escape(data.status)}. Results stay observational until the experiment’s sample and decision rule justify a winner.</div>`;
}

const renderers = { overview: renderOverview, funnel: renderFunnel, paths: renderPaths, breakdown: renderBreakdown, experiment: renderExperiment };

async function run(tool, args = {}, source = "site tool") {
  const view = labels[tool];
  if (!view) throw new Error("Unknown view.");
  kicker.textContent = view[0];
  title.textContent = view[1];
  callText.textContent = view[2];
  callState.textContent = "RUNNING";
  callState.className = "call-state running";
  panel.setAttribute("aria-busy", "true");
  content.innerHTML = '<div class="loading-state"><span class="spinner"></span>Querying Agent Analytics…</div>';
  setActive(tool);
  try {
    const response = await fetch("/api/evidence", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tool, args }) });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.error || "Evidence request failed.");
    renderers[tool](result.data);
    freshness.textContent = `Live · ${new Date(result.generated_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
    callState.textContent = source === "site tool" ? "SITE TOOL" : "COMPLETE";
    callState.className = "call-state";
    return { ...result, message: `${view[1]} is now visible on the page.` };
  } catch (error) {
    content.innerHTML = `<div class="loading-state">${escape(error.message)}</div>`;
    callState.textContent = "ERROR";
    callState.className = "call-state error";
    throw error;
  } finally {
    panel.setAttribute("aria-busy", "false");
  }
}

document.querySelectorAll("[data-demo]").forEach((button) => button.addEventListener("click", () => run(button.dataset.demo, {}, "manual control")));

const count = await registerSiteTools(document.modelContext, (tool, args) => run(tool, args, "site tool"));
toolStatus.textContent = count ? `${count} site tools available` : "WebMCP-ready page";
toolStatus.classList.toggle("ready", Boolean(count));

run("overview", { days: 30 }, "manual control").catch(() => {});
