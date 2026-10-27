import test from "node:test";
import assert from "node:assert/strict";
import { classifyTicket, draftResponse } from "./ai.js";

const originalFetch = globalThis.fetch;
const originalApiKey = process.env.GROQ_API_KEY;
const originalModel = process.env.GROQ_MODEL;

test.afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalApiKey === undefined) delete process.env.GROQ_API_KEY;
  else process.env.GROQ_API_KEY = originalApiKey;
  if (originalModel === undefined) delete process.env.GROQ_MODEL;
  else process.env.GROQ_MODEL = originalModel;
});

test("classifies with Groq and validates the returned enums", async () => {
  process.env.GROQ_API_KEY = "test-key";
  process.env.GROQ_MODEL = "test-model";
  let request;
  globalThis.fetch = async (url, options) => {
    request = { url, options };
    return new Response(JSON.stringify({
      choices: [{ message: { content: "```json\n{\"category\":\"Royalty & Payments\",\"priority\":\"High\"}\n```" } }],
    }), { status: 200, headers: { "content-type": "application/json" } });
  };

  const result = await classifyTicket("Royalty missing", "My payout is delayed.");
  assert.equal(result.category, "Royalty & Payments");
  assert.equal(result.priority, "High");
  assert.equal(result.aiUnavailable, false);
  assert.equal(request.url, "https://api.groq.com/openai/v1/chat/completions");
  assert.equal(request.options.headers.Authorization, "Bearer test-key");
  assert.equal(JSON.parse(request.options.body).model, "test-model");
});

test("uses local classification when the Groq key is not configured", async () => {
  delete process.env.GROQ_API_KEY;
  globalThis.fetch = () => { throw new Error("Fetch should not run without an API key."); };

  const result = await classifyTicket("Royalty missing", "I have not received payments for months.");
  assert.equal(result.category, "Royalty & Payments");
  assert.equal(result.priority, "High");
  assert.equal(result.aiUnavailable, true);
});

test("returns an editable draft when Groq is rate-limited", async () => {
  process.env.GROQ_API_KEY = "test-key";
  globalThis.fetch = async () => new Response("rate limited", { status: 429 });

  const result = await draftResponse(
    { subject: "Where is my royalty?", description: "My payment is delayed.", category: "Royalty & Payments" },
    null,
    { name: "Priya Sharma" },
  );
  assert.equal(result.aiUnavailable, true);
  assert.match(result.draft, /Hi Priya,/);
  assert.match(result.draft, /follow up with a specific update within 48 hours/);
});
