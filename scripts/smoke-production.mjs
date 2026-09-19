const baseUrl = (process.env.BASE_URL ?? "https://auth.denied.se").replace(/\/$/, "");
const initialDelayMs = Number(process.env.SMOKE_INITIAL_DELAY_MS ?? 30000);
const attempts = Number(process.env.SMOKE_ATTEMPTS ?? 12);
const retryDelayMs = Number(process.env.SMOKE_RETRY_DELAY_MS ?? 10000);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function request(path, init = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    return await fetch(`${baseUrl}${path}`, {
      ...init,
      redirect: "manual",
      signal: controller.signal,
      headers: {
        "user-agent": "krosa-maja-production-smoke/1",
        ...(init.headers ?? {}),
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function bodyPreview(response) {
  const text = await response.text();
  return text.replace(/\s+/g, " ").slice(0, 500);
}

function challengeResponse(response) {
  return response.headers.get("cf-mitigated") === "challenge";
}

class CloudflareChallengeError extends Error {}

function challengeError(path, response) {
  const ray = response.headers.get("cf-ray") ?? "<none>";
  return new CloudflareChallengeError(
    `${path} was intercepted by a Cloudflare Challenge Page before the Worker/Access boundary (HTTP ${response.status}, cf-ray=${ray}). Public OAuth/OIDC protocol paths must not return cf-mitigated=challenge.`,
  );
}

function accessRedirect(response) {
  const location = response.headers.get("location");
  if (!location) return false;
  try {
    const url = new URL(location, baseUrl);
    return (
      url.hostname.endsWith(".cloudflareaccess.com") &&
      url.pathname.includes("/cdn-cgi/access/")
    );
  } catch {
    return false;
  }
}

async function waitForHealth() {
  if (initialDelayMs > 0) {
    console.log(`Waiting ${initialDelayMs}ms for the production deployment to settle...`);
    await sleep(initialDelayMs);
  }

  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await request("/health");
      if (challengeResponse(response)) throw challengeError("/health", response);
      if (response.status === 200) {
        const body = await response.json();
        if (
          body?.ok === true &&
          body?.service === "krosa-maja" &&
          body?.protocol === "oauth2.1-oidc"
        ) {
          console.log("PASS /health is public and healthy");
          return;
        }
        lastError = new Error(`unexpected /health JSON: ${JSON.stringify(body)}`);
      } else {
        lastError = new Error(
          `/health returned ${response.status}: ${await bodyPreview(response)}`,
        );
      }
    } catch (error) {
      if (error instanceof CloudflareChallengeError) throw error;
      lastError = error;
    }

    console.log(
      `Health attempt ${attempt}/${attempts} failed: ${lastError instanceof Error ? lastError.message : String(lastError)}`,
    );
    if (attempt < attempts) await sleep(retryDelayMs);
  }
  throw lastError;
}

async function expectJson(path, validate) {
  const response = await request(path);
  if (challengeResponse(response)) throw challengeError(path, response);
  if (response.status !== 200) {
    throw new Error(`${path} returned ${response.status}: ${await bodyPreview(response)}`);
  }
  const body = await response.json();
  validate(body);
  console.log(`PASS ${path}`);
  return body;
}

async function expectPublic(path, init = {}) {
  const response = await request(path, init);
  if (challengeResponse(response)) throw challengeError(path, response);
  if (accessRedirect(response)) {
    throw new Error(`${path} is still intercepted by Cloudflare Access`);
  }
  if (response.status >= 500) {
    throw new Error(`${path} returned ${response.status}: ${await bodyPreview(response)}`);
  }
  console.log(`PASS ${path} is publicly routed (HTTP ${response.status})`);
}

async function expectAccessProtected(path) {
  const response = await request(path);
  if (challengeResponse(response)) throw challengeError(path, response);
  if (!accessRedirect(response)) {
    throw new Error(
      `${path} is not protected by the expected Cloudflare Access redirect (HTTP ${response.status}, location=${response.headers.get("location") ?? "<none>"}): ${await bodyPreview(response)}`,
    );
  }
  console.log(`PASS ${path} is protected by Cloudflare Access`);
}

await waitForHealth();

const oidc = await expectJson("/.well-known/openid-configuration", (body) => {
  const expected = {
    issuer: baseUrl,
    authorization_endpoint: `${baseUrl}/api/auth/oauth2/authorize`,
    token_endpoint: `${baseUrl}/api/auth/oauth2/token`,
    jwks_uri: `${baseUrl}/api/auth/jwks`,
    userinfo_endpoint: `${baseUrl}/api/auth/oauth2/userinfo`,
    revocation_endpoint: `${baseUrl}/api/auth/oauth2/revoke`,
    introspection_endpoint: `${baseUrl}/api/auth/oauth2/introspect`,
    end_session_endpoint: `${baseUrl}/api/auth/oauth2/end-session`,
  };
  for (const [key, value] of Object.entries(expected)) {
    if (body?.[key] !== value) {
      throw new Error(`OIDC metadata ${key} expected ${value}, got ${body?.[key]}`);
    }
  }
  if (!body?.code_challenge_methods_supported?.includes("S256")) {
    throw new Error("OIDC metadata does not advertise PKCE S256");
  }
});

await expectJson("/.well-known/oauth-authorization-server", (body) => {
  if (body?.issuer !== baseUrl) throw new Error(`OAuth issuer mismatch: ${body?.issuer}`);
  if (body?.token_endpoint !== oidc.token_endpoint) {
    throw new Error("OAuth and OIDC token_endpoint differ");
  }
});

await expectJson("/api/auth/jwks", (body) => {
  if (!Array.isArray(body?.keys) || body.keys.length === 0) {
    throw new Error("JWKS contains no signing keys");
  }
});

await expectPublic("/sign-in");
await expectPublic("/consent");
await expectPublic("/api/auth/oauth2/authorize");
await expectPublic("/api/auth/callback/github");

await expectAccessProtected("/ready");
await expectAccessProtected("/admin");

console.log("Production smoke verification passed.");
