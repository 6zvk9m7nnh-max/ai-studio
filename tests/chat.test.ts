import test from "node:test";
import assert from "node:assert/strict";
import chat from "../netlify/functions/chat.mts";
import missions from "../netlify/functions/missions.mts";
import { generate, stepPrompt, failure } from "../netlify/lib/providers.js";
function request(
  body: unknown,
  origin = "https://studio.example",
  method = "POST",
) {
  return new Request("https://studio.example/api/missions", {
    method,
    headers: { origin, "Content-Type": "application/json" },
    ...(method === "POST" || method === "PUT"
      ? { body: JSON.stringify(body) }
      : {}),
  });
}
const context = { cookies: { get: () => undefined } } as any;
test("rejects foreign origins, unsupported methods and absent session before database access", async () => {
  assert.equal(
    (await missions(request({}, "https://foreign.example"), context)).status,
    403,
  );
  assert.equal(
    (await missions(request({}, undefined, "DELETE"), context)).status,
    405,
  );
  assert.equal((await missions(request({}), context)).status, 401);
});
test("legacy endpoint cannot bypass mission quota", async () => {
  const r = await chat(request({}));
  assert.equal(r.status, 410);
  assert.equal(r.headers.get("cache-control"), "no-store");
});
test("three stages forward both actual outputs into finalization", () => {
  const m = {
    prompt: "Construire une boutique",
    roles: { openai: "Proposer", anthropic: "Vérifier" },
    results: [] as any[],
  };
  assert.equal(stepPrompt(m, { name: "Mini & Moi" }).provider, "openai");
  m.results.push({ text: "proposition unique" });
  let args = stepPrompt(m, { name: "Mini & Moi" });
  assert.equal(args.provider, "anthropic");
  assert.match(args.prompt, /proposition unique/);
  m.results.push({ text: "correction unique" });
  args = stepPrompt(m, { name: "Mini & Moi" });
  assert.equal(args.provider, "openai");
  assert.match(args.prompt, /proposition unique/);
  assert.match(args.prompt, /correction unique/);
  assert.match(args.system, /Finalise/);
});
test("official SDK requests use explicit provider URLs and bounded output; usage is retained", async () => {
  const originalFetch = globalThis.fetch;
  (globalThis as any).Netlify = { env: { get: () => "test-placeholder" } };
  const requests: any[] = [];
  globalThis.fetch = async (input: any, init: any) => {
    const url = String(input.url ?? input);
    const body = JSON.parse(init?.body ?? (await input.text()));
    requests.push({ url, body });
    return Response.json(
      url.includes("openai")
        ? {
            id: "test",
            object: "chat.completion",
            created: 1,
            model: "gpt-4.1-mini",
            choices: [
              {
                index: 0,
                message: { role: "assistant", content: "Proposition" },
                finish_reason: "stop",
              },
            ],
            usage: { total_tokens: 21 },
          }
        : {
            id: "test",
            type: "message",
            role: "assistant",
            model: "claude-haiku-4-5",
            content: [{ type: "text", text: "Vérification" }],
            stop_reason: "end_turn",
            usage: { input_tokens: 10, output_tokens: 12 },
          },
    );
  };
  try {
    assert.equal((await generate("openai", "Mission", "System")).tokens, 21);
    assert.equal((await generate("anthropic", "Mission", "System")).tokens, 22);
    assert.equal(requests[0].url, "https://api.openai.com/v1/chat/completions");
    assert.equal(requests[1].url, "https://api.anthropic.com/v1/messages");
    assert.ok(requests.every((r) => r.body.max_tokens === 1600));
  } finally {
    globalThis.fetch = originalFetch;
    delete (globalThis as any).Netlify;
  }
});
test("provider errors never echo sensitive upstream messages", () => {
  assert.doesNotMatch(
    failure({ status: 401, message: "sensitive upstream body" }),
    /sensitive/,
  );
  assert.match(failure({ status: 429 }), /Limite/);
  assert.match(failure({ name: "APIConnectionTimeoutError" }), /40 secondes/);
});
