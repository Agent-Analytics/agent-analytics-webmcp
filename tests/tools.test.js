import test from "node:test";
import assert from "node:assert/strict";
import { createToolDefinitions, registerSiteTools } from "../public/tools.js";

test("exposes five narrowly-described read-only WebMCP tools", () => {
  const tools = createToolDefinitions(async () => ({}));
  assert.equal(tools.length, 5);
  assert.equal(new Set(tools.map((tool) => tool.name)).size, 5);
  for (const tool of tools) {
    assert.equal(tool.annotations.readOnlyHint, true);
    assert.equal(tool.inputSchema.additionalProperties, false);
    assert.equal(typeof tool.execute, "function");
  }
});

test("registers tools and connects execute to application logic", async () => {
  const registered = [];
  const calls = [];
  const count = await registerSiteTools({ registerTool: async (tool) => registered.push(tool) }, async (tool, args) => {
    calls.push({ tool, args });
    return { ok: true };
  });
  assert.equal(count, 5);
  await registered.find((tool) => tool.name === "show_growth_overview").execute({ days: 14 });
  assert.deepEqual(calls, [{ tool: "overview", args: { days: 14 } }]);
});

test("feature detection is a safe no-op outside WebMCP browsers", async () => {
  assert.equal(await registerSiteTools(undefined, async () => ({})), 0);
});
