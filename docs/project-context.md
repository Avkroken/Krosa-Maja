# Projektkontext

## Mål

Krösa-Maja ska vara Avkrokens gemensamma OAuth 2.1/OpenID Connect-provider och kunna länka Cloudflare för delegerad API-access.

## Verifierad state 2026-09-18

- Repositoryt `Avkroken/Krosa-Maja` finns och har default branch `main`.
- Custom Properties är `ci_stack = node` och `platform = cloudflare`.
- Organisationsruleseten `main`, `main-node` och `main-cloudflare` gäller repositoryt.
- Central Node/Cloudflare CI har explicita `Avkroken/Krosa-Maja`-profiler.
- Produktionsissuer är `https://auth.denied.se`.
- Avkrokens centrala Access-standard är deny-by-default med smala publika protokollundantag.
- `package-lock.json` och Better Auth 1.7.5-migrationen är genererade och versionsstyrda.
- Cloudflare Workers Builds är kopplat till repositoryt.
- En första production build 2026-09-18 misslyckades eftersom repositoryt saknade en faktisk Wrangler-konfiguration; Wrangler gick därför in i autoconfig och försökte hitta statiska assets.
- Fixen gör `wrangler.jsonc` till deploybar source of truth och tar bort `wrangler.template.jsonc`.
- D1-ID hålls borta från Git. Deployscriptet hittar/skapar `krosa-maja-auth`, verifierar ID:t, applicerar migrationer och deployar med en temporär config.
- `keep_vars=true` används för att bevara dashboard-konfigurerade plaintext-vars. Wrangler-deploy raderar inte befintliga Worker secrets.

## Vald implementation

- Cloudflare Worker + D1
- Better Auth 1.7.5
- `@better-auth/oauth-provider` 1.7.5
- RS256 OIDC-signering
- GitHub upstream identity med numeric-ID allowlist
- Cloudflare som explicit länkad provider, inte alternativ signup-provider
- Authorization Code + PKCE för downstream-klienter
- Dynamic Client Registration och Client Credentials avstängda
- explicit D1 provisioning/migration gate före Worker deployment

## Kvar efter deployfixen

- Worker secrets och nödvändiga runtime-vars ska verifieras/provisioneras.
- GitHub OAuth App ska få Krösa-Majas callback utan att befintliga klientcallbacks tas bort för tidigt.
- Cloudflare OAuth client ska skapas för delegerad API-länkning.
- OIDC discovery/JWKS och ett fullständigt Authorization Code + PKCE-flöde ska smoke-testas före SSO-cutover.
