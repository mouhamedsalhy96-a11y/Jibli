import { NextResponse, type NextRequest } from "next/server";
import { serverClient } from "@/lib/supabase/server";
import { appOrigin } from "@/lib/app-origin";

// Supabase's default email verifies the address, then returns a PKCE code.
// Exchange it only on the server, using the verifier cookie from signup.
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (code && code.length <= 2048) {
    try {
      const supabase = await serverClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        const response = NextResponse.redirect(new URL("/espace", appOrigin()));
        response.headers.set("Cache-Control", "private, no-store");
        response.headers.set("Referrer-Policy", "no-referrer");
        return response;
      }
    } catch { /* Show a safe sign-in fallback; never expose the code or error. */ }
  }
  const response = NextResponse.redirect(new URL("/auth/erreur", appOrigin()));
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
