# AGENTS.md

## Scope

Det här repositoryt är en säkerhetskritisk identitetskomponent. Ändringar ska vara små, verifierbara och utan orelaterad funktionalitet.

## Invariants

- Krösa-Maja är en separat OAuth 2.1/OIDC-provider; konsumtionsappar får inte bli auth-authority.
- GitHub är rotidentitet tills ett uttryckligt arkitekturbeslut ändrar detta.
- GitHub numeric ID, inte login-namn eller e-post, används för allowlist.
- GitHub bearer-token får inte persisteras.
- Delegerade Cloudflare-token får endast persisteras krypterat.
- Cloudflare får inte skapa nya Krösa-Maja-användare.
- PKCE ska krävas för registrerade klienter.
- Dynamic Client Registration och Client Credentials förblir avstängda tills ett konkret behov är beslutat.
- OAuth-klientadministration ska kräva både adminsession och den interna server-capabilityn; exponera aldrig capability-värdet.
- Ingen wildcard-redirect URI.
- Ingen bypass i Cloudflare Access eller GitHub-regler.
- `workers.dev` och preview URLs ska vara avstängda i produktion.
- Secrets, privata nycklar, D1-ID:n och operativ hostinventering ska inte läggas i publik dokumentation.

## Verification

Före merge:

1. `npm test`
2. `npm run typecheck`
3. `npm run validate:worker`
4. verifiera genererad Better Auth-schema/migration mot den låsta dependency-versionen
5. verifiera OIDC discovery, JWKS, authorize/token/userinfo/revoke/logout mot en verklig testklient
6. verifiera att ett icke-allowlistat GitHub-ID nekas
7. verifiera att GitHub-token inte finns i D1 efter login
8. verifiera att Cloudflare-token finns endast krypterad när kontot explicit har länkats

Deployment och SSO-cutover får inte ske innan testerna ovan är gröna.
