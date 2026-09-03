import test from "node:test";
import assert from "node:assert/strict";
import { buildEvidenceRequest, handleEvidence } from "../src/worker.js";

test("builds a bounded overview request", () => {
  const request = buildEvidenceRequest("overview", { days: 30 });
  assert.equal(request.path, "/stats?project=agentanalytics-demo&since=30d");
  assert.deepEqual(request.view, { days: 30 });
});

test("rejects out-of-range and unknown inputs", () => {
  assert.throws(() => buildEvidenceRequest("overview", { days: 365 }), /7 to 90/);
  assert.throws(() => buildEvidenceRequest("experiment", { id: "secret-experiment" }), /public demo/);
  assert.throws(() => buildEvidenceRequest("delete_everything", {}), /Unknown/);
});

test("builds a safe funnel request with fixed project and count mode", () => {
  const request = buildEvidenceRequest("funnel", { steps: ["page_view", "signup"], since: "14d" });
  const body = JSON.parse(request.init.body);
  assert.equal(request.path, "/funnel");
  assert.equal(body.project, "agentanalytics-demo");
  assert.equal(body.count_by, "user_id");
  assert.deepEqual(body.steps, [{ event: "page_view" }, { event: "signup" }]);
});

test("evidence endpoint rejects non-JSON and non-POST requests", async () => {
  const getResponse = await handleEvidence(new Request("https://example.com/api/evidence"));
  assert.equal(getResponse.status, 405);
  const textResponse = await handleEvidence(new Request("https://example.com/api/evidence", { method: "POST", body: "{}", headers: { "Content-Type": "text/plain" } }));
  assert.equal(textResponse.status, 415);
});
