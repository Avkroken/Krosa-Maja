const token = process.env.CLOUDFLARE_API_TOKEN;
if (!token) throw new Error("CLOUDFLARE_API_TOKEN missing");

const headers = {
  authorization: `Bearer ${token}`,
  "content-type": "application/json",
};

async function cf(path, init = {}) {
  const response = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    ...init,
    headers: { ...headers, ...(init.headers ?? {}) },
  });
  const body = await response.json();
  if (!response.ok || !body.success) {
    throw new Error(`Cloudflare API failed (${response.status}): ${JSON.stringify(body.errors ?? [])}`);
  }
  return body.result;
}

const zones = await cf("/zones?name=denied.se&status=active&per_page=1");
if (!Array.isArray(zones) || zones.length !== 1) {
  throw new Error("Could not resolve exactly one active denied.se zone");
}

const zoneId = zones[0].id;
const before = await cf(`/zones/${zoneId}/bot_management`);
console.log("fight_mode_before=" + String(before.fight_mode));

if (before.fight_mode !== false) {
  const updated = await cf(`/zones/${zoneId}/bot_management`, {
    method: "PUT",
    body: JSON.stringify({ fight_mode: false }),
  });
  console.log("fight_mode_after_update=" + String(updated.fight_mode));
}

const after = await cf(`/zones/${zoneId}/bot_management`);
if (after.fight_mode !== false) throw new Error("Bot Fight Mode remained enabled");
console.log("fight_mode_verified=false");

await new Promise((resolve) => setTimeout(resolve, 3000));
const health = await fetch("https://auth.denied.se/health", {
  redirect: "manual",
  headers: {
    accept: "application/json",
    "user-agent": "krosa-maja-cloudflare-verify/1",
  },
});
console.log("health_status=" + health.status);
console.log("health_cf_mitigated=" + (health.headers.get("cf-mitigated") ?? "none"));
