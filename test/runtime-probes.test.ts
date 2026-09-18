import assert from "node:assert/strict";
import test from "node:test";
import worker from "../src/index.ts";
import type { Env } from "../src/env.ts";

test("/health is a config-independent liveness probe", async () => {
  const response = await worker.fetch(
    new Request("https://auth.denied.se/health"),
    {} as Env,
  );

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    ok: true,
    service: "krosa-maja",
    protocol: "oauth2.1-oidc",
  });
});

test("/health only accepts GET", async () => {
  const response = await worker.fetch(
    new Request("https://auth.denied.se/health", { method: "POST" }),
    {} as Env,
  );

  assert.equal(response.status, 405);
  assert.equal(response.headers.get("allow"), "GET");
});

test("/ready fails closed when runtime auth configuration is missing", async () => {
  const response = await worker.fetch(
    new Request("https://auth.denied.se/ready"),
    {} as Env,
  );

  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), {
    ok: false,
    error: "service misconfigured",
  });
});
