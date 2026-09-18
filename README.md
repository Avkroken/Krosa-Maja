# Krösa-Maja

Krösa-Maja är Avkrokens centrala OAuth 2.1- och OpenID Connect-provider. Produktionsissuer är `https://auth.denied.se`.

## Roller

1. **Identity Provider / Authorization Server** — GitHub används som rotidentitet. Registrerade Avkroken-appar autentiserar därefter användaren mot Krösa-Maja via OIDC/OAuth 2.1.
2. **OAuth client mot Cloudflare** — användaren kan uttryckligen länka sitt Cloudflare-konto. Delegerade Cloudflare-token lagras krypterat och kan senare användas för API-funktioner med minsta nödvändiga scopes.

Krösa-Maja är en separat säkerhetskomponent. Den ska inte bäddas in i Skvallerbyttan eller någon annan konsumtionsapp.

## Protokoll

- Authorization Code
- PKCE S256
- OpenID Connect (`openid`, `profile`, `email`)
- refresh tokens (`offline_access`)
- RS256 ID-token/JWKS för kompatibilitet med Cloudflare Generic OIDC
- UserInfo, introspection, revocation och RP-initiated logout via Better Auth OAuth Provider
- Dynamic Client Registration är avstängt
- Client Credentials är avstängt tills ett konkret M2M-behov finns
- OAuth-endpoints rate-limit:as per klient-IP; counters lagras i D1

## Säkerhetsmodell

- GitHub numeric ID är den auktoritativa allowlist-nyckeln för rotidentitet.
- GitHub-access-token används bara under identitetsuppslaget och tas bort innan kontot persisteras.
- Cloudflare är en **länkad** provider och kan inte skapa en lokal användare.
- Cloudflare OAuth-token krypteras före D1-persistens (`encryptOAuthTokens: true`).
- Administrationsåtgärder kräver både en giltig Krösa-Maja-session och ett GitHub-konto vars numeric ID finns i admin-allowlisten.
- OAuth/OIDC-klienter skapas via en server-side adminoperation. Dynamic registration är inte exponerad.
- `workers.dev` och preview-URL:er ska vara avstängda.
- Auth-hostens protokollendpoints måste vara publikt routbara, men övriga Avkroken-ytor förblir deny-by-default enligt central Access-standard.

## Konfiguration

Hemligheter:

- `KROSA_MAJA_SECRET`
- `KROSA_MAJA_INTERNAL_ADMIN_SECRET` (separat capability för server-side klientadministration)
- `KROSA_MAJA_GITHUB_CLIENT_SECRET`
- `KROSA_MAJA_CLOUDFLARE_CLIENT_SECRET` (när Cloudflare API-kopplingen aktiveras)

Icke-hemliga variabler:

- `KROSA_MAJA_BASE_URL`
- `KROSA_MAJA_GITHUB_CLIENT_ID`
- `KROSA_MAJA_ALLOWED_GITHUB_IDS`
- `KROSA_MAJA_ADMIN_GITHUB_IDS`
- `KROSA_MAJA_CLOUDFLARE_CLIENT_ID`
- `KROSA_MAJA_CLOUDFLARE_SCOPES`

D1-binding: `AUTH_DB`.

`wrangler.template.jsonc` är avsiktligt inte deploybar. Den ersätts av `wrangler.jsonc` först när host och D1-ID är verifierade i Cloudflare live-state.

## Lokal verifiering

```sh
npm install
npm test
npm run typecheck
npm run validate:worker
```

`package-lock.json` ska genereras av `npm install` och committas. Det ska inte handskrivas.

## Discovery

När produktionen är uppe exponeras:

- `/.well-known/openid-configuration`
- `/.well-known/oauth-authorization-server`

Övriga protokollendpoints annonseras därifrån och ligger under `/api/auth`.

Se `docs/architecture.md` och `docs/deployment.md` före deployment eller klientmigrering.
