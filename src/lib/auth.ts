import { supabase } from "@/integrations/supabase/client";

/**
 * Returns the current authenticated user's id, or null if not logged in.
 * Never returns a fake/dev UUID — that caused silent RLS failures and
 * unnecessary requests on the boot path.
 */
export async function getCurrentUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

const POST_AUTH_REDIRECT_KEY = "postAuthRedirect";

/**
 * Validates a ?redirect= target. Only same-origin absolute paths are allowed:
 * must start with "/", must not start with "//" or "/\", must not contain
 * "://", and must not point into "/admin". Anything else falls back to "/".
 */
export function getSafeRedirect(raw: string | null | undefined): string {
  if (!raw) return "/";
  if (!raw.startsWith("/")) return "/";
  if (raw.startsWith("//") || raw.startsWith("/\\")) return "/";
  if (raw.includes("://")) return "/";
  if (raw === "/admin" || raw.startsWith("/admin/") || raw.startsWith("/admin?")) return "/";
  return raw;
}

/** Persists the validated redirect so it survives e-mail confirmation flows. */
export function savePostAuthRedirect(path: string) {
  try {
    window.sessionStorage.setItem(POST_AUTH_REDIRECT_KEY, getSafeRedirect(path));
  } catch {
    /* storage indisponível — segue sem redirect */
  }
}

/** Reads and clears the stored post-auth redirect. Defaults to "/". */
export function consumePostAuthRedirect(): string {
  try {
    const raw = window.sessionStorage.getItem(POST_AUTH_REDIRECT_KEY);
    window.sessionStorage.removeItem(POST_AUTH_REDIRECT_KEY);
    return getSafeRedirect(raw);
  } catch {
    return "/";
  }
}
