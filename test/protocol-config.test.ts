import assert from "node:assert/strict";
import test from "node:test";
import { createProtocolPlugins } from "../src/auth-shared.ts";

test("OAuth provider contract remains explicit and deny-by-default", () => {
  const [, provider] = createProtocolPlugins();

  assert.equal(provider.id, "oauth-provider");
  assert.equal(provider.options.loginPage, "/sign-in");
  assert.equal(provider.options.consentPage, "/consent");

  assert.deepEqual(provider.options.scopes, [
    "openid",
    "profile",
    "email",
    "offline_access",
  ]);
  assert.deepEqual(provider.options.grantTypes, [
    "authorization_code",
    "refresh_token",
  ]);

  assert.equal(provider.options.allowDynamicClientRegistration, false);
  assert.equal(provider.options.allowUnauthenticatedClientRegistration, false);
  assert.equal(provider.options.allowPublicClientPrelogin, false);
  assert.equal(provider.options.clientRegistrationRequirePKCE, true);
});
