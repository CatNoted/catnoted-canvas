import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function getSafeRedirectUrl(next: string | null, origin: string): string {
  const defaultUrl = `${origin}/`;
  if (!next) return defaultUrl;

  // Relative path - always safe (guard against protocol-relative redirects like //example.com)
  if (next.startsWith("/")) {
    if (next.startsWith("//")) {
      return defaultUrl;
    }
    return `${origin}${next}`;
  }

  // Absolute URL
  try {
    const nextUrl = new URL(next);
    const originUrl = new URL(origin);

    const allowedDomains = ["catnoted.app", "catnoted.com"];

    // Check if the hostname matches one of our allowed domains, their subdomains, or the current origin hostname
    const isAllowedHost = allowedDomains.some(
      (domain) => nextUrl.hostname === domain || nextUrl.hostname.endsWith("." + domain)
    ) || nextUrl.hostname === originUrl.hostname;

    if (isAllowedHost) {
      return next;
    }
  } catch {
    // Invalid URL format
  }

  return defaultUrl;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(getSafeRedirectUrl(next, origin));
    }
  }

  return NextResponse.redirect(`${origin}/?login_error=1`);
}
