# Projektkontext

## Mål

Krösa-Maja ska vara Avkrokens gemensamma OAuth 2.1/OpenID Connect-provider och kunna länka Cloudflare för delegerad API-access.

## Verifierad state 2026-09-18

- Repositoryt `Avkroken/Krosa-Maja` finns och har default branch `main`.
- Custom Properties är `ci_stack = node` och `platform = cloudflare`.
- Organisationsruleseten `main`, `main-node` och `main-cloudflare` gäller repositoryt.
- Central Node/Cloudflare CI har en explicit `Avkroken/Krosa-Maja`-profil.
- Produktionsissuer är beslutad till `https://auth.denied.se`.
- Avkrokens centrala Access-standard är deny-by-default med smala publika protokollundantag.
- Cloudflare-plugin är inte tillgänglig i den aktuella verktygsmiljön, så live Cloudflare-resurser kan inte skapas eller muteras härifrån.

## Vald implementation

- Cloudflare Worker + D1
- Better Auth 1.7.5
- `@better-auth/oauth-provider` 1.7.5
- RS256 OIDC-signering
- GitHub upstream identity med numeric-ID allowlist
- Cloudflare som explicit länkad provider, inte alternativ signup-provider
- Authorization Code + PKCE för downstream-klienter
- Dynamic Client Registration och Client Credentials avstängda

## Kvar före deployment

- `package-lock.json` och Better Auth SQL-schema ska genereras från de installerade låsta paketen,
- D1-databasen `krosa-maja-auth` ska skapas och dess ID verifieras,
- faktisk `wrangler.jsonc` ska skapas från den verifierade Cloudflare-state utan att operativa ID:n läggs i publik dokumentation,
- Worker secrets och runtime-variabler ska provisioneras,
- Cloudflare OAuth client ska skapas för den delegerade API-länkningen,
- OIDC discovery/JWKS och ett fullständigt Authorization Code + PKCE-flöde ska smoke-testas före SSO-cutover.
