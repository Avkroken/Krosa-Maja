# Deployment och migrering

Detta dokument beskriver ordningen. Exakta account-/application-/policy-ID:n ska hållas utanför ett publikt repository.

## 1. GitHub repository

Repositoryt är `Avkroken/Krosa-Maja`. Ändringar görs i separat arbetsgren enligt Avkrokens aktuella branchstandard. Implementation ska inte flyttas in i Skvallerbyttan.

## 2. Cloudflare Worker och D1

`wrangler.jsonc` är repositoryts deploybara source of truth. Den innehåller:

- Worker-entrypoint `src/index.ts`,
- issuer-host `auth.denied.se`,
- `workers_dev=false`,
- `preview_urls=false`,
- D1-binding `AUTH_DB` med databasnamnet `krosa-maja-auth`,
- `keep_vars=true` så dashboard-konfigurerade vanliga variabler inte raderas vid deploy.

Ett konto-specifikt D1 `database_id` ska **inte** committas.

`npm run deploy` kör `scripts/deploy.ts` och gör följande fail-closed:

1. listar D1-databaser med Wrangler,
2. återanvänder exakt `krosa-maja-auth` om den finns,
3. skapar den annars och läser därefter tillbaka dess ID,
4. vägrar fortsätta om namnet är tvetydigt eller inget ID kan verifieras,
5. renderar `.wrangler.generated.jsonc` med det verifierade ID:t,
6. applicerar alla unapplied migrationer mot `AUTH_DB --remote`,
7. deployar Worker-versionen med samma genererade config,
8. raderar tempfilen även om migration eller deployment misslyckas.

Cloudflare dokumenterar att D1 kan provisioneras utan att resurs-ID ligger i repositoryt. Det här projektet gör ID-upplösningen explicit före migrationen så databasschemat finns innan Worker-versionen aktiveras.

## 3. Better Auth-schema

`migrations/0001-better-auth.sql` är genererad från Better Auth 1.7.5. Runtime-migrationsendpoint exponeras inte.

D1-migrationer appliceras automatiskt av deployscriptet före `wrangler deploy`. Cloudflare D1 registrerar applicerade migrationer, så samma deploy kan köras igen utan att återapplicera redan registrerade migrationer.

## 4. Runtime variables och secrets

`KROSA_MAJA_BASE_URL=https://auth.denied.se` ligger i `wrangler.jsonc`.

Följande måste provisioneras i Worker-miljön innan login kan fungera:

- `KROSA_MAJA_SECRET`
- `KROSA_MAJA_INTERNAL_ADMIN_SECRET`
- `KROSA_MAJA_GITHUB_CLIENT_ID`
- `KROSA_MAJA_GITHUB_CLIENT_SECRET`
- `KROSA_MAJA_ALLOWED_GITHUB_IDS`
- `KROSA_MAJA_ADMIN_GITHUB_IDS`

Cloudflare-kopplingen kräver dessutom, när den aktiveras:

- `KROSA_MAJA_CLOUDFLARE_CLIENT_ID`
- `KROSA_MAJA_CLOUDFLARE_CLIENT_SECRET`
- valfri `KROSA_MAJA_CLOUDFLARE_SCOPES`

Secrets ska vara Cloudflare Worker secrets, inte plaintext-vars i Git.

## 5. GitHub OAuth App

Behåll befintliga callbacks under migreringen. Lägg till callback:

```text
https://auth.denied.se/api/auth/callback/github
```

Ta inte bort Skvallerbyttans/Politikers gamla GitHub-callbacks förrän respektive klient har migrerats och verifierats.

## 6. Cloudflare OAuth client för API

Skapa en separat **private** Cloudflare OAuth-client för Krösa-Maja. Denna klient är för **delegerad Cloudflare API-access**, inte för Krösa-Majas OIDC-providerroll.

- Authorization Code
- server-side token authentication (`client_secret_basic`)
- refresh token grant
- callback:

```text
https://auth.denied.se/api/auth/callback/cloudflare
```

- scopes: `user-details.read`, `offline_access` plus endast uttryckligen behövda API-scopes.

Lagra client secret som Worker secret.

## 7. Cloudflare edge och publika protokollvägar

Cloudflare Access-bypass är inte ensam tillräcklig för OAuth/OIDC. En tidigare edge-fas får inte svara med en Cloudflare Challenge Page på publika protokollvägar, eftersom maskinklienter inte kan lösa en interaktiv HTML-challenge.

Följande vägar ska vara publikt routbara och får inte returnera `cf-mitigated: challenge`:

```text
/health
/.well-known/*
/sign-in*
/consent*
/api/auth/oauth2/*
/api/auth/callback/*
/api/auth/jwks
```

`/ready`, `/admin` och `/admin/*` ska fortsatt ligga bakom Access/default-deny.

Om en publik protokollväg träffas av en Challenge Page ska Cloudflare Security Events användas för att identifiera vilken edge-produkt som utförde åtgärden innan policyn ändras. Ett eventuellt undantag ska vara path-scopat till listan ovan; zonens skydd ska inte stängas av generellt.

Production-smoke verifierar detta explicit och failar direkt om response-headern `cf-mitigated` är `challenge`.

## 8. OIDC smoke test

Verifiera discovery och JWKS först. Registrera därefter en testklient genom `/admin` och kör hela Authorization Code + PKCE-flödet. Kontrollera issuer, audience, nonce, state, redirect URI, ID-token-signatur, UserInfo, refresh, revoke och logout.

## 9. Cloudflare Generic OIDC och appmigrering

När testklienten är verifierad konfigureras Cloudflare Generic OIDC som downstream-klient till Krösa-Maja.

En befintlig fungerande identitetsväg ska ligga kvar tills den nya har testats. Ingen bypass används som fallback. Migrera därefter en app i taget och ta först bort dess direkta GitHub OAuth-väg efter verifierad produktion.
