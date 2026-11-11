import { createBrowserClient, parseCookieHeader, serializeCookieHeader } from "@supabase/ssr";
import { publicEnv } from "@/lib/env";
import type { Database } from "./database.types";
import { withSessionLifetime } from "./session";

/** Supabase client for Client Components. Every query it makes is subject to RLS. */
export function createClient() {
  const env = publicEnv();
  return createBrowserClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return parseCookieHeader(document.cookie).map(({ name, value }) => ({ name, value: value ?? "" }));
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          document.cookie = serializeCookieHeader(name, value, withSessionLifetime(options));
        }
      },
    },
  });
}
