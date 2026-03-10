import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const token = searchParams.get("token");
  const action = searchParams.get("action");

  // Redirection vers la page de validation dans l'app
  const redirectUrl = new URL("/maintenance/validate", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000");
  if (id) redirectUrl.searchParams.set("id", id);
  if (token) redirectUrl.searchParams.set("token", token);
  if (action) redirectUrl.searchParams.set("action", action);

  return NextResponse.redirect(redirectUrl);
}
