import { NextResponse, type NextRequest } from "next/server";
import { serverClient } from "@/lib/supabase/server";
import { appOrigin } from "@/lib/app-origin";
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  let target = "/compte/recuperation-expiree";
  if (code && code.length <= 2048) {
    try {
      const supabase = await serverClient();
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error && data.session) target = "/compte/nouveau-mot-de-passe";
    } catch { /* Never expose recovery codes or provider errors. */ }
  }
  // Fixed internal destinations; submitted redirect/next values are ignored.
  const response = NextResponse.redirect(new URL(target, appOrigin()));
  response.headers.set("Cache-Control", "private, no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
