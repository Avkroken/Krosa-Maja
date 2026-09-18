export interface GitHubProfile {
  id: number | string;
  login?: string;
  name?: string | null;
  email?: string | null;
  avatar_url?: string | null;
}

interface GitHubEmail {
  email: string;
  primary: boolean;
  verified: boolean;
}

export interface BetterAuthGitHubUserInfo {
  user: {
    name: string;
    email: string;
    image?: string;
    emailVerified: boolean;
  };
  data: GitHubProfile;
}

const GITHUB_API_VERSION = "2026-03-10";
const USER_AGENT = "Avkroken-Krosa-Maja";
const REQUEST_TIMEOUT_MS = 10_000;

function headers(accessToken: string): HeadersInit {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${accessToken}`,
    "X-GitHub-Api-Version": GITHUB_API_VERSION,
    "User-Agent": USER_AGENT,
  };
}

export async function getAllowedGitHubUserInfo(
  accessToken: string | undefined,
  allowedGitHubIds: ReadonlySet<string>,
): Promise<BetterAuthGitHubUserInfo | null> {
  if (!accessToken) return null;

  const [profileResponse, emailsResponse] = await Promise.all([
    fetch("https://api.github.com/user", {
      headers: headers(accessToken),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    }),
    fetch("https://api.github.com/user/emails", {
      headers: headers(accessToken),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    }),
  ]);
  if (!profileResponse.ok || !emailsResponse.ok) return null;

  const profile = (await profileResponse.json()) as GitHubProfile;
  const userId = String(profile.id ?? "");
  if (!allowedGitHubIds.has(userId)) return null;

  const emails = (await emailsResponse.json()) as GitHubEmail[];
  const verifiedEmail =
    emails.find((entry) => entry.primary && entry.verified) ??
    emails.find((entry) => entry.verified);
  if (!verifiedEmail?.email) return null;

  return {
    user: {
      name: profile.name?.trim() || profile.login?.trim() || verifiedEmail.email,
      email: verifiedEmail.email,
      image: profile.avatar_url || undefined,
      emailVerified: true,
    },
    data: profile,
  };
}
