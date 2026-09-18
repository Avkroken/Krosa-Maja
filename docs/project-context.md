# Projektkontext

## Mål

Krösa-Maja ska vara Avkrokens gemensamma OAuth 2.1/OpenID Connect-provider och kunna länka Cloudflare för delegerad API-access.

## Verifierad state 2026-09-18

- Repositoryt `Avkroken/Krosa-Maja` finns och har default branch `main`.
- Custom Properties är `ci_stack = node` och `platform = cloudflare`.
- Organisationsruleseten `main`, `main-node` och `main-cloudflare` gäller repositoryt.
- Central Node/Cloudflare CI har explicita `Avkroken/Krosa-Maja`-profiler.
- Cloudflare-profilen validerar repositoryts publika template-konfiguration via `npm run validate:worker`.
- Produktionsissuer är beslutad till `https://auth.denied.se`.
- Avkrokens centrala Access-standard är deny-by-default med smala publika protokollundantag.
- Cloudflare-plugin är inte tillgänglig i den aktuella verktygsmiljön, så live Cloudflare-resurser kan inte skapas eller muteras härifrån.
- `package-lock.json` är genererad av npm och committad.
- `migrations/0001-better-auth.sql` är genererad av Better Auth CLI 1.7.5 och committad.
- Genererade artifacts verifierades bit-för-bit mot CI-artifacten genom Git blob-SHA:
  - `package-lock.json`: `e4928ae2047dc0deef361650ce0d8bb7a9b1ff96`
  - `migrations/0001-better-auth.sql`: `64c78e875304bcdb8cc256444622aea2a4048774`
- Bootstrap-körningen passerade 9 tester, TypeScript och Worker dry-run.
- Den tillfälliga bootstrap-workflowen raderade sig själv efter att de genererade filerna hade committats.

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

- D1-databasen `krosa-maja-auth` ska skapas och dess ID verifieras.
- Den genererade Better Auth-migrationen ska appliceras på D1 och verifieras.
- Faktisk `wrangler.jsonc` ska skapas från verifierad Cloudflare-state utan att operativa ID:n läggs i publik dokumentation.
- Worker secrets och runtime-variabler ska provisioneras.
- Cloudflare OAuth client ska skapas för den delegerade API-länkningen.
- GitHub OAuth App ska få Krösa-Majas callback utan att befintliga klientcallbacks tas bort för tidigt.
- OIDC discovery/JWKS och ett fullständigt Authorization Code + PKCE-flöde ska smoke-testas före SSO-cutover.
