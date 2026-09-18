import { oauthProvider } from "@better-auth/oauth-provider";
import { jwt } from "better-auth/plugins";

export const ACCOUNT_OPTIONS = {
  encryptOAuthTokens: true,
  storeStateStrategy: "database" as const,
  updateAccountOnSignIn: true,
  accountLinking: {
    enabled: true,
    disableImplicitLinking: true,
    trustedProviders: ["github", "cloudflare"],
    allowDifferentEmails: false,
  },
};

export const RATE_LIMIT_OPTIONS = {
  enabled: true,
  storage: "database" as const,
  window: 60,
  max: 100,
};

export function createProtocolPlugins(
  clientPrivileges?: (context: { headers: Headers; action: string }) => Promise<boolean | undefined>,
) {
  return [
    jwt({
      disableSettingJwtHeader: true,
      jwks: {
        keyPairConfig: { alg: "RS256" as const, modulusLength: 2048 },
      },
    }),
    oauthProvider({
      loginPage: "/sign-in",
      consentPage: "/consent",
      scopes: ["openid", "profile", "email", "offline_access"],
      grantTypes: ["authorization_code", "refresh_token"],
      allowDynamicClientRegistration: false,
      allowUnauthenticatedClientRegistration: false,
      allowPublicClientPrelogin: false,
      clientRegistrationRequirePKCE: true,
      ...(clientPrivileges ? { clientPrivileges } : {}),
    }),
  ] as const;
}
