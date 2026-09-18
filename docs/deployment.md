# Deployment och migrering

Detta dokument beskriver ordningen. Exakta account-/application-/policy-ID:n ska hållas utanför ett publikt repository.

## 1. GitHub repository

Repositoryt är `Avkroken/Krosa-Maja`. Ändringar görs i separat arbetsgren enligt Avkrokens aktuella branchstandard. Implementation ska inte flyttas in i Skvallerbyttan.

## 2. Cloudflare basresurser

Verifiera och skapa:

- dedikerad custom hostname för auth-tjänsten,
- Worker med `workers.dev=false` och `preview_urls=false`,
- D1-databas `krosa-maja-auth`,
- Worker secrets och icke-hemliga variabler.

Först därefter ersätts `wrangler.template.jsonc` med en faktisk `wrangler.jsonc`.

## 3. Better Auth-schema

Installera de låsta paketen och generera schema från exakt den version som körs. Granska SQL innan den appliceras. Applicera migrationen på D1. Runtime-migrationsendpoint får inte exponeras i produktion.

## 4. GitHub OAuth App

Behåll befintliga callbacks under migreringen. Lägg till den callback som Better Auth kräver:

```text
https://auth.denied.se/api/auth/callback/github
```

Ta inte bort Skvallerbyttans/Politikers gamla GitHub-callbacks förrän respektive klient har migrerats och verifierats.

## 5. Cloudflare OAuth client för API

Skapa en separat **private** Cloudflare OAuth-client för Krösa-Maja. Denna klient är för **delegerad Cloudflare API-access**, inte för Krösa-Majas OIDC-providerroll. Gör den inte public om inte Krösa-Maja senare ska auktoriseras av Cloudflare-användare utanför det egna kontot; en public-promotering är permanent enligt Cloudflare.

- Authorization Code
- server-side token authentication (`client_secret_basic`)
- refresh token grant
- callback:

```text
https://auth.denied.se/api/auth/callback/cloudflare
```

- scopes: `user-details.read`, `offline_access` plus endast uttryckligen behövda API-scopes (Cloudflares aktuella API-scopes använder punktnotation, exempelvis `account.read`, inte kolonnotation)

Lagra client secret som Worker secret.

## 6. OIDC smoke test

Verifiera discovery och JWKS först. Registrera därefter en testklient genom `/admin` och kör hela Authorization Code + PKCE-flödet. Kontrollera issuer, audience, nonce, state, redirect URI, ID-token-signatur, UserInfo, refresh, revoke och logout.

## 7. Cloudflare Generic OIDC

När testklienten är verifierad skapas/ändras Cloudflare Generic OIDC så att Cloudflare blir en downstream-klient till Krösa-Maja. Använd discovery/JWKS från Krösa-Maja och PKCE.

En befintlig fungerande identitetsväg ska ligga kvar tills den nya har testats. Ingen bypass används som fallback.

## 8. Appmigrering

Migrera en app i taget:

1. registrera klient i Krösa-Maja,
2. lägg till OIDC-konfiguration i appen,
3. verifiera login/logout/session/claims,
4. deploya,
5. verifiera produktion,
6. ta först därefter bort appens direkta GitHub OAuth-väg.
