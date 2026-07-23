import { createServerClient } from "@supabase/ssr";
import { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export async function createClient(): Promise<SupabaseClient> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase environment variables. NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set.",
    );
  }

  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        if (typeof (cookieStore as any).getAll === "function") {
          return (cookieStore as any).getAll();
        }
        return [];
      },
      setAll(cookiesToSet: any[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }: { name: string; value: string; options: any }) => {
            if (typeof (cookieStore as any).set === "function") {
              (cookieStore as any).set(name, value, options);
            }
          });
        } catch {
          // Ignore errors when called from Server Components where cookies cannot be set
        }
      },
    },
    cookieOptions: process.env.NEXT_PUBLIC_COOKIE_DOMAIN
      ? { domain: process.env.NEXT_PUBLIC_COOKIE_DOMAIN }
      : undefined,
  });
}
