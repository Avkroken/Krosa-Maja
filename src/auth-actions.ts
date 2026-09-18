import type { KrosaMajaAuth } from "./auth.ts";

interface RedirectPayload {
  redirect?: boolean;
  url?: string;
}

export async function runAuthPostForRedirect(
  auth: KrosaMajaAuth,
  request: Request,
  baseUrl: string,
  path: string,
  body: Record<string, unknown>,
): Promise<Response> {
  const headers = new Headers(request.headers);
  headers.set("Accept", "application/json");
  headers.set("Content-Type", "application/json");
  headers.set("Origin", new URL(baseUrl).origin);

  const internal = await auth.handler(
    new Request(`${baseUrl}/api/auth${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    }),
  );

  if (!internal.ok) return internal;
  let payload: RedirectPayload;
  try {
    payload = (await internal.clone().json()) as RedirectPayload;
  } catch {
    return internal;
  }
  if (!payload.url) return internal;

  const responseHeaders = new Headers(internal.headers);
  responseHeaders.set("Location", payload.url);
  responseHeaders.set("Cache-Control", "no-store");
  return new Response(null, { status: 303, headers: responseHeaders });
}
